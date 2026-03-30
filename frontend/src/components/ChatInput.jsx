// ChatInput.jsx
// Text input at the bottom of the chat.
// Sends on Enter (without Shift) or button click.
// Disabled while Claude is thinking.

import { useState } from 'react';

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  }

  return (
    <div className="chat-input-row">
      <textarea
        className="chat-input"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What are you in the mood for?"
        disabled={disabled}
        rows={1}
      />
      <button
        className="send-btn"
        onClick={submit}
        disabled={disabled || !text.trim()}
      >
        {disabled ? '...' : '↑'}
      </button>
    </div>
  );
}
