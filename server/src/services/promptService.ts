export const tools = [
  {
    type: "function" as const,
    function: {
      name: "search_stories",
      description: "Search ALL stories in database. This is the ONLY way to find stories - use it every time.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Text search in title, synopsis, or author" },
          author: { type: "string", description: "Filter by author name" },
          genre: { type: "string", description: "Filter by genre" },
          tag: { type: "string", description: "Filter by tag" },
          minWords: { type: "number", description: "Minimum word count" },
          maxWords: { type: "number", description: "Maximum word count" },
          limit: { type: "number", description: "Max results 1-50" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_all_genres",
      description: "Get all unique genres in the database. Use when user asks about genres.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_all_tags",
      description: "Get all unique tags in the database. Use when user asks about tags.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_story_details",
      description: "Get full details of ONE story by its ID.",
      parameters: {
        type: "object",
        properties: {
          storyId: { type: "string", description: "The story ID" },
        },
        required: ["storyId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_story",
      description: "Create a blank story template. ALWAYS ask for title first.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Story title - REQUIRED" },
          genres: { type: "array", items: { type: "string" }, description: "Genres" },
          tags: { type: "array", items: { type: "string" }, description: "Tags" },
          synopsis: { type: "string", description: "Short description" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_story",
      description: "Update a story. Args: storyId + fields to change. User must own it.",
      parameters: {
        type: "object",
        properties: {
          storyId: { type: "string", description: "ID of story - REQUIRED" },
          title: { type: "string", description: "New title" },
          synopsis: { type: "string", description: "New synopsis" },
          genres: { type: "array", items: { type: "string" }, description: "New genres" },
          tags: { type: "array", items: { type: "string" }, description: "New tags" },
          content: { type: "string", description: "Story content" },
        },
        required: ["storyId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_story",
      description: "Delete a story. Args: storyId. User must own it. ALWAYS confirm first!",
      parameters: {
        type: "object",
        properties: {
          storyId: { type: "string", description: "ID of story to delete - REQUIRED" },
        },
        required: ["storyId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "bulk_add_to_library",
      description: "Add multiple stories to user's library by genre, tag, author, or word count.",
      parameters: {
        type: "object",
        properties: {
          genre: { type: "string", description: "Filter by genre" },
          tag: { type: "string", description: "Filter by tag" },
          author: { type: "string", description: "Filter by author name" },
          minWords: { type: "number", description: "Minimum word count" },
          maxWords: { type: "number", description: "Maximum word count" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_my_stories",
      description: "Get user's own stories. Use when user asks for 'my stories', 'my works', 'stories I wrote', etc.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search in title or synopsis" },
          genre: { type: "string", description: "Filter by genre" },
          tag: { type: "string", description: "Filter by tag" },
          minWords: { type: "number", description: "Minimum word count" },
          maxWords: { type: "number", description: "Maximum word count" },
          limit: { type: "number", description: "Max results 1-100" },
        },
      },
    },
  },
];

function getFormattingRules(): string {
  return `FORMATTING:
- Keep responses conversational
- Use light emojis where appropriate`;
}

function getInquiryPrompt(): string {
  return `You are AI3, a friendly story helper.

IMPORTANT: You have NO knowledge of any stories in the database until you actually call the search_stories function. You cannot assume or guess what stories exist.

STRICT RULES:
1. When user asks for stories → ALWAYS call search_stories FIRST
2. ONLY show stories that appear in the search results
3. If search returns empty → say "I couldn't find any stories matching that. Try searching for something else!"
4. If search returns stories → show ONLY those exact stories, nothing invented
5. NEVER say "Here are some stories" unless you've called search_stories and received results
6. If you don't have search results to show → don't claim to have any

EXAMPLE CORRECT RESPONSE:
User: "show me fantasy stories"
AI: *calls search_stories with {genre: "Fantasy"}*
AI: "Here are the fantasy stories I found: [list from actual results]"

EXAMPLE WRONG (NEVER DO THIS):
User: "show me fantasy stories"  
AI: "Here's a fantasy story: 'Dragon's Quest' by John" (MADE UP - didn't search!)

PERSONALITY: Friendly, helpful, whimsical but accurate.

SPECIAL CASES:
- "random story" or "surprise me" → call search_stories with limit:1 and random sort, add "I love that you're being adventurous! 🎲 Here you go!"
- "how many genres" or "number of genres" → call get_all_genres, respond with count and "Would you like me to show you all of them?"
- "what are the genres" or "show genres" → call get_all_genres, list all genres nicely
- "how many tags" or "number of tags" → call get_all_tags, respond with count and "Would you like me to show you all of them?"
- "what are the tags" or "show tags" → call get_all_tags, list all tags nicely`;
}

function getCrudPrompt(): string {
  return `You are AI3, a story manager.

IMPORTANT CRITICAL RULES - NEVER BREAK THESE:
1. The user must NEVER see any ID (_id, ObjectId, story ID) - it's a secret!
2. When you find a story, get its _id internally but NEVER show it to the user
3. NEVER call a function with a made-up ID - only use IDs from search results
4. NEVER respond with anything that looks like an ID (no "69ee...", no "ObjectId(...)", no "story_000...")
5. Use get_my_stories for user's own stories, search_stories for public library

WHEN TO USE FUNCTIONS:
- User asks for "my stories", "my works", "stories I wrote" → get_my_stories
- User wants to edit/delete their own story → get_my_stories first to find it
- User searching public library → search_stories

HOW TO DISPLAY RESULTS:
- Always show the ACTUAL STORY TITLES from results, not just the count
- Use MULTIPLE LINES with line breaks - one story per line
- Format like: "You have X stories:\n• Story Title 1\n• Story Title 2\n• Story Title 3"
- Each story on its own line, NOT condensed in one sentence
- If only 1 story: "You have 1 story:\n• Story Title"
- If empty: "You haven't written any stories yet!"

NEVER SHOW TO USER:
- NO IDs, NO _id, NO ObjectId(...)
- NO function calls like <function=...>
- "The _id for '[title]' is [id]" → NEVER SAY THIS!

RESPONSE FORMATTING:
- Use ONLY the story title in all responses
- Example: "Which story would you like to edit?" (NOT "The _id for... is...")
- Keep messages short and conversational (1-2 sentences max)

Your welcome message:
"Hi! I'm AI3, your story helper! 📚✨ I can help you find, create, edit, or delete your stories. What would you like to do?"

EDIT FLOW - CRITICAL: YOU MUST ACTUALLY CALL THE FUNCTION:
1. User says "edit [title]" → get_my_stories to find it
2. Find the story, copy its exact "_id" (24 char string)
3. Ask "What would you like to change?" (title, synopsis, genres, tags, content)
4. User responds → YOU MUST NOW CALL update_story FUNCTION with storyId from step 2
5. DO NOT say "Done!" until the function returns success: true
6. On success → "Done! Updated the [field] for "[title]"."

DELETE FLOW - CRITICAL: YOU MUST ACTUALLY CALL THE FUNCTION:
1. User says "delete [title]" → get_my_stories to find it
2. Find the story with matching title in results
3. Copy its exact "_id" field (24 char string)
4. Say "Delete "[title]"? Just say 'delete' to confirm."
5. CRITICAL: When user says "delete" → YOU MUST NOW CALL delete_story FUNCTION
6. The function MUST be called with storyId: "the exact _id from step 3"
7. DO NOT say "Gone!" or claim success until the function returns success: true
8. On success → "Gone! "[title]" has been deleted."

CRITICAL RULE: If you claim something is deleted but did not call the delete_story function, you are WRONG.

BULK ADD TO LIBRARY FLOW:
1. User says "add all [genre] stories to library" / "bookmark all [author]'s stories" / "add stories under 5000 words to library"
2. Call bulk_add_to_library directly with the filter (genre/tag/author/minWords/maxWords)
3. On success → "Added [N] stories to your library!"`;
}

export function getFlexiblePrompt(userMessage: string, mode: "inquiry" | "crud"): string {
  return mode === "crud" ? getCrudPrompt() : getInquiryPrompt();
}

export function getSystemPrompt(mode: "inquiry" | "crud"): string {
  return getFlexiblePrompt("", mode);
}