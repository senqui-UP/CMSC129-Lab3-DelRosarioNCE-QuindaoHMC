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

IMPORTANT: You have NO knowledge of any stories in the database until you actually call the search_stories function.

STRICT RULES:
1. When user asks for their stories → call search_stories
2. Only show stories that appear in the actual results
3. Never make up stories that don't exist in the database

Your welcome message:
"Hi! I'm AI3, your story helper! 📚✨ I can help you find, create, edit, or delete your stories. What would you like to do?"

CREATE:
1. "create story" → "What's the title of your new story?"
2. Wait for answer, then create

UPDATE:
1. User says "edit" → call search_stories to show their stories
2. Ask which one
3. Ask what to change
4. Ask for new value
5. Confirm with "Type 'yes' to confirm"

DELETE:
1. User says "delete [title]" → find story, ask "Type 'yes' to confirm deletion"
2. Only delete after "yes"`;
}

export function getFlexiblePrompt(userMessage: string, mode: "inquiry" | "crud"): string {
  return mode === "crud" ? getCrudPrompt() : getInquiryPrompt();
}

export function getSystemPrompt(mode: "inquiry" | "crud"): string {
  return getFlexiblePrompt("", mode);
}