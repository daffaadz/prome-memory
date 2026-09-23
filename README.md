# Prome

> **Persistent, flat-token, project-scoped memory for AI coding agents.**
> Zero-maintenance, anti-hallucination, local-first.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](<>)

---

## The Problem

Every time you start a new conversation with a coding agent (Claude Code, Antigravity, Cursor, etc.), the agent either starts with total amnesia or forces you to re-explain project constraints, design decisions, and architectural conventions. Naive solutions stuff entire conversation histories into context prompts, causing token usage and API costs to grow uncontrollably over the life of the project.

## The Prome Solution

Prome is an open-source CLI and memory protocol built on three non-negotiable principles:

1. **Local-First**: Everything lives in your project's `.prome/` folder. No required cloud servers, no SaaS subscriptions, no account lock-in.
2. **Token Flat**: Auto-injected context stays constant in size, kept bounded and fresh via automated **Compaction**. Granular details are never lost (**Anti-Amnesia** via append-only `decisions.jsonl`), but are recalled on-demand.
3. **Human Touch Minimal**: `prome init` runs silently and non-interactively. The only human interaction is a brief 2–4 question interview conducted naturally inside your very first agent chat session.

---

## Quickstart

Initialize Prome in your project with one command:

```bash
npx prome init
```

That's it! Prome automatically:

- Creates `.prome/memory/` containing `core.md`, `state.md`, and `decisions.jsonl`
- Detects installed agent tools (Claude Code, Antigravity, etc.)
- Automatically installs agent hooks and memory skill protocols

---

## First Session Walkthrough

Here is how your first chat session with an AI coding agent works with Prome:

```text
User: "Add a user authentication module with JWT."

Agent: (Reads .prome/memory/core.md -> finds status: uninitialized)
Agent: "Before I implement JWT authentication, I noticed this project doesn't
        have memory initialized yet. Let me ask 3 quick questions:
        1. What is the target deployment environment (e.g. Serverless, Docker, Edge)?
        2. Are there hard security constraints (e.g. cookie-based vs bearer header)?
        3. Any non-goals (e.g. social logins out of scope for now)?"

User: "Docker with Node.js, bearer token, no social logins for now."

Agent: (Executes `prome amend --set-initialized --body "..."`)
Agent: "Core memory initialized! Now implementing the JWT authentication module..."
       (Writes authentication code...)
Agent: (Executes `prome remember '{"type":"architecture","summary":"JWT bearer auth","reason":"Docker containerized backend","ref":["src/auth/"]}'`)
Agent: "JWT authentication implemented and recorded to project memory."
```

In all future sessions, the agent automatically loads `core.md` and `state.md` as active context with zero repetitive explanations needed.

---

## CLI Command Reference

All commands support `--json` for machine-readable agent automation:

| Command                 | Description                                                                      |
| ----------------------- | -------------------------------------------------------------------------------- |
| `prome init`            | Silent, idempotent initialization. Sets up `.prome/` and hooks.                  |
| `prome status`          | Displays memory health, file sizes, decision counts, and compaction triggers.    |
| `prome amend`           | Updates `core.md` and increments the project version.                            |
| `prome compact`         | Compacts uncompacted decisions into `state.md` while keeping raw decision logs.  |
| `prome recall <query>`  | Structured grep across `decisions.jsonl` by keyword, `--type`, or `--ref`.       |
| `prome remember <json>` | Appends a structured decision with an auto-increment ID (`d-0001`, `d-0002`...). |
| `prome install <skill>` | Copies or clones a skill package from a local path or git URL.                   |
| `prome context`         | Context injection helper for agent `SessionStart` and `Stop` hooks.              |

---

## Memory File Architecture

```
.prome/
├── memory/
│   ├── core.md            # Immutable constraints, goals, stack, non-goals (versioned)
│   ├── state.md           # Compacted active architecture, conventions, recent work
│   └── decisions.jsonl    # Append-only chronological log of all decisions (anti-amnesia)
├── skills/                # Installed custom agent skills
└── config.yml             # Compaction thresholds and active adapters
```

---

## Supported Agent Adapters

- **Claude Code**: Configures `.claude/settings.json` hooks (`SessionStart` and `Stop`) with safe merging.
- **Google Antigravity**: Installs `.agent/skills/prome-memory/SKILL.md` and `.agent/workflows/prome-sync.md`.
- **Generic Fallback**: Generates `.prome/inject.md` with plug-and-play instructions for Cursor, Copilot, Windsurf, Aider, etc.

---

## Compaction & Anti-Amnesia

As your project grows, decisions are logged to `decisions.jsonl`. When `session_count` reaches threshold (default 20) or `state.md` exceeds 4KB:

- Prome condenses recent decisions into `state.md`.
- The decisions are marked `compacted: true`.
- **Raw lines in `decisions.jsonl` are never deleted!** The agent can still query any historical decision using `prome recall`.

---

## Explicit MVP Boundaries (Not Yet Implemented)

To maintain extreme focus and reliability, the following features are intentionally out of scope for the MVP:

- Vector-based semantic database / embeddings recall (planned for v0.2)
- Centralized skill registry server (use local paths or git URLs)
- Web UI dashboard
- Cloud multi-user real-time sync

---

## License

[MIT](LICENSE) © Prome Contributors
