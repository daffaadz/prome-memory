import fs from 'node:fs';
import path from 'node:path';
import { Adapter } from './adapter.interface.js';

export class AntigravityAdapter implements Adapter {
  name = 'antigravity';

  detect(projectRoot: string): boolean {
    const agentDir = path.join(projectRoot, '.agent');
    const geminiDir = path.join(projectRoot, '.gemini');
    const isUnderVitest = Boolean(process.env.VITEST);
    const envDetected =
      !isUnderVitest &&
      (process.env.ANTIGRAVITY_AGENT === '1' ||
        process.env.ANTIGRAVITY_VSCODE_HOST === '1' ||
        Boolean(process.env.ANTIGRAVITY_APP_DATA_DIR));
    return fs.existsSync(agentDir) || fs.existsSync(geminiDir) || envDetected;
  }

  injectMemoryTemplate(): string {
    return `---
name: prome-memory
description: Persistent project memory management for coding agents using Prome
---

# Prome Memory Protocol

Baca .prome/memory/core.md sebelum memproses request user apa pun.

JIKA status: uninitialized
  1. JANGAN langsung eksekusi request user dan JANGAN langsung membuat implementation plan.
  2. Lakukan interview singkat (2-4 pertanyaan), manfaatkan info yang
     sudah tersirat di prompt user — jangan tanya ulang hal yang
     sudah jelas dari konteks.
     Tanyakan: tujuan project (jika belum jelas), constraint teknis,
     stack/design system, non-goals.
  3. Tulis core.md dari jawaban via \`prome amend\` atau tool setara,
     ubah status menjadi initialized.
  4. Lanjutkan mengerjakan request awal user tanpa user mengulang.

JIKA status: initialized
  Muat core.md + state.md sebagai konteks kerja.
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

    // 1. Install Skill
    const skillDir = path.join(baseDir, 'skills', 'prome-memory');
    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }
    const skillFile = path.join(skillDir, 'SKILL.md');
    fs.writeFileSync(skillFile, this.injectMemoryTemplate(), 'utf-8');

    // 2. Install Rule (Permanently loaded into Antigravity prompt on every turn)
    const rulesDir = path.join(baseDir, 'rules');
    if (!fs.existsSync(rulesDir)) {
      fs.mkdirSync(rulesDir, { recursive: true });
    }
    const ruleFile = path.join(rulesDir, 'prome.md');
    const ruleContent = `# Prome Memory Protocol

CRITICAL RULE: Baca .prome/memory/core.md sebelum memproses request user apa pun.

JIKA status: uninitialized
  1. JANGAN langsung eksekusi request user dan JANGAN langsung membuat implementation plan artifact.
  2. Lakukan interview singkat langsung di chat (2-4 pertanyaan), tanyakan:
     - Tujuan project (jika belum jelas dari prompt)
     - Constraint teknis
     - Stack / design system
     - Non-goals (hal yang di luar lingkup)
  3. Setelah user menjawab interview, simpan jawaban ke .prome/memory/core.md via \`prome amend\` atau tool write_to_file dan ubah status menjadi initialized.
  4. Baru setelah itu lanjutkan mengerjakan request awal user.

JIKA status: initialized
  Muat .prome/memory/core.md dan .prome/memory/state.md sebagai konteks kerja.
  Lanjutkan normal.

Di akhir sesi/task signifikan (arsitektur baru, konvensi baru, scope baru):
  Panggil \`prome remember '{"type":"architecture|convention|scope","summary":"...","reason":"...","ref":[...]}'\`
`;
    fs.writeFileSync(ruleFile, ruleContent, 'utf-8');

    // 3. Install Workflow
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

