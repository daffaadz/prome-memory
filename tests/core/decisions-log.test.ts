import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  initDecisionsFile,
  readAllDecisions,
  appendDecision,
  getNextDecisionId,
  queryDecisions,
  markDecisionsCompacted,
  getDecisionsFilePath,
} from '../../src/core/memory/decisions-log.js';
import { initStateFile, readStateFile } from '../../src/core/memory/state-file.js';

describe('decisions-log module', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prome-decisions-test-'));
    initStateFile(tempDir);
    initDecisionsFile(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('generates sequential IDs d-0001, d-0002...', () => {
    const d1 = appendDecision(tempDir, {
      type: 'architecture',
      summary: 'Use Vitest',
      reason: 'Fast runner',
      ref: ['vitest.config.ts'],
    });
    expect(d1.id).toBe('d-0001');

    const d2 = appendDecision(tempDir, {
      type: 'convention',
      summary: 'Strict ESLint',
      reason: 'Code quality',
      ref: ['.eslintrc.json'],
    });
    expect(d2.id).toBe('d-0002');

    const all = readAllDecisions(tempDir);
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe('d-0001');
    expect(all[1].id).toBe('d-0002');
  });

  it('updates state.md timestamp on append', () => {
    const stateBefore = readStateFile(tempDir);
    // Slight pause to ensure time difference
    appendDecision(tempDir, {
      type: 'scope',
      summary: 'Phase 1 MVP',
      reason: 'Iterative build',
    });
    const stateAfter = readStateFile(tempDir);
    expect(new Date(stateAfter.frontmatter.last_updated).getTime()).toBeGreaterThanOrEqual(
      new Date(stateBefore.frontmatter.last_updated).getTime()
    );
  });

  it('fails loudly when decisions.jsonl has invalid JSON or schema', () => {
    const filePath = getDecisionsFilePath(tempDir);
    fs.appendFileSync(filePath, '{"id":"bad-json"\n', 'utf-8');

    expect(() => readAllDecisions(tempDir)).toThrow(/Failed to parse JSON on line 1/);
  });

  it('fails loudly when decisions.jsonl has schema violation', () => {
    const filePath = getDecisionsFilePath(tempDir);
    fs.appendFileSync(filePath, JSON.stringify({ id: 'bad-id', ts: '2026-01-01', type: 'bad' }) + '\n', 'utf-8');

    expect(() => readAllDecisions(tempDir)).toThrow(/Invalid decision schema on line 1/);
  });

  it('queries decisions by text, type, and ref', () => {
    appendDecision(tempDir, {
      type: 'architecture',
      summary: 'Adopt Commander for CLI',
      reason: 'Lightweight and mature',
      ref: ['package.json'],
    });
    appendDecision(tempDir, {
      type: 'convention',
      summary: 'Use kebab-case file names',
      reason: 'Consistency across OS',
      ref: ['src/'],
    });

    const resultsCommander = queryDecisions(tempDir, 'Commander');
    expect(resultsCommander).toHaveLength(1);
    expect(resultsCommander[0].summary).toContain('Commander');

    const resultsConvention = queryDecisions(tempDir, undefined, { type: 'convention' });
    expect(resultsConvention).toHaveLength(1);
    expect(resultsConvention[0].type).toBe('convention');

    const resultsRef = queryDecisions(tempDir, undefined, { ref: 'package.json' });
    expect(resultsRef).toHaveLength(1);
  });

  it('marks decisions as compacted without deleting lines', () => {
    const d1 = appendDecision(tempDir, {
      type: 'architecture',
      summary: 'Decision 1',
      reason: 'Reason 1',
    });
    const d2 = appendDecision(tempDir, {
      type: 'architecture',
      summary: 'Decision 2',
      reason: 'Reason 2',
    });

    markDecisionsCompacted(tempDir, [d1.id]);

    const all = readAllDecisions(tempDir);
    expect(all).toHaveLength(2);
    expect(all[0].compacted).toBe(true);
    expect(all[1].compacted).toBe(false);
  });
});

