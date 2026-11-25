import { parentPort, workerData } from "node:worker_threads";
import { EDITION } from "../src/edition";
import { STYLE } from "../src/game/style";
import { buildTown } from "../src/game/world/town";
import { townCanvasDocument } from "./town-canvas-stub";
import { bakeTownCollision } from "./town-collision-data";

// The build worker keeps the canvas stub and town registries local to generation.
const helper = workerData.learner === "lt" ? "lt" : "en";
if (EDITION.id !== workerData.edition || EDITION.helper !== helper || STYLE !== "blocks") {
  throw new Error("Town collision generator resolved the wrong edition, learner or world style");
}
Object.defineProperty(globalThis, "document", { value: townCanvasDocument() });
parentPort!.postMessage(bakeTownCollision(buildTown({ movableParking: true })));
