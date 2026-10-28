// Local GSAP only. Delegate events so newly rendered views and modals work too.
export function installMagneticControls() {
  const gsap = window.gsap
  if (!gsap) return
  const fine = matchMedia('(hover: hover) and (pointer: fine)')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const selector = '.console-btn.is-solid'
  const controls = new WeakMap()
  let active = null
  const reset = () => {
    if (!active) return
    const element = active
    active = null
    gsap.to(element, { x: 0, y: 0, duration: reduced.matches ? 0 : .65, ease: 'elastic.out(1, 0.55)', overwrite: true,
      onComplete: () => { element.style.removeProperty('transform') } })
  }
  document.addEventListener('pointermove', event => {
    if (!fine.matches || reduced.matches || event.pointerType === 'touch') return
    const element = event.target.closest?.(selector)
    if (!element || element.disabled || element.matches('[aria-disabled=true]')) { reset(); return }
    if (active !== element) { reset(); active = element }
    let control = controls.get(element)
    if (!control) {
      control = { x: gsap.quickTo(element, 'x', { duration: .25, ease: 'power3.out', overwrite: 'auto' }),
        y: gsap.quickTo(element, 'y', { duration: .25, ease: 'power3.out', overwrite: 'auto' }) }
      controls.set(element, control)
    }
    const rect = element.getBoundingClientRect()
    const x = event.clientX - rect.left - rect.width / 2 - Number(gsap.getProperty(element, 'x'))
    const y = event.clientY - rect.top - rect.height / 2 - Number(gsap.getProperty(element, 'y'))
    control.x(Math.max(-4, Math.min(4, x * .12)))
    control.y(Math.max(-3, Math.min(3, y * .15)))
  }, { passive: true })
  document.addEventListener('pointerout', event => {
    if (active && !active.contains(event.relatedTarget)) reset()
  })
  document.addEventListener('pointerdown', reset, { passive: true })
  document.addEventListener('focusin', reset)
  document.addEventListener('visibilitychange', reset)
  window.addEventListener('blur', reset)
  reduced.addEventListener('change', reset)
  fine.addEventListener('change', reset)
}
