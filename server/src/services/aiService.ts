import OpenAI from "openai";
import { env } from "../config/env";
import { tools, getFlexiblePrompt } from "./promptService";
import { executeFunction } from "./functionService";

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: MessageRole;
  content: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface ChatOptions {
  message: string;
  mode: "inquiry" | "crud";
  conversationHistory?: ChatMessage[];
  userId?: string;
}

export interface ChatResponse {
  response: string;
  functionCalls: Array<{ function: string; args: Record<string, unknown> }>;
  toolMessages?: ChatMessage[];
  mode: string;
}

const groq = new OpenAI({
  apiKey: env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const MODEL = "llama-3.1-8b-instant";

export async function sendChatMessage(
  options: ChatOptions,
): Promise<ChatResponse> {
  const { message, mode, conversationHistory, userId } = options;

  const systemPrompt = getFlexiblePrompt(message, mode);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  if (conversationHistory && Array.isArray(conversationHistory)) {
    // Groq requires strict ordering: one assistant message containing ALL tool_calls
    // for a turn must be immediately followed by ALL matching tool result messages.
    //
    // The stored history interleaves them as individual objects (one per call), so
    // we must re-group them: collect consecutive assistant+tool pairs that share
    // tool_call_ids, then emit a single merged assistant message followed by all
    // tool results. Any orphaned tool messages (no preceding assistant) are skipped.
    const history = conversationHistory.slice(-20);

    // First pass: merge consecutive per-call assistant/tool pairs into grouped turns.
    // A "tool turn" is: N×(assistant{tool_calls:[c]}) followed by N×(tool{tool_call_id})
    // where the tool_call_ids match. We detect this by collecting assistant messages
    // that have tool_calls and grouping their immediately-following tool results.
    type MergedEntry =
      | { kind: "plain"; role: "user" | "assistant"; content: string }
      | { kind: "tool_turn"; tool_calls: any[]; results: { content: string; tool_call_id: string }[] };

    const merged: MergedEntry[] = [];

    let i = 0;
    while (i < history.length) {
      const msg = history[i];

      if (msg.role === "assistant" && msg.tool_calls?.length) {
        // Start collecting a tool turn — gather all consecutive assistant+tool pairs
        const tool_calls: any[] = [];
        const results: { content: string; tool_call_id: string }[] = [];
        const seenIds = new Set<string>();

        // Collect all contiguous assistant messages with tool_calls (one per call)
        while (i < history.length && history[i].role === "assistant" && history[i].tool_calls?.length) {
          const calls = history[i].tool_calls!;
          for (const c of calls) {
            tool_calls.push(c);
            seenIds.add(c.id);
          }
          i++;
        }

        // Collect all immediately-following tool result messages whose IDs we know
        while (i < history.length && history[i].role === "tool" && seenIds.has(history[i].tool_call_id!)) {
          results.push({ content: history[i].content ?? "", tool_call_id: history[i].tool_call_id! });
          i++;
        }

        // Only include if every tool call has a matching result (Groq requires pairs)
        if (tool_calls.length > 0 && tool_calls.length === results.length) {
          merged.push({ kind: "tool_turn", tool_calls, results });
        }
        // If unpaired, drop the whole turn — better than sending malformed history
      } else if (msg.role === "tool") {
        // Orphaned tool message with no preceding assistant — skip
        i++;
      } else if (msg.role === "user" || msg.role === "assistant") {
        merged.push({ kind: "plain", role: msg.role, content: msg.content ?? "" });
        i++;
      } else {
        i++;
      }
    }

    // Second pass: push merged entries into messages
    for (const entry of merged) {
      if (entry.kind === "plain") {
        messages.push({ role: entry.role, content: entry.content });
      } else {
        // One assistant message with ALL tool_calls, then all tool results
        messages.push({
          role: "assistant",
          content: "",
          tool_calls: entry.tool_calls,
        } as OpenAI.Chat.ChatCompletionMessageParam);
        for (const r of entry.results) {
          messages.push({
            role: "tool",
            content: r.content,
            tool_call_id: r.tool_call_id,
          } as OpenAI.Chat.ChatCompletionToolMessageParam);
        }
      }
    }
  }

  messages.push({ role: "user", content: message });

  const availableTools = mode === "crud" ? tools : tools.slice(0, 2);
  
  console.log("[AI Service] ===== NEW REQUEST =====");
  console.log("[AI Service] Mode:", mode);
  console.log("[AI Service] Message:", message);
  console.log("[AI Service] Tools:", availableTools.map(t => t.function.name).join(", "));
  console.log("[AI Service] History:", conversationHistory?.length || 0, "messages");
  console.log("[AI Service] User ID:", userId ? "provided" : "MISSING");

  let toolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const toolMessages: ChatMessage[] = [];
  let maxIterations = 5;
  let iterations = 0;
  let finalResponse = "";
  let currentMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [...messages];

  do {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: currentMessages,
      tools: availableTools,
      temperature: 0,
      max_tokens: 2048,
    });

    const assistantMessage = response.choices[0]?.message;
    const toolCallsResult = assistantMessage?.tool_calls || [];
    
    console.log("[AI Service] Response:", assistantMessage?.content?.substring(0, 200));
    console.log("[AI Service] iteration:", iterations, "tool calls:", toolCallsResult.length);

    if (toolCallsResult.length > 0) {
      for (const call of toolCallsResult) {
        const fnName = (call as any).function?.name || (call as any).name;
        const fnArgs = JSON.parse(
          (call as any).function?.arguments || (call as any).arguments || "{}",
        ) as Record<string, unknown>;

        toolCalls.push({ name: fnName, args: fnArgs });

        const assistantToolMessage: ChatMessage = {
          role: "assistant",
          tool_calls: [call],
          tool_call_id: call.id,
          content: "",
        };

        currentMessages.push({
          role: "assistant",
          content: "",
          tool_calls: [call],
        } as OpenAI.Chat.ChatCompletionMessageParam);
        toolMessages.push(assistantToolMessage);

        console.log("[AI Service] Calling function:", fnName, "with args:", fnArgs);
        
        // Execute all functions immediately
        const funcResult = await executeFunction(
          fnName,
          fnArgs,
          userId || undefined,
        );
        console.log("[AI Service] Function result:", funcResult);

        const toolResultMessage: ChatMessage = {
          role: "tool",
          content: JSON.stringify(funcResult),
          tool_call_id: call.id,
        };

        currentMessages.push({
          role: "tool",
          content: JSON.stringify(funcResult),
          tool_call_id: call.id,
        } as OpenAI.Chat.ChatCompletionToolMessageParam);
        toolMessages.push(toolResultMessage);
      }
    } else {
      finalResponse = assistantMessage?.content || "";
      break;
    }

    iterations++;
  } while (iterations < maxIterations);

  if (!finalResponse && toolCalls.length > 0) {
    const lastResponse = await groq.chat.completions.create({
      model: MODEL,
      messages: currentMessages,
      temperature: 0,
      max_tokens: 1024,
    });
    finalResponse = lastResponse.choices[0]?.message?.content || "";
  }

  const toolMessages = currentMessages
    .filter((msg) => msg.role === "tool")
    .map((msg, index) => ({
      id: (msg as any).tool_call_id || `tool-${Date.now()}-${index}`,
      role: "tool" as const,
      content: String(msg.content),
      tool_call_id: (msg as any).tool_call_id,
      tool_calls: (msg as any).tool_calls,
    }));

  return {
    response: finalResponse,
    functionCalls: toolCalls.map((tc) => ({
      function: tc.name,
      args: tc.args,
    })),
    toolMessages,
    mode,
  };
}

