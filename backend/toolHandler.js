// toolHandler.js
//
// Routes tool calls from Claude to the right implementation:
//   - TMDB tools (search_movies, get_streaming_info) → called directly
//   - Watchlist tools → forwarded to the MCP server subprocess
//
// HOW THE MCP CONNECTION WORKS:
// When this module loads, it spawns watchlist-server.js as a child process.
// The MCP client talks to it over stdin/stdout (like a pipe).
// From then on, watchlist calls go: claude.js → toolHandler → MCP client
//   → watchlist-server.js → SQLite → response back up the chain.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { searchMovies, getStreamingInfo } from './tools/tmdb.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── MCP Client setup ─────────────────────────────────────────────────────────

let mcpClient = null;
let mcpTools  = [];   // tool definitions fetched from MCP server

export async function initMcpClient() {
  // StdioClientTransport spawns the server as a child process
  // and wires up stdin/stdout automatically
  const transport = new StdioClientTransport({
    command: 'node',
    args: [resolve(__dirname, 'mcp-server', 'watchlist-server.js')],
  });

  mcpClient = new Client(
    { name: 'reel-backend', version: '1.0.0' },
    { capabilities: {} }
  );

  await mcpClient.connect(transport);

  // Fetch the tool list once at startup — we'll merge these with
  // the TMDB tools in claude.js so Claude sees all 6 tools
  const { tools } = await mcpClient.listTools();
  mcpTools = tools;

  console.log(`[toolHandler] MCP connected — ${mcpTools.length} watchlist tools loaded`);
  return mcpTools;
}

// Returns the raw MCP tool definitions (used by claude.js to build allTools)
export function getMcpTools() {
  return mcpTools;
}

// ─── runTool ──────────────────────────────────────────────────────────────────
// Called by claude.js inside the agent loop.
// toolName  — which tool Claude wants to use
// toolInput — the arguments Claude passed
// userId    — anonymous UUID from the frontend request

export async function runTool(toolName, toolInput, userId) {
  switch (toolName) {

    // ── TMDB tools — called directly ─────────────────────────────────────
    case 'search_movies':
      return searchMovies(
        toolInput.query    || '',
        toolInput.language || '',
        toolInput.genre    || '',
        toolInput.limit    || 5
      );

    case 'get_streaming_info':
      return getStreamingInfo(toolInput.movie_id);

    // ── Watchlist tools — forwarded to MCP server ─────────────────────────
    case 'add_to_watchlist':
      return callMcp('add_to_watchlist', { ...toolInput, user_id: userId });

    case 'get_watchlist':
      return callMcp('get_watchlist', { user_id: userId });

    case 'remove_from_watchlist':
      return callMcp('remove_from_watchlist', { ...toolInput, user_id: userId });

    case 'check_in_watchlist':
      return callMcp('check_in_watchlist', { ...toolInput, user_id: userId });

    default:
      console.error(`[toolHandler] Unknown tool: ${toolName}`);
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ─── MCP call helper ──────────────────────────────────────────────────────────
// Sends a tool call to the MCP server and parses the response.
// MCP always returns { content: [{ type: 'text', text: '...' }] }
// so we JSON.parse the text to get the actual result back.
async function callMcp(toolName, args) {
  if (!mcpClient) {
    return { error: 'MCP client not initialised — call initMcpClient() first' };
  }

  const result = await mcpClient.callTool({ name: toolName, arguments: args });

  // MCP returns content as an array of blocks — grab the first text block
  const textBlock = result.content?.find(b => b.type === 'text');
  if (!textBlock) return { error: 'Empty response from MCP server' };

  try {
    return JSON.parse(textBlock.text);
  } catch {
    return { raw: textBlock.text };
  }
}
