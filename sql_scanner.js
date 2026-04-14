/**
 * Zero-dependency heuristic string/JSON scanner for SQLite files.
 * 
 * Since AG-Code Token strictly prohibits `better-sqlite3` and other compiled native dependencies,
 * we use byte-scanning heuristics to extract usage data from .db files (e.g. OpenCode, Hermes).
 * SQLite databases usually store strings uncompressed in pages, making them extractable.
 */

import { readFile } from 'fs/promises';

/**
 * Scans a binary file (like .db) for JSON-like strings containing usage/token stats.
 * Useful for grabbing JSON objects directly out of the binary pages.
 * 
 * @param {string} filePath - Path to the file.
 * @returns {Promise<any[]>} - Array of parsed JSON objects.
 */
export async function scrapeJSONFromSQLite(filePath) {
  try {
    const buffer = await readFile(filePath);
    const content = buffer.toString('latin1'); // Preserve bytes while giving string methods
    
    // Simplistic heuristic to find JSON objects containing "model" or "tokens"
    // We look for patterns starting with { and ending with } that have common token keys.
    const jsonPattern = /\{[^{}]*?(?:"(?:model|input_tokens|prompt_tokens|tokens|usage)"|'(?:model|input_tokens|prompt_tokens|tokens|usage)')[^{}]*?\}/gi;
    
    const results = [];
    let match;
    while ((match = jsonPattern.exec(content)) !== null) {
      try {
        const text = match[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Strip control chars from DB
        const obj = JSON.parse(text);
        results.push(obj);
      } catch (err) {
        // Not valid JSON or partial match, ignore
      }
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Scrape OpenCode-specific patterns from binary db lines
 * OpenCode might store it as fields instead of pure JSON.
 * @param {string} filePath 
 */
export async function scrapeOpenCodeRecords(filePath) {
  try {
    const buffer = await readFile(filePath);
    const content = buffer.toString('latin1');
    const records = [];

    // Crude fallback: find "gpt-4" or "claude" closely followed by numbers in the DB string
    // OpenCode writes these into specific columns which are stored continuously.
    const modelPattern = /(claude-[a-z0-9.-]+|gpt-[a-z0-9.-]+|gemini-[a-z0-9.-]+)/gi;
    
    let match;
    while ((match = modelPattern.exec(content)) !== null) {
      const model = match[1];
      const index = match.index;
      // Look at nearby 100 bytes for input/output tokens
      const nearby = content.slice(index, index + 150).replace(/[^a-zA-Z0-9_{}.":]+/g, ' ');
      
      const promptMatch = /prompt(?:_tokens)?\s*[:=]?\s*(\d+)/i.exec(nearby);
      const completionMatch = /(?:completion|output)(?:_tokens)?\s*[:=]?\s*(\d+)/i.exec(nearby);
      
      if (promptMatch || completionMatch) {
        records.push({
          model,
          promptTokens: parseInt(promptMatch?.[1] || '0', 10),
          completionTokens: parseInt(completionMatch?.[1] || '0', 10),
        });
      }
    }
    return records;
  } catch {
    return [];
  }
}
