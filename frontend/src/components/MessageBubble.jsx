// MessageBubble.jsx
// Renders a single chat message.
// User messages sit on the right, assistant messages on the left.
// Supports **bold** and bullet points from Claude's markdown output.

function parseMarkdown(text) {
  // Split into lines and process each one
  const lines = text.split('\n');
  const elements = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === '') {
      elements.push(<br key={key++} />);
      continue;
    }

    // Horizontal rule
    if (line.trim() === '---') {
      elements.push(<hr key={key++} className="bubble-divider" />);
      continue;
    }

    // Bullet point
    const bulletMatch = line.match(/^[-*]\s+(.*)/);
    if (bulletMatch) {
      elements.push(
        <div key={key++} className="bubble-bullet">
          <span className="bullet-dot">•</span>
          <span>{inlineMarkdown(bulletMatch[1])}</span>
        </div>
      );
      continue;
    }

    elements.push(<div key={key++}>{inlineMarkdown(line)}</div>);
  }

  return elements;
}

// Handles **bold** and *italic* within a line
function inlineMarkdown(text) {
  const parts = [];
  // Split on **bold** patterns
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(<span key={i++}>{text.slice(last, match.index)}</span>);
    }
    parts.push(<strong key={i++}>{match[1]}</strong>);
    last = regex.lastIndex;
  }

  if (last < text.length) {
    parts.push(<span key={i++}>{text.slice(last)}</span>);
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`bubble-row ${isUser ? 'bubble-row--user' : 'bubble-row--assistant'}`}>
      {!isUser && (
        <div className="bubble-avatar bubble-avatar--assistant">🎬</div>
      )}

      <div className={`bubble ${isUser ? 'bubble--user' : 'bubble--assistant'}`}>
        {parseMarkdown(message.content)}
      </div>

      {isUser && (
        <div className="bubble-avatar bubble-avatar--user">👤</div>
      )}
    </div>
  );
}
