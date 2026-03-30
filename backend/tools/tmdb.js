// tools/tmdb.js
// Talks directly to the TMDB API.
// TMDB docs: https://developer.themoviedb.org/reference/intro/getting-started
//
// We use the long "API Read Access Token" (starts with eyJ) as a Bearer token.
// It goes in the Authorization header, not as a query parameter.

import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'https://api.themoviedb.org/3';
const TOKEN = process.env.TMDB_API_KEY;

// ─── Helper: make any TMDB request ───────────────────────────────────────────
// path  = the endpoint, e.g. '/search/movie'
// params = query string key/value pairs
async function tmdbGet(path, params = {}) {
  if (!TOKEN) {
    throw new Error('TMDB_API_KEY is missing from .env');
  }

  // Build the URL with query parameters
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      url.searchParams.set(key, String(val));
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // Don't crash — return an empty result with the error message
    console.error(`TMDB ${path} failed: ${response.status} ${response.statusText}`);
    return null;
  }

  return response.json();
}

// ─── searchMovies ─────────────────────────────────────────────────────────────
// Searches TMDB for movies matching the query, language, and genre.
// Returns a clean list that Claude can read and present to the user.
//
// query    — e.g. "psychological thriller", "romantic comedy"
// language — TMDB language code, e.g. "hi", "te", "en" (optional)
// genre    — genre name as a string, e.g. "horror" (optional)
// limit    — how many results to return (default 5)

export async function searchMovies(query, language = '', genre = '', limit = 5) {
  try {
    let results = [];

    if (language && language !== 'en') {
      // Strategy for non-English:
      // Use /discover/movie (no text search, but best language filtering)
      // with sort by popularity so we get real movies, not obscure ones
      const discoverParams = {
        include_adult: false,
        page: 1,
        sort_by: 'popularity.desc',
        with_original_language: language,
        'vote_count.gte': 100,
      };

      // Map common mood/genre words to TMDB genre IDs for better results
      const genreMap = {
        action: 28, comedy: 35, drama: 18, horror: 27, romance: 10749,
        thriller: 53, 'sci-fi': 878, animation: 16, family: 10751,
        mystery: 9648, crime: 80, adventure: 12,
      };
      const queryLower = query.toLowerCase();
      for (const [word, id] of Object.entries(genreMap)) {
        if (queryLower.includes(word)) {
          discoverParams.with_genres = id;
          break;
        }
      }

      const discoverData = await tmdbGet('/discover/movie', discoverParams);
      results = discoverData?.results || [];

      // If discover returns nothing, fall back to search + language post-filter
      if (results.length === 0) {
        const searchData = await tmdbGet('/search/movie', { query, include_adult: false, page: 1 });
        results = (searchData?.results || []).filter(m => m.original_language === language);
      }
    } else {
      // English — use text search across multiple pages for better coverage
      const data = await tmdbGet('/search/movie', { query, include_adult: false, page: 1 });
      results = data?.results || [];
    }

    // Filter: must have enough votes and a decent rating
    results = results.filter(m => m.vote_count > 50 && m.vote_average >= 6.0);

    // Sort by rating (best first)
    results.sort((a, b) => b.vote_average - a.vote_average);

    // Take only what we need
    results = results.slice(0, limit);

    // For each result, fetch runtime (not in search results, only in details)
    const detailed = await Promise.all(
      results.map(async (movie) => {
        const details = await tmdbGet(`/movie/${movie.id}`, { language: 'en-US' });
        return {
          movie_id:    movie.id,
          title:       movie.title,
          year:        movie.release_date ? movie.release_date.slice(0, 4) : 'N/A',
          rating:      movie.vote_average ? Number(movie.vote_average.toFixed(1)) : null,
          overview:    movie.overview || 'No description available.',
          poster_path: movie.poster_path || null,
          runtime:     details?.runtime || null,
          language:    movie.original_language,
        };
      })
    );

    return detailed;

  } catch (err) {
    console.error('searchMovies error:', err.message);
    return [];
  }
}

// ─── getStreamingInfo ─────────────────────────────────────────────────────────
// Checks where a movie is available to stream in India (region=IN).
// Returns a list of platform names, or a fallback message if none found.
//
// movieId — TMDB movie ID (number)

export async function getStreamingInfo(movieId) {
  try {
    const data = await tmdbGet(`/movie/${movieId}/watch/providers`);

    if (!data || !data.results || !data.results.IN) {
      // No India data available
      return {
        platforms: [],
        message: 'Streaming info not available — check Netflix, Hotstar or JioCinema',
      };
    }

    const india = data.results.IN;
    const platforms = [];

    // TMDB gives us flatrate (subscription), rent, and buy separately
    // We care most about flatrate (subscription streaming)
    if (india.flatrate) {
      india.flatrate.forEach(p => {
        if (!platforms.includes(p.provider_name)) {
          platforms.push(p.provider_name);
        }
      });
    }
    if (india.rent) {
      india.rent.forEach(p => {
        const label = `${p.provider_name} (rent)`;
        if (!platforms.includes(label)) {
          platforms.push(label);
        }
      });
    }

    if (platforms.length === 0) {
      return {
        platforms: [],
        message: 'Not currently streaming in India — check Netflix, Hotstar or JioCinema',
      };
    }

    return {
      platforms,
      message: platforms.join(', '),
    };

  } catch (err) {
    console.error('getStreamingInfo error:', err.message);
    return {
      platforms: [],
      message: 'Check Netflix, Hotstar or JioCinema',
    };
  }
}
