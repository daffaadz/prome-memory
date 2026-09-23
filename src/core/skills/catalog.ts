import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface BuiltinSkill {
  name: string;
  category: 'early-stage' | 'development' | 'quality' | 'design';
  summary: string;
  description: string;
  aliases: string[];
  templateRelativeDir: string;
}

export const BUILTIN_SKILLS: Record<string, BuiltinSkill> = {
  'frontend-craft': {
    name: 'frontend-craft',
    category: 'design',
    summary: 'Anti-AI-slop frontend design, distinctive typography, and UI/UX craft',
    description:
      'Eliminates generic AI slop aesthetics. Enforces distinctive typography pairing (blacklisting overused AI fonts), strict 8pt spatial rhythm & padding consistency, semantic token palettes, and rich micro-interactions.',
    aliases: ['anti-slop', 'ui-ux', 'design-craft', 'frontend-design'],
    templateRelativeDir: 'skills/frontend-craft',
  },
  'seo-web-vitals': {
    name: 'seo-web-vitals',
    category: 'quality',
    summary: 'SEO optimization, JSON-LD structured schemas, and Core Web Vitals (LCP, INP, CLS)',
    description:
      'Guarantees top search engine indexing and green Core Web Vitals. Covers semantic OpenGraph metadata, JSON-LD Schema.org generators, asset preloading, layout shift zero-tolerance, and responsiveness.',
    aliases: ['seo', 'web-vitals', 'cwv', 'seo-optimization'],
    templateRelativeDir: 'skills/seo-web-vitals',
  },
  'performance-logic-audit': {
    name: 'performance-logic-audit',
    category: 'quality',
    summary: 'Detection of computational bottlenecks, database N+1, memory leaks, and logic flaws',
    description:
      'Audits code for subtle logic bugs, async race conditions, uncleaned resource leaks, database N+1 query patterns, excessive re-renders, and floating point arithmetic pitfalls.',
    aliases: ['performance', 'audit', 'logic-audit', 'perf-audit'],
    templateRelativeDir: 'skills/performance-logic-audit',
  },
  'project-architecture': {
    name: 'project-architecture',
    category: 'early-stage',
    summary: 'Domain boundaries, 3-tier layering, runtime schema validation, and error architecture',
    description:
      'Guides early project setup to prevent future technical debt. Enforces feature-first vs layered boundaries, strict schema validation (Zod/TypeBox) at all edges, and standardized Result error handling.',
    aliases: ['architecture', 'scaffolding', 'blueprint', 'clean-code'],
    templateRelativeDir: 'skills/project-architecture',
  },
  'security-hardening': {
    name: 'security-hardening',
    category: 'development',
    summary: 'OWASP Top 10 defense, zero secrets leakage, auth hardening, and secure HTTP headers',
    description:
      'Enforces defensive coding: secrets scanning, injection/XSS defenses, secure HttpOnly cookie sessions, Content-Security-Policy (CSP), and dependency vulnerability auditing.',
    aliases: ['security', 'hardening', 'owasp', 'defensive-coding'],
    templateRelativeDir: 'skills/security-hardening',
  },
};

/**
 * Resolves a built-in skill by exact name or alias.
 */
export function getBuiltinSkill(nameOrAlias: string): BuiltinSkill | undefined {
  const normalized = nameOrAlias.toLowerCase().trim();
  if (BUILTIN_SKILLS[normalized]) {
    return BUILTIN_SKILLS[normalized];
  }
  return Object.values(BUILTIN_SKILLS).find((s) => s.aliases.includes(normalized));
}

/**
 * Returns all built-in skills as an array.
 */
export function listBuiltinSkills(): BuiltinSkill[] {
  return Object.values(BUILTIN_SKILLS);
}

/**
 * Resolves the absolute directory path to the skill template inside the package.
 */
export function getBuiltinSkillTemplateDir(skill: BuiltinSkill): string {
  const currentFile = fileURLToPath(import.meta.url);
  let dir = path.dirname(currentFile);
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      break;
    }
    dir = path.dirname(dir);
  }

  const candidate1 = path.join(dir, 'src', 'templates', skill.templateRelativeDir);
  if (fs.existsSync(candidate1)) return candidate1;

  const candidate2 = path.join(dir, 'templates', skill.templateRelativeDir);
  if (fs.existsSync(candidate2)) return candidate2;

  return candidate1;
}
