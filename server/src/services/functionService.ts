import axios from "axios";

const API_BASE = `http://localhost:${process.env.PORT || "5000"}/api/v1/ai-data`;

interface FunctionResult {
  success: boolean;
  data?: unknown;
  message?: string;
  error?: string;
  count?: number;
}

async function makeRequest(method: string, endpoint: string, data?: unknown, userId?: string): Promise<FunctionResult> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (userId) {
      // For now, we'll use a simple auth header - in production, you'd pass the actual JWT
      headers["x-user-id"] = userId;
    }

    const response = await axios({
      method,
      url: `${API_BASE}${endpoint}`,
      data,
      headers,
    });
    return response.data;
  } catch (err: any) {
    if (err.response?.data) {
      return err.response.data;
    }
    return { success: false, error: err.message || "Request failed" };
  }
}

export async function executeFunction(
  functionName: string,
  args: Record<string, unknown>,
  userId?: string
): Promise<FunctionResult> {
  switch (functionName) {
    case "search_stories":
      return await makeRequest("POST", "/search", {
        query: args.query,
        author: args.author,
        genre: args.genre,
        tag: args.tag,
        minWords: args.minWords,
        maxWords: args.maxWords,
        limit: args.limit || 10,
      });
      
    case "get_all_genres":
      return await makeRequest("GET", "/genres");
      
    case "get_all_tags":
      return await makeRequest("GET", "/tags");
      
    case "get_story_details":
      return await makeRequest("GET", `/story/${args.storyId}`);
      
    case "create_story":
      if (!userId) return { success: false, error: "Authentication required" };
      return await makeRequest("POST", "/story", {
        title: args.title,
        genres: args.genres,
        tags: args.tags,
        synopsis: args.synopsis,
      }, userId);
      
    case "update_story":
      if (!userId) return { success: false, error: "Authentication required" };
      return await makeRequest("PUT", `/story/${args.storyId}`, {
        title: args.title,
        synopsis: args.synopsis,
        genres: args.genres,
        tags: args.tags,
        content: args.content,
      }, userId);
      
    case "delete_story":
      if (!userId) return { success: false, error: "Authentication required" };
      return await makeRequest("DELETE", `/story/${args.storyId}`, undefined, userId);
      
    default:
      return { success: false, error: `Unknown function: ${functionName}` };
  }
}