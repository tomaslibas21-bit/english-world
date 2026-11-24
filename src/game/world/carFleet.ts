import { carModelEntry } from "./carModels";
import { PARKED_CARS, TRAFFIC_CARS } from "./layout";

export const CAR_PALETTE_FILE = "Textures/colormap.png";
export const EXTERIOR_CAR_NAMES = [...new Set([...TRAFFIC_CARS, ...PARKED_CARS].map(({ model }) => model))];
export const FLEET_FILES = [...new Set([CAR_PALETTE_FILE, ...EXTERIOR_CAR_NAMES.map((name) => carModelEntry(name).file)])].sort();
