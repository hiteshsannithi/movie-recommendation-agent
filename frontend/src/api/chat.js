// api/chat.js
// Thin wrappers around the backend endpoints.

import axios from 'axios';

// Send a chat message and get Claude's reply.
// messages — full conversation history
// userId   — anonymous UUID from localStorage
export async function sendMessage(messages, userId) {
  const response = await axios.post('/api/chat', { messages, userId });
  return response.data.reply;
}

// Fetch the watchlist directly — no chat round-trip needed.
// Called by WatchlistPanel on load and after saves/removes.
export async function fetchWatchlist(userId) {
  const response = await axios.get('/api/watchlist', { params: { userId } });
  return response.data.watchlist ?? [];
}
