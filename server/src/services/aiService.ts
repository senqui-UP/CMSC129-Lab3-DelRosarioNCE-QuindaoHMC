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
    for (const msg of conversationHistory.slice(-10)) {
      if (msg.role === "tool" && msg.tool_call_id) {
        messages.push({
          role: "tool",
          content: msg.content,
          tool_call_id: msg.tool_call_id,
        } as OpenAI.Chat.ChatCompletionToolMessageParam);
      } else {
        messages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
          ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}),
        });
      }
    }
  }

  messages.push({ role: "user", content: message });

  const availableTools = mode === "crud" ? tools : tools.slice(0, 2);

  let toolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  let maxIterations = 5;
  let iterations = 0;
  let finalResponse = "";
  let currentMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [...messages];

  do {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: currentMessages,
      tools: availableTools,
      temperature: 0.5,
      max_tokens: 2048,
    });

    const assistantMessage = response.choices[0]?.message;
    const toolCallsResult = assistantMessage?.tool_calls || [];

    if (toolCallsResult.length > 0) {
      for (const call of toolCallsResult) {
        const fnName = (call as any).function?.name || (call as any).name;
        const fnArgs = JSON.parse(
          (call as any).function?.arguments || (call as any).arguments || "{}",
        ) as Record<string, unknown>;

        toolCalls.push({ name: fnName, args: fnArgs });

        currentMessages.push({
          role: "assistant",
          tool_calls: [call],
        } as OpenAI.Chat.ChatCompletionMessageParam);

        // For delete and update, DON'T execute - let frontend handle confirmation
        if (fnName === "delete_story" || fnName === "update_story") {
          const pendingMsg =
            fnName === "delete_story"
              ? "⏳ Delete request noted. Please confirm to proceed."
              : "⏳ Update request noted. Please confirm to proceed.";
          currentMessages.push({
            role: "tool",
            content: JSON.stringify({
              success: true,
              pending: true,
              message: pendingMsg,
            }),
            tool_call_id: call.id,
          } as OpenAI.Chat.ChatCompletionToolMessageParam);
        } else {
          const funcResult = await executeFunction(
            fnName,
            fnArgs,
            userId || undefined,
          );
          currentMessages.push({
            role: "tool",
            content: JSON.stringify(funcResult),
            tool_call_id: call.id,
          } as OpenAI.Chat.ChatCompletionToolMessageParam);
        }
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
      temperature: 0.5,
      max_tokens: 1024,
    });
    finalResponse = lastResponse.choices[0]?.message?.content || "";
  }

  return {
    response: finalResponse,
    functionCalls: toolCalls.map((tc) => ({
      function: tc.name,
      args: tc.args,
    })),
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
