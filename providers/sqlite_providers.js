/**
 * SQLite Providers
 * 
 * Uses zero-dependency string heuristics to extract JSON logs from SQLite DB files.
 * Covers: OpenCode, Hermes, Synthetic/Octofriend.
 */

import { stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { calculateCost } from '../models.js';
import { scrapeJSONFromSQLite, scrapeOpenCodeRecords } from '../sql_scanner.js';

function createSqliteProvider(id, name, dbPathsResolver, scraperType = 'json') {
  return {
    name: id,
    displayName: name,

    modelDisplayName(model) { return model; },
    toolDisplayName(rawTool) { return rawTool; },

    async discoverSessions() {
      const sources = [];
      const dbPaths = dbPathsResolver();
      for (const p of dbPaths) {
        try {
          const s = await stat(p);
          if (s.isFile()) {
            sources.push({ path: p, project: 'global', provider: id, scraperType });
          }
        } catch {}
      }
      return sources;
    },

    createSessionParser(source, seenKeys) {
      return {
        async *parse() {
          const timestamp = new Date().toISOString();
          
          if (source.scraperType === 'opencode') {
             const records = await scrapeOpenCodeRecords(source.path);
             for (const r of records) {
                if (r.promptTokens === 0 && r.completionTokens === 0) continue;
                // Generate artificial dedup key based on exact match of tokens to prevent double counting 
                // in the heuristic scan as the same page might be scanned twice if fragmented.
                const dedupKey = `${source.provider}:${source.path}:${r.model}:${r.promptTokens}:${r.completionTokens}`;
                if (seenKeys.has(dedupKey)) continue;
                seenKeys.add(dedupKey);

                const costUSD = calculateCost(r.model, r.promptTokens, r.completionTokens);
                yield {
                  provider: source.provider,
                  model: r.model,
                  inputTokens: r.promptTokens,
                  outputTokens: r.completionTokens,
                  cacheCreationInputTokens: 0,
                  cacheReadInputTokens: 0,
                  cachedInputTokens: 0,
                  reasoningTokens: 0,
                  webSearchRequests: 0,
                  costUSD,
                  tools: [],
                  timestamp,
                  speed: 'standard',
                  deduplicationKey: dedupKey,
                  userMessage: '',
                  sessionId: source.path,
                };
             }
          } else {
             const records = await scrapeJSONFromSQLite(source.path);
             for (const entry of records) {
                const model = entry.model || entry.model_id || 'unknown';
                const usage = entry.usage || entry.tokens || entry.token_usage || entry;
                const inputTokens = usage.prompt_tokens || usage.input_tokens || usage.prompt || 0;
                const outputTokens = usage.completion_tokens || usage.output_tokens || usage.completion || 0;
                
                if (inputTokens === 0 && outputTokens === 0) continue;

                const t = entry.timestamp || entry.created_at || timestamp;
                const dedupKey = `${source.provider}:${source.path}:${t}:${inputTokens}:${outputTokens}`;
                if (seenKeys.has(dedupKey)) continue;
                seenKeys.add(dedupKey);

                const costUSD = entry.cost || calculateCost(model, inputTokens, outputTokens);
                yield {
                  provider: source.provider,
                  model: model,
                  inputTokens,
                  outputTokens,
                  cacheCreationInputTokens: usage.cache_creation_input_tokens || 0,
                  cacheReadInputTokens: usage.cache_read_input_tokens || 0,
                  cachedInputTokens: 0,
                  reasoningTokens: 0,
                  webSearchRequests: 0,
                  costUSD,
                  tools: entry.tools ? entry.tools.map(t => t.name || t) : [],
                  timestamp: t,
                  speed: 'standard',
                  deduplicationKey: dedupKey,
                  userMessage: entry.prompt || entry.message || '',
                  sessionId: source.path,
                };
             }
          }
        }
      };
    }
  };
}

export const openCode = createSqliteProvider(
  'opencode', 
  'OpenCode', 
  () => [join(homedir(), '.local', 'share', 'opencode', 'opencode.db'), join(homedir(), 'opencode-stable.db')],
  'opencode'
);

export const hermes = createSqliteProvider(
  'hermes',
  'Hermes Agent',
  () => [join(process.env.HERMES_HOME || '', 'state.db'), join(homedir(), '.hermes', 'state.db')]
);

export const synthetic = createSqliteProvider(
  'synthetic',
  'Synthetic / Octofriend',
  () => [join(homedir(), '.local', 'share', 'octofriend', 'sqlite.db')]
);

export const sqliteProviders = [openCode, hermes, synthetic];
