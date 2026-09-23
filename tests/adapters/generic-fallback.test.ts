import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { GenericFallbackAdapter } from "../../src/core/adapters/generic-fallback.js";
import { runInit } from "../../src/cli/commands/init.js";
import { readConfigFile } from "../../src/core/memory/config-file.js";

describe("Generic Fallback Adapter", () => {
  let tempDir: string;
  let adapter: GenericFallbackAdapter;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "prome-fallback-test-"));
    adapter = new GenericFallbackAdapter();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("always detects true as fallback", () => {
    expect(adapter.detect(tempDir)).toBe(true);
  });

  it("installs .prome/inject.md with clear instructions", async () => {
    await adapter.installHooks(tempDir);

    const injectPath = path.join(tempDir, ".prome", "inject.md");
    expect(fs.existsSync(injectPath)).toBe(true);

    const content = fs.readFileSync(injectPath, "utf-8");
    expect(content).toContain(
      "Baca .prome/memory/core.md sebelum memproses request user apa pun.",
    );
    expect(content).toContain("JIKA status: uninitialized");
    expect(content).toContain("JIKA status: initialized");
  });

  it("provides manual instructions mentioning popular AI tools", () => {
    const manual = adapter.getManualInstructions();
    expect(manual).toContain("inject.md");
    expect(manual).toContain("Cursor");
    expect(manual).toContain("Copilot");
  });

  it("activates during prome init when no specific agent is detected", async () => {
    const initResult = await runInit({
      cwd: tempDir,
      projectName: "fallback-project",
    });
    expect(initResult.adaptersInstalled).toContain("generic-fallback");

    const config = readConfigFile(tempDir);
    expect(config.agent_adapters).toContain("generic-fallback");

    const injectPath = path.join(tempDir, ".prome", "inject.md");
    expect(fs.existsSync(injectPath)).toBe(true);
  });
});
