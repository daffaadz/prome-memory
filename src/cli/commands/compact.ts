import chalk from 'chalk';
import { executeCompaction, CompactionExecutionResult } from '../../core/memory/compaction.js';

export interface CompactOptions {
  force?: boolean;
  json?: boolean;
  cwd?: string;
}

export async function runCompact(options: CompactOptions = {}): Promise<CompactionExecutionResult> {
  const projectRoot = options.cwd || process.cwd();

  const result = await executeCompaction(projectRoot, {
    force: options.force,
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (result.compacted) {
      console.log(chalk.green(`✔ ${result.message}`));
      console.log(chalk.dim(`  State size: ${result.previousByteSize} B -> ${result.newByteSize} B`));
      console.log(chalk.dim(`  Decisions compacted: ${result.decisionsCompacted}`));
    } else {
      console.log(chalk.yellow(`ℹ ${result.message}`));
      console.log(chalk.dim('  Use --force to run compaction unconditionally.'));
    }
  }

  return result;
}
