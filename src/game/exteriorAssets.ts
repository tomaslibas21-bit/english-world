import { loadStartupModule } from "./startupTask";
import type { ExteriorCarModels } from "./world/carModels";

let preparation: Promise<ExteriorCarModels> | undefined;

/** Called only after 3D play is selected. Keep the successful result and allow failed requests to retry. */
export function prepareExteriorCars() {
  preparation ??= loadStartupModule(import("./world/carModelLoader"))
    .then(({ prepareCars }) => prepareCars())
    .catch((error) => {
      preparation = undefined;
      throw error;
    });
  return preparation;
}
