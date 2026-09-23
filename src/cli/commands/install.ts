import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import chalk from "chalk";
import { readConfigFile } from "../../core/memory/config-file.js";

export interface InstallOptions {
  name?: string;
  json?: boolean;
  cwd?: string;
}

export interface InstallResult {
  status: "success" | "error";
  skillName?: string;
  targetPaths: string[];
  error?: string;
}

export async function runInstall(
  source: string,
  options: InstallOptions = {},
): Promise<InstallResult> {
  const projectRoot = options.cwd || process.cwd();
  const promeSkillsDir = path.join(projectRoot, ".prome", "skills");

  if (!fs.existsSync(promeSkillsDir)) {
    fs.mkdirSync(promeSkillsDir, { recursive: true });
  }

  // Derive skill name
  let skillName = options.name;
  if (!skillName) {
    if (source.endsWith(".git")) {
      skillName = path.basename(source, ".git");
    } else {
      skillName = path.basename(source);
    }
  }

  const isGitUrl =
    source.startsWith("http://") ||
    source.startsWith("https://") ||
    source.startsWith("git@") ||
    source.startsWith("ssh://");

  const promeTarget = path.join(promeSkillsDir, skillName);
  const targetPaths: string[] = [promeTarget];

  // Check if Antigravity is active, install there too
  try {
    const config = readConfigFile(projectRoot);
    if (config.agent_adapters.includes("antigravity")) {
      const agentTarget = path.join(projectRoot, ".agent", "skills", skillName);
      targetPaths.push(agentTarget);
    }
  } catch {
    // If config does not exist, ignore
  }

  try {
    if (isGitUrl) {
      if (fs.existsSync(promeTarget)) {
        fs.rmSync(promeTarget, { recursive: true, force: true });
      }
      execSync(`git clone --depth 1 "${source}" "${promeTarget}"`, {
        stdio: "pipe",
      });
    } else {
      const resolvedSource = path.resolve(projectRoot, source);
      if (!fs.existsSync(resolvedSource)) {
        throw new Error(`Source skill path does not exist: ${resolvedSource}`);
      }

      const stat = fs.statSync(resolvedSource);
      if (fs.existsSync(promeTarget)) {
        fs.rmSync(promeTarget, { recursive: true, force: true });
      }

      if (stat.isDirectory()) {
        fs.cpSync(resolvedSource, promeTarget, { recursive: true });
      } else {
        fs.mkdirSync(promeTarget, { recursive: true });
        fs.copyFileSync(
          resolvedSource,
          path.join(promeTarget, path.basename(resolvedSource)),
        );
      }
    }

    // Copy to any secondary adapter paths (e.g. .agent/skills/)
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

    const result: InstallResult = {
      status: "success",
      skillName,
      targetPaths,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(
        chalk.green(`✔ Skill '${skillName}' installed successfully!`),
      );
      for (const t of targetPaths) {
        console.log(chalk.dim(`  - ${path.relative(projectRoot, t)}`));
      }
    }

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const result: InstallResult = {
      status: "error",
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
