/**
 * The UI always operates in the space of the installed runtime.
 *
 * WSL still keeps its historical Windows/Linux split in persisted profiles and
 * API compatibility, but it is an implementation detail now.  Exposing a
 * space switch made it too easy to open an account in the wrong OS namespace.
 */
export function selectedRuntime(env) {
  if (env?.wsl) return 'windows'
  if (env?.platform === 'win32') return 'windows'
  if (env?.platform === 'darwin') return 'mac'
  return 'linux'
}

// Session mode describes how the browser is launched, not its OS namespace.
// Native Windows launches use "local"; only the WSL bridge uses "windows".
export function sessionRuntime(session, env) {
  if (session.mode === 'windows') return 'windows'
  if (env?.platform === 'win32') return 'windows'
  if (env?.platform === 'darwin') return 'mac'
  return 'linux'
}
