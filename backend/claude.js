// claude.js
//
// Defines the TMDB tools, initialises the MCP connection,
// merges all tools, and runs the agent loop.

import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from './promptLoader.js';
import { initMcpClient, getMcpTools, runTool } from './toolHandler.js';

// Lazy Anthropic client — created after dotenv.config() runs in server.js
let _client = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const MODEL      = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;

// ─── TMDB tool definitions ────────────────────────────────────────────────────
// These are the two tools we call directly (not via MCP).
const TMDB_TOOLS = [
  {
    name: 'search_movies',
    description:
      'Search for movies or series by mood, genre, and language. ' +
      'ALWAYS call this before recommending any movie. ' +
      'Never recommend without searching first.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query — mood, genre, keyword or title. E.g. "action thriller", "feel good comedy"',
        },
        language: {
          type: 'string',
          description:
            'Filter by original language. Use TMDB codes: ' +
            'hi (Hindi), te (Telugu), ta (Tamil), ml (Malayalam), ' +
            'kn (Kannada), en (English), ko (Korean), ja (Japanese), es (Spanish).',
        },
        genre: {
          type: 'string',
          description: 'Optional genre filter, e.g. "horror", "comedy"',
        },
        limit: {
          type: 'number',
          description: 'How many results to return. Default 5.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_streaming_info',
    description:
      'Get streaming availability for a movie in India. ' +
      'Call this after search_movies to tell the user where to watch.',
    input_schema: {
      type: 'object',
      properties: {
        movie_id: {
          type: 'number',
          description: 'TMDB movie ID from search_movies results',
        },
      },
      required: ['movie_id'],
    },
  },
];

// ─── MCP tool conversion ──────────────────────────────────────────────────────
// MCP tools use `inputSchema` (camelCase) but the Claude API expects
// `input_schema` (snake_case). This converts them.
//
// We also strip `user_id` from the schema — it is injected automatically by
// toolHandler.js from the request's userId, so Claude never needs to ask for it.
function mcpToolToClaudeTool(mcpTool) {
  const schema = mcpTool.inputSchema;
  const { user_id: _dropped, ...properties } = schema.properties ?? {};
  const required = (schema.required ?? []).filter(f => f !== 'user_id');

  return {
    name:         mcpTool.name,
    description:  mcpTool.description,
    input_schema: { ...schema, properties, required },
  };
}

// ─── Initialise ───────────────────────────────────────────────────────────────
// Called once from server.js before handling any requests.
// Starts the MCP subprocess and fetches its tool list.
let allTools = [...TMDB_TOOLS]; // start with TMDB tools; MCP tools added on init

export async function initClaude() {
  const mcpTools = await initMcpClient();
  allTools = [
    ...TMDB_TOOLS,
    ...mcpTools.map(mcpToolToClaudeTool),
  ];
  console.log(`[claude] ${allTools.length} tools ready:`, allTools.map(t => t.name).join(', '));
}

// ─── chat() ───────────────────────────────────────────────────────────────────
// Called by server.js for every chat request.
// messages — full conversation history from the frontend
// userId   — anonymous UUID (passed through to watchlist tools)
export async function chat(messages, userId) {
  const systemPrompt = buildSystemPrompt();
  const history = [...messages];

  while (true) {
    const response = await getClient().messages.create({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      system:     systemPrompt,
      tools:      allTools,
      messages:   history,
    });

    // ── Claude finished — return the text ────────────────────────────────
    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text');
      return textBlock?.text ?? '';
    }

    // ── Claude wants to use a tool ───────────────────────────────────────
    if (response.stop_reason === 'tool_use') {
      history.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        console.log(`  → Tool: ${block.name}`, JSON.stringify(block.input));

        let result;
        try {
          result = await runTool(block.name, block.input, userId);
        } catch (err) {
          console.error(`Tool ${block.name} threw:`, err.message);
          result = { error: err.message };
        }

        toolResults.push({
          type:        'tool_result',
          tool_use_id: block.id,
          content:     JSON.stringify(result),
        });
      }

      history.push({ role: 'user', content: toolResults });
      continue;
    }

    console.warn('[claude] Unexpected stop_reason:', response.stop_reason);
    break;
  }

  return 'Sorry, something went wrong. Please try again.';
}
