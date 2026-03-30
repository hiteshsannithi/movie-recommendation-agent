import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let cachedPrompt = null;

export async function loadSystemPrompt() {
  if (cachedPrompt) return cachedPrompt;

  const promptPath = join(__dirname, 'prompts', 'system-prompt.md');
  cachedPrompt = await readFile(promptPath, 'utf-8');
  return cachedPrompt;
}

// Call this to reload the prompt (useful during development)
export function clearPromptCache() {
  cachedPrompt = null;
}
