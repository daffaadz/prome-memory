import { Adapter } from './adapters/adapter.interface.js';
import { ClaudeCodeAdapter } from './adapters/claude-code.js';
import { AntigravityAdapter } from './adapters/antigravity.js';
import { GenericFallbackAdapter } from './adapters/generic-fallback.js';

export function getKnownAdapters(): Adapter[] {
  return [new ClaudeCodeAdapter(), new AntigravityAdapter()];
}

export function detectAdapters(projectRoot: string, requestedAdapter?: string): Adapter[] {
  const adapters = getKnownAdapters();
  if (requestedAdapter) {
    const matched = adapters.find((a) => a.name === requestedAdapter.toLowerCase().trim());
    if (matched) return [matched];
    if (requestedAdapter === 'generic' || requestedAdapter === 'generic-fallback') {
      return [new GenericFallbackAdapter()];
    }
  }

  const detected = adapters.filter((a) => a.detect(projectRoot));
  if (detected.length === 0) {
    return [new GenericFallbackAdapter()];
  }
  return detected;
}

