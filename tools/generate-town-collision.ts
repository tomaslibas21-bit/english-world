import { parentPort } from "node:worker_threads";
import { buildTown } from "../src/game/world/town";
import { townCanvasDocument } from "./town-canvas-stub";
import { bakeTownCollision } from "./town-collision-data";

// Runs in a fresh build-only worker so the canvas stub, town registries and RNG stay local to it.
Object.defineProperty(globalThis, "document", { value: townCanvasDocument() });
const { compressed } = bakeTownCollision(buildTown());
parentPort!.postMessage(compressed);
