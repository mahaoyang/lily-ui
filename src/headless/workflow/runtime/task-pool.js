// One execution lane. Priority jobs interrupt only at explicit node boundaries.
export function createTaskPool() {
  const pending = [], listeners = new Set(), active = []
  let scheduled = false, draining = false, sequence = 0
  const current = () => active.at(-1)
  const describe = ({ id, owner, key, priority, label }) => ({ id, owner, key, priority, label })
  const snapshot = () => ({ active: current() ? describe(current()) : null, waiting: pending.map(describe) })
  const notify = () => {
    if (!listeners.size) return
    const value = snapshot()
    for (const listener of listeners) { try { listener(value) } catch (error) { console.error(error) } }
  }
  const cancelled = job => { if (job.cancelled) throw new Error('任务已取消') }
  async function perform(job) {
    active.push(job); notify()
    try { cancelled(job); job.resolve(await job.run(job)) } catch (error) { job.reject(error) }
    finally { active.pop(); notify() }
  }
  const schedule = () => {
    if (scheduled || draining || active.length || !pending.length) return
    scheduled = true
    queueMicrotask(async () => {
      scheduled = false
      if (active.length) return
      draining = true
      try { while (pending.length) await perform(pending.shift()) }
      finally { draining = false; schedule() }
    })
  }
  return {
    enqueue({ owner, key, label, priority = 0, run }) {
      const existing = priority > 0 && key != null && pending.find(job => job.owner === owner && job.key === key)
      if (existing) return { id: existing.id, promise: existing.promise }
      const id = `pool-${++sequence}`
      let resolve, reject
      const promise = new Promise((yes, no) => { resolve = yes; reject = no })
      const job = { id, owner, key, label, priority, run, resolve, reject, promise, cancelled: false }
      // Stable insertion keeps FIFO within each priority, without sorting the
      // entire waiting queue at every execution boundary.
      const index = pending.findIndex(other => other.priority < priority)
      pending.splice(index < 0 ? pending.length : index, 0, job)
      notify(); schedule()
      return { id, promise }
    },
    async checkpoint(lease) {
      if (!lease) return
      cancelled(lease)
      if (current() !== lease || lease.priority > 0) return
      while (pending.length && pending[0].priority > lease.priority) {
        await perform(pending.shift())
        cancelled(lease)
      }
    },
    cancelOwner(owner) {
      // A normal job can be suspended under a priority retry. Cancel both its
      // active lease and queued jobs so it cannot resume after the retry.
      for (const job of active) if (job.owner === owner) job.cancelled = true
      for (let i = pending.length - 1; i >= 0; i--) if (pending[i].owner === owner) {
        const [job] = pending.splice(i, 1); job.reject(new Error('任务已取消'))
      }
      notify()
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    snapshot,
  }
}
