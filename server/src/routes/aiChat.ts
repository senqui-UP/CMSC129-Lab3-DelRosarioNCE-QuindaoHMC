import { Router, Response, NextFunction } from "express";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { env } from "../config/env";
import { Story } from "../models";
import { AuthRequest, authenticate } from "../middleware/auth";

const router = Router();

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const searchStoriesSchema = {
  type: SchemaType.OBJECT,
  properties: {
    query: { type: SchemaType.STRING, description: "Natural language search query" },
    author: { type: SchemaType.STRING, description: "Filter by author name" },
    genre: { type: SchemaType.STRING, description: "Filter by genre" },
    tag: { type: SchemaType.STRING, description: "Filter by tag" },
    limit: { type: SchemaType.NUMBER, description: "Number of results to return" },
  },
};

const getStoryDetailsSchema = {
  type: SchemaType.OBJECT,
  properties: {
    storyId: { type: SchemaType.STRING, description: "The ID of the story" },
  },
  required: ["storyId"],
};

const createStorySchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, description: "Title of the story" },
    genres: { type: SchemaType.ARRAY, description: "Array of genre strings", items: { type: SchemaType.STRING } },
    tags: { type: SchemaType.ARRAY, description: "Array of tag strings", items: { type: SchemaType.STRING } },
    synopsis: { type: SchemaType.STRING, description: "Optional synopsis for the story" },
  },
  required: ["title"],
};

const updateStorySchema = {
  type: SchemaType.OBJECT,
  properties: {
    storyId: { type: SchemaType.STRING, description: "ID of the story to update" },
    title: { type: SchemaType.STRING, description: "New title" },
    synopsis: { type: SchemaType.STRING, description: "New synopsis" },
    genres: { type: SchemaType.ARRAY, description: "New genres array", items: { type: SchemaType.STRING } },
    tags: { type: SchemaType.ARRAY, description: "New tags array", items: { type: SchemaType.STRING } },
    content: { type: SchemaType.STRING, description: "New content" },
  },
  required: ["storyId"],
};

const deleteStorySchema = {
  type: SchemaType.OBJECT,
  properties: {
    storyId: { type: SchemaType.STRING, description: "ID of the story to delete" },
  },
  required: ["storyId"],
};

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  tools: [
    {
      functionDeclarations: [
        {
          name: "search_stories",
          description: "Search and filter stories from the database. Use this for any query about stories.",
          parameters: searchStoriesSchema,
        },
        {
          name: "get_story_details",
          description: "Get detailed information about a specific story by its ID",
          parameters: getStoryDetailsSchema,
        },
        {
          name: "create_story",
          description: "Create a new blank story with title, genres, and tags. No content generation - just create a template.",
          parameters: createStorySchema,
        },
        {
          name: "update_story",
          description: "Update an existing story. Can modify title, synopsis, genres, tags, or content.",
          parameters: updateStorySchema,
        },
        {
          name: "delete_story",
          description: "Soft delete a story (mark as deleted but don't permanently remove)",
          parameters: deleteStorySchema,
        },
      ],
    },
  ],
});

const today = () => new Date().toISOString().slice(0, 10);

async function executeFunction(
  functionName: string,
  args: Record<string, unknown>,
  userId?: string
): Promise<unknown> {
  switch (functionName) {
    case "search_stories": {
      const filter: Record<string, unknown> = { deletedAt: null };
      if (args.author) filter.author = String(args.author);
      if (args.genre) filter.genres = String(args.genre);
      if (args.tag) filter.tags = String(args.tag);
      if (args.query) {
        const searchRegex = new RegExp(String(args.query), "i");
        filter.$or = [
          { title: searchRegex },
          { synopsis: searchRegex },
          { author: searchRegex },
        ];
      }
      const limit = Math.min(Number(args.limit) || 10, 20);
      const stories = await Story.find(filter)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean();
      return { success: true, data: stories, count: stories.length };
    }

    case "get_story_details": {
      const story = await Story.findOne({
        _id: args.storyId,
        deletedAt: null,
      }).lean();
      if (!story) return { success: false, error: "Story not found" };
      return { success: true, data: story };
    }

    case "create_story": {
      if (!userId) return { success: false, error: "Authentication required" };
      const { User } = await import("../config/db");
      const user = await User.findById(userId).lean();
      if (!user) return { success: false, error: "User not found" };
      const story = await Story.create({
        title: args.title,
        author: user.username,
        authorId: user._id,
        published: today(),
        lastUpdated: today(),
        genres: (args.genres as string[]) || [],
        tags: (args.tags as string[]) || [],
        synopsis: (args.synopsis as string) || "",
        content: "",
        words: 0,
      });
      return { success: true, data: story, message: `Created story: ${args.title}` };
    }

    case "update_story": {
      if (!userId) return { success: false, error: "Authentication required" };
      const existingStory = await Story.findOne({
        _id: args.storyId,
        deletedAt: null,
      });
      if (!existingStory) return { success: false, error: "Story not found" };
      if (existingStory.authorId.toString() !== userId) {
        return { success: false, error: "You can only edit your own stories" };
      }
      const updateData: Record<string, unknown> = { lastUpdated: today() };
      if (args.title) updateData.title = args.title;
      if (args.synopsis) updateData.synopsis = args.synopsis;
      if (args.genres) updateData.genres = args.genres;
      if (args.tags) updateData.tags = args.tags;
      if (args.content) {
        updateData.content = args.content;
        updateData.words = String(args.content).trim().split(/\s+/).filter(Boolean).length;
      }
      const story = await Story.findByIdAndUpdate(args.storyId, updateData, {
        returnDocument: "after",
        runValidators: true,
      }).lean();
      return { success: true, data: story, message: `Updated story: ${story?.title}` };
    }

    case "delete_story": {
      if (!userId) return { success: false, error: "Authentication required" };
      const existingStory = await Story.findOne({
        _id: args.storyId,
        deletedAt: null,
      });
      if (!existingStory) return { success: false, error: "Story not found" };
      if (existingStory.authorId.toString() !== userId) {
        return { success: false, error: "You can only delete your own stories" };
      }
      await Story.findByIdAndUpdate(args.storyId, { deletedAt: new Date() });
      return { success: true, message: `Deleted story: ${existingStory.title}` };
    }

    default:
      return { success: false, error: `Unknown function: ${functionName}` };
  }
}

