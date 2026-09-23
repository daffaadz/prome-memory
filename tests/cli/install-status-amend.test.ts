import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runInit } from "../../src/cli/commands/init.js";
import { runInstall } from "../../src/cli/commands/install.js";
import { runStatus } from "../../src/cli/commands/status.js";
import { runAmend } from "../../src/cli/commands/amend.js";
import { runRemember } from "../../src/cli/commands/remember.js";
import { readCoreFile } from "../../src/core/memory/core-file.js";

describe("CLI install, status, and amend commands", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "prome-cli-extra-"));
    await runInit({ cwd: tempDir, projectName: "cli-extra-test" });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("runInstall", () => {
    it("installs a skill from a local directory into .prome/skills/", async () => {
      // Create a mock skill directory
      const mockSkillSource = path.join(tempDir, "mock-custom-skill");
      fs.mkdirSync(mockSkillSource);
      fs.writeFileSync(
        path.join(mockSkillSource, "SKILL.md"),
        "# Custom Skill Content",
        "utf-8",
      );

      const result = await runInstall(mockSkillSource, {
        cwd: tempDir,
        json: true,
      });
      expect(result.status).toBe("success");
      expect(result.skillName).toBe("mock-custom-skill");

      const installedSkillPath = path.join(
        tempDir,
        ".prome",
        "skills",
        "mock-custom-skill",
        "SKILL.md",
      );
      expect(fs.existsSync(installedSkillPath)).toBe(true);
      expect(fs.readFileSync(installedSkillPath, "utf-8")).toBe(
        "# Custom Skill Content",
      );
    });

    it("returns error when local source does not exist", async () => {
      const nonExistent = path.join(tempDir, "non-existent-skill");
      const result = await runInstall(nonExistent, {
        cwd: tempDir,
        json: true,
      });
      expect(result.status).toBe("error");
      expect(result.error).toContain("does not exist");
    });
  });

  describe("runStatus", () => {
    it("reports uninitialized status initially", async () => {
      const status = await runStatus({ cwd: tempDir, json: true });
      expect(status.initialized).toBe(false);
      expect(status.coreStatus).toBe("uninitialized");
      expect(status.coreVersion).toBe(1);
      expect(status.totalDecisions).toBe(0);
      expect(status.compactionNeeded).toBe(false);
    });

    it("tracks decisions count and reflects updates", async () => {
      await runRemember(
        JSON.stringify({
          type: "architecture",
          summary: "Status test decision",
          reason: "Checking metrics",
        }),
        { cwd: tempDir },
      );

      const status = await runStatus({ cwd: tempDir, json: true });
      expect(status.totalDecisions).toBe(1);
      expect(status.uncompactedDecisions).toBe(1);
      expect(status.compactedDecisions).toBe(0);
    });
  });

  describe("runAmend", () => {
    it("updates status and bumps version", async () => {
      const result = await runAmend({
        cwd: tempDir,
        setInitialized: true,
        body: "## Updated Tujuan\nCustom goals",
        json: true,
      });

      expect(result.status).toBe("success");
      expect(result.version).toBe(2);
      expect(result.coreStatus).toBe("initialized");

      const core = readCoreFile(tempDir);
      expect(core.frontmatter.version).toBe(2);
      expect(core.frontmatter.status).toBe("initialized");
      expect(core.body).toContain("Custom goals");
    });
  });
});
