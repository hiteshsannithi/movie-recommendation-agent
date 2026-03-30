// api/chat.js
// Thin wrappers around the backend endpoints.
//
// BASE_URL is empty in development (the Vite proxy handles /api → localhost:3001).
// In production (Vercel), VITE_API_URL is set to the Render backend URL
// so requests go directly to the right server.

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '';

// Send a chat message and get Claude's reply.
// messages — full conversation history
// userId   — anonymous UUID from localStorage
export async function sendMessage(messages, userId) {
  const response = await axios.post(`${BASE_URL}/api/chat`, { messages, userId });
  return response.data.reply;
}

// Fetch the watchlist directly — no chat round-trip needed.
// Called by WatchlistPanel on load and after saves/removes.
export async function fetchWatchlist(userId) {
  const response = await axios.get(`${BASE_URL}/api/watchlist`, { params: { userId } });
  return response.data.watchlist ?? [];
}
