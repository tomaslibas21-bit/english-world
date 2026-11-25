import { readFileSync } from "node:fs";
import * as THREE from "three";
import { expect, vi } from "vitest";

export const carAssets = new URL("../../public/models/cars/", import.meta.url);
export const testFleetURL = "/course/puerto-colibri/assets/pc-fleet-test.bin";

export function stubCarAssets(options: {
  fleetResponse?: (signal?: AbortSignal | null) => Response | Promise<Response>;
  beforeModel?: (file: string, signal?: AbortSignal | null) => Promise<void>;
  beforePalette?: (url: string) => Promise<void>;
} = {}) {
  vi.stubGlobal("self", globalThis);
  vi.stubGlobal("ProgressEvent", Event);
  const fetchFile = vi.fn(async (url: string, init?: RequestInit) => {
    if (options.fleetResponse && /\/assets\/pc-fleet-[\w-]+\.bin$/.test(url)) return options.fleetResponse(init?.signal);
    const file = new URL(url, "http://localhost").pathname.split("/").at(-1)!;
    await options.beforeModel?.(file, init?.signal);
    return new Response(readFileSync(new URL(file, carAssets)));
  });
  vi.stubGlobal("fetch", fetchFile);
  const palette = new THREE.Texture<HTMLImageElement>();
  const loadPalette = vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation((url, onLoad, _progress, onError) => {
    expect(url).toMatch(/^blob:|\/models\/cars\/Textures\/colormap\.png$/);
    void (options.beforePalette?.(url) ?? Promise.resolve()).then(() => onLoad?.(palette), onError);
    return palette;
  });
  return { fetchFile, loadPalette, palette };
}
