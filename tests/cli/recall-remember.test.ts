import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runInit } from "../../src/cli/commands/init.js";
import { runRemember } from "../../src/cli/commands/remember.js";
import { runRecall } from "../../src/cli/commands/recall.js";
import { readAllDecisions } from "../../src/core/memory/decisions-log.js";

describe("CLI remember & recall commands", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "prome-cli-mem-"));
    await runInit({ cwd: tempDir, projectName: "cli-test" });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("runRemember", () => {
    it("appends structured decision from JSON string", async () => {
      const payload = JSON.stringify({
        type: "architecture",
        summary: "Adopt Vitest for test runner",
        reason: "Fast native ESM support",
        ref: ["vitest.config.ts"],
      });

      const res = await runRemember(payload, { cwd: tempDir, json: true });
      expect(res.status).toBe("success");
      expect(res.decision).toBeDefined();
      expect(res.decision?.id).toBe("d-0001");
      expect(res.decision?.type).toBe("architecture");
      expect(res.decision?.summary).toBe("Adopt Vitest for test runner");

      const all = readAllDecisions(tempDir);
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe("d-0001");
    });

    it("increments ID on subsequent remember calls", async () => {
      await runRemember(
        JSON.stringify({
          type: "architecture",
          summary: "Decision 1",
          reason: "Reason 1",
        }),
        { cwd: tempDir },
      );

      const res2 = await runRemember(
        JSON.stringify({
          type: "convention",
          summary: "Decision 2",
          reason: "Reason 2",
        }),
        { cwd: tempDir },
      );

      expect(res2.decision?.id).toBe("d-0002");
      const all = readAllDecisions(tempDir);
      expect(all).toHaveLength(2);
      expect(all[1].id).toBe("d-0002");
    });

    it("rejects malformed JSON and returns error status", async () => {
      const res = await runRemember("{ bad json", { cwd: tempDir, json: true });
      expect(res.status).toBe("error");
      expect(res.error).toContain("Invalid JSON string");

      const all = readAllDecisions(tempDir);
      expect(all).toHaveLength(0);
    });

    it("rejects missing required schema fields", async () => {
      const incomplete = JSON.stringify({
        type: "architecture",
        summary: "No reason provided",
      });

      const res = await runRemember(incomplete, { cwd: tempDir, json: true });
      expect(res.status).toBe("error");
      expect(res.error).toContain("reason");

      const all = readAllDecisions(tempDir);
      expect(all).toHaveLength(0);
    });
  });

  describe("runRecall", () => {
    beforeEach(async () => {
      await runRemember(
        JSON.stringify({
          type: "architecture",
          summary: "Use Vitest runner",
          reason: "Fast and lightweight",
          ref: ["vitest.config.ts"],
        }),
        { cwd: tempDir },
      );

      await runRemember(
        JSON.stringify({
          type: "convention",
          summary: "Conventional commits standard",
          reason: "Automated changelogs",
          ref: ["package.json"],
        }),
        { cwd: tempDir },
      );

      await runRemember(
        JSON.stringify({
          type: "scope",
          summary: "Exclude web dashboard in MVP",
          reason: "Focus on CLI essentials",
          ref: ["README.md"],
        }),
        { cwd: tempDir },
      );
    });

    it("recalls all decisions when query is empty", async () => {
      const res = await runRecall("", { cwd: tempDir, json: true });
      expect(res.status).toBe("success");
      expect(res.count).toBe(3);
      expect(res.decisions).toHaveLength(3);
    });

    it("filters decisions by keyword search", async () => {
      const res = await runRecall("Vitest", { cwd: tempDir, json: true });
      expect(res.count).toBe(1);
      expect(res.decisions[0].summary).toContain("Vitest");
    });

    it("filters decisions by type", async () => {
      const res = await runRecall(undefined, {
        cwd: tempDir,
        type: "convention",
        json: true,
      });
      expect(res.count).toBe(1);
      expect(res.decisions[0].type).toBe("convention");
    });

    it("filters decisions by file ref", async () => {
      const res = await runRecall(undefined, {
        cwd: tempDir,
        ref: "package.json",
        json: true,
      });
      expect(res.count).toBe(1);
      expect(res.decisions[0].ref).toContain("package.json");
    });
  });
});
