/// <reference lib="webworker" />
import { readTownCollision, type TownCollisionRequest } from "./townCollisionTransport";

const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.addEventListener("message", async ({ data }: MessageEvent<TownCollisionRequest>) => {
  const bytes = await readTownCollision(data);
  scope.postMessage(bytes, bytes ? [bytes] : []);
  scope.close();
}, { once: true });
