import { spawnSync } from 'node:child_process';
import chalk from 'chalk';
import { readCoreFile, amendCoreFile, getCoreFilePath } from '../../core/memory/core-file.js';
import { CoreStatus } from '../../core/memory/schemas.js';

export interface AmendOptions {
  status?: CoreStatus;
  setInitialized?: boolean;
  body?: string;
  json?: boolean;
  cwd?: string;
}

export interface AmendResult {
  status: 'success' | 'error';
  version: number;
  coreStatus: CoreStatus;
  message: string;
}

export async function runAmend(options: AmendOptions = {}): Promise<AmendResult> {
  const projectRoot = options.cwd || process.cwd();
  const filePath = getCoreFilePath(projectRoot);

  try {
    const current = readCoreFile(projectRoot);

    let newStatus = current.frontmatter.status;
    if (options.status) {
      newStatus = options.status;
    } else if (options.setInitialized) {
      newStatus = 'initialized';
    }

    let newBody = options.body;

    // If no flags were provided and not in JSON mode, open in system editor
    if (options.body === undefined && !options.status && !options.setInitialized && !options.json) {
      const editor = process.env.EDITOR || (process.platform === 'win32' ? 'notepad' : 'vi');
      console.log(chalk.cyan(`Opening core.md in editor (${editor})...`));
      spawnSync(editor, [filePath], { stdio: 'inherit' });

      // After editor closes, re-read and increment version
      const reloaded = readCoreFile(projectRoot);
      const amended = amendCoreFile(projectRoot, {
        status: reloaded.frontmatter.status === 'uninitialized' ? 'initialized' : reloaded.frontmatter.status,
      }, reloaded.body);

      const result: AmendResult = {
        status: 'success',
        version: amended.frontmatter.version,
        coreStatus: amended.frontmatter.status,
        message: `core.md amended. Version bumped to ${amended.frontmatter.version}.`,
      };
      console.log(chalk.green(`✔ ${result.message}`));
      return result;
    }

    // Direct programmatic amend
    const amended = amendCoreFile(
      projectRoot,
      { status: newStatus },
      newBody !== undefined ? newBody : current.body
    );

    const result: AmendResult = {
      status: 'success',
      version: amended.frontmatter.version,
      coreStatus: amended.frontmatter.status,
      message: `core.md amended. Version bumped to ${amended.frontmatter.version}.`,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green(`✔ ${result.message}`));
      console.log(chalk.dim(`  Status:  ${amended.frontmatter.status}`));
      console.log(chalk.dim(`  Version: ${amended.frontmatter.version}`));
    }

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const result: AmendResult = {
      status: 'error',
      version: 0,
      coreStatus: 'uninitialized',
      message: errorMsg,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error(chalk.red(`Failed to amend core.md: ${errorMsg}`));
    }

    return result;
  }
}
