import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
  CoreFrontmatter,
  CoreFrontmatterSchema,
  CoreFileContent,
} from "./schemas.js";

export function getCoreFilePath(projectRoot: string): string {
  return path.join(projectRoot, ".prome", "memory", "core.md");
}

export function readCoreFile(projectRoot: string): CoreFileContent {
  const filePath = getCoreFilePath(projectRoot);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `core.md not found at ${filePath}. Run 'prome init' first.`,
    );
  }

  const rawContent = fs.readFileSync(filePath, "utf-8");
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(rawContent);
  } catch (err) {
    throw new Error(
      `Failed to parse frontmatter in core.md: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const parseResult = CoreFrontmatterSchema.safeParse(parsed.data);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    throw new Error(`Invalid core.md frontmatter schema: ${errorDetails}`);
  }

  return {
    frontmatter: parseResult.data,
    body: parsed.content.trim(),
  };
}

export function writeCoreFile(
  projectRoot: string,
  frontmatter: CoreFrontmatter,
  body: string,
): void {
  const parseResult = CoreFrontmatterSchema.safeParse(frontmatter);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    throw new Error(
      `Cannot write core.md: Invalid frontmatter schema: ${errorDetails}`,
    );
  }

  const filePath = getCoreFilePath(projectRoot);
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const fileString = matter.stringify(`\n${body.trim()}\n`, parseResult.data);
  fs.writeFileSync(filePath, fileString, "utf-8");
}

export function initCoreFile(
  projectRoot: string,
  projectName: string,
  initialBody?: string,
): void {
  const now = new Date().toISOString();
  const defaultBody =
    initialBody ||
    `## Tujuan\n\n## Constraint keras\n\n## Design system / stack awal\n\n## Non-goals`;
  const frontmatter: CoreFrontmatter = {
    project: projectName,
    created: now,
    version: 1,
    status: "uninitialized",
  };
  writeCoreFile(projectRoot, frontmatter, defaultBody);
}

export function amendCoreFile(
  projectRoot: string,
  updates: Partial<Omit<CoreFrontmatter, "created" | "version">>,
  newBody?: string,
): CoreFileContent {
  const current = readCoreFile(projectRoot);
  const updatedFrontmatter: CoreFrontmatter = {
    ...current.frontmatter,
    ...updates,
    version: current.frontmatter.version + 1,
  };
  const body = newBody !== undefined ? newBody : current.body;
  writeCoreFile(projectRoot, updatedFrontmatter, body);
  return {
    frontmatter: updatedFrontmatter,
    body,
  };
}
