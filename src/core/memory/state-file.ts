import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {
  StateFrontmatter,
  StateFrontmatterSchema,
  StateFileContent,
} from './schemas.js';

export function getStateFilePath(projectRoot: string): string {
  return path.join(projectRoot, '.prome', 'memory', 'state.md');
}

export function readStateFile(projectRoot: string): StateFileContent {
  const filePath = getStateFilePath(projectRoot);
  if (!fs.existsSync(filePath)) {
    throw new Error(`state.md not found at ${filePath}. Run 'prome init' first.`);
  }

  const rawContent = fs.readFileSync(filePath, 'utf-8');
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(rawContent);
  } catch (err) {
    throw new Error(`Failed to parse frontmatter in state.md: ${err instanceof Error ? err.message : String(err)}`);
  }

  const parseResult = StateFrontmatterSchema.safeParse(parsed.data);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(`Invalid state.md frontmatter schema: ${errorDetails}`);
  }

  return {
    frontmatter: parseResult.data,
    body: parsed.content.trim(),
  };
}

export function writeStateFile(
  projectRoot: string,
  frontmatter: StateFrontmatter,
  body: string
): void {
  const parseResult = StateFrontmatterSchema.safeParse(frontmatter);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(`Cannot write state.md: Invalid frontmatter schema: ${errorDetails}`);
  }

  const filePath = getStateFilePath(projectRoot);
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const fileString = matter.stringify(`\n${body.trim()}\n`, parseResult.data);
  fs.writeFileSync(filePath, fileString, 'utf-8');
}

export function initStateFile(projectRoot: string): void {
  const now = new Date().toISOString();
  const defaultBody = `## Arsitektur saat ini\n\n## Keputusan aktif\n\n## Area kerja terakhir\n\n## Konvensi yang sudah disepakati`;
  const frontmatter: StateFrontmatter = {
    last_updated: now,
    session_count: 0,
  };
  writeStateFile(projectRoot, frontmatter, defaultBody);
}

export function touchStateFile(
  projectRoot: string,
  newBody?: string
): StateFileContent {
  const current = readStateFile(projectRoot);
  const updatedFrontmatter: StateFrontmatter = {
    ...current.frontmatter,
    last_updated: new Date().toISOString(),
  };
  const body = newBody !== undefined ? newBody : current.body;
  writeStateFile(projectRoot, updatedFrontmatter, body);
  return {
    frontmatter: updatedFrontmatter,
    body,
  };
}

export function incrementSessionCount(projectRoot: string): number {
  const current = readStateFile(projectRoot);
  const updatedFrontmatter: StateFrontmatter = {
    ...current.frontmatter,
    last_updated: new Date().toISOString(),
    session_count: current.frontmatter.session_count + 1,
  };
  writeStateFile(projectRoot, updatedFrontmatter, current.body);
  return updatedFrontmatter.session_count;
}

