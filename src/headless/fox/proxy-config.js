const fail = message => { throw new Error(message); };
export function normalizeProxyInput(input) {
  let text = String(input ?? '').replace(/^\uFEFF/, '').trim();
  if (text.length > 900000) fail('代理配置过大');
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) text = text.slice(1, -1).trim();
  if (text.startsWith('{') || text.startsWith('[')) return text;
  text = text.replace(/&amp;/g, '&');
  if (/\s/.test(text.split('#')[0])) fail('代理链接中有空格或换行，请复制完整的一条链接');
  if (/[%](?![a-f\d]{2})/i.test(text)) fail('链接含不完整的 % 编码');
  return text.replace(/^(ss|hy2|hysteria2):/i, value => value.toLowerCase());
}
export function validateOutbound(n) {
  if (!n || !['hysteria2','shadowsocks'].includes(n.type)) fail('仅支持 HY2 和 SS 节点');
  if (typeof n.server !== 'string' || !n.server.trim() || /[\s/@?#]/.test(n.server)) fail('服务器地址无效，请只填写主机名或 IP');
  if (!Number.isInteger(n.server_port) || n.server_port < 1 || n.server_port > 65535) fail('代理端口必须为 1–65535');
  if (typeof n.password !== 'string' || !n.password) fail('代理密码不能为空');
  if (n.detour) fail('暂不支持依赖其他出站的链式节点');
  if (n.type === 'shadowsocks' && !['aes-128-gcm','aes-192-gcm','aes-256-gcm','chacha20-ietf-poly1305','xchacha20-ietf-poly1305','2022-blake3-aes-128-gcm','2022-blake3-aes-256-gcm','2022-blake3-chacha20-poly1305','none'].includes(n.method)) fail('不支持此 SS 加密方式，请核对 method');
  if (n.type === 'hysteria2') {
    if (!n.tls || n.tls.enabled !== true) fail('HY2 必须启用 TLS');
    if (n.tls.insecure !== undefined && typeof n.tls.insecure !== 'boolean') fail('TLS insecure 必须是 true 或 false');
    if (n.obfs && (n.obfs.type !== 'salamander' || typeof n.obfs.password !== 'string' || !n.obfs.password)) fail('HY2 混淆需要 salamander 和非空密码');
  }
  return { ...n, tag: 'proxy-out' };
}
export function proxyNodes(input) {
  let data; try { data = JSON.parse(normalizeProxyInput(input)); } catch (e) { fail(e instanceof SyntaxError ? 'JSON 格式不完整或有语法错误' : e.message); }
  const nodes = Array.isArray(data) ? data : data?.outbounds || [data];
  if (!Array.isArray(nodes)) fail('outbounds 必须是数组');
  const supported = nodes.filter(n => n && ['hysteria2','shadowsocks'].includes(n.type));
  if (!supported.length) fail('JSON 中没有 HY2 / SS 节点');
  return supported.map(n => { const node = validateOutbound(n); return { name: String(n.tag || `${n.server}:${n.server_port}`), value: JSON.stringify(node) }; });
}
const decode64 = text => {
  const value = text.replace(/-/g,'+').replace(/_/g,'/');
  if (!/^[a-z\d+/]*={0,2}$/i.test(value) || value.replace(/=+$/,'').length % 4 === 1) fail('SS Base64 编码无效');
  try { return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(value), c => c.charCodeAt(0))); } catch { fail('SS Base64 内容无效或复制不完整'); }
};
export function parseProxy(input) {
  const uri = normalizeProxyInput(input);
  if (uri.startsWith('{') || uri.startsWith('[')) { const nodes = proxyNodes(uri); if (nodes.length !== 1) fail('存在多个节点，请先选择一个节点'); return JSON.parse(nodes[0].value); }
  if (!/^(ss|hy2|hysteria2):\/\//.test(uri)) fail('请填写完整的 ss://、hy2:// 或 hysteria2:// 链接');
  let url; try { url = new URL(uri); } catch { fail('代理链接地址或端口无效'); }
  const known = url.protocol === 'ss:' ? ['plugin'] : ['sni','peer','insecure','allowInsecure','obfs','obfs-password','obfsPassword','pinSHA256'];
  for (const key of url.searchParams.keys()) if (!known.includes(key)) fail(`不支持链接参数 ${key}，请检查是否复制错误`);
  if (url.protocol === 'ss:') {
    const raw = uri.slice(5).split('#')[0].split('?')[0];
    let credentials, address;
    if (raw.includes('@')) { const at = raw.lastIndexOf('@'); address = raw.slice(at+1); credentials = decodeURIComponent(raw.slice(0,at)); if (!credentials.includes(':')) credentials = decode64(credentials); }
    else { const decoded = decode64(raw); const at = decoded.lastIndexOf('@'); if (at < 0) fail('SS 链接缺少服务器地址'); credentials = decoded.slice(0,at); address = decoded.slice(at+1); }
    const sep = credentials.indexOf(':'), colon = address.lastIndexOf(':');
    if (sep < 1 || colon < 1) fail('SS 链接缺少加密方式、密码或端口');
    const port = address.slice(colon+1).replace(/\/$/,'');
    if (!/^\d+$/.test(port)) fail('SS 端口无效');
    const n = { type:'shadowsocks', server:address.slice(0,colon).replace(/^\[|\]$/g,''), server_port:Number(port), method:credentials.slice(0,sep), password:credentials.slice(sep+1) };
    const plugin = url.searchParams.get('plugin'); if (plugin) { const [name,...options] = plugin.split(';'); n.plugin=name; n.plugin_opts=options.join(';'); }
    return validateOutbound(n);
  }
  const insecure = url.searchParams.get('insecure') ?? url.searchParams.get('allowInsecure') ?? 'false';
  if (!['true','false','1','0'].includes(insecure)) fail('insecure 参数只能为 true、false、1 或 0');
  const server=url.hostname.replace(/^\[|\]$/g,'');
  const n={type:'hysteria2',server,server_port:Number(url.port || 443),password:decodeURIComponent(url.username)+(url.password ? ':'+decodeURIComponent(url.password) : ''),tls:{enabled:true,server_name:url.searchParams.get('sni')||url.searchParams.get('peer')||server,insecure:['true','1'].includes(insecure)}};
  if (url.pathname && url.pathname !== '/') fail('HY2 链接不支持路径，请检查服务器地址');
  const obfs=url.searchParams.get('obfs'), password=url.searchParams.get('obfs-password')||url.searchParams.get('obfsPassword');
  if (obfs || password) n.obfs={type:obfs,password};
  if (url.searchParams.has('pinSHA256')) n.tls.certificate_public_key_sha256=[url.searchParams.get('pinSHA256')];
  return validateOutbound(n);
}
