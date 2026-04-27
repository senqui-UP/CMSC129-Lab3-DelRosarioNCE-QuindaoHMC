import { Router, Response, NextFunction } from "express";
import { Story } from "../models";
import { AuthRequest, optionalAuth } from "../middleware/auth";

const router = Router();

router.use(optionalAuth);

const today = () => new Date().toISOString().slice(0, 10);

function getUserId(req: AuthRequest): string | null {
  if (req.user?._id) return req.user._id.toString();
  if (req.headers["x-user-id"]) return req.headers["x-user-id"] as string;
  return null;
}

async function getUserStories(userId: string) {
  return Story.find({ authorId: userId, deletedAt: null })
    .sort({ updatedAt: -1 })
    .select("_id title author genres tags synopsis published lastUpdated words")
    .lean();
}

// Search stories - PUBLIC
router.post("/search", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { query, author, genre, tag, minWords, maxWords, limit } = req.body;
    const filter: Record<string, unknown> = { deletedAt: null };

    if (author) filter.author = new RegExp(String(author), "i");
    if (genre) filter.genres = new RegExp(String(genre), "i");
    if (tag) filter.tags = new RegExp(String(tag), "i");
    
    if (query) {
      const searchRegex = new RegExp(String(query), "i");
      filter.$or = [
        { title: searchRegex },
        { synopsis: searchRegex },
        { author: searchRegex },
      ];
    }

    if (minWords || maxWords) {
      const wordFilter: Record<string, number> = {};
      if (minWords) wordFilter.$gte = Number(minWords);
      if (maxWords) wordFilter.$lte = Number(maxWords);
      filter.words = wordFilter;
    }

    const maxLimit = Math.min(Number(limit) || 10, 50);
    const stories = await Story.find(filter)
      .sort({ updatedAt: -1 })
      .limit(maxLimit)
      .select("_id title author genres tags synopsis published lastUpdated words")
      .lean();

    res.json({ success: true, data: stories, count: stories.length });
  } catch (err) {
    next(err);
  }
});

// Get all unique genres
router.get("/genres", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stories = await Story.find({ deletedAt: null }).select("genres").lean();
    const genreSet = new Set<string>();
    stories.forEach(story => {
      story.genres?.forEach((genre: string) => genreSet.add(genre));
    });
    const genres = Array.from(genreSet).sort();
    res.json({ success: true, data: genres, count: genres.length });
  } catch (err) {
    next(err);
  }
});

// Get all unique tags
router.get("/tags", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stories = await Story.find({ deletedAt: null }).select("tags").lean();
    const tagSet = new Set<string>();
    stories.forEach(story => {
      story.tags?.forEach((tag: string) => tagSet.add(tag));
    });
    const tags = Array.from(tagSet).sort();
    res.json({ success: true, data: tags, count: tags.length });
  } catch (err) {
    next(err);
  }
});

// Get single story details
router.get("/story/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const storyId = String(req.params.id);
    
    if (!storyId || storyId.length !== 24 || !/^[a-fA-F0-9]{24}$/.test(storyId)) {
      res.status(400).json({ success: false, error: "Invalid story ID format" });
      return;
    }
    
    const story = await Story.findOne({ _id: storyId, deletedAt: null }).lean();
    if (!story) {
      res.status(404).json({ success: false, error: "Story not found" });
      return;
    }
    res.json({ success: true, data: story });
  } catch (err) {
    console.error("[GET story] Error:", err);
    next(err);
  }
});

// Search user's own stories - for AI CRUD mode
router.post("/my-stories-search", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: "User ID required" });
      return;
    }
    
    const { query, genre, tag, minWords, maxWords, limit } = req.body;
    const filter: Record<string, unknown> = { authorId: userId, deletedAt: null };
    
    if (genre) filter.genres = new RegExp(String(genre), "i");
    if (tag) filter.tags = new RegExp(String(tag), "i");
    
    if (query) {
      const searchRegex = new RegExp(String(query), "i");
      filter.$or = [
        { title: searchRegex },
        { synopsis: searchRegex },
      ];
    }
    
    if (minWords || maxWords) {
      const wordFilter: Record<string, number> = {};
      if (minWords) wordFilter.$gte = Number(minWords);
      if (maxWords) wordFilter.$lte = Number(maxWords);
      filter.words = wordFilter;
    }
    
    const maxLimit = Math.min(Number(limit) || 50, 100);
    const stories = await Story.find(filter)
      .sort({ updatedAt: -1 })
      .limit(maxLimit)
      .select("_id title author genres tags synopsis published lastUpdated words")
      .lean();
    
    res.json({ success: true, data: stories, count: stories.length });
  } catch (err) {
    next(err);
  }
});

