import fleetURL from "virtual:fleet-pack-url";
import { finishFleetTransfer, startFleetTransfer } from "./fleetTransfer";
import { loadStartupModule } from "./startupTask";
import type { ExteriorCarModels } from "./world/carModels";

let preparation: Promise<ExteriorCarModels> | undefined;

/** Called only after 3D play is selected. Keep the successful result and allow failed requests to retry. */
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
  return preparation = current;
}
