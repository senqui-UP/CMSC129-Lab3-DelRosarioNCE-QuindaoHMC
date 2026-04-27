import axios from "axios";

const API_BASE = `http://localhost:${process.env.PORT || "5000"}/api/v1`;

interface FunctionResult {
  success: boolean;
  data?: unknown;
  message?: string;
  error?: string;
  count?: number;
}

async function makeRequest(method: string, endpoint: string, data?: unknown, userId?: string): Promise<FunctionResult> {
  console.log(`[functionService] ${method} ${endpoint}`, { data, userId });
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (userId) {
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
      return await makeRequest("POST", "/ai-data/search", {
        query: args.query,
        author: args.author,
        genre: args.genre,
        tag: args.tag,
        minWords: args.minWords,
        maxWords: args.maxWords,
        limit: args.limit || 10,
      });
      
    case "get_all_genres":
      return await makeRequest("GET", "/ai-data/genres");
      
    case "get_all_tags":
      return await makeRequest("GET", "/ai-data/tags");
      
    case "get_my_stories":
      return await makeRequest("POST", "/ai-data/my-stories-search", {
        query: args.query,
        genre: args.genre,
        tag: args.tag,
        minWords: args.minWords,
        maxWords: args.maxWords,
        limit: args.limit || 50,
      }, userId);
      
    case "get_story_details":
      if (!userId) return { success: false, error: "Authentication required" };
      return await makeRequest("GET", `/ai-data/story/${args.storyId}`, undefined, userId);
      
    case "create_story":
      if (!userId) return { success: false, error: "Authentication required" };
      return await makeRequest("POST", "/ai-data/story", {
        title: args.title,
        genres: args.genres,
        tags: args.tags,
        synopsis: args.synopsis,
      }, userId);
      
    case "update_story":
      if (!userId) return { success: false, error: "Authentication required" };
      return await makeRequest("PUT", `/ai-data/story/${args.storyId}`, {
        title: args.title,
        synopsis: args.synopsis,
        genres: args.genres,
        tags: args.tags,
        content: args.content,
      }, userId);
      
    case "delete_story":
      if (!userId) return { success: false, error: "Authentication required" };
      return await makeRequest("DELETE", `/ai-data/story/${args.storyId}`, undefined, userId);
      
    case "bulk_add_to_library":
      if (!userId) return { success: false, error: "Authentication required" };
      return await makeRequest("POST", "/libraries/bulk-add", {
        genre: args.genre,
        tag: args.tag,
        author: args.author,
        minWords: args.minWords,
        maxWords: args.maxWords,
      }, userId);
      
    default:
      return { success: false, error: `Unknown function: ${functionName}` };
  }
}