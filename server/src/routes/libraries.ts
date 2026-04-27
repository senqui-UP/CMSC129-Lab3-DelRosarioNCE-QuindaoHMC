import { Router, Response, NextFunction } from "express";
import {
  listLibraries,
  addLibrary,
  removeLibrary,
} from "../controllers/libraryController";
import { authenticate, AuthRequest } from "../middleware/auth";
import { Story, Library } from "../models";

const router = Router();

router.get("/", authenticate, listLibraries);
router.post("/", authenticate, addLibrary);
router.delete("/:id", authenticate, removeLibrary);

router.post("/bulk-add", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { genre, tag, author, minWords, maxWords } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const filter: Record<string, unknown> = { deletedAt: null };
    if (author) filter.author = new RegExp(String(author), "i");
    if (genre) filter.genres = new RegExp(String(genre), "i");
    if (tag) filter.tags = new RegExp(String(tag), "i");
    if (minWords || maxWords) {
      const wordFilter: Record<string, number> = {};
      if (minWords) wordFilter.$gte = Number(minWords);
      if (maxWords) wordFilter.$lte = Number(maxWords);
      filter.words = wordFilter;
    }

    const stories = await Story.find(filter).select("_id").lean();
    const storyIds = stories.map(s => s._id);

    const existing = await Library.find({
      userId,
      storyId: { $in: storyIds }
    }).select("storyId").lean();
    const existingIds = new Set(existing.map(e => e.storyId.toString()));

    const toAdd = storyIds.filter(id => !existingIds.has(id.toString()));

    if (toAdd.length === 0) {
      res.json({ success: true, added: 0, message: "No new stories to add" });
      return;
    }

    const newEntries = toAdd.map(storyId => ({ userId, storyId }));
    await Library.insertMany(newEntries, { ordered: false });

    res.json({
      success: true,
      added: toAdd.length,
      message: `Added ${toAdd.length} stories to your library!`
    });
  } catch (err) {
    next(err);
  }
});

export default router;
