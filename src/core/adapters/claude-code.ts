import fs from "node:fs";
import path from "node:path";
import { Adapter } from "./adapter.interface.js";

export class ClaudeCodeAdapter implements Adapter {
  name = "claude-code";

  detect(projectRoot: string): boolean {
    const claudeDir = path.join(projectRoot, ".claude");
    const claudeJson = path.join(projectRoot, ".claude.json");
    return fs.existsSync(claudeDir) || fs.existsSync(claudeJson);
  }

  injectMemoryTemplate(): string {
    return `# Prome Memory Protocol

Baca .prome/memory/core.md sebelum memproses request user apa pun.

JIKA status: uninitialized
  1. JANGAN langsung eksekusi request user.
  2. Lakukan interview singkat (2-4 pertanyaan), manfaatkan info yang
     sudah tersirat di prompt user — jangan tanya ulang hal yang
     sudah jelas dari konteks.
     Tanyakan: tujuan project (jika belum jelas), constraint teknis,
     stack/design system, non-goals.
  3. Tulis core.md dari jawaban via \`prome amend\` atau tool setara,
     ubah status menjadi initialized.
  4. Lanjutkan mengerjakan request awal user tanpa user mengulang.

JIKA status: initialized
  Muat core.md + state.md + glossary.md sebagai konteks kerja.
  Lanjutkan normal.

Di akhir sesi/task signifikan (keputusan arsitektur baru, konvensi
baru, perubahan scope):
  Panggil \`prome remember\` dengan objek keputusan terstruktur
  (type, summary, reason, ref file terkait).
  JANGAN memanggil remember untuk detail trivial/tidak berulang.
`;
  }

  async installHooks(projectRoot: string): Promise<void> {
    const claudeDir = path.join(projectRoot, ".claude");
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }

    const settingsPath = path.join(claudeDir, "settings.json");
    let settings: Record<string, any> = {};

    if (fs.existsSync(settingsPath)) {
      try {
        const content = fs.readFileSync(settingsPath, "utf-8");
        settings = JSON.parse(content);
      } catch (err) {
        throw new Error(
          `Failed to parse existing .claude/settings.json: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Merge hooks without overwriting existing settings
    const currentHooks = settings.hooks || {};
    settings.hooks = {
      ...currentHooks,
      SessionStart: "prome context --inject",
      Stop: "prome context --update-if-changed",
    };

    fs.writeFileSync(
      settingsPath,
      JSON.stringify(settings, null, 2) + "\n",
      "utf-8",
    );

    // Also write PROME_INSTRUCTIONS.md inside .claude for reference
    const instructionsPath = path.join(claudeDir, "PROME_INSTRUCTIONS.md");
    fs.writeFileSync(instructionsPath, this.injectMemoryTemplate(), "utf-8");
  }
}
