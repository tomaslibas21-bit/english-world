import fleetURL from "virtual:fleet-pack-url";
import { finishFleetTransfer, startFleetTransfer } from "./fleetTransfer";
import { loadStartupModule } from "./startupTask";
import type { ExteriorCarModels } from "./world/carModels";

let preparation: Promise<ExteriorCarModels> | undefined;

/** Starts the transfer as soon as 3D play is selected. The parser can arrive later. */
export function prepareExteriorCars() {
  if (preparation) return preparation;
  const transfer = fleetURL ? startFleetTransfer(fleetURL) : undefined;
  const current = loadStartupModule(import("./world/carModelLoader"))
    .then(({ prepareCars }) => prepareCars(transfer))
    .finally(() => finishFleetTransfer(transfer))
    .catch((error) => {
      if (preparation === current) preparation = undefined;
      throw error;
    });
  // Game and the fleet can finish independently, including when entering indoors.
  void current.catch(() => {});
  return preparation = current;
}
