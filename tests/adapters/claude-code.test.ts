import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ClaudeCodeAdapter } from '../../src/core/adapters/claude-code.js';
import { runInit } from '../../src/cli/commands/init.js';
import { readConfigFile } from '../../src/core/memory/config-file.js';

describe('Claude Code Adapter', () => {
  let tempDir: string;
  let adapter: ClaudeCodeAdapter;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prome-claude-test-'));
    adapter = new ClaudeCodeAdapter();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects .claude folder or .claude.json', () => {
    expect(adapter.detect(tempDir)).toBe(false);

    // Test .claude directory
    const claudeDir = path.join(tempDir, '.claude');
    fs.mkdirSync(claudeDir);
    expect(adapter.detect(tempDir)).toBe(true);

    // Remove directory and test .claude.json
    fs.rmSync(claudeDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, '.claude.json'), '{}', 'utf-8');
    expect(adapter.detect(tempDir)).toBe(true);
  });

  it('installs hooks into fresh .claude/settings.json without error', async () => {
    await adapter.installHooks(tempDir);

    const settingsPath = path.join(tempDir, '.claude', 'settings.json');
    expect(fs.existsSync(settingsPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(content.hooks.SessionStart).toBe('prome context --inject');
    expect(content.hooks.Stop).toBe('prome context --update-if-changed');
  });

  it('preserves existing settings and other hooks when merging', async () => {
    const claudeDir = path.join(tempDir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });

    const settingsPath = path.join(claudeDir, 'settings.json');
    const existingSettings = {
      theme: 'dark',
      model: 'claude-3-5-sonnet',
      hooks: {
        PreCommit: 'npm test',
      },
    };
    fs.writeFileSync(settingsPath, JSON.stringify(existingSettings, null, 2), 'utf-8');

    await adapter.installHooks(tempDir);

    const updated = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(updated.theme).toBe('dark');
    expect(updated.model).toBe('claude-3-5-sonnet');
    expect(updated.hooks.PreCommit).toBe('npm test');
    expect(updated.hooks.SessionStart).toBe('prome context --inject');
    expect(updated.hooks.Stop).toBe('prome context --update-if-changed');
  });

  it('integrates seamlessly with prome init when .claude is present', async () => {
    fs.mkdirSync(path.join(tempDir, '.claude'));

    const initResult = await runInit({ cwd: tempDir, projectName: 'claude-project' });
    expect(initResult.adaptersInstalled).toContain('claude-code');

    const config = readConfigFile(tempDir);
    expect(config.agent_adapters).toContain('claude-code');

    const settingsPath = path.join(tempDir, '.claude', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(settings.hooks.SessionStart).toBe('prome context --inject');
  });

  it('injectMemoryTemplate contains the exact conditional logic from spec', () => {
    const template = adapter.injectMemoryTemplate();
    expect(template).toContain('Baca .prome/memory/core.md sebelum memproses request user apa pun.');
    expect(template).toContain('JIKA status: uninitialized');
    expect(template).toContain('JIKA status: initialized');
    expect(template).toContain('prome remember');
    expect(template).toContain('prome amend');
  });
});
