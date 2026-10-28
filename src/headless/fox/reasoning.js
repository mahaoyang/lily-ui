import { optionChoices } from './config-options.js';
// CLI-advertised choices are authoritative; never infer support from a model name.
export const effortNames = { none: '关闭', minimal: '极低', low: '低', medium: '中', high: '高', xhigh: '极高', max: '最高', ultra: '超高' };
export const effortChoices = option => optionChoices(option).filter(o => o.value !== 'default');
export const effortOption = options => (options || []).find(o => o.type === 'select' && (o.category === 'thought_level' || /effort|thinking|reasoning|思考|深度/i.test(o.id + ' ' + o.name)));
