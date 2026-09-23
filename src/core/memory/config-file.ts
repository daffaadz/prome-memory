import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { Config, ConfigSchema } from './schemas.js';

export function getConfigFilePath(projectRoot: string): string {
  return path.join(projectRoot, '.prome', 'config.yml');
}

export function readConfigFile(projectRoot: string): Config {
  const filePath = getConfigFilePath(projectRoot);
  if (!fs.existsSync(filePath)) {
    throw new Error(`config.yml not found at ${filePath}. Run 'prome init' first.`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = YAML.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse config.yml: ${err instanceof Error ? err.message : String(err)}`);
  }

  const result = ConfigSchema.safeParse(parsed);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(`Invalid config.yml schema: ${errorDetails}`);
  }

  return result.data;
}

export function writeConfigFile(projectRoot: string, config: Config): void {
  const result = ConfigSchema.safeParse(config);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(`Cannot write config.yml: Invalid schema: ${errorDetails}`);
  }

  const filePath = getConfigFilePath(projectRoot);
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const yamlString = YAML.stringify(result.data);
  fs.writeFileSync(filePath, yamlString, 'utf-8');
}

export function initConfigFile(projectRoot: string, adapters: string[] = []): void {
  const defaultConfig: Config = {
    prome_version: 1,
    agent_adapters: adapters,
    compaction: {
      trigger: 'session_count',
      threshold: 20,
    },
    recall: {
      mode: 'grep',
    },
  };
  writeConfigFile(projectRoot, defaultConfig);
}

