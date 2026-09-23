import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import chalk from 'chalk';
import { readConfigFile } from '../../core/memory/config-file.js';
import {
  BuiltinSkill,
  getBuiltinSkill,
  listBuiltinSkills,
  getBuiltinSkillTemplateDir,
} from '../../core/skills/catalog.js';

export interface InstallOptions {
  name?: string;
  json?: boolean;
  cwd?: string;
  list?: boolean;
  all?: boolean;
}

export interface InstallResult {
  status: 'success' | 'error';
  skillName?: string;
  skillsInstalled?: string[];
  targetPaths: string[];
  catalog?: BuiltinSkill[];
  error?: string;
}

/**
 * Copies a skill directory or file to target destination paths.
 */
function copySkillToTargets(
  sourceDir: string,
  skillName: string,
  projectRoot: string,
  promeSkillsDir: string
): string[] {
  const promeTarget = path.join(promeSkillsDir, skillName);
  const targetPaths: string[] = [promeTarget];

  // If Antigravity is active, also install to .agent/skills/
  try {
    const config = readConfigFile(projectRoot);
    if (config.agent_adapters.includes('antigravity')) {
      const agentTarget = path.join(projectRoot, '.agent', 'skills', skillName);
      targetPaths.push(agentTarget);
    }
  } catch {
    // If config does not exist, check if .agent exists
    const agentDir = path.join(projectRoot, '.agent');
    if (fs.existsSync(agentDir)) {
      targetPaths.push(path.join(agentDir, 'skills', skillName));
    }
  }

  // Copy to .prome/skills/
  if (fs.existsSync(promeTarget)) {
    fs.rmSync(promeTarget, { recursive: true, force: true });
  }
  const stat = fs.statSync(sourceDir);
  if (stat.isDirectory()) {
    fs.cpSync(sourceDir, promeTarget, { recursive: true });
  } else {
    fs.mkdirSync(promeTarget, { recursive: true });
    fs.copyFileSync(sourceDir, path.join(promeTarget, path.basename(sourceDir)));
  }

  // Copy to secondary targets (e.g. .agent/skills/)
  for (const target of targetPaths) {
    if (target !== promeTarget) {
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
      }
      const parent = path.dirname(target);
      if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
      fs.cpSync(promeTarget, target, { recursive: true });
    }
  }

  return targetPaths;
}

