/** Give requests, input and rendering a task boundary, including when animation frames are suspended. */
export function startupTask() {
  const scheduler = (globalThis as { scheduler?: { yield?(): Promise<void> } }).scheduler;
  return scheduler?.yield?.() ?? new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export const STARTUP_IO_TIMEOUT = 10000;

/** A timed-out module may still arrive, but it cannot restart the abandoned startup. */
export function loadStartupModule<T>(request: Promise<T>) {
  let deadline: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    deadline = setTimeout(() => reject(new Error("Game module request timed out")), STARTUP_IO_TIMEOUT);
  });
  return Promise.race([request, timeout]).finally(() => clearTimeout(deadline));
}
