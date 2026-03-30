// server.js
// The Express backend — receives chat messages from the frontend
// and returns Claude's replies.
//
// There's only one real endpoint: POST /api/chat
// The frontend sends the full conversation history every time
// (the API is stateless — it doesn't remember previous messages on its own).

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { chat } from './claude.js';

// override: true forces dotenv to overwrite any existing shell env vars
// (needed when ANTHROPIC_API_KEY is set to empty string in the shell)
dotenv.config({ override: true });

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
// cors: allows the frontend (on a different port) to call this server
// json: parses the request body as JSON automatically
app.use(cors());
app.use(express.json());

// ── POST /api/chat ────────────────────────────────────────────────────────────
// The frontend sends:
//   messages — full conversation history e.g. [{role:'user', content:'hi'}]
//   userId   — anonymous UUID identifying this user (for watchlist)
//
// We return:
//   { reply: "Claude's response text" }
app.post('/api/chat', async (req, res) => {
  const { messages, userId } = req.body;

  // Validation
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' });
  }
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const reply = await chat(messages, userId);
    return res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ── GET /health ───────────────────────────────────────────────────────────────
// Simple check to confirm the server is running.
// Useful when deploying to Render later.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Reel backend running on port ${PORT}`);
});
