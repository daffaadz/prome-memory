# Generic Fallback Adapter

The Generic Fallback adapter provides instructions and template files when no automated agent tool (such as Claude Code or Antigravity) is detected in the repository.

## Supported Environments

- Cursor (`.cursorrules` or system prompt)
- GitHub Copilot (`.github/copilot-instructions.md`)
- Windsurf (`.windsurfrules`)
- Aider
- Custom LLM tools and scripts

## How It Works

When running `prome init` in an unconfigured repository:

1. Prome creates `.prome/inject.md`.
2. The terminal prints explicit, honest manual setup instructions explaining how to reference `.prome/memory/core.md` in your tool of choice.

## Configuration Instructions

In your tool's rule file (e.g. `.cursorrules` or `.github/copilot-instructions.md`), add:

```markdown
Read .prome/memory/core.md before processing any user requests.

IF status is 'uninitialized':

1. Do not immediately implement the code request.
2. Ask a short 2-4 question interview to clarify project goals, hard constraints, tech stack, and non-goals.
3. Update .prome/memory/core.md via `prome amend --set-initialized`.
4. Continue with user request.

IF status is 'initialized':
Read .prome/memory/core.md and .prome/memory/state.md as active context.

At task completion:
Log major decisions with `prome remember '{"type":"...", "summary":"...", "reason":"...", "ref":[...]}'`.
```
