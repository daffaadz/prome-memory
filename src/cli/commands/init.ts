import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { initCoreFile } from "../../core/memory/core-file.js";
import { initStateFile } from "../../core/memory/state-file.js";
import { initDecisionsFile } from "../../core/memory/decisions-log.js";
import { initConfigFile } from "../../core/memory/config-file.js";
import { detectAdapters } from "../../core/detect-tool.js";
import { GenericFallbackAdapter } from "../../core/adapters/generic-fallback.js";

export interface InitOptions {
  json?: boolean;
  cwd?: string;
  projectName?: string;
}

export interface InitResult {
  status: "initialized" | "already_initialized";
  message: string;
  projectRoot: string;
  projectName: string;
  adaptersInstalled: string[];
  filesCreated: string[];
}

export async function runInit(options: InitOptions = {}): Promise<InitResult> {
  const projectRoot = options.cwd ? path.resolve(options.cwd) : process.cwd();
  const promeDir = path.join(projectRoot, ".prome");

  // Derive project name
  let projectName = options.projectName;
  if (!projectName) {
    const pkgPath = path.join(projectRoot, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        if (pkg.name) projectName = pkg.name;
      } catch {
        // Fall back to directory name
      }
    }
    if (!projectName) {
      projectName = path.basename(projectRoot) || "unnamed-project";
    }
  }

  // Idempotency check: if .prome already exists, do not overwrite
  if (fs.existsSync(promeDir)) {
    const result: InitResult = {
      status: "already_initialized",
      message: "Prome is already initialized in this project.",
      projectRoot,
      projectName,
      adaptersInstalled: [],
      filesCreated: [],
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(
        chalk.yellow("Prome is already initialized in this project."),
      );
      console.log(chalk.dim(`Directory: ${promeDir}`));
    }
    return result;
  }

  const filesCreated: string[] = [];

  // Create memory and skills directory
  const memoryDir = path.join(promeDir, "memory");
  const skillsDir = path.join(promeDir, "skills");
  fs.mkdirSync(memoryDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });

  // 1. Initialize core.md
  initCoreFile(projectRoot, projectName);
  filesCreated.push(".prome/memory/core.md");

  // 2. Initialize state.md
  initStateFile(projectRoot);
  filesCreated.push(".prome/memory/state.md");

  // 3. Initialize decisions.jsonl
  initDecisionsFile(projectRoot);
  filesCreated.push(".prome/memory/decisions.jsonl");

  // 4. Detect tools and install adapters
  const adapters = detectAdapters(projectRoot);
  const installedAdapters: string[] = [];

  for (const adapter of adapters) {
    await adapter.installHooks(projectRoot);
    installedAdapters.push(adapter.name);
    if (adapter.name === "claude-code") {
      filesCreated.push(
        ".claude/settings.json",
        ".claude/PROME_INSTRUCTIONS.md",
      );
    } else if (adapter.name === "antigravity") {
      filesCreated.push(
        ".agent/skills/prome-memory/SKILL.md",
        ".agent/workflows/prome-sync.md",
      );
    } else if (adapter.name === "generic-fallback") {
      filesCreated.push(".prome/inject.md");
    }
  }

  // 5. Initialize config.yml
  initConfigFile(projectRoot, installedAdapters);
  filesCreated.push(".prome/config.yml");

  const result: InitResult = {
    status: "initialized",
    message: "Prome initialized successfully.",
    projectRoot,
    projectName,
    adaptersInstalled: installedAdapters,
    filesCreated,
  };

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(chalk.green("✔ Prome initialized successfully!"));
    console.log(chalk.bold(`Project: ${projectName}`));
    console.log(chalk.cyan("Created files:"));
    for (const f of filesCreated) {
      console.log(`  - ${f}`);
    }
    console.log(chalk.cyan("Configured adapters:"));
    for (const a of installedAdapters) {
      console.log(`  - ${a}`);
    }

    const fallback = adapters.find(
      (a) => a instanceof GenericFallbackAdapter,
    ) as GenericFallbackAdapter | undefined;
    if (fallback) {
      console.log("\n" + chalk.yellow(fallback.getManualInstructions()));
    }
  }

  return result;
}
