import { Router, Response, NextFunction } from "express";
import { sendChatMessage, createErrorResponse } from "../services/aiService";
import { AuthRequest, authenticate } from "../middleware/auth";

const router = Router();

router.post("/chat", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { message, mode, conversationHistory } = req.body;

    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const result = await sendChatMessage({
      message,
      mode: mode || "inquiry",
      conversationHistory,
      userId: req.user?._id?.toString(),
    });

    res.json(result);
  } catch (err: unknown) {
    console.error("AI chat error:", err);
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    
    if (errStr.includes("429") || errStr.includes("rate_limit")) {
      res.status(429).json({
        error: "AI service is temporarily unavailable. Please try again later.",
        retryAfter: 60
      });
      return;
    }
    
    if (errStr.includes("500") || errStr.includes("server error")) {
      res.status(500).json({
        error: "Something went wrong. Please try a different prompt.",
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

    const { executeFunction } = await import("../services/functionService");

    if (action === "delete") {
      const result = await executeFunction("delete_story", { storyId }, req.user?._id?.toString());
      res.json(result);
    } else if (action === "update") {
      const result = await executeFunction("update_story", { storyId, ...data }, req.user?._id?.toString());
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
    const { query, author, genre, tag, minWords, maxWords, limit } = req.query;
    const { executeFunction } = await import("../services/functionService");

    const result = await executeFunction("search_stories", {
      query: query as string,
      author: author as string,
      genre: genre as string,
      tag: tag as string,
      minWords: minWords ? parseInt(minWords as string) : undefined,
      maxWords: maxWords ? parseInt(maxWords as string) : undefined,
      limit: limit ? parseInt(limit as string) : 20,
    }, undefined);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;