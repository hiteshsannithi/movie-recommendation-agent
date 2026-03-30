// promptLoader.js
// Reads the system prompt and skill file from disk and combines them.
//
// Why two files?
// - system-prompt.md defines WHO Reel is (personality, rules, format)
// - SKILL.md defines HOW to recommend movies (strategy, mood mapping)
// Keeping them separate makes each easier to edit without touching the other.

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// __dirname doesn't exist in ES modules — this recreates it
const __dirname = dirname(fileURLToPath(import.meta.url));

export function buildSystemPrompt() {
  const systemPrompt = readFileSync(
    join(__dirname, 'prompts', 'system-prompt.md'),
    'utf-8'
  );

  const skillPrompt = readFileSync(
    join(__dirname, 'skills', 'movie-recommendation', 'SKILL.md'),
    'utf-8'
  );

  // Combine with a clear separator so Claude treats them as one document
  return `${systemPrompt}\n\n---\n\n${skillPrompt}`;
}
