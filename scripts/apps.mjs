export const apps = {
  fox: { backendEnv: 'FOX_BACKEND_URL', backend: 'http://127.0.0.1:4177', entry: 'app.js' },
  ipqcheck: { backendEnv: 'IPQCHECK_BACKEND_URL', backend: 'http://127.0.0.1:8787', entry: 'main.js' },
  'ai-flow': { backendEnv: 'AI_FLOW_BACKEND_URL', backend: 'http://127.0.0.1:4174', entry: 'bootstrap.js' },
  finpri: { backendEnv: 'FINPRI_BACKEND_URL', backend: 'http://127.0.0.1:3189', entry: 'finpri-app.js' },
};
export function selectApp() {
  const name = process.argv.find(arg => arg.startsWith('--app='))?.slice(6) || process.env.LILY_APP || 'fox';
  if (!apps[name]) throw new Error(`Unknown app ${name}. Choose ${Object.keys(apps).join(', ')}`);
  return { name, ...apps[name] };
}
export function entryHtml(html, app) {
  return html.replace(/(<script\b[^>]*\bsrc=")[^"]+("[^>]*>)/g, (match, before, after) => match.includes(app.entry) ? `${before}/src/apps/${app.name}/entry.js${after}` : match);
}
