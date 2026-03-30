/**
 * TMDB API helpers — direct REST calls, no MCP.
 * Docs: https://developer.themoviedb.org/reference/intro/getting-started
 */

const BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

async function tmdbFetch(path, params = {}) {
  if (!API_KEY) throw new Error('TMDB_API_KEY is not set');

  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('api_key', API_KEY);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Search movies by query string.
 * @param {string} query
 * @param {{ year?: number, genre?: string }} options
 */
export async function searchMovies(query, options = {}) {
  const params = {
    query,
    include_adult: false,
    language: 'en-US',
    page: 1,
  };
  if (options.year) params.year = options.year;

  const data = await tmdbFetch('/search/movie', params);

  return {
    results: (data.results || []).slice(0, 10).map(normalizeMovie),
    total_results: data.total_results,
  };
}

/**
 * Get full details for a single movie.
 * @param {number} movieId
 */
export async function getMovieDetails(movieId) {
  const data = await tmdbFetch(`/movie/${movieId}`, {
    language: 'en-US',
    append_to_response: 'credits',
  });
  return normalizeMovieDetails(data);
}

/**
 * Get trending movies.
 * @param {'day'|'week'} timeWindow
 */
export async function getTrendingMovies(timeWindow = 'week') {
  const data = await tmdbFetch(`/trending/movie/${timeWindow}`, { language: 'en-US' });
  return {
    results: (data.results || []).slice(0, 10).map(normalizeMovie),
  };
}

// --- Normalizers ---

function normalizeMovie(m) {
  return {
    id: m.id,
    title: m.title,
    year: m.release_date ? m.release_date.slice(0, 4) : null,
    overview: m.overview,
    rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : null,
    poster_path: m.poster_path,
    genre_ids: m.genre_ids,
  };
}

function normalizeMovieDetails(m) {
  const cast = m.credits?.cast?.slice(0, 5).map(c => c.name) || [];
  const director = m.credits?.crew?.find(c => c.job === 'Director')?.name || null;
  return {
    id: m.id,
    title: m.title,
    year: m.release_date ? m.release_date.slice(0, 4) : null,
    overview: m.overview,
    rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : null,
    runtime: m.runtime,
    genres: m.genres?.map(g => g.name) || [],
    poster_path: m.poster_path,
    director,
    cast,
    tagline: m.tagline,
  };
}
