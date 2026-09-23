import fs from "node:fs";
import path from "node:path";
import {
  Decision,
  DecisionInput,
  DecisionInputSchema,
  DecisionSchema,
  DecisionType,
} from "./schemas.js";
import { touchStateFile } from "./state-file.js";

export function getDecisionsFilePath(projectRoot: string): string {
  return path.join(projectRoot, ".prome", "memory", "decisions.jsonl");
}

export function initDecisionsFile(projectRoot: string): void {
  const filePath = getDecisionsFilePath(projectRoot);
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "", "utf-8");
  }
}

export function readAllDecisions(projectRoot: string): Decision[] {
  const filePath = getDecisionsFilePath(projectRoot);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `decisions.jsonl not found at ${filePath}. Run 'prome init' first.`,
    );
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const decisions: Decision[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(line);
    } catch (err) {
      throw new Error(
        `Failed to parse JSON on line ${i + 1} of decisions.jsonl: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const parseResult = DecisionSchema.safeParse(parsedJson);
    if (!parseResult.success) {
      const errorDetails = parseResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      throw new Error(
        `Invalid decision schema on line ${i + 1} of decisions.jsonl: ${errorDetails}`,
      );
    }

    decisions.push(parseResult.data);
  }

  return decisions;
}

export function getNextDecisionId(decisions: Decision[]): string {
  let maxId = 0;
  for (const d of decisions) {
    const match = d.id.match(/^d-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxId) {
        maxId = num;
      }
    }
  }
  const nextNum = maxId + 1;
  return `d-${String(nextNum).padStart(4, "0")}`;
}

export function appendDecision(
  projectRoot: string,
  input: DecisionInput,
): Decision {
  const inputValidation = DecisionInputSchema.safeParse(input);
  if (!inputValidation.success) {
    const errorDetails = inputValidation.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    throw new Error(`Invalid decision input: ${errorDetails}`);
  }

  const existingDecisions = readAllDecisions(projectRoot);
  const nextId = getNextDecisionId(existingDecisions);
  const now = new Date().toISOString();

  const newDecision: Decision = {
    id: nextId,
    ts: now,
    type: inputValidation.data.type,
    summary: inputValidation.data.summary,
    reason: inputValidation.data.reason,
    ref: inputValidation.data.ref ?? [],
    supersedes: inputValidation.data.supersedes ?? null,
    compacted: inputValidation.data.compacted ?? false,
  };

  const validation = DecisionSchema.safeParse(newDecision);
  if (!validation.success) {
    const errorDetails = validation.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    throw new Error(
      `Constructed decision failed schema validation: ${errorDetails}`,
    );
  }

  const filePath = getDecisionsFilePath(projectRoot);
  fs.appendFileSync(filePath, JSON.stringify(validation.data) + "\n", "utf-8");

  // Update state.md timestamp per spec
  try {
    touchStateFile(projectRoot);
  } catch {
    // If state.md isn't initialized yet or cannot be touched, ignore
  }

  return validation.data;
}

export interface QueryDecisionsOptions {
  type?: DecisionType;
  ref?: string;
  compacted?: boolean;
}

export function queryDecisions(
  projectRoot: string,
  query?: string,
  options?: QueryDecisionsOptions,
): Decision[] {
  const decisions = readAllDecisions(projectRoot);
  const lowerQuery = query ? query.toLowerCase().trim() : "";

  return decisions.filter((d) => {
    if (options?.type && d.type !== options.type) {
      return false;
    }

    if (options?.compacted !== undefined && d.compacted !== options.compacted) {
      return false;
    }

    if (options?.ref) {
      const targetRef = options.ref.toLowerCase();
      const hasMatch = d.ref.some((r) => r.toLowerCase().includes(targetRef));
      if (!hasMatch) return false;
    }

    if (lowerQuery) {
      const inSummary = d.summary.toLowerCase().includes(lowerQuery);
      const inReason = d.reason.toLowerCase().includes(lowerQuery);
      const inId = d.id.toLowerCase().includes(lowerQuery);
      const inRef = d.ref.some((r) => r.toLowerCase().includes(lowerQuery));
      if (!inSummary && !inReason && !inId && !inRef) {
        return false;
      }
    }

    return true;
  });
}

export function markDecisionsCompacted(
  projectRoot: string,
  decisionIds: string[],
): void {
  const decisions = readAllDecisions(projectRoot);
  const idSet = new Set(decisionIds);

  const updatedDecisions = decisions.map((d) => {
    if (idSet.has(d.id)) {
      return { ...d, compacted: true };
    }
    return d;
  });

  const filePath = getDecisionsFilePath(projectRoot);
  const content = updatedDecisions.map((d) => JSON.stringify(d)).join("\n");
  fs.writeFileSync(filePath, content ? content + "\n" : "", "utf-8");
}
