/// <reference lib="webworker" />
import { readTownCollision } from "./townCollisionTransport";

const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.addEventListener("message", async ({ data: url }: MessageEvent<string>) => {
  const bytes = await readTownCollision(url);
  scope.postMessage(bytes, bytes ? [bytes] : []);
  scope.close();
}, { once: true });
