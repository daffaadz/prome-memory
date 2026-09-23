import chalk from 'chalk';
import { readCoreFile } from '../../core/memory/core-file.js';
import { readStateFile, touchStateFile, incrementSessionCount } from '../../core/memory/state-file.js';

export interface ContextOptions {
  inject?: boolean;
  updateIfChanged?: boolean;
  json?: boolean;
  cwd?: string;
}

export interface ContextResult {
  status: 'uninitialized' | 'initialized';
  context: string;
  sessionCount: number;
}

export function buildInjectedContext(projectRoot: string): ContextResult {
  const core = readCoreFile(projectRoot);
  const state = readStateFile(projectRoot);

  if (core.frontmatter.status === 'uninitialized') {
    const interviewPrompt = `# Prome Context (UNINITIALIZED)

Status: uninitialized
Project: ${core.frontmatter.project}

PROTOCAL INSTRUCTIONS:
1. JANGAN langsung eksekusi request user.
2. Lakukan interview singkat (2-4 pertanyaan), manfaatkan info yang sudah tersirat di prompt user — jangan tanya ulang hal yang sudah jelas dari konteks.
   Tanyakan: tujuan project (jika belum jelas), constraint teknis, stack/design system, non-goals.
3. Tulis core.md dari jawaban via \`prome amend\` atau tool setara, ubah status menjadi initialized.
4. Lanjutkan mengerjakan request awal user tanpa user mengulang.
`;
    return {
      status: 'uninitialized',
      context: interviewPrompt,
      sessionCount: state.frontmatter.session_count,
    };
  }

  const activeContext = `# Prome Context

## Core Memory (Project: ${core.frontmatter.project}, v${core.frontmatter.version})
${core.body}

---

## State Memory (Sessions: ${state.frontmatter.session_count}, Last Updated: ${state.frontmatter.last_updated})
${state.body}

---
*Notice: At the end of significant tasks (architectural decisions, conventions, scope changes), run:*
\`prome remember '{"type":"architecture|convention|scope","summary":"...","reason":"...","ref":[...]}'\`
`;

  return {
    status: 'initialized',
    context: activeContext,
    sessionCount: state.frontmatter.session_count,
  };
}

export async function runContext(options: ContextOptions = {}): Promise<ContextResult> {
  const projectRoot = options.cwd || process.cwd();

  if (options.updateIfChanged) {
    incrementSessionCount(projectRoot);
  }

  const result = buildInjectedContext(projectRoot);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (options.inject) {
    console.log(result.context);
  } else {
    console.log(chalk.bold(`Prome Memory Status: ${result.status}`));
    console.log(chalk.dim(`Session count: ${result.sessionCount}`));
  }

  return result;
}

