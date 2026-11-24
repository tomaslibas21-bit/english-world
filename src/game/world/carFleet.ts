import { carModelEntry } from "./carModels";
import { PARKED_CARS, TRAFFIC_PLACEMENTS } from "./layout";

export const CAR_PALETTE_FILE = "Textures/colormap.png";
export const EXTERIOR_CAR_NAMES = [...new Set([...TRAFFIC_PLACEMENTS, ...PARKED_CARS].flatMap(({ model }) => model ? [model] : []))];
export const FLEET_FILES = [...new Set([CAR_PALETTE_FILE, ...EXTERIOR_CAR_NAMES.map((name) => carModelEntry(name).file)])].sort();
