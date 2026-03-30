// claude.js
// The core of the app — defines the tools and runs the agent loop.
//
// How the agent loop works:
// 1. We send Claude the conversation + tools
// 2. Claude either replies with text (done) or asks to use a tool
// 3. If it asks for a tool, we run the tool and send the result back
// 4. Repeat until Claude gives a final text response
//
// This "while loop" approach is what makes it an AI agent —
// Claude decides how many tool calls it needs, not us.

import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from './promptLoader.js';
import { runTool } from './toolHandler.js';

// Client is created lazily so dotenv.config() in server.js runs first
let _client = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;

// ─── Tool Definitions ─────────────────────────────────────────────────────────
// These describe each tool to Claude — the name, what it does, and what
// inputs it needs. Claude reads these and decides when and how to use them.
const TOOLS = [
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
          description: 'Search query — mood, genre, keyword, or title. E.g. "action thriller", "romantic comedy", "feel good"',
        },
        language: {
          type: 'string',
          description:
            'TMDB language code to filter by original language. ' +
            'Use: hi (Hindi), te (Telugu), ta (Tamil), ml (Malayalam), ' +
            'kn (Kannada), en (English), ko (Korean), ja (Japanese), es (Spanish). ' +
            'Leave empty to search across all languages.',
        },
        genre: {
          type: 'string',
          description: 'Optional genre filter, e.g. "horror", "comedy", "drama"',
        },
        limit: {
          type: 'number',
          description: 'Number of results to return. Default is 5.',
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

  {
    name: 'add_to_watchlist',
    description:
      "Save a movie to the user's watchlist. " +
      'Call this when user asks to save or bookmark a movie. ' +
      'Always call check_in_watchlist first to avoid duplicates.',
    input_schema: {
      type: 'object',
      properties: {
        title:       { type: 'string', description: 'Movie title' },
        year:        { type: 'number', description: 'Release year' },
        rating:      { type: 'number', description: 'TMDB rating out of 10' },
        language:    { type: 'string', description: 'Original language code, e.g. hi, te, en' },
        poster_path: { type: 'string', description: 'TMDB poster_path from search results' },
        movie_id:    { type: 'number', description: 'TMDB movie ID' },
      },
      required: ['title', 'movie_id'],
    },
  },

  {
    name: 'get_watchlist',
    description: "Get all movies saved in the user's watchlist.",
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  {
    name: 'remove_from_watchlist',
    description: "Remove a movie from the user's watchlist.",
    input_schema: {
      type: 'object',
      properties: {
        movie_id: { type: 'number', description: 'TMDB movie ID to remove' },
      },
      required: ['movie_id'],
    },
  },

  {
    name: 'check_in_watchlist',
    description:
      "Check if a specific movie is already saved in the user's watchlist " +
      'before recommending to save it. Avoids duplicates.',
    input_schema: {
      type: 'object',
      properties: {
        movie_id: { type: 'number', description: 'TMDB movie ID to check' },
      },
      required: ['movie_id'],
    },
  },
];

// ─── chat() ───────────────────────────────────────────────────────────────────
// Main function called by server.js
// messages — full conversation history from the frontend
//            format: [{ role: 'user'|'assistant', content: 'string' }]
// userId   — anonymous UUID, passed to watchlist tools
// Returns: Claude's final text reply as a string
export async function chat(messages, userId) {
  const systemPrompt = buildSystemPrompt();

  // We work on a copy so we don't mutate the caller's array
  const history = [...messages];

  // Agent loop — keep going until Claude gives a text response
  while (true) {
    const response = await getClient().messages.create({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      system:     systemPrompt,
      tools:      TOOLS,
      messages:   history,
    });

    // ── Claude is done — return the text ──────────────────────────────────
    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text');
      return textBlock?.text ?? '';
    }

    // ── Claude wants to use a tool ────────────────────────────────────────
    if (response.stop_reason === 'tool_use') {
      // Add Claude's response (which includes the tool_use request) to history
      history.push({ role: 'assistant', content: response.content });

      // Run every tool Claude asked for and collect the results
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

      // Send the tool results back to Claude as a user message
      history.push({ role: 'user', content: toolResults });

      // Loop again so Claude can continue with the tool results
      continue;
    }

    // Unexpected stop reason — break to avoid infinite loop
    console.warn('Unexpected stop_reason:', response.stop_reason);
    break;
  }

  return 'Sorry, something went wrong. Please try again.';
}
