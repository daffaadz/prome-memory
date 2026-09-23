import { describe, it, expect } from "vitest";
import {
  CoreFrontmatterSchema,
  StateFrontmatterSchema,
  DecisionSchema,
  DecisionInputSchema,
  ConfigSchema,
} from "../../src/core/memory/schemas.js";

describe("Schemas Validation", () => {
  describe("CoreFrontmatterSchema", () => {
    it("validates a correct core frontmatter", () => {
      const valid = {
        project: "my-project",
        created: "2026-09-23T10:00:00.000Z",
        version: 1,
        status: "uninitialized" as const,
      };
      const result = CoreFrontmatterSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("fails when project name is empty", () => {
      const invalid = {
        project: "",
        created: new Date().toISOString(),
        version: 1,
        status: "initialized",
      };
      const result = CoreFrontmatterSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("fails when status is invalid", () => {
      const invalid = {
        project: "test",
        created: new Date().toISOString(),
        version: 1,
        status: "in-progress",
      };
      const result = CoreFrontmatterSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("fails when version is not a positive integer", () => {
      const invalid = {
        project: "test",
        created: new Date().toISOString(),
        version: 0,
        status: "initialized",
      };
      const result = CoreFrontmatterSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("StateFrontmatterSchema", () => {
    it("validates correct state frontmatter", () => {
      const valid = {
        last_updated: "2026-09-23T10:00:00.000Z",
        session_count: 5,
      };
      const result = StateFrontmatterSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("fails when session_count is negative", () => {
      const invalid = {
        last_updated: "2026-09-23T10:00:00.000Z",
        session_count: -1,
      };
      const result = StateFrontmatterSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("fails on invalid date format", () => {
      const invalid = {
        last_updated: "not-a-date",
        session_count: 0,
      };
      const result = StateFrontmatterSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("DecisionSchema", () => {
    it("validates a correct decision entry", () => {
      const valid = {
        id: "d-0001",
        ts: "2026-09-23T10:00:00.000Z",
        type: "architecture",
        summary: "Use Vitest for testing",
        reason: "Fast, native ESM and TypeScript support",
        ref: ["vitest.config.ts"],
        supersedes: null,
        compacted: false,
      };
      const result = DecisionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("fails on invalid ID format", () => {
      const invalid = {
        id: "decision-1",
        ts: new Date().toISOString(),
        type: "architecture",
        summary: "test",
        reason: "test",
        ref: [],
        supersedes: null,
        compacted: false,
      };
      const result = DecisionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("fails on unknown decision type", () => {
      const invalid = {
        id: "d-0002",
        ts: new Date().toISOString(),
        type: "random_type",
        summary: "test",
        reason: "test",
        ref: [],
        supersedes: null,
        compacted: false,
      };
      const result = DecisionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("DecisionInputSchema", () => {
    it("accepts valid input without ID or ts", () => {
      const input = {
        type: "convention",
        summary: "Use conventional commits",
        reason: "Standardized git history",
        ref: ["package.json"],
      };
      const result = DecisionInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("ConfigSchema", () => {
    it("validates correct config.yml structure", () => {
      const valid = {
        prome_version: 1,
        agent_adapters: ["claude-code"],
        compaction: {
          trigger: "session_count",
          threshold: 20,
        },
        recall: {
          mode: "grep",
        },
      };
      const result = ConfigSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("fails when compaction threshold is not positive", () => {
      const invalid = {
        prome_version: 1,
        agent_adapters: [],
        compaction: {
          trigger: "session_count",
          threshold: 0,
        },
        recall: {
          mode: "grep",
        },
      };
      const result = ConfigSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
