import { buildProbeUrl, runReachability, resolveDns } from '../../../headless/diagnostics/network/index.js';
import { probeOnce } from '../../../adapters/browser/diagnostics/reachability.js';
import { t } from '../i18n.js';
import { detailsTable, field } from '../ui/components.js';
import { setupLilySelects } from '../ui/select.js';

export function createNetworkTools(callbacks) {
  return {
    renderTcpPingCard: () => renderTcpPingCard(callbacks),
    renderDnsCard: () => renderDnsCard(callbacks),
  };
}

function renderTcpPingCard({ setStatus, pushEvent, setAction }) {
  const container = document.createElement('div');
  container.className = 'card';
  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = t('net.tcp.title');

  const hostInput = document.createElement('input');
  hostInput.className = 'input';
  hostInput.placeholder = t('net.tcp.host.ph');

  const grid = document.createElement('div');
  grid.className = 'form-grid';

  const portInput = document.createElement('input');
  portInput.className = 'input';
  portInput.type = 'number';
  portInput.value = '443';

  const countInput = document.createElement('input');
  countInput.className = 'input';
  countInput.type = 'number';
  countInput.value = '4';


  const hostWrap = field(t('net.tcp.host'), hostInput);
  hostWrap.classList.add('span-2');
  const portWrap = field(t('net.tcp.port'), portInput);
  const countWrap = field(t('net.tcp.count'), countInput);

  const runBtn = document.createElement('button');
  runBtn.className = 'btn';
  runBtn.textContent = t('run.action.run');

  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'span-2';
  const actions = document.createElement('div');
  actions.className = 'quick-actions';
  actions.appendChild(runBtn);
  actionsWrap.appendChild(actions);

  const out = document.createElement('div');
  out.className = 'details ipq-tool-output';

  runBtn.addEventListener('click', async () => {
    const host = hostInput.value.trim();
    if (!host) return;
    runBtn.disabled = true;
    out.innerHTML = '';
    setStatus(t('status.running'));
    pushEvent({ kind: 'tcp', message: `${host}:${portInput.value}` });
    setAction(`tcp ${host}:${portInput.value}`);
    try {
      const url = buildProbeUrl(host, portInput.value);
      if (!url) throw new Error('invalid host');
      const data = await runReachability({ url, count: countInput.value, probe: probeOnce });
      out.appendChild(
        detailsTable([
          [t('net.result.url'), url],
          [t('net.result.resolved'), null],
          [t('net.result.sentRecv'), `${data.stats.sent}/${data.stats.received}`],
          [t('net.result.minAvgMax'), `${data.stats.min ?? '-'} / ${data.stats.avg ?? '-'} / ${data.stats.max ?? '-'}`],
          [
            t('net.result.samples'),
            data.samples
              .map((s) => {
                const outcome = s.ok ? t('net.sample.ok') : t(`net.sample.${s.outcome}`) || String(s.outcome);
                return `${outcome}:${s.ms}ms`;
              })
              .join(' | '),
          ],
        ]),
      );
      setStatus(t('status.ready'));
    } catch (error) {
      out.appendChild(detailsTable([[t('common.error'), String(error?.message || error)]]));
      setStatus(t('status.error'));
      pushEvent({ level: 'error', kind: 'tcp', message: String(error?.message || error) });
    } finally {
      runBtn.disabled = false;
    }
  });

  grid.append(hostWrap, portWrap, countWrap, actionsWrap);
  container.append(title, grid, out);
  return container;
}

function renderDnsCard({ setStatus, pushEvent, setAction }) {
  const cardRoot = document.createElement('div');
  cardRoot.className = 'card';
  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = t('net.dns.title');

  const grid = document.createElement('div');
  grid.className = 'form-grid';

  const nameInput = document.createElement('input');
  nameInput.className = 'input';
  nameInput.placeholder = t('net.dns.name.ph');

  const typeSelect = document.createElement('select');
  typeSelect.className = 'select';
  for (const t of ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA']) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    typeSelect.appendChild(opt);
  }

  const runBtn = document.createElement('button');
  runBtn.className = 'btn';
  runBtn.textContent = t('run.action.run');

  const out = document.createElement('div');
  out.className = 'details ipq-tool-output';


  runBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    const type = String(typeSelect.value || 'A');
    if (!name) return;
    runBtn.disabled = true;
    out.innerHTML = '';
    setStatus(t('status.running'));
    pushEvent({ kind: 'dns', message: `${type} ${name}` });
    setAction(`dns ${type} ${name}`);
    try {
      const data = await resolveDns({ name, type, fetch });
      out.appendChild(
        detailsTable([
          [t('net.result.name'), data.name],
          [t('net.result.type'), data.type],
          [t('net.result.records'), data.records],
        ]),
      );
      setStatus(t('status.ready'));
    } catch (error) {
      out.appendChild(detailsTable([[t('common.error'), String(error?.message || error)]]));
      setStatus(t('status.error'));
      pushEvent({ level: 'error', kind: 'dns', message: String(error?.message || error) });
    } finally {
      runBtn.disabled = false;
    }
  });

  const nameWrap = field(t('net.dns.name'), nameInput);
  nameWrap.classList.add('span-2');
  const typeWrap = field(t('net.dns.type'), typeSelect);

  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'span-2';
  const actions = document.createElement('div');
  actions.className = 'quick-actions';
  actions.appendChild(runBtn);

  actionsWrap.appendChild(actions);
  grid.append(nameWrap, typeWrap, actionsWrap);
  cardRoot.append(title, grid, out);

  // Upgrade the newly created select to lily-select.
  setupLilySelects(cardRoot);
  return cardRoot;
}

