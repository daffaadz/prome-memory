import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runInit } from "../../src/cli/commands/init.js";
import {
  appendDecision,
  readAllDecisions,
} from "../../src/core/memory/decisions-log.js";
import {
  readStateFile,
  incrementSessionCount,
} from "../../src/core/memory/state-file.js";
import {
  defaultCompactState,
  isCompactionNeeded,
  executeCompaction,
} from "../../src/core/memory/compaction.js";
import { runCompact } from "../../src/cli/commands/compact.js";
import { Decision } from "../../src/core/memory/schemas.js";

describe("Compaction Engine", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "prome-compact-test-"));
    await runInit({ cwd: tempDir, projectName: "compact-test" });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("Pure function defaultCompactState", () => {
    it("integrates decisions into standard markdown sections", () => {
      const mockDecisions: Decision[] = [
        {
          id: "d-0001",
          ts: "2026-09-23T10:00:00.000Z",
          type: "architecture",
          summary: "Use Vitest for testing",
          reason: "Fast runner",
          ref: ["vitest.config.ts"],
          supersedes: null,
          compacted: false,
        },
        {
          id: "d-0002",
          ts: "2026-09-23T10:05:00.000Z",
          type: "convention",
          summary: "Conventional Commits",
          reason: "Automated changelogs",
          ref: [],
          supersedes: null,
          compacted: false,
        },
      ];

      const initialBody = `## Arsitektur saat ini\n\n## Keputusan aktif\n\n## Area kerja terakhir\n\n## Konvensi yang sudah disepakati`;
      const compacted = defaultCompactState(initialBody, mockDecisions);

      expect(compacted).toContain("## Arsitektur saat ini");
      expect(compacted).toContain(
        "Modul: vitest.config.ts -> Use Vitest for testing",
      );
      expect(compacted).toContain("## Keputusan aktif");
      expect(compacted).toContain(
        "[d-0001] Use Vitest for testing (Alasan: Fast runner)",
      );
      expect(compacted).toContain("## Konvensi yang sudah disepakati");
      expect(compacted).toContain(
        "[d-0002] Conventional Commits (Alasan: Automated changelogs)",
      );
    });
  });

  describe("isCompactionNeeded", () => {
    it("returns false when no decisions are uncompacted", () => {
      const check = isCompactionNeeded(tempDir);
      expect(check.needed).toBe(false);
    });

    it("returns true when session count reaches threshold with uncompacted decisions", () => {
      appendDecision(tempDir, {
        type: "architecture",
        summary: "Decision 1",
        reason: "Reason 1",
      });

      // Threshold is 20 by default
      for (let i = 0; i < 20; i++) {
        incrementSessionCount(tempDir);
      }

      const check = isCompactionNeeded(tempDir);
      expect(check.needed).toBe(true);
      expect(check.reason).toContain("Session count (20) reached threshold");
    });

    it("returns true when state.md size exceeds maxBytes", () => {
      appendDecision(tempDir, {
        type: "architecture",
        summary: "Decision 1",
        reason: "Reason 1",
      });

      // Max bytes check with tiny limit
      const check = isCompactionNeeded(tempDir, { maxBytes: 10 });
      expect(check.needed).toBe(true);
      expect(check.reason).toContain("file size");
    });
  });

  describe("executeCompaction & Anti-Amnesia", () => {
    it("marks decisions as compacted: true without deleting raw lines", async () => {
      appendDecision(tempDir, {
        type: "architecture",
        summary: "Decision 1",
        reason: "Reason 1",
      });
      appendDecision(tempDir, {
        type: "convention",
        summary: "Decision 2",
        reason: "Reason 2",
      });

      const decisionsBefore = readAllDecisions(tempDir);
      expect(decisionsBefore).toHaveLength(2);
      expect(decisionsBefore.every((d) => !d.compacted)).toBe(true);

      const result = await executeCompaction(tempDir, { force: true });
      expect(result.compacted).toBe(true);
      expect(result.decisionsCompacted).toBe(2);

      // Verify Anti-Amnesia: all raw lines still exist!
      const decisionsAfter = readAllDecisions(tempDir);
      expect(decisionsAfter).toHaveLength(2);
      expect(decisionsAfter[0].id).toBe("d-0001");
      expect(decisionsAfter[0].compacted).toBe(true);
      expect(decisionsAfter[1].id).toBe("d-0002");
      expect(decisionsAfter[1].compacted).toBe(true);

      // Verify state.md updated and session count reset
      const state = readStateFile(tempDir);
      expect(state.frontmatter.session_count).toBe(0);
      expect(state.body).toContain("[d-0001] Decision 1");
      expect(state.body).toContain("[d-0002] Decision 2");
    });

    it("supports custom summarizer function", async () => {
      appendDecision(tempDir, {
        type: "architecture",
        summary: "Custom test",
        reason: "Mocking LLM",
      });

      const mockSummarizer = async (body: string, decisions: Decision[]) => {
        return `## Summarized via Mock LLM\nTotal: ${decisions.length}`;
      };

      const result = await executeCompaction(tempDir, {
        force: true,
        summarizer: mockSummarizer,
      });

      expect(result.compacted).toBe(true);
      const state = readStateFile(tempDir);
      expect(state.body).toBe("## Summarized via Mock LLM\nTotal: 1");
    });

    it("CLI runCompact command with force flag works properly", async () => {
      appendDecision(tempDir, {
        type: "scope",
        summary: "CLI Compact test",
        reason: "Testing command",
      });

      const res = await runCompact({ cwd: tempDir, force: true, json: true });
      expect(res.compacted).toBe(true);
      expect(res.decisionsCompacted).toBe(1);
    });
  });
});
