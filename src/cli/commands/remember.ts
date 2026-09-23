import chalk from 'chalk';
import { appendDecision } from '../../core/memory/decisions-log.js';
import { Decision, DecisionInput } from '../../core/memory/schemas.js';

export interface RememberOptions {
  type?: 'architecture' | 'convention' | 'scope';
  summary?: string;
  reason?: string;
  ref?: string[];
  json?: boolean;
  cwd?: string;
}

export interface RememberResult {
  status: 'success' | 'error';
  decision?: Decision;
  error?: string;
}

export async function runRemember(
  rawJsonOrSummary?: string,
  options: RememberOptions = {}
): Promise<RememberResult> {
  const projectRoot = options.cwd || process.cwd();
  let decisionInput: Partial<DecisionInput> = {};

  if (rawJsonOrSummary) {
    const trimmed = rawJsonOrSummary.trim();
    if (trimmed.startsWith('{')) {
      try {
        decisionInput = JSON.parse(trimmed);
      } catch (err) {
        const errorMsg = `Invalid JSON string provided to remember: ${err instanceof Error ? err.message : String(err)}`;
        if (options.json) {
          console.log(JSON.stringify({ status: 'error', error: errorMsg }, null, 2));
        } else {
          console.error(chalk.red(`Error: ${errorMsg}`));
        }
        return { status: 'error', error: errorMsg };
      }
    } else {
      decisionInput.summary = trimmed;
    }
  }

  // Merge CLI flags if provided
  if (options.type) decisionInput.type = options.type;
  if (options.summary) decisionInput.summary = options.summary;
  if (options.reason) decisionInput.reason = options.reason;
  if (options.ref) decisionInput.ref = options.ref;

  try {
    const decision = appendDecision(projectRoot, decisionInput as DecisionInput);

    const result: RememberResult = {
      status: 'success',
      decision,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green(`✔ Recorded decision ${chalk.bold(decision.id)} [${decision.type}]`));
      console.log(chalk.dim(`  Summary: ${decision.summary}`));
      console.log(chalk.dim(`  Reason:  ${decision.reason}`));
      if (decision.ref && decision.ref.length > 0) {
        console.log(chalk.dim(`  Refs:    ${decision.ref.join(', ')}`));
      }
    }

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const result: RememberResult = {
      status: 'error',
      error: errorMsg,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error(chalk.red(`Failed to remember decision: ${errorMsg}`));
    }

    return result;
  }
}