export async function runInstall(
  source?: string,
  options: InstallOptions = {}
): Promise<InstallResult> {
  const projectRoot = options.cwd || process.cwd();
  const promeSkillsDir = path.join(projectRoot, '.prome', 'skills');

  if (!fs.existsSync(promeSkillsDir)) {
    fs.mkdirSync(promeSkillsDir, { recursive: true });
  }

  // 1. Handle --list / -l: Display built-in skills catalogue
  if (options.list) {
    const catalog = listBuiltinSkills();
    const result: InstallResult = {
      status: 'success',
      catalog,
      targetPaths: [],
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold.cyan('\n✨ Curated Built-in Developer Skills for Prome:'));
      console.log(chalk.dim('Install any skill via: prome install <skill-name>\n'));
      for (const skill of catalog) {
        console.log(
          `  ${chalk.bold.green(skill.name.padEnd(26))} ${chalk.yellow(`[${skill.category}]`)}`
        );
        console.log(`  ${chalk.white(skill.summary)}`);
        console.log(chalk.dim(`  Aliases: ${skill.aliases.join(', ')}\n`));
      }
      console.log(chalk.dim('Tip: Install all skills at once using: prome install --all\n'));
    }
    return result;
  }

  // 2. Handle --all: Install all curated built-in skills
  if (options.all) {
    const catalog = listBuiltinSkills();
    const installedNames: string[] = [];
    const allTargetPaths: string[] = [];

    for (const skill of catalog) {
      const templateDir = getBuiltinSkillTemplateDir(skill);
      if (!fs.existsSync(templateDir)) {
        continue;
      }
      const paths = copySkillToTargets(templateDir, skill.name, projectRoot, promeSkillsDir);
      installedNames.push(skill.name);
      allTargetPaths.push(...paths);
    }

    const result: InstallResult = {
      status: 'success',
      skillsInstalled: installedNames,
      targetPaths: allTargetPaths,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green(`✔ Successfully installed ${installedNames.length} curated skills:`));
      for (const name of installedNames) {
        console.log(`  - ${chalk.bold(name)}`);
      }
      console.log(chalk.cyan('\nInstalled target paths:'));
      for (const p of allTargetPaths) {
        console.log(chalk.dim(`  - ${path.relative(projectRoot, p)}`));
      }
    }
    return result;
  }

  // 3. If source is missing and neither --list nor --all
  if (!source) {
    const errorMsg = 'Please specify a skill name, git URL, or local path. Use --list to view available skills.';
    const result: InstallResult = {
      status: 'error',
      targetPaths: [],
      error: errorMsg,
    };
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error(chalk.red(errorMsg));
    }
    return result;
  }

  // 4. Check if source matches a built-in skill
  const builtin = getBuiltinSkill(source);
  if (builtin) {
    const templateDir = getBuiltinSkillTemplateDir(builtin);
    if (!fs.existsSync(templateDir)) {
      const errorMsg = `Built-in skill template directory not found at: ${templateDir}`;
      const result: InstallResult = {
        status: 'error',
        skillName: builtin.name,
        targetPaths: [],
        error: errorMsg,
      };
      if (options.json) console.log(JSON.stringify(result, null, 2));
      else console.error(chalk.red(errorMsg));
      return result;
    }

    const skillName = options.name || builtin.name;
    const targetPaths = copySkillToTargets(templateDir, skillName, projectRoot, promeSkillsDir);

    const result: InstallResult = {
      status: 'success',
      skillName,
      targetPaths,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green(`✔ Built-in skill '${skillName}' installed successfully!`));
      console.log(chalk.white(`  ${builtin.summary}`));
      for (const t of targetPaths) {
        console.log(chalk.dim(`  - ${path.relative(projectRoot, t)}`));
      }
    }
    return result;
  }

  // 5. Fallback: External git URL or custom local folder
  let skillName = options.name;
  if (!skillName) {
    if (source.endsWith('.git')) {
      skillName = path.basename(source, '.git');
    } else {
      skillName = path.basename(source);
    }
  }

  const isGitUrl =
    source.startsWith('http://') ||
    source.startsWith('https://') ||
    source.startsWith('git@') ||
    source.startsWith('ssh://');

  try {
    let resolvedSourceDir: string;
    if (isGitUrl) {
      const tempClone = path.join(promeSkillsDir, `__temp_${skillName}_${Date.now()}`);
      execSync(`git clone --depth 1 "${source}" "${tempClone}"`, { stdio: 'pipe' });
      resolvedSourceDir = tempClone;
    } else {
      resolvedSourceDir = path.resolve(projectRoot, source);
      if (!fs.existsSync(resolvedSourceDir)) {
        throw new Error(`Source skill path does not exist: ${resolvedSourceDir}`);
      }
    }

    const targetPaths = copySkillToTargets(resolvedSourceDir, skillName, projectRoot, promeSkillsDir);

    if (isGitUrl && fs.existsSync(resolvedSourceDir)) {
      fs.rmSync(resolvedSourceDir, { recursive: true, force: true });
    }

    const result: InstallResult = {
      status: 'success',
      skillName,
      targetPaths,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green(`✔ Skill '${skillName}' installed successfully!`));
      for (const t of targetPaths) {
        console.log(chalk.dim(`  - ${path.relative(projectRoot, t)}`));
      }
    }

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const result: InstallResult = {
      status: 'error',
      skillName,
      targetPaths: [],
      error: errorMsg,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error(chalk.red(`Failed to install skill: ${errorMsg}`));
    }

    return result;
  }
}
