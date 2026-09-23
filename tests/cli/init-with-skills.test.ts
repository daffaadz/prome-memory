import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runInit } from '../../src/cli/commands/init.js';

describe('CLI runInit with skills options', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prome-init-skills-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('initializes with allSkills flag and installs all curated skills into .prome and .agent', async () => {
    const res = await runInit({
      cwd: tempDir,
      projectName: 'full-stack-app',
      adapter: 'antigravity',
      allSkills: true,
      json: true,
    });

    expect(res.status).toBe('initialized');
    expect(res.skillsInstalled?.length).toBeGreaterThanOrEqual(5);

    // Verify Antigravity files
    expect(fs.existsSync(path.join(tempDir, 'GEMINI.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.agent', 'rules', 'prome.md'))).toBe(true);

    // Verify skills in .agent/skills/
    const agentSkillsDir = path.join(tempDir, '.agent', 'skills');
    expect(fs.existsSync(path.join(agentSkillsDir, 'prome-memory', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(agentSkillsDir, 'frontend-craft', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(agentSkillsDir, 'seo-web-vitals', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(agentSkillsDir, 'performance-logic-audit', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(agentSkillsDir, 'project-architecture', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(agentSkillsDir, 'security-hardening', 'SKILL.md'))).toBe(true);
  });

  it('initializes with specific subset of skills', async () => {
    const res = await runInit({
      cwd: tempDir,
      projectName: 'frontend-only',
      adapter: 'antigravity',
      skills: ['frontend-craft', 'seo'],
      json: true,
    });

    expect(res.status).toBe('initialized');
    expect(res.skillsInstalled).toContain('frontend-craft');
    expect(res.skillsInstalled).toContain('seo-web-vitals');

    expect(fs.existsSync(path.join(tempDir, '.prome', 'skills', 'frontend-craft', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.prome', 'skills', 'seo-web-vitals', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.prome', 'skills', 'security-hardening', 'SKILL.md'))).toBe(false);
  });
});
