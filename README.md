<h1 align="center">AO3 Dupe</h1>

  <p align="center">
    A hybrid of manga and light novel websites, Wattpad, and Archive of Our Own for oneshot stories
  </p>

---
## 📖 Overview   

- **Authors**: Nina Claudia Del Rosario, Hansen Maeve Quindao     
- **Tech Stack**: MERN (MongoDB Atlas, Express, React, Node.js)      
- **Architecture**: MVC (Model-View-Controller)

---
## 💻 Preparing the Environment

1. Git clone this repository
2. Install dependencies
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```
3. Install React Typescript 
   ```bash
   npm install -g typescript ts-node nodemon
   tsc --version     # for verification
   ```

--- 
## ➡️ How to Run

1. Run terminal from backend using `cd server`
2. `npm run dev` (makes server run at localhost:5000)
3. Run split terminal from frontend using `cd client`
4. `npm run dev` (makes client side run at localhost:5173)
5. Open and run http://localhost:5173/

---
## API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Public Routes
### Stories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stories` | List all active stories |
| GET | `/stories/:id` | Get a single story |
| POST | `/stories` | Create a new story |
| PUT | `/stories/:id` | Update a story |
| DELETE | `/stories/:id` | Soft-delete a story |

### Library

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/library` | List all saved stories |
| POST | `/library` | Add a story to library |
| DELETE | `/library/:id` | Remove a story from library |

### Admin Routes

All admin routes require the header:
```
X-Admin-Key: <ADMIN_SECRET_KEY>
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/stories` | List all stories including deleted |
| GET | `/admin/stories/deleted` | List only deleted stories |
| PUT | `/admin/stories/:id/restore` | Restore a soft-deleted story |
| DELETE | `/admin/stories/:id` | Permanently delete a story |

### AI Chatbot Routes

All AI routes require authentication (JWT token).

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/chat` | Send a message to the AI chatbot |
| POST | `/ai/confirm-action` | Confirm or cancel a CRUD action |

---

## 🤖 AI Chatbot Features

This application includes an AI-powered chatbot powered by **Google Gemini API** to help users manage and discover stories.

### Setup

1. Get a Google Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Copy `.env.example` to `.env` in the server directory
3. Add your API key to the `.env` file:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

### Features

The chatbot appears as a floating widget on the main page. It has two modes:

#### 1. Inquiry Mode
- Search for stories by title, author, genre, or tags
- Ask natural language queries like "show me adventure stories"
- Get conversational responses with story recommendations
- Maintains conversation context (last 10 messages)
- Supports follow-up questions and pronoun references

#### 2. CRUD Mode (AI CRUD)
In addition to all inquiry features:
- **Create**: Create new blank stories with title, genres, and tags (no content generation)
- **Read**: Query and display any story data
- **Update**: Modify existing story properties (title, synopsis, genres, tags, content)
- **Delete**: Soft-delete stories with confirmation dialog

### Example Queries

**Inquiry Mode:**
- "Show me stories with the adventure genre and fantasy tag"
- "Give me all stories written by [author name]"
- "What horror stories are available?"
- "Find stories with magic tag"
- "Show me recently updated stories"

**CRUD Mode:**
- "Create a story called 'My Adventure' with fantasy and adventure genres"
- "Update my story 'Old Draft' to add horror genre"
- "Delete my story 'First Attempt'"
- "Show me my stories and update the one called 'Test'"

### Security

- API key is stored in environment variables (never exposed in frontend)
- All AI requests go through backend proxy
- User authentication required for chatbot access
- CRUD operations only allowed on user's own stories

