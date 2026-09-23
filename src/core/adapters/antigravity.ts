import fs from 'node:fs';
import path from 'node:path';
import { Adapter } from './adapter.interface.js';

export class AntigravityAdapter implements Adapter {
  name = 'antigravity';

  detect(projectRoot: string): boolean {
    const agentDir = path.join(projectRoot, '.agent');
    const geminiDir = path.join(projectRoot, '.gemini');
    return fs.existsSync(agentDir) || fs.existsSync(geminiDir);
  }

  injectMemoryTemplate(): string {
    return `---
name: prome-memory
description: Persistent project memory management for coding agents using Prome
---

# Prome Memory Protocol

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
    // Determine base folder: prefer .agent, fallback to .gemini if only .gemini exists
    const agentDir = path.join(projectRoot, '.agent');
    const geminiDir = path.join(projectRoot, '.gemini');
    const baseDir = fs.existsSync(geminiDir) && !fs.existsSync(agentDir) ? geminiDir : agentDir;

    const skillDir = path.join(baseDir, 'skills', 'prome-memory');
    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }
    const skillFile = path.join(skillDir, 'SKILL.md');
    fs.writeFileSync(skillFile, this.injectMemoryTemplate(), 'utf-8');

    const workflowDir = path.join(baseDir, 'workflows');
    if (!fs.existsSync(workflowDir)) {
      fs.mkdirSync(workflowDir, { recursive: true });
    }
    const workflowFile = path.join(workflowDir, 'prome-sync.md');
    const workflowContent = `# Prome Sync

Sync and record session decisions with Prome memory.

// turbo
1. Review session activity and significant changes.
2. Record architectural, convention, or scope decisions:
   run: \`prome remember '{"type":"<architecture|convention|scope>","summary":"<summary>","reason":"<reason>","ref":["<files>"]}'\`
3. Check memory status:
   run: \`prome status\`
`;
    fs.writeFileSync(workflowFile, workflowContent, 'utf-8');
  }
}
