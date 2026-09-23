import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  initCoreFile,
  readCoreFile,
  writeCoreFile,
  amendCoreFile,
  getCoreFilePath,
} from '../../src/core/memory/core-file.js';

describe('core-file module', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prome-core-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('initializes core.md with status: uninitialized and version 1', () => {
    initCoreFile(tempDir, 'test-project');
    const core = readCoreFile(tempDir);

    expect(core.frontmatter.project).toBe('test-project');
    expect(core.frontmatter.version).toBe(1);
    expect(core.frontmatter.status).toBe('uninitialized');
    expect(core.body).toContain('## Tujuan');
    expect(core.body).toContain('## Constraint keras');
    expect(core.body).toContain('## Design system / stack awal');
    expect(core.body).toContain('## Non-goals');
  });

  it('fails loudly when frontmatter is corrupted or invalid', () => {
    const filePath = getCoreFilePath(tempDir);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '---\nproject: test\nversion: invalid-num\nstatus: wrong\n---\nBody', 'utf-8');

    expect(() => readCoreFile(tempDir)).toThrow(/Invalid core\.md frontmatter schema/);
  });

  it('amends core.md and increments version', () => {
    initCoreFile(tempDir, 'test-project');
    const amended = amendCoreFile(tempDir, { status: 'initialized' }, '## Custom Tujuan');

    expect(amended.frontmatter.version).toBe(2);
    expect(amended.frontmatter.status).toBe('initialized');
    expect(amended.body).toBe('## Custom Tujuan');

    const reread = readCoreFile(tempDir);
    expect(reread.frontmatter.version).toBe(2);
    expect(reread.frontmatter.status).toBe('initialized');
  });
});
