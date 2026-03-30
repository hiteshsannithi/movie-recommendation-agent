// mcp-server/watchlist-server.js
//
// This is a standalone MCP server — it runs as a separate subprocess.
// It wraps SQLite and exposes 4 watchlist tools via the MCP protocol.
//
// WHY A SUBPROCESS?
// MCP servers communicate over stdin/stdout. The backend starts this
// file as a child process and sends JSON messages back and forth.
// This keeps the database logic cleanly separated from the main server.
//
// HOW TO RUN STANDALONE (for testing):
//   node mcp-server/watchlist-server.js

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Database lives at backend/watchlist.db
const DB_PATH = resolve(__dirname, '..', 'watchlist.db');

// Make sure the parent directory exists before opening the db
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// ─── Schema ───────────────────────────────────────────────────────────────────
// Create the table if it doesn't exist yet.
// UNIQUE(user_id, movie_id) prevents the same movie being saved twice
// for the same user — INSERT OR IGNORE will silently skip duplicates.
db.exec(`
  CREATE TABLE IF NOT EXISTS watchlist (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT    NOT NULL,
    movie_id    INTEGER NOT NULL,
    title       TEXT    NOT NULL,
    year        INTEGER,
    rating      REAL,
    language    TEXT,
    poster_path TEXT,
    added_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, movie_id)
  );
`);

// ─── Prepared statements ──────────────────────────────────────────────────────
// Prepared statements are compiled once and run many times — faster and safer
// than building SQL strings manually (prevents SQL injection too).

const stmtAdd = db.prepare(`
  INSERT OR IGNORE INTO watchlist
    (user_id, movie_id, title, year, rating, language, poster_path)
  VALUES
    (@user_id, @movie_id, @title, @year, @rating, @language, @poster_path)
`);

const stmtGet = db.prepare(`
  SELECT movie_id, title, year, rating, language, poster_path, added_at
  FROM   watchlist
  WHERE  user_id = @user_id
  ORDER  BY added_at DESC
`);

const stmtRemove = db.prepare(`
  DELETE FROM watchlist
  WHERE  user_id = @user_id AND movie_id = @movie_id
`);

const stmtCheck = db.prepare(`
  SELECT COUNT(*) as count
  FROM   watchlist
  WHERE  user_id = @user_id AND movie_id = @movie_id
`);

// ─── MCP Server ───────────────────────────────────────────────────────────────
const server = new Server(
  { name: 'reel-watchlist', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// listTools — tells the client what tools this server exposes
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'add_to_watchlist',
      description: "Add a movie to the user's watchlist.",
      inputSchema: {
        type: 'object',
        properties: {
          user_id:     { type: 'string',  description: 'Anonymous user UUID' },
          movie_id:    { type: 'number',  description: 'TMDB movie ID' },
          title:       { type: 'string',  description: 'Movie title' },
          year:        { type: 'number',  description: 'Release year' },
          rating:      { type: 'number',  description: 'TMDB rating out of 10' },
          language:    { type: 'string',  description: 'Original language code e.g. hi, te, en' },
          poster_path: { type: 'string',  description: 'TMDB poster path' },
        },
        required: ['user_id', 'movie_id', 'title'],
      },
    },
    {
      name: 'get_watchlist',
      description: "Get all movies in the user's watchlist.",
      inputSchema: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'Anonymous user UUID' },
        },
        required: ['user_id'],
      },
    },
    {
      name: 'remove_from_watchlist',
      description: "Remove a movie from the user's watchlist.",
      inputSchema: {
        type: 'object',
        properties: {
          user_id:  { type: 'string', description: 'Anonymous user UUID' },
          movie_id: { type: 'number', description: 'TMDB movie ID' },
        },
        required: ['user_id', 'movie_id'],
      },
    },
    {
      name: 'check_in_watchlist',
      description: "Check if a movie is already saved in the user's watchlist.",
      inputSchema: {
        type: 'object',
        properties: {
          user_id:  { type: 'string', description: 'Anonymous user UUID' },
          movie_id: { type: 'number', description: 'TMDB movie ID' },
        },
        required: ['user_id', 'movie_id'],
      },
    },
  ],
}));

// callTool — actually executes the tool when the backend asks
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {

      case 'add_to_watchlist': {
        stmtAdd.run({
          user_id:     args.user_id,
          movie_id:    args.movie_id,
          title:       args.title,
          year:        args.year        ?? null,
          rating:      args.rating      ?? null,
          language:    args.language    ?? null,
          poster_path: args.poster_path ?? null,
        });
        return respond({ success: true, message: `"${args.title}" saved to watchlist` });
      }

      case 'get_watchlist': {
        const rows = stmtGet.all({ user_id: args.user_id });
        return respond({ watchlist: rows });
      }

      case 'remove_from_watchlist': {
        const info = stmtRemove.run({ user_id: args.user_id, movie_id: args.movie_id });
        const removed = info.changes > 0;
        return respond({ success: removed, message: removed ? 'Removed from watchlist' : 'Movie not found in watchlist' });
      }

      case 'check_in_watchlist': {
        const row = stmtCheck.get({ user_id: args.user_id, movie_id: args.movie_id });
        return respond({ inWatchlist: row.count > 0 });
      }

      default:
        return respond({ error: `Unknown tool: ${name}` }, true);
    }
  } catch (err) {
    console.error(`[watchlist-server] ${name} error:`, err.message);
    return respond({ error: err.message }, true);
  }
});

// MCP tools must return { content: [{ type: 'text', text: string }] }
function respond(data, isError = false) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data) }],
    isError,
  };
}

// ─── Start ────────────────────────────────────────────────────────────────────
// StdioServerTransport means: communicate via stdin/stdout.
// The parent process (toolHandler.js) pipes messages to us this way.
const transport = new StdioServerTransport();
await server.connect(transport);

// Use stderr for logs — stdout is reserved for MCP protocol messages
console.error(`[watchlist-server] Running — DB: ${DB_PATH}`);
