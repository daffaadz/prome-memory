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

  it('installs SKILL.md, rules, workflows, and GEMINI.md into project', async () => {
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

    const rulePath = path.join(tempDir, '.agent', 'rules', 'prome.md');
    expect(fs.existsSync(rulePath)).toBe(true);
    const ruleContent = fs.readFileSync(rulePath, 'utf-8');
    expect(ruleContent).toContain('CRITICAL PRECEDENCE: This rule overrides Planning Mode.');

    const workflowPath = path.join(tempDir, '.agent', 'workflows', 'prome-sync.md');
    expect(fs.existsSync(workflowPath)).toBe(true);
    const workflowContent = fs.readFileSync(workflowPath, 'utf-8');
    expect(workflowContent).toContain('# Prome Sync');
    expect(workflowContent).toContain('prome remember');
    expect(workflowContent).toContain('prome status');

    const geminiMdPath = path.join(tempDir, 'GEMINI.md');
    expect(fs.existsSync(geminiMdPath)).toBe(true);
    const geminiMdContent = fs.readFileSync(geminiMdPath, 'utf-8');
    expect(geminiMdContent).toContain('# Prome Memory Protocol');
    expect(geminiMdContent).toContain('CRITICAL PRECEDENCE: This rule overrides Planning Mode.');
  });

  it('appends to existing GEMINI.md if already present without duplicating', async () => {
    fs.mkdirSync(path.join(tempDir, '.agent'));
    const geminiMdPath = path.join(tempDir, 'GEMINI.md');
    fs.writeFileSync(geminiMdPath, '# Existing Project Guidelines\n', 'utf-8');

    await adapter.installHooks(tempDir);

    const content = fs.readFileSync(geminiMdPath, 'utf-8');
    expect(content).toContain('# Existing Project Guidelines');
    expect(content).toContain('# Prome Memory Protocol');

    // Run a second time to ensure no duplicate append
    await adapter.installHooks(tempDir);
    const count = (content.match(/# Prome Memory Protocol/g) || []).length;
    expect(count).toBe(1);
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
