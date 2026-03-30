import Anthropic from '@anthropic-ai/sdk';
import { loadSystemPrompt } from './promptLoader.js';
import { handleToolCall } from './toolHandler.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 4096;

// Tool definitions sent to Claude on every request
const TOOLS = [
  {
    name: 'search_movies',
    description: 'Search for movies by title, genre, year, or keywords using TMDB.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (title, keyword, etc.)' },
        year: { type: 'integer', description: 'Optional release year filter' },
        genre: { type: 'string', description: 'Optional genre filter' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_movie_details',
    description: 'Get detailed information about a specific movie by its TMDB ID.',
    input_schema: {
      type: 'object',
      properties: {
        movie_id: { type: 'integer', description: 'TMDB movie ID' },
      },
      required: ['movie_id'],
    },
  },
  {
    name: 'get_trending_movies',
    description: 'Fetch currently trending movies.',
    input_schema: {
      type: 'object',
      properties: {
        time_window: {
          type: 'string',
          enum: ['day', 'week'],
          description: 'Trending window: "day" or "week"',
        },
      },
      required: ['time_window'],
    },
  },
  {
    name: 'add_to_watchlist',
    description: "Add a movie to the user's watchlist.",
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'Anonymous user UUID' },
        movie_id: { type: 'integer', description: 'TMDB movie ID' },
        title: { type: 'string', description: 'Movie title' },
        poster_path: { type: 'string', description: 'TMDB poster path' },
      },
      required: ['user_id', 'movie_id', 'title'],
    },
  },
  {
    name: 'get_watchlist',
    description: "Retrieve the user's watchlist.",
    input_schema: {
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
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'Anonymous user UUID' },
        movie_id: { type: 'integer', description: 'TMDB movie ID' },
      },
      required: ['user_id', 'movie_id'],
    },
  },
];

export async function chat({ messages, userId, res }) {
  const systemPrompt = await loadSystemPrompt();

  // Agentic loop — keep going until Claude stops calling tools
  const history = [...messages];

  while (true) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools: TOOLS,
      messages: history,
    });

    // Stream text blocks back to the client as SSE
    for (const block of response.content) {
      if (block.type === 'text') {
        res.write(`data: ${JSON.stringify({ type: 'text', text: block.text })}\n\n`);
      }
    }

    if (response.stop_reason === 'end_turn') break;

    if (response.stop_reason === 'tool_use') {
      history.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          res.write(`data: ${JSON.stringify({ type: 'tool_call', name: block.name })}\n\n`);
          const result = await handleToolCall(block.name, block.input, userId);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      history.push({ role: 'user', content: toolResults });
      continue;
    }

    break;
  }
}
