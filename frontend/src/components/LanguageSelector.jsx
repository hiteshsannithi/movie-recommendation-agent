// LanguageSelector.jsx
// Pill buttons to pick a language filter.
// The selected language is appended to every chat message in App.jsx
// so Claude knows which language to search in.

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'te', label: 'Telugu' },
  { code: 'ta', label: 'Tamil' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ko', label: 'Korean' },
  { code: 'ja', label: 'Japanese' },
  { code: 'es', label: 'Spanish' },
];

export default function LanguageSelector({ selected, onChange }) {
  return (
    <div className="language-selector">
      <p className="sidebar-label">Language</p>
      <div className="language-pills">
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            className={`lang-pill ${selected === lang.code ? 'active' : ''}`}
            onClick={() => onChange(lang.code)}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
}
