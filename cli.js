#!/usr/bin/env node
/**
 * AG-Code Token CLI
 * 
 * Provides a terminal interface mirroring Tokscale's Rust TUI features.
 * Usage: 
 *   ag-token
 *   ag-token submit
 */

import { getAggregateSummary } from './parser.js';
import { getActiveProviders } from './providers/index.js';
import { loadPricing } from './models.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

// Basic ANSI colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

function formatNumber(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
  return num.toString();
}

/** Rank calculation based on Kardashev scale analogy */
function getTokscaleRank(totalTokens) {
  if (totalTokens > 10_000_000) return { rank: 'Type III (Galactic Architect)', msg: 'You command the energy of an entire galaxy of code.' };
  if (totalTokens > 1_000_000) return { rank: 'Type II (Stellar Developer)', msg: 'You harness the entire output of your star.' };
  if (totalTokens > 100_000) return { rank: 'Type I (Planetary Coder)', msg: 'You use all energy available on your planet.' };
  return { rank: 'Type 0 (Local Scripter)', msg: 'Beginning your journey up the scale.' };
}

async function renderTUI() {
  console.log(`\n${colors.bold}${colors.cyan}🛰️  AG-Code Token (Tokscale Parity) - Universal CLI${colors.reset}\n`);
  process.stdout.write(`${colors.gray}Loading data from 23 IDEs and CLI agents...${colors.reset}\r`);
  
  await loadPricing();
  const active = await getActiveProviders();
  const summary = await getAggregateSummary('all', 'all');
  
  const totalTokens = summary.totalInputTokens + summary.totalOutputTokens + summary.totalCacheReadTokens;
  const { rank, msg } = getTokscaleRank(totalTokens);

  console.log(' '.repeat(50) + '\r'); // clear loading line

  console.log(`${colors.bold}YOUR TOKSCALE RANK:${colors.reset} ${colors.magenta}${rank}${colors.reset}`);
  console.log(`${colors.gray}${msg}${colors.reset}\n`);

  console.log(`${colors.bold}📊 LIFETIME USAGE${colors.reset}`);
  console.log(`  Total Tokens:   ${colors.yellow}${summary.totalInputTokens + summary.totalOutputTokens}${colors.reset}`);
  console.log(`  Input Tokens:   ${colors.cyan}${summary.totalInputTokens}${colors.reset}`);
  console.log(`  Output Tokens:  ${colors.green}${summary.totalOutputTokens}${colors.reset}`);
  if (summary.totalCacheReadTokens > 0) {
    console.log(`  Cached Tokens:  ${colors.gray}${summary.totalCacheReadTokens} (Saved!)${colors.reset}`);
  }
  console.log(`  Total Cost:     ${colors.green}$${summary.totalCostUSD.toFixed(4)}${colors.reset}`);

  console.log(`\n${colors.bold}🔌 ACTIVE PROVIDERS DETECTED${colors.reset}`);
  for (const p of active) {
    console.log(`  - ${p.displayName} (${p.sessionCount} sessions)`);
  }

  console.log(`\n${colors.bold}🧠 TOP MODELS USED${colors.reset}`);
  const topModels = summary.models.sort((a,b) => (b.inputTokens + b.outputTokens) - (a.inputTokens + a.outputTokens)).slice(0, 5);
  for (const m of topModels) {
    const mTokens = m.inputTokens + m.outputTokens;
    console.log(`  - ${m.name}: ${formatNumber(mTokens)} tokens ($${m.costUSD.toFixed(3)})`);
  }

  console.log(`\n${colors.gray}Run \`ag-token submit\` to generate your public profile payload.${colors.reset}\n`);
}

async function submitProfile() {
  console.log(`\n${colors.bold}${colors.cyan}🏅 Generating Tokscale Leaderboard Profile...${colors.reset}\n`);
  await loadPricing();
  const summary = await getAggregateSummary('all', 'all');
  const active = await getActiveProviders();
  
  const totalTokens = summary.totalInputTokens + summary.totalOutputTokens + summary.totalCacheReadTokens;
  const { rank } = getTokscaleRank(totalTokens);

  const payload = {
    username: process.env.USER || process.env.USERNAME || 'anonymous',
    tokscale_rank: rank,
    total_tokens: totalTokens,
    total_cost_usd: summary.totalCostUSD,
    top_models: summary.models.slice(0, 5).map(m => m.name),
    providers: active.map(p => p.displayName),
    generated_at: new Date().toISOString()
  };

  const outPath = join(process.cwd(), 'ag-profile.json');
  await writeFile(outPath, JSON.stringify(payload, null, 2));

  console.log(`${colors.green}✓ Profile generated successfully at:${colors.reset} ${outPath}`);
  console.log(`\n${colors.gray}(This replicates the \`bunx tokscale submit\` payload for Global Leaderboards.)${colors.reset}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  try {
    if (args[0] === 'submit') {
      await submitProfile();
    } else {
      await renderTUI();
    }
  } catch (err) {
    console.error(`${colors.bold}\x1b[31mError:${colors.reset} ${err.message}`);
    process.exit(1);
  }
}

main();
