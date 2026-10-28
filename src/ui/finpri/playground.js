const note = document.getElementById('note')
const result = document.getElementById('result')
const render = () => {
  document.getElementById('saved').textContent = localStorage.getItem('finpri.playground.note') || '还没有记号'
  const cookie = document.cookie.split('; ').find(s => s.startsWith('finpri_demo='))
  document.getElementById('cookie').textContent = cookie ? `Cookie 记号：${decodeURIComponent(cookie.slice('finpri_demo='.length))}` : 'Cookie：还没有记号'
}
try {
  render()
  document.getElementById('save').onclick = () => {
    try {
      const text = note.value.trim()
      if (!text) { result.textContent = '先输入一个容易辨认的记号。'; note.focus(); return }
      localStorage.setItem('finpri.playground.note', text)
      document.cookie = `finpri_demo=${encodeURIComponent(text)}; Max-Age=2592000; Path=/; SameSite=Strict`
      render(); result.textContent = '已保存。现在去另一个环境对比，再回来刷新。'
    } catch { result.textContent = '浏览器阻止了存储，请检查当前环境的存储权限。' }
  }
  document.getElementById('clear').onclick = () => {
    localStorage.removeItem('finpri.playground.note')
    document.cookie = 'finpri_demo=; Max-Age=0; Path=/; SameSite=Strict'
    render(); result.textContent = '本页记号已清除。'
  }
} catch { result.textContent = '无法读取本地存储，请检查浏览器权限。' }

document.getElementById('check-hardware').onclick = async () => {
  const target = document.getElementById('hardware-result')
  const button = document.getElementById('check-hardware')
  button.disabled = true; target.textContent = '正在本地检查…'
  try {
    const enhanced = await navigator.brave?.isBrave?.()
    const webgl = !!document.createElement('canvas').getContext('webgl')
    const webgl2 = !!document.createElement('canvas').getContext('webgl2')
    const offscreen = typeof OffscreenCanvas !== 'undefined' && (!!new OffscreenCanvas(1, 1).getContext('webgl') || !!new OffscreenCanvas(1, 1).getContext('webgl2'))
    const gpu = !!(await navigator.gpu?.requestAdapter())
    target.textContent = `内核：${enhanced ? 'Brave（身份识别不代表所有保护均已生效）' : '未识别为增强内核'}\nCPU 逻辑核心：${navigator.hardwareConcurrency}${enhanced ? '（原生内核报告，可能仍等于真实核数）' : '（未隐藏）'}\n内存报告：${navigator.deviceMemory === undefined ? '当前页面不可读取' : `${navigator.deviceMemory} GiB（不能据此推断物理内存或保护效果）`}\nWebGL / WebGL2：${webgl || webgl2 ? '可用，可能暴露显卡' : '不可用'}\nOffscreenCanvas 3D：${offscreen ? '可用' : '不可用'}\nWebGPU 显卡适配器：${gpu ? '可用，可能暴露显卡' : '不可用'}`
    const fontPermission = await navigator.permissions.query({ name: 'local-fonts' }).then(p => p.state, () => '当前内核不支持检查')
    target.textContent += `\n本地字体枚举权限：${fontPermission}（拒绝枚举不等于阻止所有 CSS 字体探测）`
    const digest = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(n => n.toString(16).padStart(2, '0')).join('').slice(0, 24)
    const canvas = document.createElement('canvas'); canvas.width = 280; canvas.height = 80
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#f60'; ctx.fillRect(0, 0, 140, 80); ctx.font = '17px Arial'; ctx.fillStyle = '#069'; ctx.fillText('FinPri privacy fingerprint Ω 😃', 3, 40)
    const canvasHash = await digest(new TextEncoder().encode(canvas.toDataURL()))
    const audio = new OfflineAudioContext(1, 5000, 44100)
    const oscillator = audio.createOscillator(); oscillator.type = 'triangle'; oscillator.frequency.value = 10000
    const compressor = audio.createDynamicsCompressor(); oscillator.connect(compressor); compressor.connect(audio.destination); oscillator.start(0)
    const rendered = await audio.startRendering()
    const audioHash = await digest(rendered.getChannelData(0).slice(4500).buffer)
    target.textContent += `\nCanvas 本地摘要：${canvasHash}\n音频本地摘要：${audioHash}\n请在 A / B 环境分别点击对比：摘要不同仅证明本项输出不同，不是防关联认证。`
  } catch { target.textContent += '\n检查未完成，浏览器可能限制了部分接口。不能据此判断保护已生效。' }
  finally { button.disabled = false }
}
