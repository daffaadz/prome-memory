import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  initStateFile,
  readStateFile,
  incrementSessionCount,
  touchStateFile,
  getStateFilePath,
} from '../../src/core/memory/state-file.js';

describe('state-file module', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prome-state-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('initializes state.md with session_count 0 and structured headers', () => {
    initStateFile(tempDir);
    const state = readStateFile(tempDir);

    expect(state.frontmatter.session_count).toBe(0);
    expect(state.frontmatter.last_updated).toBeDefined();
    expect(state.body).toContain('## Arsitektur saat ini');
    expect(state.body).toContain('## Keputusan aktif');
    expect(state.body).toContain('## Area kerja terakhir');
    expect(state.body).toContain('## Konvensi yang sudah disepakati');
  });

  it('increments session count correctly', () => {
    initStateFile(tempDir);
    const count1 = incrementSessionCount(tempDir);
    expect(count1).toBe(1);

    const count2 = incrementSessionCount(tempDir);
    expect(count2).toBe(2);

    const state = readStateFile(tempDir);
    expect(state.frontmatter.session_count).toBe(2);
  });

  it('fails loudly when state.md schema is invalid', () => {
    const filePath = getStateFilePath(tempDir);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '---\nlast_updated: bad-date\nsession_count: -5\n---\nBody', 'utf-8');

    expect(() => readStateFile(tempDir)).toThrow(/Invalid state\.md frontmatter schema/);
  });
});
