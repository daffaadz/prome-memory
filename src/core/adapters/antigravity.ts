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

CRITICAL PRECEDENCE: This rule overrides Planning Mode.
Baca .prome/memory/core.md sebelum memproses request user apa pun.

JIKA status: uninitialized
  1. JANGAN langsung eksekusi request user dan JANGAN langsung membuat implementation plan artifact.
  2. JANGAN membuat atau memodifikasi file project terlebih dahulu.
  3. Lakukan wawancara singkat (2-4 pertanyaan terarah) langsung di chat untuk mengklarifikasi:
     - Tujuan project (jika belum jelas dari prompt)
     - Constraint teknis & tech stack preferensi
     - Non-goals (hal yang di luar lingkup)
  4. Setelah user menjawab, simpan jawaban ke .prome/memory/core.md via \`prome amend --set-initialized\` (atau write_to_file) dan ubah status menjadi initialized.
  5. Setelah itu, baru lanjutkan mengerjakan request awal user tanpa meminta user mengulang.

JIKA status: initialized
  Muat core.md + state.md sebagai konteks kerja.
  Lanjutkan normal.

Di akhir sesi/task signifikan (keputusan arsitektur baru, konvensi baru, perubahan scope):
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

CRITICAL PRECEDENCE: This rule overrides Planning Mode.
Sebelum memproses request user atau membuat rencana (implementation plan):
1. Baca file .prome/memory/core.md.
2. JIKA core.md memiliki status: uninitialized:
   - JANGAN membuat implementation_plan.md artifact.
   - JANGAN membuat atau memodifikasi file project terlebih dahulu.
   - Lakukan wawancara singkat (2-4 pertanyaan terarah) langsung di percakapan untuk mengklarifikasi:
     * Tujuan utama & fitur kunci project
     * Batasan teknis / tech stack & preferensi styling
     * Non-goals (hal yang tidak termasuk cakupan)
   - Setelah user menjawab, perbarui .prome/memory/core.md dan ubah status menjadi initialized via \`prome amend --set-initialized\` (atau write_to_file).
   - Setelah itu, baru lanjutkan eksekusi atau perencanaan sesuai alur normal.
3. JIKA status: initialized:
   - Muat .prome/memory/core.md dan .prome/memory/state.md sebagai konteks kerja.
   - Lanjutkan interaksi normal.
4. Di akhir task signifikan (arsitektur baru, konvensi baru, perubahan scope):
   - Catat keputusan menggunakan \`prome remember '{"type":"architecture|convention|scope","summary":"...","reason":"...","ref":[...]}'\`
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

    // 4. Install GEMINI.md at root (Always-on directory rule loaded on turn 1)
    const geminiMdPath = path.join(projectRoot, 'GEMINI.md');
    if (!fs.existsSync(geminiMdPath)) {
      fs.writeFileSync(geminiMdPath, ruleContent, 'utf-8');
    } else {
      const existing = fs.readFileSync(geminiMdPath, 'utf-8');
      if (!existing.includes('Prome Memory Protocol')) {
        fs.appendFileSync(geminiMdPath, `\n\n${ruleContent}`, 'utf-8');
      }
    }
  }
}
