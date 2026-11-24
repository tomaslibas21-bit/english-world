import { TOWN_COLLISION_TIMEOUT_MS } from "./townCollisionTransport";

export function prepareTownCollision(url: string) {
  if (typeof Worker !== "function") return;
  let worker: Worker;
  try {
    worker = new Worker(new URL("./town-collision.worker.ts", import.meta.url), { type: "module" });
  } catch {
    return;
  }

  let finished = false;
  let bytes: ArrayBuffer | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let notify!: () => void;
  const completed = new Promise<void>((resolve) => { notify = resolve; });

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(deadline);
    worker.removeEventListener("message", receive);
    worker.removeEventListener("error", fail);
    worker.removeEventListener("messageerror", fail);
    worker.terminate();
    notify();
  }

  function receive({ data }: MessageEvent<unknown>) {
    bytes = data instanceof ArrayBuffer ? data : undefined;
    finish();
  }

  function fail(event: Event) {
    event.preventDefault();
    finish();
  }

  worker.addEventListener("message", receive);
  worker.addEventListener("error", fail);
  worker.addEventListener("messageerror", fail);
  try {
    worker.postMessage(url);
  } catch {
    finish();
  }

  return {
    async join() {
      // A completed reply can be queued behind town construction. Start waiting only here.
      if (!finished) {
        deadline ??= setTimeout(finish, TOWN_COLLISION_TIMEOUT_MS);
        await completed;
      }
      return bytes;
    },
    cancel() {
      bytes = undefined;
      finish();
    },
  };
}
