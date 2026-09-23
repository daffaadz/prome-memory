#!/usr/bin/env node
import { Command } from 'commander';
import { runInit } from './commands/init.js';
import { runStatus } from './commands/status.js';
import { runAmend } from './commands/amend.js';
import { runCompact } from './commands/compact.js';
import { runRecall } from './commands/recall.js';
import { runRemember } from './commands/remember.js';
import { runInstall } from './commands/install.js';
import { runContext } from './commands/context.js';
import { DecisionType } from '../core/memory/schemas.js';

const program = new Command();

program
  .name('prome')
  .description('Persistent, flat-token project memory CLI for AI coding agents')
  .version('0.1.1');

// init command
program
  .command('init')
  .description('Initialize Prome memory in the current project (silent and idempotent)')
  .option('-a, --adapter <adapter>', 'Specify agent adapter to install (e.g. antigravity, claude-code)')
  .option('--json', 'Output result as JSON')
  .action(async (opts) => {
    await runInit({ json: opts.json, adapter: opts.adapter });
  });

// status command
program
  .command('status')
  .description('Show current memory status, token metrics, and compaction triggers')
  .option('--json', 'Output result as JSON')
  .action(async (opts) => {
    await runStatus({ json: opts.json });
  });

// amend command
program
  .command('amend')
  .description('Update core.md and bump project version')
  .option('--status <status>', 'Set status (initialized | uninitialized)')
  .option('--set-initialized', 'Mark project status as initialized')
  .option('--body <content>', 'Update core.md body markdown directly')
  .option('--json', 'Output result as JSON')
  .action(async (opts) => {
    await runAmend({
      status: opts.status,
      setInitialized: opts.setInitialized,
      body: opts.body,
      json: opts.json,
    });
  });

// compact command
program
  .command('compact')
  .description('Compact uncompacted decisions into state.md (anti-amnesia)')
  .option('--force', 'Force compaction regardless of threshold')
  .option('--json', 'Output result as JSON')
  .action(async (opts) => {
    await runCompact({ force: opts.force, json: opts.json });
  });

// recall command
program
  .command('recall [query]')
  .description('Recall decisions from decisions.jsonl by keyword, type, or file ref')
  .option('-t, --type <type>', 'Filter by type (architecture | convention | scope)')
  .option('-r, --ref <ref>', 'Filter by referenced file path')
  .option('--all', 'Include all decisions (both compacted and uncompacted)')
  .option('--json', 'Output result as JSON')
  .action(async (query, opts) => {
    await runRecall(query, {
      type: opts.type as DecisionType,
      ref: opts.ref,
      compacted: opts.all ? undefined : undefined,
      json: opts.json,
    });
  });

// remember command
program
  .command('remember [decisionJson]')
  .description('Record an architectural decision, convention, or scope change')
  .option('-t, --type <type>', 'Decision type (architecture | convention | scope)')
  .option('-s, --summary <summary>', 'Short summary of the decision')
  .option('--reason <reason>', 'Rationale or context for the decision')
  .option('--ref <files...>', 'Referenced files')
  .option('--json', 'Output result as JSON')
  .action(async (decisionJson, opts) => {
    await runRemember(decisionJson, {
      type: opts.type as DecisionType,
      summary: opts.summary,
      reason: opts.reason,
      ref: opts.ref,
      json: opts.json,
    });
  });

// install command
program
  .command('install <skill>')
  .description('Install a skill from a local path or git URL')
  .option('-n, --name <name>', 'Custom skill destination name')
  .option('--json', 'Output result as JSON')
  .action(async (skill, opts) => {
    await runInstall(skill, { name: opts.name, json: opts.json });
  });

// context command (for agent session start / stop hooks)
program
  .command('context')
  .description('Inject memory context for agents or update session timestamp')
  .option('--inject', 'Format and print memory context for agent injection')
  .option('--update-if-changed', 'Update session counter and timestamp')
  .option('--json', 'Output context as JSON')
  .action(async (opts) => {
    await runContext({
      inject: opts.inject,
      updateIfChanged: opts.updateIfChanged,
      json: opts.json,
    });
  });

program.parse(process.argv);

