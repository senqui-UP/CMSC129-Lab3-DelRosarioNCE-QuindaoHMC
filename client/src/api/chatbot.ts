import apiClient from "./client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ChatResponse {
  response: string;
  functionCalls?: Array<{
    function: string;
    args: Record<string, unknown>;
  }>;
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