export function uniqueTaskName(name, tasks) {
  const base = String(name || '').trim() || '未命名'
  const used = new Set(Array.from(tasks, task => task.name))
  if (!used.has(base)) return base
  let index = 2
  while (used.has(`${base}-${index}`)) index++
  return `${base}-${index}`
}
