import { cp, mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { apps, entryHtml } from './apps.mjs';
const output = new URL('../dist/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const [name, config] of Object.entries(apps)) {
  const dest = name === 'fox' ? output : new URL(name + '/', output);
  await mkdir(dest, { recursive: true });
  for (const directory of ['headless', 'adapters', 'themes/shared', `ui/${name}`, `themes/${name}`, `apps/${name}`]) {
    const target = new URL(`src/${directory}/`, dest);
    await mkdir(target, { recursive: true });
    await cp(new URL(`../src/${directory}/`, import.meta.url), target, { recursive: true });
  }
  // Public URLs combine independently owned UI, theme and application resources.
  const assets = name === 'finpri' ? new URL('console/', dest) : dest;
  for (const layer of ['themes', 'ui', 'apps']) {
    await cp(new URL(`../src/${layer}/${name}/`, import.meta.url), assets, { recursive: true });
  }
  for (const file of await readdir(assets, { recursive: true })) {
    if (!file.endsWith('.html') || file.startsWith('src/')) continue;
    const target = new URL(file, assets);
    await writeFile(target, entryHtml(await readFile(target, 'utf8'), { name, ...config }));
  }
  const html = await readFile(new URL(`../src/apps/${name}/index.html`, import.meta.url), 'utf8');
  await writeFile(new URL('index.html', dest), entryHtml(html, { name, ...config }));
  if (name === 'finpri') {
    for (const file of ['playground.html', 'playground.js']) {
      await cp(new URL(`../src/ui/finpri/${file}`, import.meta.url), new URL(file, dest), { recursive: true });
    }
  }
}
console.log('Built dist/ (Fox), dist/ipqcheck/, dist/ai-flow/, dist/finpri/ — serve each at its own origin root.');
