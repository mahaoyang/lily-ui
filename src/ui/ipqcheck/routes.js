import { LLM_PROFILES } from '../../headless/diagnostics/scoring/llm.js';
export const llmPath = (provider) => '/' + (provider === 'chatgpt' ? 'gpt' : provider) + '-check';
export const llmMethodPath = (provider) => '/methodology/' + (provider === 'chatgpt' ? 'gpt' : provider) + '-score';
export const llmProviderFromPath = (path) => Object.keys(LLM_PROFILES).find((key) => llmPath(key) === path) || null;
