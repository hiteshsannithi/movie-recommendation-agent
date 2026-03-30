// useUserId.js
// Generates a stable anonymous user ID for this browser session.
// Stored in localStorage so it survives page refreshes.
// This is how we tie a user's watchlist to them without requiring login.

import { useState } from 'react';

const STORAGE_KEY = 'reel_user_id';

export function useUserId() {
  const [userId] = useState(() => {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  });

  return userId;
}
