// toolHandler.js
// Routes tool calls from Claude to the right function.
//
// When Claude decides it needs data, it responds with a "tool_use" block
// containing a tool name and inputs. This function receives that and
// calls the correct implementation.
//
// Watchlist tools are placeholders for now — they'll be wired to
// the SQLite MCP server in Session 2.

import { searchMovies, getStreamingInfo } from './tools/tmdb.js';

// runTool is called by claude.js inside the agent loop.
// toolName  — the tool Claude wants to use, e.g. "search_movies"
// toolInput — the arguments Claude passed, e.g. { query: "action", language: "hi" }
// userId    — anonymous UUID from the frontend, used for watchlist operations
export async function runTool(toolName, toolInput, userId) {
  switch (toolName) {

    case 'search_movies':
      return searchMovies(
        toolInput.query    || '',
        toolInput.language || '',
        toolInput.genre    || '',
        toolInput.limit    || 5
      );

    case 'get_streaming_info':
      return getStreamingInfo(toolInput.movie_id);

    // ── Watchlist placeholders (Session 2 will replace these) ──────────────
    case 'add_to_watchlist':
      // In Session 2: call the MCP watchlist server to save to SQLite
      return {
        success: true,
        message: `Got it! "${toolInput.title}" will be saved to your watchlist in the next update.`,
      };

    case 'get_watchlist':
      // In Session 2: fetch from SQLite via MCP server
      return [];

    case 'remove_from_watchlist':
      // In Session 2: delete from SQLite via MCP server
      return { success: true };

    case 'check_in_watchlist':
      // In Session 2: query SQLite to check
      return { inWatchlist: false };

    default:
      console.error(`Unknown tool called: ${toolName}`);
      return { error: `Unknown tool: ${toolName}` };
  }
}
