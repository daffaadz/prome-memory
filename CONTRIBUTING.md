# Contributing to Prome

Thank you for contributing to Prome! This guide will help you understand the architecture, run tests, and add new agent adapters.

---

## 1. Development Setup

Prerequisites:

- Node.js ≥ 18
- pnpm ≥ 9

```bash
# Clone the repository
git clone https://github.com/prome-dev/prome.git
cd prome

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build TypeScript to dist/
pnpm run build
```

---

## 2. Adding a New Adapter

Prome uses an adapter pattern to integrate with different coding agents and IDEs. All adapters implement the `Adapter` interface in `src/core/adapters/adapter.interface.ts`:

```typescript
export interface Adapter {
  name: string;
  detect(projectRoot: string): boolean;
  installHooks(projectRoot: string): Promise<void>;
  injectMemoryTemplate(): string;
}
```

### Steps to implement an adapter:

1. **Create the adapter file**:
   Create `src/core/adapters/<tool-name>.ts`.
   Implement `detect(projectRoot: string)` to check for configuration directories or files (e.g. `.cursor/` or `.github/copilot-instructions.md`).
   Implement `installHooks(projectRoot: string)` ensuring:
   - Existing user configuration is **never overwritten or destroyed**.
   - Custom keys/settings are merged safely.
     Implement `injectMemoryTemplate()` with the mandatory conditional interview & remember instructions.

2. **Register the adapter in detection logic**:
   Add the new adapter class to `getKnownAdapters()` in `src/core/detect-tool.ts`.

3. **Add unit and integration tests**:
   Create `tests/adapters/<tool-name>.test.ts`. Test:
   - Detection when tool files are present vs absent.
   - Hook installation into fresh projects.
   - Safe merging with pre-existing configuration.

4. **Document the adapter**:
   Add a guide in `docs/adapters/<tool-name>.md`.

---

## 3. Commit Guidelines

Prome follows [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` for new user-facing features or commands
- `fix:` for bug fixes
- `docs:` for documentation updates
- `test:` for adding or improving test coverage
- `refactor:` for code cleanups without functional changes
