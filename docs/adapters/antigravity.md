# Google Antigravity Adapter

The Antigravity adapter integrates Prome with Google DeepMind's Antigravity (AGY) agentic coding assistant.

## Detection

Prome automatically detects Antigravity when either:

- An `.agent/` directory exists, or
- A `.gemini/` configuration directory exists.

## Integration Mechanism

When `prome init` runs:

1. **Skill Installation**:
   Installs `.agent/skills/prome-memory/SKILL.md` (or `.gemini/skills/prome-memory/SKILL.md`).
   The skill declares:
   - Frontmatter (`name: prome-memory`, `description: ...`)
   - Mandatory conditional interview protocol
   - Automatic decision remembering protocol

2. **Sync Workflow Installation**:
   Installs `.agent/workflows/prome-sync.md`.
   Allows running `/prome-sync` or invoking automated post-task decision commits via `prome remember`.

## Workflow

1. When starting a conversation, the agent reads `.prome/memory/core.md`.
2. If `status: uninitialized`, the agent carries out a concise 2-4 question interview and populates `core.md`.
3. At the conclusion of architectural tasks, the agent calls `prome remember` with structured JSON to log decisions.
