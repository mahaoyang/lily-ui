// One state object per application/consumer; importing the module has no side effects.
export function createAppState() {
  return { instances: [], selected: null, source: null, messages: [], commands: [], busy: false, replyPending: false, cancelRequested: false, initialized: null, configOptions: [], advertisedCommands: [], modes: [], contextUsage: null };
}
