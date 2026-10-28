import { walkNodes } from '../../../headless/workflow/graph/compound-node.js';
import { createTaskRuntimeClient } from '../../../headless/workflow/runtime/task-runtime-client.js';
import { createWorkflowStorage } from '../../../headless/workflow/persistence/input-storage.js';
import { createTaskPool } from '../../../headless/workflow/runtime/task-pool.js';
import { createJobEvents } from '../../../headless/workflow/runtime/job-events.js';
import { encodeTask, decodeTask } from './task-codec.js';

// Browser services and application-scoped state are composed once at this entry.
const fetch = (...args) => globalThis.fetch(...args);
export const { runtimeCommand, watchRuntimeTasks } = createTaskRuntimeClient({ fetch, encodeTask, decodeTask });
export const {
  loadWorkflows, readWorkflows, writeWorkflows, saveWorkflowInputs,
  restoreWorkflowInputs, deleteWorkflowInputs, cleanupWorkflowInputs, duplicateWorkflow,
} = createWorkflowStorage({ fetch, walkNodes, encodeTask, decodeTask });
export const { watchJobEvents } = createJobEvents({ fetch, EventSource: globalThis.EventSource });
export const globalTaskPool = createTaskPool();
