/**
 * Watchlist MCP Server
 * Exposes SQLite-backed watchlist operations as MCP tools.
 * Run standalone: node mcp-server/watchlist-server.js
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const DB_PATH = resolve(process.env.WATCHLIST_DB_PATH || './data/watchlist.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS watchlist (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT    NOT NULL,
    movie_id    INTEGER NOT NULL,
    title       TEXT    NOT NULL,
    poster_path TEXT,
    added_at    TEXT    DEFAULT (datetime('now')),
    UNIQUE(user_id, movie_id)
  );
`);

// --- Prepared statements ---
const stmtAdd = db.prepare(`
  INSERT OR IGNORE INTO watchlist (user_id, movie_id, title, poster_path)
  VALUES (@user_id, @movie_id, @title, @poster_path)
`);

const stmtRemove = db.prepare(`
  DELETE FROM watchlist WHERE user_id = @user_id AND movie_id = @movie_id
`);

const stmtGet = db.prepare(`
  SELECT movie_id, title, poster_path, added_at
  FROM watchlist
  WHERE user_id = @user_id
  ORDER BY added_at DESC
`);

// --- MCP Server ---

const server = new Server(
  { name: 'reel-watchlist', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'add_to_watchlist',
      description: "Add a movie to a user's watchlist.",
      inputSchema: {
        type: 'object',
        properties: {
          user_id:     { type: 'string',  description: 'Anonymous user UUID' },
          movie_id:    { type: 'integer', description: 'TMDB movie ID' },
          title:       { type: 'string',  description: 'Movie title' },
          poster_path: { type: 'string',  description: 'TMDB poster path (optional)' },
        },
        required: ['user_id', 'movie_id', 'title'],
      },
    },
    {
      name: 'remove_from_watchlist',
      description: "Remove a movie from a user's watchlist.",
      inputSchema: {
        type: 'object',
        properties: {
          user_id:  { type: 'string',  description: 'Anonymous user UUID' },
          movie_id: { type: 'integer', description: 'TMDB movie ID' },
        },
        required: ['user_id', 'movie_id'],
      },
    },
    {
      name: 'get_watchlist',
      description: "Get all movies in a user's watchlist.",
      inputSchema: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'Anonymous user UUID' },
        },
        required: ['user_id'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'add_to_watchlist': {
        stmtAdd.run({
          user_id: args.user_id,
          movie_id: args.movie_id,
          title: args.title,
          poster_path: args.poster_path || null,
        });
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, movie_id: args.movie_id }) }] };
      }

      case 'remove_from_watchlist': {
        const info = stmtRemove.run({ user_id: args.user_id, movie_id: args.movie_id });
        return { content: [{ type: 'text', text: JSON.stringify({ success: info.changes > 0, movie_id: args.movie_id }) }] };
      }

      case 'get_watchlist': {
        const movies = stmtGet.all({ user_id: args.user_id });
        return { content: [{ type: 'text', text: JSON.stringify({ watchlist: movies }) }] };
      }

      default:
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }], isError: true };
    }
  } catch (err) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Reel watchlist MCP server running');
