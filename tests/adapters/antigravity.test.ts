import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AntigravityAdapter } from '../../src/core/adapters/antigravity.js';
import { runInit } from '../../src/cli/commands/init.js';
import { readConfigFile } from '../../src/core/memory/config-file.js';

describe('Antigravity Adapter', () => {
  let tempDir: string;
  let adapter: AntigravityAdapter;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prome-agent-test-'));
    adapter = new AntigravityAdapter();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects .agent or .gemini directory', () => {
    expect(adapter.detect(tempDir)).toBe(false);

    fs.mkdirSync(path.join(tempDir, '.agent'));
    expect(adapter.detect(tempDir)).toBe(true);

    fs.rmSync(path.join(tempDir, '.agent'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.gemini'));
    expect(adapter.detect(tempDir)).toBe(true);
  });

  it('installs SKILL.md and prome-sync workflow into .agent directory', async () => {
    fs.mkdirSync(path.join(tempDir, '.agent'));
    await adapter.installHooks(tempDir);

    const skillPath = path.join(tempDir, '.agent', 'skills', 'prome-memory', 'SKILL.md');
    expect(fs.existsSync(skillPath)).toBe(true);
    const skillContent = fs.readFileSync(skillPath, 'utf-8');
    expect(skillContent).toContain('name: prome-memory');
    expect(skillContent).toContain('Baca .prome/memory/core.md sebelum memproses request user apa pun.');
    expect(skillContent).toContain('JIKA status: uninitialized');
    expect(skillContent).toContain('JIKA status: initialized');
    expect(skillContent).toContain('prome remember');

    const workflowPath = path.join(tempDir, '.agent', 'workflows', 'prome-sync.md');
    expect(fs.existsSync(workflowPath)).toBe(true);
    const workflowContent = fs.readFileSync(workflowPath, 'utf-8');
    expect(workflowContent).toContain('# Prome Sync');
    expect(workflowContent).toContain('prome remember');
    expect(workflowContent).toContain('prome status');
  });

  it('installs into .gemini if .gemini exists and .agent does not', async () => {
    fs.mkdirSync(path.join(tempDir, '.gemini'));
    await adapter.installHooks(tempDir);

    const skillPath = path.join(tempDir, '.gemini', 'skills', 'prome-memory', 'SKILL.md');
    expect(fs.existsSync(skillPath)).toBe(true);
  });

  it('integrates seamlessly with prome init when .agent is present', async () => {
    fs.mkdirSync(path.join(tempDir, '.agent'));

    const initResult = await runInit({ cwd: tempDir, projectName: 'agent-project' });
    expect(initResult.adaptersInstalled).toContain('antigravity');

    const config = readConfigFile(tempDir);
    expect(config.agent_adapters).toContain('antigravity');

    const skillPath = path.join(tempDir, '.agent', 'skills', 'prome-memory', 'SKILL.md');
    expect(fs.existsSync(skillPath)).toBe(true);
  });
});
