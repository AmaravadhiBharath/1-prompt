import type { PlatformAdapter } from '../../types';

import { ChatGPTAdapter } from './chatgpt';
import { ClaudeAdapter } from './claude';
import { GeminiAdapter } from './gemini';
import { PerplexityAdapter } from './perplexity';
import { DeepSeekAdapter } from './deepseek';
import { LovableAdapter } from './lovable';
import { BoltAdapter } from './bolt';
import { CursorAdapter } from './cursor';
import { MetaAIAdapter } from './meta-ai';
import { GenericAdapter } from './generic';

// Register all adapters in order of specificity
// Generic adapter must be last as it always matches
const adapters: PlatformAdapter[] = [
  new ChatGPTAdapter(),
  new ClaudeAdapter(),
  new GeminiAdapter(),
  new PerplexityAdapter(),
  new DeepSeekAdapter(),
  new LovableAdapter(),
  new BoltAdapter(),
  new CursorAdapter(),
  new MetaAIAdapter(),
  new GenericAdapter(), // Fallback - must be last
];

export function getAdapter(): PlatformAdapter | null {
  return adapters.find(adapter => adapter.detect()) || null;
}

export function getPlatformName(): string | null {
  const adapter = getAdapter();
  return adapter ? adapter.name : null;
}

export { adapters };
