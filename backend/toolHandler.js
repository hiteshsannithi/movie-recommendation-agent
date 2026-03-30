import * as tmdb from './tools/tmdb.js';
import { createRequire } from 'module';

// MCP watchlist client — imported dynamically to handle optional MCP availability
let watchlistClient = null;

async function getWatchlistClient() {
  if (watchlistClient) return watchlistClient;
  // TODO: initialize MCP client connected to watchlist-server.js
  // watchlistClient = await connectMcpServer('./mcp-server/watchlist-server.js');
  return null;
}

export async function handleToolCall(toolName, input, userId) {
  switch (toolName) {
    case 'search_movies':
      return tmdb.searchMovies(input.query, { year: input.year, genre: input.genre });

    case 'get_movie_details':
      return tmdb.getMovieDetails(input.movie_id);

    case 'get_trending_movies':
      return tmdb.getTrendingMovies(input.time_window);

    case 'add_to_watchlist': {
      const client = await getWatchlistClient();
      if (!client) return { error: 'Watchlist MCP server not connected' };
      // TODO: call client.callTool('add_to_watchlist', { ...input, user_id: userId })
      return { error: 'Not implemented' };
    }

    case 'get_watchlist': {
      const client = await getWatchlistClient();
      if (!client) return { error: 'Watchlist MCP server not connected' };
      // TODO: call client.callTool('get_watchlist', { user_id: userId })
      return { error: 'Not implemented' };
    }

    case 'remove_from_watchlist': {
      const client = await getWatchlistClient();
      if (!client) return { error: 'Watchlist MCP server not connected' };
      // TODO: call client.callTool('remove_from_watchlist', { ...input, user_id: userId })
      return { error: 'Not implemented' };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
