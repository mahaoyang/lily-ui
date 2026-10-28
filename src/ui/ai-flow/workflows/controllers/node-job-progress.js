import { watchJobEvents } from '../../../../adapters/browser/workflow/runtime.js'

export function waitForNodeJob(jobId, progress) {
  return watchJobEvents(jobId, {
    signal: progress?.signal,
    onStatus: status => progress?.(status.progress || 0, status.message || ''),
  })
}
