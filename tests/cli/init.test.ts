import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runInit } from '../../src/cli/commands/init.js';
import { readCoreFile } from '../../src/core/memory/core-file.js';
import { readStateFile } from '../../src/core/memory/state-file.js';
import { readAllDecisions } from '../../src/core/memory/decisions-log.js';
import { readConfigFile } from '../../src/core/memory/config-file.js';

describe('CLI Init Command', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prome-init-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('initializes a fresh project silently and creates all required files', async () => {
    const result = await runInit({ cwd: tempDir, projectName: 'test-app' });

    expect(result.status).toBe('initialized');
    expect(result.projectName).toBe('test-app');

    // Verify core.md
    const core = readCoreFile(tempDir);
    expect(core.frontmatter.status).toBe('uninitialized');
    expect(core.frontmatter.project).toBe('test-app');
    expect(core.frontmatter.version).toBe(1);

    // Verify state.md
    const state = readStateFile(tempDir);
    expect(state.frontmatter.session_count).toBe(0);

    // Verify decisions.jsonl
    const decisions = readAllDecisions(tempDir);
    expect(decisions).toEqual([]);

    // Verify config.yml
    const config = readConfigFile(tempDir);
    expect(config.prome_version).toBe(1);
    expect(config.compaction.threshold).toBe(20);
    expect(config.recall.mode).toBe('grep');
  });

  it('is strictly idempotent: second init run does not overwrite existing files', async () => {
    // First run
    const result1 = await runInit({ cwd: tempDir, projectName: 'test-app' });
    expect(result1.status).toBe('initialized');

    // Modify a file to check if it gets overwritten
    const corePath = path.join(tempDir, '.prome', 'memory', 'core.md');
    fs.appendFileSync(corePath, '\n# Custom User Note Added\n', 'utf-8');

    // Second run
    const result2 = await runInit({ cwd: tempDir, projectName: 'test-app' });
    expect(result2.status).toBe('already_initialized');
    expect(result2.message).toContain('already initialized');

    // Content should NOT be overwritten
    const content = fs.readFileSync(corePath, 'utf-8');
    expect(content).toContain('# Custom User Note Added');
  });
});