router.post("/chat", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { message, mode, conversationHistory } = req.body;

    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const isCRUDMode = mode === "crud";

    const systemPrompt = isCRUDMode
      ? `You are a helpful assistant for a story writing platform. You have access to database tools to help users manage their stories.

Available Actions:
- search_stories: Search stories by title, author, genre, or tag
- get_story_details: Get full details of a specific story
- create_story: Create a new blank story (only title, genres, tags - NO content generation)
- update_story: Update an existing story (title, synopsis, genres, tags, content)
- delete_story: Soft delete a story

CRUD Rules:
- For CREATE: Only create a blank story with title, genres, and tags. NEVER generate content.
- For UPDATE: Users can modify any field (title, synopsis, genres, tags, content)
- For DELETE: Always confirm with the user before executing
- Users can only modify/delete their own stories
- When showing results, include story titles and relevant details

Inquiry Examples:
- "show me stories with adventure genre and female protagonist tag"
- "give me all stories by [author name]"
- "what stories have the fantasy genre?"
- "find stories with magic tag"
- "show me recently updated stories"

CRUD Examples:
- "create a story called 'My Adventure' with fantasy and adventure genres"
- "update the story [title] to add horror genre"
- "delete my story 'Old Draft'"

Maintain conversation context - reference previous topics when appropriate.`
      : `You are a helpful assistant for a story writing platform. You can search and display stories from the database.

Available Actions:
- search_stories: Search stories by title, author, genre, or tag
- get_story_details: Get full details of a specific story

Inquiry Examples:
- "show me stories with adventure genre and female protagonist tag"
- "give me all stories by [author name]"
- "what stories have the fantasy genre?"
- "find stories with magic tag"
- "show me recently updated stories"
- "list all stories"
- "show me horror stories"

When responding, include story titles and relevant details. If no results found, say so.`;

    const chatHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [
      { role: "user", parts: [{ text: systemPrompt }] },
    ];

    chatHistory.push({ role: "user", parts: [{ text: message }] });

    const chat = model.startChat({
      history: chatHistory,
    });

    let result;
    let toolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
    let maxIterations = 5;
    let iterations = 0;

    do {
      result = await chat.sendMessage(message);
      iterations++;
      
      const response = result.response;
      const functionCalls = response.functionCalls();
      
      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          const fnName = call.name;
          const fnArgs = call.args as Record<string, unknown>;
          toolCalls.push({ name: fnName, args: fnArgs });
          
          const funcResult = await executeFunction(fnName, fnArgs, req.user?._id);
          
          const funcResponse = JSON.stringify(funcResult);
          await chat.sendMessage(funcResponse);
        }
      } else {
        break;
      }
    } while (iterations < maxIterations);

    const finalText = result.response.text();

    const functionCallResults = toolCalls.map((tc) => ({
      function: tc.name,
      args: tc.args,
    }));

    res.json({
      response: finalText,
      functionCalls: functionCallResults,
      mode,
    });
  } catch (err: any) {
    console.error("AI chat error:", err);
    const errStr = JSON.stringify(err);
    if (err.status === 429 || err.statusText === 'Too Many Requests' || errStr.includes("429") || errStr.includes("quota") || errStr.includes("Too Many Requests") || errStr.includes(" quota") || errStr.includes("API_KEY_INVALID") || errStr.includes("expired") || err.status === 404 || errStr.includes("not found")) {
      res.status(429).json({ 
        error: "AI service is temporarily unavailable. Please try again later.",
        retryAfter: 60
      });
      return;
    }
    next(err);
  }
});

router.post("/confirm-action", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { action, storyId, confirmed, data } = req.body;

    if (!confirmed) {
      res.json({ success: true, message: "Action cancelled" });
      return;
    }

    if (action === "delete") {
      const result = await executeFunction("delete_story", { storyId }, req.user?._id);
      res.json(result);
    } else if (action === "update") {
      const result = await executeFunction("update_story", { storyId, ...data }, req.user?._id);
      res.json(result);
    } else {
      res.status(400).json({ error: "Unknown action" });
    }
  } catch (err) {
    next(err);
  }
});

router.post("/search", async (req, res, next) => {
  try {
    const { query, author, genre, tag, limit } = req.query;
    const filter: Record<string, unknown> = { deletedAt: null };

    if (author) filter.author = String(author);
    if (genre) filter.genres = String(genre);
    if (tag) filter.tags = String(tag);
    if (query) {
      const searchRegex = new RegExp(String(query), "i");
      filter.$or = [
        { title: searchRegex },
        { synopsis: searchRegex },
        { author: searchRegex },
      ];
    }

    const maxLimit = Math.min(Number(limit) || 20, 50);
    const stories = await Story.find(filter)
      .sort({ updatedAt: -1 })
      .limit(maxLimit)
      .lean();

    res.json({ data: stories, count: stories.length });
  } catch (err) {
    next(err);
  }
});

export default router;