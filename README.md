# Reel 🎬

A movie recommendation chat app powered by Claude AI and TMDB.

## Stack

| Layer     | Tech                                 |
|-----------|--------------------------------------|
| Frontend  | React (Vite) — Vercel                |
| Backend   | Node.js + Express — Render           |
| LLM       | Claude (`claude-haiku-4-5-20251001`) |
| Movie API | TMDB (direct REST)                   |
| Watchlist | SQLite via MCP server                |
| Auth      | Anonymous UUID in localStorage       |

## Project Structure

```
reel-movie-agent/
├── backend/
│   ├── prompts/system-prompt.md     # Claude system prompt
│   ├── skills/movie-recommendation/ # Agent skill definition
│   ├── mcp-server/watchlist-server.js  # MCP SQLite watchlist
│   ├── tools/tmdb.js                # TMDB REST helpers
│   ├── server.js                    # Express entry point
│   ├── claude.js                    # Anthropic SDK + agentic loop
│   ├── toolHandler.js               # Routes tool calls
│   └── promptLoader.js              # Loads system-prompt.md
└── frontend/                        # React app (Session 1+)
```

## Getting Started

### Backend

```bash
cd backend
cp .env.example .env
# Fill in ANTHROPIC_API_KEY and TMDB_API_KEY
npm install
npm run dev
```

### Watchlist MCP Server (separate process)

```bash
cd backend
node mcp-server/watchlist-server.js
```

### Frontend

```bash
cd frontend
# Coming in Session 1
```

## API

### `POST /api/chat`

```json
{
  "messages": [{ "role": "user", "content": "Recommend a thriller" }],
  "userId": "uuid-v4-string"
}
```

Returns a Server-Sent Events stream with `text` and `tool_call` events.

## Environment Variables

See `backend/.env.example` for required keys.
