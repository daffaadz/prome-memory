import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runInit } from '../../src/cli/commands/init.js';
import { runInstall } from '../../src/cli/commands/install.js';

describe('CLI runInstall with built-in skills', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prome-install-test-'));
    await runInit({ cwd: tempDir, projectName: 'install-test', adapter: 'antigravity' });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('lists available built-in skills with --list', async () => {
    const res = await runInstall(undefined, { list: true, cwd: tempDir, json: true });
    expect(res.status).toBe('success');
    expect(res.catalog).toBeDefined();
    expect(res.catalog?.length).toBeGreaterThanOrEqual(5);
  });

  it('installs a single built-in skill by name and syncs to .agent/skills/', async () => {
    const res = await runInstall('frontend-craft', { cwd: tempDir, json: true });
    expect(res.status).toBe('success');
    expect(res.skillName).toBe('frontend-craft');

    const promeSkillFile = path.join(tempDir, '.prome', 'skills', 'frontend-craft', 'SKILL.md');
    expect(fs.existsSync(promeSkillFile)).toBe(true);

    const agentSkillFile = path.join(tempDir, '.agent', 'skills', 'frontend-craft', 'SKILL.md');
    expect(fs.existsSync(agentSkillFile)).toBe(true);
    expect(fs.readFileSync(agentSkillFile, 'utf-8')).toContain('Frontend Craft');
  });

  it('installs built-in skill using alias', async () => {
    const res = await runInstall('seo', { cwd: tempDir, json: true });
    expect(res.status).toBe('success');
    expect(res.skillName).toBe('seo-web-vitals');

    const skillFile = path.join(tempDir, '.prome', 'skills', 'seo-web-vitals', 'SKILL.md');
    expect(fs.existsSync(skillFile)).toBe(true);
    expect(fs.readFileSync(skillFile, 'utf-8')).toContain('SEO Excellence');
  });

  it('installs all curated skills using --all', async () => {
    const res = await runInstall(undefined, { all: true, cwd: tempDir, json: true });
    expect(res.status).toBe('success');
    expect(res.skillsInstalled?.length).toBeGreaterThanOrEqual(5);

    const expected = [
      'frontend-craft',
      'seo-web-vitals',
      'performance-logic-audit',
      'project-architecture',
      'security-hardening',
    ];

    for (const name of expected) {
      const p = path.join(tempDir, '.prome', 'skills', name, 'SKILL.md');
      expect(fs.existsSync(p)).toBe(true);
      const a = path.join(tempDir, '.agent', 'skills', name, 'SKILL.md');
      expect(fs.existsSync(a)).toBe(true);
    }
  });
});
