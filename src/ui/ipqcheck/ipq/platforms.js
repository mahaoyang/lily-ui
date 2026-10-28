export const SOCIAL_PROFILES = { youtube: { name: 'YouTube', path: '/youtube-ip-check' }, tiktok: { name: 'TikTok', path: '/tiktok-ip-check' }, twitter: { name: 'X.com', path: '/x-ip-check' }, instagram: { name: 'Ins', path: '/instagram-ip-check' } };
export function socialFromPath(path) { return Object.keys(SOCIAL_PROFILES).find(key => SOCIAL_PROFILES[key].path === path) || null; }
