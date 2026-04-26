export const tools = [
  {
    type: "function" as const,
    function: {
      name: "search_stories",
      description: "Search stories by keyword, author, genre, tag, or word count. Use for ALL story searches.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Text search in title/synopsis/author" },
          author: { type: "string", description: "Filter by author name" },
          genre: { type: "string", description: "Filter by genre (Fantasy, Horror, Romance, etc.)" },
          tag: { type: "string", description: "Filter by tag (magic, adventure, etc.)" },
          minWords: { type: "number", description: "Minimum word count" },
          maxWords: { type: "number", description: "Maximum word count" },
          limit: { type: "number", description: "Max results 1-20" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_story_details",
      description: "Get full details of ONE story by ID.",
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
      description: "Create a new blank story. Args: title (required), genres, tags, synopsis. NEVER generate content.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Story title - REQUIRED" },
          genres: { type: "array", items: { type: "string" }, description: "Genres like ['Fantasy']" },
          tags: { type: "array", items: { type: "string" }, description: "Tags like ['magic']" },
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
      description: "Update a story. Args: storyId + any of: title, synopsis, genres, tags, content. User must own it.",
      parameters: {
        type: "object",
        properties: {
          storyId: { type: "string", description: "ID of story to update - REQUIRED" },
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
      description: "Delete a story. Args: storyId. User must own it. MUST confirm first!",
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
  return `FORMATTING - FOLLOW EXACTLY:
1. Use double line breaks between paragraphs
2. Use emojis: 📖=story, 👤=author, 📚=genre, 📝=words, 💬=quote, ✅=success, 🗑️=delete, ✏️=create, 🔍=search
3. Stories format:
📖 **Title**
   👤 Author
   📚 Genre1, Genre2
   📝 X words
   💬 "short synopsis..."

4. Numbered lists:
1. **First Story** by Author
   📚 Genre • 📝 500 words

2. **Second Story** by Author
   📚 Genre • 📝 1000 words

5. SHORT paragraphs (2-3 lines)
6. SEPARATOR lines: ────────────── between sections`;
}

function getContextRules(): string {
  return `CONTEXT HANDLING - CRITICAL:
1. REMEMBER: Track what stories you've shown user
2. Handle pronouns: "it", "that", "this one", "the first" → reference previous story
3. "tell me more" → get_story_details on last story
4. "show me another" → new search with same params
5. "what about [genre]" → new search with [genre]
6. "author of [story]" → get story, show author
7. "words of [story]" → get story, show word count
8. "update [story]" → search user's stories, find match, confirm
9. "delete [story]" → search user's stories, find match, confirm

REFERENCE PREVIOUS RESULTS:
- "that one" = last story shown
- "the first" / "first one" = first story in last list
- "the second" = second story in last list
- "its genre" = genre of last story
- "its author" = author of last story`;
}

function getInquiryPrompt(): string {
  return `You are a friendly story discovery assistant.

${getFormattingRules()}

${getContextRules()}

SEARCH PATTERNS:
- "fantasy stories" → {genre: "Fantasy"}
- "adventure with magic" → {genre: "Adventure", tag: "magic"}
- "under 5000 words" → {maxWords: 5000}
- "5000+ words" → {minWords: 5000}
- "stories by John" → {author: "John"}
- "list all" → {}
- "recently updated" → {}

RESPONSE:
- Friendly intro
- Each story on its own line with format above
- If no results: "I couldn't find stories matching '[query]'. Try different keywords!"
- End with suggestions: "Want more results? Try [different genre] or search for [keyword]."

EDGE CASES:
- Empty search: suggest popular genres
- Very long query: extract key terms
- Unknown genre: "I don't recognize '[X]' as a genre. Try: Fantasy, Horror, Romance, Sci-Fi, Action, Comedy, Drama"
- User asks about non-story: "I'm a story assistant! Ask me about stories, authors, genres, or tags."`;
}

function getCrudPrompt(): string {
  return `You are a story manager with CRUD capabilities.

${getFormattingRules()}

${getContextRules()}

CRUD WORKFLOW - ALWAYS FOLLOW:

CREATE:
1. User: "create story [title]" or "new story"
2. If no title: "What title for your new story?"
3. Ask for optional genres/tags: "Any genres or tags?"
4. create_story with {title, genres?, tags?}
5. Respond: "✅ Created '[title]'! You can now add content."

READ (User's Stories):
1. User: "show my stories" or "my works"
2. search_stories with author filter (system provides user)
3. Format each story, ask "What would you like to do?"

UPDATE - 2 STEP PROCESS:
Step 1: User says "update [story]" or "edit [story]"
→ search_stories to find it
→ If multiple matches: "Which one? [list]"
Step 2: Confirm changes
→ "Update '[title]' to have [changes]? Type 'yes' to confirm."
→ After yes: update_story
→ Show result: "✅ Updated! Here's what changed: [list]"

DELETE - 2 STEP PROCESS - ALWAYS CONFIRM:
Step 1: User says "delete [story]" or "remove [story]"
→ search_stories to find it
Step 2: CONFIRM BEFORE EXECUTING
→ "⚠️ Delete '[title]'? This cannot be undone. Type 'yes' to confirm."
→ Wait for "yes" before delete_story
→ "🗑️ Deleted '[title]'. This cannot be undone."

STRICT RULES:
- "You can only manage your own stories" if user tries another user's story
- NEVER generate content - only blank templates
- ALWAYS confirm before delete/update
- If unclear which story, ask user to choose

EDGE CASES:
- User says "delete" without story name: "Which story do you want to delete?"
- User tries to update without owning: "You can only update your own stories."
- User confirms wrong story: List them first, ask which one
- create_story without title: Ask "What title?"
- User says "yes" to wrong story: Verify which one first`;
}

export function getFlexiblePrompt(userMessage: string, mode: "inquiry" | "crud"): string {
  const systemPrompt = mode === "crud" ? getCrudPrompt() : getInquiryPrompt();
  
  const intentAnalysis = `
  
MESSAGE ANALYSIS:
- Parse user intent from message + conversation history
- If "that"/"it" etc, find last mentioned story
- If update/delete, search for story first before acting

KEY PHRASES:
- "under X words" = maxWords, "over X words" = minWords
- "short story" = maxWords: 5000, "long story" = minWords: 10000
- "that one" / "it" = last story in history
- "first" = index 0, "second" = index 1, etc.`;
  
  return `${systemPrompt}${intentAnalysis}`;
}

export function getSystemPrompt(mode: "inquiry" | "crud"): string {
  return getFlexiblePrompt("", mode);
}