import { Story } from "../models";

const today = () => new Date().toISOString().slice(0, 10);

export interface FunctionResult {
  success: boolean;
  data?: unknown;
  message?: string;
  error?: string;
  count?: number;
}

export async function executeFunction(
  functionName: string,
  args: Record<string, unknown>,
  userId?: string
): Promise<FunctionResult> {
  switch (functionName) {
    case "search_stories":
      return await searchStories(args);
    case "get_all_genres":
      return await getAllGenres();
    case "get_all_tags":
      return await getAllTags();
    case "get_story_details":
      return await getStoryDetails(args);
    case "create_story":
      return await createStory(args, userId);
    case "update_story":
      return await updateStory(args, userId);
    case "delete_story":
      return await deleteStory(args, userId);
    default:
      return { success: false, error: `Unknown function: ${functionName}` };
  }
}

async function searchStories(args: Record<string, unknown>): Promise<FunctionResult> {
  const filter: Record<string, unknown> = { deletedAt: null };

  if (args.author) {
    filter.author = new RegExp(String(args.author), "i");
  }
  if (args.genre) {
    filter.genres = new RegExp(String(args.genre), "i");
  }
  if (args.tag) {
    filter.tags = new RegExp(String(args.tag), "i");
  }
  if (args.query) {
    const searchRegex = new RegExp(String(args.query), "i");
    filter.$or = [
      { title: searchRegex },
      { synopsis: searchRegex },
      { author: searchRegex },
    ];
  }

  if (args.minWords !== undefined || args.maxWords !== undefined) {
    const wordFilter: Record<string, number> = {};
    if (args.minWords !== undefined) wordFilter.$gte = Number(args.minWords);
    if (args.maxWords !== undefined) wordFilter.$lte = Number(args.maxWords);
    filter.words = wordFilter;
  }

  const limit = Math.min(Number(args.limit) || 10, 20);
  
  const stories = await Story.find(filter)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select("title author genres tags synopsis published lastUpdated words")
    .lean();

  if (stories.length === 0) {
    return { success: true, data: [], count: 0, message: "No stories found matching your criteria." };
  }

  return { 
    success: true, 
    data: stories, 
    count: stories.length,
    message: `Found ${stories.length} story(ies)`
  };
}

async function getAllGenres(): Promise<FunctionResult> {
  const stories = await Story.find({ deletedAt: null }).select("genres").lean();
  const genreSet = new Set<string>();
  stories.forEach(story => {
    story.genres?.forEach((genre: string) => genreSet.add(genre));
  });
  const genres = Array.from(genreSet).sort();
  return { 
    success: true, 
    data: genres, 
    count: genres.length,
    message: `There are ${genres.length} unique genres in the database. Would you like me to show you all of them?`
  };
}

async function getAllTags(): Promise<FunctionResult> {
  const stories = await Story.find({ deletedAt: null }).select("tags").lean();
  const tagSet = new Set<string>();
  stories.forEach(story => {
    story.tags?.forEach((tag: string) => tagSet.add(tag));
  });
  const tags = Array.from(tagSet).sort();
  return { 
    success: true, 
    data: tags, 
    count: tags.length,
    message: `There are ${tags.length} unique tags in the database. Would you like me to show you all of them?`
  };
}

async function getStoryDetails(args: Record<string, unknown>): Promise<FunctionResult> {
  const story = await Story.findOne({
    _id: args.storyId,
    deletedAt: null,
  }).lean();

  if (!story) {
    return { success: false, error: "Story not found" };
  }

  return { success: true, data: story };
}

async function createStory(args: Record<string, unknown>, userId?: string): Promise<FunctionResult> {
  if (!userId) {
    return { success: false, error: "Authentication required to create a story" };
  }

  const { User } = await import("../config/db");
  const user = await User.findById(userId).lean();

  if (!user) {
    return { success: false, error: "User not found" };
  }

  const genres = Array.isArray(args.genres) ? args.genres as string[] : [];
  const tags = Array.isArray(args.tags) ? args.tags as string[] : [];

  const story = await Story.create({
    title: args.title,
    author: user.username,
    authorId: user._id,
    published: today(),
    lastUpdated: today(),
    genres,
    tags,
    synopsis: (args.synopsis as string) || "",
    content: "",
    words: 0,
  });

  return { 
    success: true, 
    data: { id: story._id, title: story.title }, 
    message: `Created new story: "${story.title}"` 
  };
}

async function updateStory(args: Record<string, unknown>, userId?: string): Promise<FunctionResult> {
  if (!userId) {
    return { success: false, error: "Authentication required to update stories" };
  }

  const storyId = args.storyId;
  if (!storyId) {
    return { success: false, error: "Story ID is required" };
  }

  const existingStory = await Story.findOne({
    _id: storyId,
    deletedAt: null,
  });

  if (!existingStory) {
    return { success: false, error: "Story not found" };
  }

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

  const story = await Story.findByIdAndUpdate(storyId, updateData, {
    returnDocument: "after",
    runValidators: true,
  }).lean();

  return { 
    success: true, 
    data: { id: story?._id, title: story?.title }, 
    message: `Updated "${story?.title}"` 
  };
}

async function deleteStory(args: Record<string, unknown>, userId?: string): Promise<FunctionResult> {
  if (!userId) {
    return { success: false, error: "Authentication required to delete stories" };
  }

  const storyId = args.storyId;
  if (!storyId) {
    return { success: false, error: "Story ID is required" };
  }

  const existingStory = await Story.findOne({
    _id: storyId,
    deletedAt: null,
  });

  if (!existingStory) {
    return { success: false, error: "Story not found" };
  }

  if (existingStory.authorId.toString() !== userId) {
    return { success: false, error: "You can only delete your own stories" };
  }

  await Story.findByIdAndUpdate(storyId, { deletedAt: new Date() });

  return { 
    success: true, 
    message: `Deleted "${existingStory.title}"` 
  };
}