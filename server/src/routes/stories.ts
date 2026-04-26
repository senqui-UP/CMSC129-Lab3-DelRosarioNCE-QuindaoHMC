import { Router } from "express";
import {
  listStories,
  getStory,
  createStory,
  updateStory,
  softDeleteStory,
} from "../controllers/storyController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/", listStories);
router.get("/:id", getStory);
router.post("/", authenticate, createStory);
router.put("/:id", authenticate, updateStory);
router.delete("/:id", authenticate, softDeleteStory);

export default router;
