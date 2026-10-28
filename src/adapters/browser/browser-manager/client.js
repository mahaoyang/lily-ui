import { createBrowserManagerClient } from '../../../headless/browser-manager/client.js';
export { ApiError } from '../../../headless/browser-manager/client.js';
export const { apiFetch, spaceHeaders } = createBrowserManagerClient({ fetch: (...args) => globalThis.fetch(...args), onUnauthorized: () => window.location.assign('/auth') });
