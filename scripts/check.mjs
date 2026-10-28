import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const sourceRoot = resolve(root, 'src');
const failures = [];
let modules = 0;
// Literal ES module imports/re-exports and module-relative worker URLs.
const references = /\b(?:import\s*(?:\(\s*)?|export\s+[^;]*?\s+from\s*|import\s+[^;]*?\s+from\s*|new\s+URL\s*\(\s*)['"](\.[^'"\n]+)['"]/g;

for (const directory of ['src', 'scripts', 'test']) {
  for (const file of await readdir(resolve(root, directory), { recursive: true })) {
    if (directory === 'src' && file.startsWith('themes/')) {
      if (/\.(?:html|mjs|js)$/.test(file)) failures.push(`src/${file}: themes contain CSS and visual resources only`);
      if (file.endsWith('.css')) {
        const css = await readFile(resolve(root, directory, file), 'utf8');
        if (/\/src\/(?:headless|adapters|ui|apps)\//.test(css)) failures.push(`src/${file}: themes must not reference functionality`);
      }
    }
    if (!/\.(?:mjs|js)$/.test(file)) continue;
    const absolute = resolve(root, directory, file);
    const label = relative(root, absolute).split(sep).join('/');
    const source = await readFile(absolute, 'utf8');
    modules++;
    const syntax = spawnSync(process.execPath, ['--check', absolute], { encoding: 'utf8' });
    if (syntax.status !== 0) failures.push(`${label}: ${syntax.stderr || syntax.error}`);
    for (const match of source.matchAll(references)) {
      const target = resolve(dirname(absolute), match[1]);
      try { await access(target); } catch { failures.push(`${label}: missing ${match[1]}`); }
      if (directory !== 'src') continue;
      const path = relative(sourceRoot, target).split(sep).join('/');
      if (path.startsWith('..')) failures.push(`${label}: source imports outside src: ${match[1]}`);
      if (label.startsWith('src/headless/') && !path.startsWith('headless/')) {
        failures.push(`${label}: headless must not import ${path}`);
      }
      // Computation must remain reusable without the workflow execution system.
      if (label.startsWith('src/headless/audio/') && path.startsWith('headless/workflow/')) {
        failures.push(`${label}: audio rules must not depend on workflow execution`);
      }
      if (label.startsWith('src/headless/workflow/runtime/') && /^headless\/workflow\/(graph|persistence)\//.test(path)) {
        failures.push(`${label}: runtime must receive graph/storage behavior through injection`);
      }
      if (label.startsWith('src/adapters/') && /^(themes|ui|apps)\//.test(path)) {
        failures.push(`${label}: adapters must not import presentation or applications`);
      }
      if (label.startsWith('src/ui/') && /^(apps|themes)\//.test(path)) failures.push(`${label}: UI must not import application or theme modules`);
    }
    if (label.startsWith('src/headless/') && /(?<![\w-])(?:document|window|navigator|localStorage|sessionStorage)\s*\./.test(source)) {
      failures.push(`${label}: browser globals belong in adapters or UI`);
    }
  }
}
const { exports: entries } = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
for (const [name, path] of Object.entries(entries)) {
  if (path.includes('*')) continue;
  try { await access(resolve(root, path)); } catch { failures.push(`package export ${name}: missing ${path}`); }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Checked ${modules} modules: syntax, local imports, package exports and layer boundaries.`);
}
