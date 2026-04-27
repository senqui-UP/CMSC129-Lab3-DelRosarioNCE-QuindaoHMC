import apiClient from "./client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: number;
  tool_call_id?: string;
  tool_calls?: Array<Record<string, unknown>>;
}

export interface ChatResponse {
  response: string;
  functionCalls?: Array<{
    function: string;
    args: Record<string, unknown>;
  }>;
  toolMessages?: ChatMessage[];
  mode: string;
}

export const sendChatMessage = async (
  message: string,
  mode: "inquiry" | "crud",
  conversationHistory: ChatMessage[]
): Promise<ChatResponse> => {
  const response = await apiClient.post("/ai/chat", {
    message,
    mode,
    conversationHistory: conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
      ...(msg.role === "tool"
        ? { tool_call_id: msg.tool_call_id, tool_calls: msg.tool_calls }
        : {}),
    })),
  });
  return response.data;
};

export const confirmAction = async (
  action: string,
  storyId: string,
  confirmed: boolean,
  data?: Record<string, unknown>
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post("/ai/confirm-action", {
    action,
    storyId,
    confirmed,
    data,
  });
  return response.data;
};