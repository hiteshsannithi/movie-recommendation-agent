# WhatToWatch — Project Context for Claude Code

## App Name
**WhatToWatch** — a chat-based movie recommendation app

## Live URLs
- **Frontend:** https://movie-recommendation-agent-theta.vercel.app
- **Backend:** https://movie-recommendation-agent-s58r.onrender.com
- **GitHub:** https://github.com/hiteshsannithi/movie-recommendation-agent

## Stack
- **Frontend:** React + Vite → deployed on Vercel
- **Backend:** Node.js + Express → deployed on Render
- **LLM:** `claude-haiku-4-5-20251001` ← always use this model, never change it
- **Movie data:** TMDB REST API (Bearer token, stored as `TMDB_API_KEY`)
- **Watchlist:** SQLite via custom MCP server subprocess (better-sqlite3)
- **Auth:** Anonymous UUID via `crypto.randomUUID()`, stored in localStorage as `reel_user_id`

## To run locally
```bash
# Backend (port 3001)
cd reel-movie-agent/backend
node server.js

# Frontend (port 5173)
cd reel-movie-agent/frontend
npm run dev
```

## Environment variables (create backend/.env)
```
ANTHROPIC_API_KEY=your_anthropic_key
TMDB_API_KEY=eyJ...   # long Bearer token from TMDB, ~200 chars
```

## Key files
```
reel-movie-agent/
├── backend/
│   ├── server.js                        — Express entry; POST /api/chat, GET /api/watchlist, GET /health
│   ├── claude.js                        — Anthropic agent loop; initClaude() merges all 6 tools
│   ├── toolHandler.js                   — initMcpClient(), runTool(); injects userId into watchlist calls
│   ├── tools/tmdb.js                    — searchMovies() + getStreamingInfo()
│   ├── mcp-server/watchlist-server.js   — standalone MCP server, SQLite, 4 watchlist tools
│   ├── prompts/system-prompt.md         — WhatToWatch persona + tool usage rules
│   ├── skills/movie-recommendation/SKILL.md  — mood→genre mapping, streaming priority
│   ├── promptLoader.js                  — reads both markdown files, joins with ---
│   └── render.yaml                      — Render deployment config
└── frontend/
    ├── src/
    │   ├── App.jsx                      — root component, all state, language injection
    │   ├── App.css                      — dark theme styles (gold accent #e8c97a)
    │   ├── api/chat.js                  — sendMessage(), fetchWatchlist(); uses VITE_API_URL
    │   ├── hooks/useUserId.js           — localStorage UUID hook
    │   └── components/
    │       ├── MessageBubble.jsx        — chat bubbles with inline markdown parser
    │       ├── ChatInput.jsx            — textarea + send button
    │       ├── LanguageSelector.jsx     — pill buttons for 9 languages
    │       └── WatchlistPanel.jsx       — sidebar watchlist with remove button
    ├── .env.production                  — VITE_API_URL set to Render backend URL
    └── vite.config.js                   — proxy /api → localhost:3001 (dev only)
```

## API endpoints
- `POST /api/chat` — `{ messages, userId }` → `{ reply }`
- `GET /api/watchlist?userId=xxx` → `{ watchlist: [] }`
- `GET /health` → `{ status: 'ok' }`

## 6 Tools Claude can use
1. `search_movies(query, language, genre, limit)` — TMDB search
2. `get_streaming_info(movieId)` — India streaming providers (region=IN)
3. `add_to_watchlist(movie_id, title, year, rating, language, poster_path)` — MCP → SQLite
4. `get_watchlist()` — MCP → SQLite
5. `remove_from_watchlist(movie_id)` — MCP → SQLite
6. `check_in_watchlist(movie_id)` — MCP → SQLite

## Important implementation notes
- `user_id` is stripped from MCP tool schemas shown to Claude — injected automatically in toolHandler.js
- `dotenv.config({ override: true })` in server.js — needed because ANTHROPIC_API_KEY was empty string in shell
- Anthropic client is a lazy getter — initialized inside a function so dotenv runs first
- Indian languages (hi, te, ta, ml, kn) use relaxed TMDB thresholds: vote_count ≥ 10, rating ≥ 5.5
- Search strategy for non-English: runs /search/movie + /discover/movie in parallel, merges results
- CORS is open: `cors({ origin: '*' })`
- Render free tier sleeps after 15 min idle — first request after idle takes ~30–60s

## Supported languages
English (en), Hindi (hi), Telugu (te), Tamil (ta), Malayalam (ml), Kannada (kn), Korean (ko), Japanese (ja), Spanish (es)

## Sessions history
- **Session 0:** Project scaffold, git init, pushed to GitHub
- **Session 1:** Backend agent — system prompt, TMDB tools, Claude loop, Express server
- **Session 2:** SQLite watchlist via MCP server, all 6 tools tested end-to-end
- **Session 3:** React frontend built; app renamed to WhatToWatch; Indian language search fixed
- **Session 4:** Deployed — backend on Render, frontend on Vercel

## Deployment notes
- On Render: root directory is `backend` (not `reel-movie-agent/backend` — the GitHub repo root is already inside `reel-movie-agent/`)
- On Vercel: root directory is `reel-movie-agent/frontend`
- After any frontend change: rebuild with `npm run build` in frontend/, then push — Vercel auto-deploys
- After any backend change: push to GitHub — Render auto-deploys
