import { Adapter } from './adapters/adapter.interface.js';
import { ClaudeCodeAdapter } from './adapters/claude-code.js';
import { AntigravityAdapter } from './adapters/antigravity.js';
import { GenericFallbackAdapter } from './adapters/generic-fallback.js';

export function getKnownAdapters(): Adapter[] {
  return [new ClaudeCodeAdapter(), new AntigravityAdapter()];
}

export function detectAdapters(projectRoot: string): Adapter[] {
  const adapters = getKnownAdapters();
  const detected = adapters.filter((a) => a.detect(projectRoot));
  if (detected.length === 0) {
    return [new GenericFallbackAdapter()];
  }
  return detected;
}