const errorResponses = [
  "Oh no! Something went a bit wobbly there. 🤔",
  "Whoopsie! I tripped on that one!",
  "Hmm, my brain just did a little hiccup 😅",
  "Oopsie! That's a bit beyond my magical abilities right now.",
  "Eek! Something got tangled up in the wires!",
];

function getWhimsicalErrorMessage(): string {
  return errorResponses[Math.floor(Math.random() * errorResponses.length)];
}

export function createErrorResponse(errorType: string): {
  response: string;
  functionCalls: any[];
  mode: string;
} {
  const baseMessage = getWhimsicalErrorMessage();

  const suggestions: Record<string, string> = {
    rate_limit:
      "\n\n💡 Would you like to try again in a moment? Or maybe search for something else in the meantime?",
    model_not_found:
      "\n\n💡 Would you like me to try a different approach? Maybe search for stories instead?",
    not_found:
      "\n\n💡 Would you like to search for something else? I can help you find stories by genre, author, or tags!",
    auth: "\n\n💡 You might need to log in again. Would you like me to help you with that?",
    default:
      "\n\n💡 Would you like to try something else? I can help you find stories, create new ones, or answer questions!",
  };

  const suggestion = suggestions[errorType] || suggestions.default;

  return {
    response: `${baseMessage}${suggestion}`,
    functionCalls: [],
    mode: "inquiry",
  };
}