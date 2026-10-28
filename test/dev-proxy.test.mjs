import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('selected backend receives same-origin POST and source entries stay local', async () => {
  const upstream = http.createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ host: req.headers.host, origin: req.headers.origin, url: req.url }));
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  const backend = `http://127.0.0.1:${upstream.address().port}`;
  const child = spawn(process.execPath, ['scripts/dev.mjs', '--app=finpri'], { env: { ...process.env, PORT: '0', HOST: '127.0.0.1', FINPRI_BACKEND_URL: backend }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const base = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Dev server startup timed out')), 5000);
      child.stdout.on('data', data => { const m = data.toString().match(/http:\/\/127.0.0.1:\d+/); if (m) { clearTimeout(timer); resolve(m[0]); } });
      child.once('error', reject);
    });
    const response = await fetch(base + '/api/profiles', { method: 'POST', headers: { origin: base }, body: '{}' });
    assert.deepEqual(await response.json(), { host: new URL(backend).host, origin: backend, url: '/api/profiles' });
    const foreign = await (await fetch(base + '/api/profiles', { headers: { origin: 'http://foreign.test' } })).json();
    assert.equal(foreign.origin, 'http://foreign.test');
    const html = await (await fetch(base)).text(); assert.match(html, /\/src\/apps\/finpri\/entry.js/);
    assert.equal((await fetch(base + '/console/styles/index.css')).status, 200);
    assert.equal((await fetch(base + '/playground.html')).status, 200);
  } finally { child.kill(); await once(child, 'exit'); await new Promise(resolve => upstream.close(resolve)); }
});
