// WatchlistPanel.jsx
// Shows the user's saved movies in the left sidebar.
// Re-fetches whenever the `watchlist` prop changes (parent keeps the list).

const TMDB_IMG = 'https://image.tmdb.org/t/p/w92';

export default function WatchlistPanel({ watchlist, loading, onRemove }) {
  if (loading) {
    return (
      <div className="watchlist-panel">
        <p className="sidebar-label">My Watchlist</p>
        <p className="watchlist-empty">Loading...</p>
      </div>
    );
  }

  return (
    <div className="watchlist-panel">
      <p className="sidebar-label">My Watchlist</p>

      {watchlist.length === 0 ? (
        <p className="watchlist-empty">Your watchlist is empty</p>
      ) : (
        <ul className="watchlist-list">
          {watchlist.map(movie => (
            <li key={movie.movie_id} className="watchlist-item">
              {movie.poster_path ? (
                <img
                  src={`${TMDB_IMG}${movie.poster_path}`}
                  alt={movie.title}
                  className="watchlist-poster"
                />
              ) : (
                <div className="watchlist-poster watchlist-poster--placeholder">🎬</div>
              )}

              <div className="watchlist-info">
                <span className="watchlist-title">{movie.title}</span>
                {movie.year && <span className="watchlist-year">{movie.year}</span>}
              </div>

              <button
                className="watchlist-remove"
                onClick={() => onRemove(movie.movie_id, movie.title)}
                title="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
