import fs from 'node:fs';
import { Decision } from './schemas.js';
import {
  readStateFile,
  writeStateFile,
  getStateFilePath,
} from './state-file.js';
import {
  queryDecisions,
  markDecisionsCompacted,
} from './decisions-log.js';
import { readConfigFile } from './config-file.js';

export type SummarizerFn = (
  currentStateBody: string,
  uncompactedDecisions: Decision[]
) => Promise<string> | string;

/**
 * Pure compaction function that updates the markdown body given existing state and new decisions.
 * It synthesizes and dedupes decisions into the 4 standard sections.
 */
export function defaultCompactState(
  currentStateBody: string,
  uncompactedDecisions: Decision[]
): string {
  const sections: Record<string, string[]> = {
    'Arsitektur saat ini': [],
    'Keputusan aktif': [],
    'Area kerja terakhir': [],
    'Konvensi yang sudah disepakati': [],
  };

  // Parse existing sections from currentStateBody
  const lines = currentStateBody.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.replace('## ', '').trim();
      if (!sections[currentSection]) {
        sections[currentSection] = [];
      }
    } else if (trimmed && currentSection && sections[currentSection]) {
      sections[currentSection].push(trimmed);
    }
  }

  // Synthesize new decisions into sections
  for (const d of uncompactedDecisions) {
    const entry = `- [${d.id}] ${d.summary} (Alasan: ${d.reason})`;

    if (d.type === 'architecture') {
      sections['Keputusan aktif'].push(entry);
      if (d.ref.length > 0) {
        sections['Arsitektur saat ini'].push(`- Modul: ${d.ref.join(', ')} -> ${d.summary}`);
      }
    } else if (d.type === 'convention') {
      sections['Konvensi yang sudah disepakati'].push(entry);
    } else if (d.type === 'scope') {
      sections['Area kerja terakhir'].push(entry);
    }
  }

  // Deduplicate and retain most recent items per section to keep token size flat
  const MAX_ITEMS_PER_SECTION = 10;
  for (const sec of Object.keys(sections)) {
    const unique = Array.from(new Set(sections[sec]));
    sections[sec] = unique.slice(-MAX_ITEMS_PER_SECTION);
  }

  const resultLines: string[] = [];
  const orderedSections = [
    'Arsitektur saat ini',
    'Keputusan aktif',
    'Area kerja terakhir',
    'Konvensi yang sudah disepakati',
  ];

  for (const sec of orderedSections) {
    resultLines.push(`## ${sec}\n`);
    const items = sections[sec] || [];
    if (items.length > 0) {
      resultLines.push(items.join('\n'));
    }
    resultLines.push('');
  }

  return resultLines.join('\n').trim();
}

export function isCompactionNeeded(
  projectRoot: string,
  options?: { threshold?: number; maxBytes?: number }
): { needed: boolean; reason?: string } {
  let threshold = options?.threshold ?? 20;
  const maxBytes = options?.maxBytes ?? 4096;

  try {
    const config = readConfigFile(projectRoot);
    if (config.compaction?.threshold) {
      threshold = config.compaction.threshold;
    }
  } catch {
    // Use fallback
  }

  const statePath = getStateFilePath(projectRoot);
  if (!fs.existsSync(statePath)) {
    return { needed: false, reason: 'state.md does not exist' };
  }

  const state = readStateFile(projectRoot);
  const uncompacted = queryDecisions(projectRoot, undefined, { compacted: false });
  if (uncompacted.length === 0) {
    return { needed: false, reason: 'No uncompacted decisions present' };
  }

  if (state.frontmatter.session_count > 0 && state.frontmatter.session_count >= threshold) {
    return {
      needed: true,
      reason: `Session count (${state.frontmatter.session_count}) reached threshold (${threshold})`,
    };
  }

  const stat = fs.statSync(statePath);
  if (stat.size >= maxBytes) {
    return {
      needed: true,
      reason: `state.md file size (${stat.size} bytes) exceeded limit (${maxBytes} bytes)`,
    };
  }

  return { needed: false, reason: 'Thresholds not reached' };
}

export interface CompactionExecutionResult {
  compacted: boolean;
  decisionsCompacted: number;
  previousByteSize: number;
  newByteSize: number;
  message: string;
}

export async function executeCompaction(
  projectRoot: string,
  options: {
    force?: boolean;
    summarizer?: SummarizerFn;
  } = {}
): Promise<CompactionExecutionResult> {
  const check = isCompactionNeeded(projectRoot);
  if (!options.force && !check.needed) {
    const statePath = getStateFilePath(projectRoot);
    const size = fs.existsSync(statePath) ? fs.statSync(statePath).size : 0;
    return {
      compacted: false,
      decisionsCompacted: 0,
      previousByteSize: size,
      newByteSize: size,
      message: check.reason || 'Compaction not needed',
    };
  }

  const uncompacted = queryDecisions(projectRoot, undefined, { compacted: false });
  if (uncompacted.length === 0) {
    const statePath = getStateFilePath(projectRoot);
    const size = fs.existsSync(statePath) ? fs.statSync(statePath).size : 0;
    return {
      compacted: false,
      decisionsCompacted: 0,
      previousByteSize: size,
      newByteSize: size,
      message: 'No uncompacted decisions found to compact.',
    };
  }

  const statePath = getStateFilePath(projectRoot);
  const previousByteSize = fs.existsSync(statePath) ? fs.statSync(statePath).size : 0;
  const currentState = readStateFile(projectRoot);

  const summarizer = options.summarizer || defaultCompactState;
  const newBody = await summarizer(currentState.body, uncompacted);

  // Write updated state.md: reset session_count, update last_updated
  const newFrontmatter = {
    last_updated: new Date().toISOString(),
    session_count: 0,
  };
  writeStateFile(projectRoot, newFrontmatter, newBody);

  // Mark all uncompacted decisions as compacted: true (keeping raw lines!)
  const ids = uncompacted.map((d) => d.id);
  markDecisionsCompacted(projectRoot, ids);

  const newByteSize = fs.statSync(statePath).size;

  return {
    compacted: true,
    decisionsCompacted: ids.length,
    previousByteSize,
    newByteSize,
    message: `Successfully compacted ${ids.length} decisions.`,
  };
}
