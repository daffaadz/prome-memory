import fs from "node:fs";
import path from "node:path";
import { Adapter } from "./adapter.interface.js";

export class GenericFallbackAdapter implements Adapter {
  name = "generic-fallback";

  detect(_projectRoot: string): boolean {
    return true; // Always available as fallback
  }

  injectMemoryTemplate(): string {
    return `# Prome Memory Protocol (Generic Setup)

To use Prome with your AI coding tool:
Add this instruction to your system prompt, custom rules, or assistant instructions:

---

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
    const promeDir = path.join(projectRoot, ".prome");
    if (!fs.existsSync(promeDir)) {
      fs.mkdirSync(promeDir, { recursive: true });
    }

    const injectFilePath = path.join(promeDir, "inject.md");
    fs.writeFileSync(injectFilePath, this.injectMemoryTemplate(), "utf-8");
  }

  getManualInstructions(): string {
    return `[Notice] No automated agent tool (Claude Code / Antigravity) was detected.
Created '.prome/inject.md'.
To enable Prome memory in your tool (Cursor, Copilot, Windsurf, Aider, etc.):
Add the instructions in '.prome/inject.md' or reference '.prome/memory/core.md' in your system prompt or rules file (e.g. .cursorrules).`;
  }
}
