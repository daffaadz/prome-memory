# Claude Code Adapter

The Claude Code adapter integrates Prome seamlessly with Anthropic's [Claude Code CLI](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview).

## Detection
Prome automatically detects Claude Code when either:
- A `.claude/` directory exists in the project root, or
- A `.claude.json` configuration file exists.

## Integration Mechanism
When `prome init` runs, it installs hooks into `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": "prome context --inject",
    "Stop": "prome context --update-if-changed"
  }
}
```

### Safety & Merging
- Prome **does not overwrite** existing keys in `settings.json`.
- If custom hooks already exist, Prome merges `SessionStart` and `Stop` alongside existing hooks.
- It also generates `.claude/PROME_INSTRUCTIONS.md` containing the memory protocol instructions.

## Hook Workflow
1. **SessionStart**: Executes `prome context --inject`.
   - If `status: uninitialized`: Injects the initial project interview prompt.
   - If `status: initialized`: Injects `core.md` and `state.md` contents into Claude's working context.
2. **Stop**: Executes `prome context --update-if-changed`, incrementing the session counter and touching timestamps.

