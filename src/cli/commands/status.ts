import fs from 'node:fs';
import chalk from 'chalk';
import { readCoreFile } from '../../core/memory/core-file.js';
import { readStateFile, getStateFilePath } from '../../core/memory/state-file.js';
import { readAllDecisions } from '../../core/memory/decisions-log.js';
import { isCompactionNeeded } from '../../core/memory/compaction.js';
import { readConfigFile } from '../../core/memory/config-file.js';

export interface StatusOptions {
  json?: boolean;
  cwd?: string;
}

export interface StatusResult {
  initialized: boolean;
  project: string;
  coreStatus: 'uninitialized' | 'initialized';
  coreVersion: number;
  stateByteSize: number;
  sessionCount: number;
  lastUpdated: string;
  totalDecisions: number;
  compactedDecisions: number;
  uncompactedDecisions: number;
  compactionNeeded: boolean;
  compactionReason?: string;
  adapters: string[];
}

export async function runStatus(options: StatusOptions = {}): Promise<StatusResult> {
  const projectRoot = options.cwd || process.cwd();

  const core = readCoreFile(projectRoot);
  const state = readStateFile(projectRoot);
  const statePath = getStateFilePath(projectRoot);
  const stateByteSize = fs.existsSync(statePath) ? fs.statSync(statePath).size : 0;
  const decisions = readAllDecisions(projectRoot);

  const compactedCount = decisions.filter((d) => d.compacted).length;
  const uncompactedCount = decisions.filter((d) => !d.compacted).length;

  const compactionCheck = isCompactionNeeded(projectRoot);

  let adapters: string[] = [];
  try {
    const config = readConfigFile(projectRoot);
    adapters = config.agent_adapters;
  } catch {
    // Ignore if not present
  }

  const result: StatusResult = {
    initialized: core.frontmatter.status === 'initialized',
    project: core.frontmatter.project,
    coreStatus: core.frontmatter.status,
    coreVersion: core.frontmatter.version,
    stateByteSize,
    sessionCount: state.frontmatter.session_count,
    lastUpdated: state.frontmatter.last_updated,
    totalDecisions: decisions.length,
    compactedDecisions: compactedCount,
    uncompactedDecisions: uncompactedCount,
    compactionNeeded: compactionCheck.needed,
    compactionReason: compactionCheck.reason,
    adapters,
  };

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(chalk.bold.cyan(`\n=== Prome Memory Status: ${core.frontmatter.project} ===\n`));

    const statusBadge =
      core.frontmatter.status === 'initialized'
        ? chalk.green.bold('initialized')
        : chalk.yellow.bold('uninitialized');

    console.log(`  Core Status:           ${statusBadge} (v${core.frontmatter.version})`);
    console.log(`  State File Size:       ${stateByteSize} bytes`);
    console.log(`  Active Session Count:  ${state.frontmatter.session_count}`);
    console.log(`  Last Updated:          ${state.frontmatter.last_updated}`);
    console.log(`  Total Decisions:       ${decisions.length} (${compactedCount} compacted, ${uncompactedCount} pending)`);
    console.log(
      `  Compaction Needed:     ${
        compactionCheck.needed ? chalk.yellow('Yes') + ` (${compactionCheck.reason})` : chalk.green('No')
      }`
    );
    console.log(`  Active Adapters:       ${adapters.length > 0 ? adapters.join(', ') : 'none'}\n`);
  }

  return result;
}
