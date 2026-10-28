// Shared provider catalog. Persist the provider ID, never infer it from a profile name.
export const providers = Object.freeze({
  kiro: { id: 'kiro', name: 'Kiro', binary: 'kiro-cli', pathKey: 'kiroPath', protocol: 'ACP V3', icon: '/kiro.svg' },
  codex: { id: 'codex', name: 'Codex', binary: 'codex', pathKey: 'codexPath', protocol: 'App Server', icon: '/codex.svg' },
});
export const providerFor = item => providers[item?.provider || 'kiro'] || providers.kiro;
export const extensions = init => init?.agentCapabilities?._meta?.fox?.extensionMethods || init?.agentCapabilities?._meta?.kiro?.extensionMethods || [];
export const updateMetadata = update => update?._meta?.fox || update?._meta?.kiro || {};
