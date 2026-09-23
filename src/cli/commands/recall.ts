import chalk from 'chalk';
import { queryDecisions, QueryDecisionsOptions } from '../../core/memory/decisions-log.js';
import { Decision, DecisionType } from '../../core/memory/schemas.js';

export interface RecallOptions {
  type?: DecisionType;
  ref?: string;
  compacted?: boolean;
  json?: boolean;
  cwd?: string;
}

export interface RecallResult {
  status: 'success' | 'error';
  count: number;
  decisions: Decision[];
  error?: string;
}

export async function runRecall(
  query?: string,
  options: RecallOptions = {}
): Promise<RecallResult> {
  const projectRoot = options.cwd || process.cwd();

  const queryOptions: QueryDecisionsOptions = {};
  if (options.type) queryOptions.type = options.type;
  if (options.ref) queryOptions.ref = options.ref;
  if (options.compacted !== undefined) queryOptions.compacted = options.compacted;

  try {
    const decisions = queryDecisions(projectRoot, query, queryOptions);

    const result: RecallResult = {
      status: 'success',
      count: decisions.length,
      decisions,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (decisions.length === 0) {
        console.log(chalk.yellow('No matching decisions found.'));
      } else {
        console.log(chalk.bold(`Found ${decisions.length} decision(s):`));
        for (const d of decisions) {
          const typeBadge = chalk.cyan(`[${d.type}]`);
          const compactedNotice = d.compacted ? chalk.dim(' (compacted)') : '';
          console.log(`\n• ${chalk.bold(d.id)} ${typeBadge}${compactedNotice} - ${d.summary}`);
          console.log(`  ${chalk.dim('Reason:')} ${d.reason}`);
          if (d.ref && d.ref.length > 0) {
            console.log(`  ${chalk.dim('Refs:')}   ${d.ref.join(', ')}`);
          }
        }
      }
    }

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const result: RecallResult = {
      status: 'error',
      count: 0,
      decisions: [],
      error: errorMsg,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error(chalk.red(`Failed to recall decisions: ${errorMsg}`));
    }

    return result;
  }
}
