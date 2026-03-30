// App.jsx
// Root component — wires together the sidebar and chat panel.
//
// State lives here and flows down to children via props.
// Key design decisions:
//   - Full conversation history is kept in `messages` state
//   - Language is appended to each user message before sending to the backend
//     so Claude knows which language to search in without the user repeating it
//   - Watchlist is fetched directly from the backend (not through Claude)
//     and refreshed after every save/remove action

import { useEffect, useRef, useState, useCallback } from 'react';
import { useUserId } from './hooks/useUserId';
import { sendMessage, fetchWatchlist } from './api/chat';
import LanguageSelector from './components/LanguageSelector';
import WatchlistPanel from './components/WatchlistPanel';
import MessageBubble from './components/MessageBubble';
import ChatInput from './components/ChatInput';
import './App.css';

const LANGUAGE_NAMES = {
  en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil',
  ml: 'Malayalam', kn: 'Kannada', ko: 'Korean', ja: 'Japanese', es: 'Spanish',
};

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: "Hi! I'm WhatToWatch, your personal film companion 🎬\nWhat are you in the mood to watch tonight?",
};

export default function App() {
  const userId = useUserId();

  const [messages, setMessages]           = useState([INITIAL_MESSAGE]);
  const [loading, setLoading]             = useState(false);
  const [selectedLanguage, setLanguage]   = useState('en');
  const [watchlist, setWatchlist]         = useState([]);
  const [watchlistLoading, setWlLoading]  = useState(true);

  const bottomRef = useRef(null);

  // ── Load watchlist on mount ───────────────────────────────────────────────
  const refreshWatchlist = useCallback(async () => {
    setWlLoading(true);
    try {
      const list = await fetchWatchlist(userId);
      setWatchlist(list);
    } catch (err) {
      console.error('Failed to load watchlist:', err);
    } finally {
      setWlLoading(false);
    }
  }, [userId]);

  useEffect(() => { refreshWatchlist(); }, [refreshWatchlist]);

  // ── Auto-scroll to bottom on new messages ────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Send a message ────────────────────────────────────────────────────────
  async function handleSend(text) {
    // Append language hint to whatever the user typed
    const langName = LANGUAGE_NAMES[selectedLanguage] ?? selectedLanguage;
    const textWithLang = selectedLanguage === 'en'
      ? text
      : `${text} (Please recommend movies in ${langName} language or ${selectedLanguage} original language)`;

    const userMsg  = { role: 'user', content: text };          // shown in UI
    const apiMsg   = { role: 'user', content: textWithLang };  // sent to API

    // Build the history that goes to the API
    const historyForApi = [...messages, apiMsg];

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const reply = await sendMessage(historyForApi, userId);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      // Refresh watchlist in case Claude saved or removed something
      refreshWatchlist();
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ── Remove a movie from watchlist via chat ────────────────────────────────
  async function handleRemove(movieId, title) {
    setLoading(true);
    try {
      const removeMsg = `Remove "${title}" from my watchlist (movie_id: ${movieId})`;
      const reply = await sendMessage(
        [...messages, { role: 'user', content: removeMsg }],
        userId
      );
      setMessages(prev => [
        ...prev,
        { role: 'user',      content: `Remove "${title}" from my watchlist` },
        { role: 'assistant', content: reply },
      ]);
      refreshWatchlist();
    } catch (err) {
      console.error('Remove error:', err);
    } finally {
      setLoading(false);
    }
  }

  // ── Typing indicator ─────────────────────────────────────────────────────
  const typingIndicator = loading ? (
    <div className="bubble-row bubble-row--assistant">
      <div className="bubble-avatar bubble-avatar--assistant">🎬</div>
      <div className="bubble bubble--assistant bubble--typing">
        <span className="dot" /><span className="dot" /><span className="dot" />
      </div>
    </div>
  ) : null;

  return (
    <div className="app">
      {/* ── Left sidebar ─────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-brand">🎬 WhatToWatch</div>
        <LanguageSelector selected={selectedLanguage} onChange={setLanguage} />
        <WatchlistPanel
          watchlist={watchlist}
          loading={watchlistLoading}
          onRemove={handleRemove}
        />
      </aside>

      {/* ── Main chat area ───────────────────────────────────── */}
      <main className="chat-area">
        <div className="message-list">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {typingIndicator}
          <div ref={bottomRef} />
        </div>

        <ChatInput onSend={handleSend} disabled={loading} />
      </main>
    </div>
  );
}