// Create story
router.post("/story", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: "User ID required" });
      return;
    }
    const { title, genres, tags, synopsis } = req.body;
    const { User } = await import("../config/db");
    const user = await User.findById(userId).lean();
    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }
    
    const story = await Story.create({
      title,
      author: user.username,
      authorId: user._id,
      published: today(),
      lastUpdated: today(),
      genres: genres || [],
      tags: tags || [],
      synopsis: synopsis || "",
      content: "",
      words: 0,
    });
    
    res.json({ success: true, data: { id: story._id, title: story.title }, message: "Story created!" });
  } catch (err) {
    next(err);
  }
});

// Update story
router.put("/story/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const storyId = String(req.params.id);
    
    if (!storyId || storyId.length !== 24 || !/^[a-fA-F0-9]{24}$/.test(storyId)) {
      res.status(400).json({ success: false, error: "Invalid story ID format" });
      return;
    }
    
    console.log("[PUT] Request params:", req.params);
    console.log("[PUT] Request body:", req.body);
    console.log("[PUT] User ID from header:", userId);
    
    if (!userId) {
      res.status(401).json({ success: false, error: "User ID required" });
      return;
    }
    
    const story = await Story.findOne({ _id: storyId, deletedAt: null });
    console.log("[PUT] Found story:", story?.title, story?._id);
    
    if (!story) {
      res.status(404).json({ success: false, error: "Story not found" });
      return;
    }
    
    if (story.authorId.toString() !== userId) {
      console.log("[PUT] Author mismatch:", story.authorId.toString(), "!==", userId);
      res.status(403).json({ success: false, error: "You can only edit your own stories" });
      return;
    }
    
    const { title, synopsis, genres, tags, content } = req.body;
    const updateData: Record<string, unknown> = { lastUpdated: today() };
    
    if (title) updateData.title = title;
    if (synopsis) updateData.synopsis = synopsis;
    if (genres) updateData.genres = genres;
    if (tags) updateData.tags = tags;
    if (content) {
      updateData.content = content;
      updateData.words = String(content).trim().split(/\s+/).filter(Boolean).length;
    }
    
    const updated = await Story.findByIdAndUpdate(req.params.id, updateData, { returnDocument: "after" }).lean();
    res.json({ success: true, data: { id: updated?._id, title: updated?.title }, message: `Updated "${updated?.title}"` });
  } catch (err) {
    console.error("[PUT] Error:", err);
    next(err);
  }
});

// Delete story
router.delete("/story/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const storyId = String(req.params.id);
    
    if (!storyId || storyId.length !== 24 || !/^[a-fA-F0-9]{24}$/.test(storyId)) {
      res.status(400).json({ success: false, error: "Invalid story ID format" });
      return;
    }
    
    console.log("[DELETE] Request params:", req.params);
    console.log("[DELETE] User ID from header:", userId);
    console.log("[DELETE] req.user:", req.user);
    
    if (!userId) {
      res.status(401).json({ success: false, error: "User ID required" });
      return;
    }
    
    const story = await Story.findOne({ _id: storyId, deletedAt: null });
    console.log("[DELETE] Found story:", story?.title, story?._id);
    
    if (!story) {
      res.status(404).json({ success: false, error: "Story not found" });
      return;
    }
    
    if (story.authorId.toString() !== userId) {
      console.log("[DELETE] Author mismatch:", story.authorId.toString(), "!==", userId);
      res.status(403).json({ success: false, error: "You can only delete your own stories" });
      return;
    }
    
    await Story.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ success: true, message: `Deleted "${story.title}"` });
  } catch (err) {
    console.error("[DELETE] Error:", err);
    next(err);
  }
});

export default router;