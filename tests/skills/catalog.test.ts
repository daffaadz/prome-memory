import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  BUILTIN_SKILLS,
  getBuiltinSkill,
  listBuiltinSkills,
  getBuiltinSkillTemplateDir,
} from '../../src/core/skills/catalog.js';

describe('Builtin Skills Catalog', () => {
  it('registers all required skills', () => {
    const list = listBuiltinSkills();
    expect(list.length).toBeGreaterThanOrEqual(5);

    const names = list.map((s) => s.name);
    expect(names).toContain('frontend-craft');
    expect(names).toContain('seo-web-vitals');
    expect(names).toContain('performance-logic-audit');
    expect(names).toContain('project-architecture');
    expect(names).toContain('security-hardening');
  });

  it('resolves skill by exact name and aliases', () => {
    const craft = getBuiltinSkill('frontend-craft');
    expect(craft).toBeDefined();
    expect(craft?.name).toBe('frontend-craft');

    const antiSlop = getBuiltinSkill('anti-slop');
    expect(antiSlop).toBeDefined();
    expect(antiSlop?.name).toBe('frontend-craft');

    const seo = getBuiltinSkill('seo');
    expect(seo).toBeDefined();
    expect(seo?.name).toBe('seo-web-vitals');

    const perf = getBuiltinSkill('performance');
    expect(perf).toBeDefined();
    expect(perf?.name).toBe('performance-logic-audit');

    const arch = getBuiltinSkill('architecture');
    expect(arch).toBeDefined();
    expect(arch?.name).toBe('project-architecture');

    const sec = getBuiltinSkill('security');
    expect(sec).toBeDefined();
    expect(sec?.name).toBe('security-hardening');
  });

  it('every built-in skill has an existing SKILL.md template with rich content', () => {
    const list = listBuiltinSkills();
    for (const skill of list) {
      const templateDir = getBuiltinSkillTemplateDir(skill);
      expect(fs.existsSync(templateDir)).toBe(true);

      const skillMd = path.join(templateDir, 'SKILL.md');
      expect(fs.existsSync(skillMd)).toBe(true);

      const content = fs.readFileSync(skillMd, 'utf-8');
      expect(content).toContain(`name: ${skill.name}`);
      expect(content.length).toBeGreaterThan(1500); // Verify rich & detailed content
    }
  });

  it('frontend-craft explicitly lists AI slop fonts to avoid and spacing rules', () => {
    const craft = getBuiltinSkill('frontend-craft')!;
    const templateDir = getBuiltinSkillTemplateDir(craft);
    const content = fs.readFileSync(path.join(templateDir, 'SKILL.md'), 'utf-8');

    expect(content).toContain('Inter');
    expect(content).toContain('Roboto');
    expect(content).toContain('Poppins');
    expect(content).toContain('8pt');
    expect(content).toContain('padding');
    expect(content).toContain('margin');
  });
});
