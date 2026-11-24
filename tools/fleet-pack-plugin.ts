import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { gzipSync } from "node:zlib";
import type { Plugin } from "vite";

const MODULE = "virtual:fleet-pack-url";
const ID = "\0" + MODULE;

export async function buildFleetPack(root: string, watch?: (path: string) => void) {
  const { outputFiles, metafile } = await build({
    absWorkingDir: root,
    stdin: { resolveDir: root, contents: [
      'export { FLEET_FILES } from "./src/game/world/carFleet"',
      'export { FLEET_HEADER_BYTES, FLEET_MAGIC, FLEET_VERSION } from "./src/game/fleetPack"',
    ].join("\n") },
    bundle: true, platform: "node", packages: "external", format: "cjs", metafile: true, write: false,
    define: { "import.meta.env": JSON.stringify({ BASE_URL: "/", DEV: false, PROD: true }) },
  });
  // Resolve from the placements on each build, including rebuilds in watch mode.
  for (const path of Object.keys(metafile.inputs)) if (path !== "<stdin>") watch?.(resolve(root, path));
  const module = { exports: {} as {
    FLEET_FILES: string[]; FLEET_HEADER_BYTES: number; FLEET_MAGIC: number; FLEET_VERSION: number;
  } };
  runInNewContext(outputFiles[0].text, { module });
  const { FLEET_FILES, FLEET_HEADER_BYTES, FLEET_MAGIC, FLEET_VERSION } = module.exports;
  const bodies = await Promise.all(FLEET_FILES.map((file) => {
    const path = resolve(root, "public/models/cars", file);
    watch?.(path);
    return readFile(path);
  }));
  let offset = 0;
  const members = FLEET_FILES.map((file, i) => {
    const length = bodies[i].length;
    const member = [file, offset, length];
    offset += length;
    return member;
  });
  const directory = Buffer.from(JSON.stringify(members));
  const header = Buffer.alloc(FLEET_HEADER_BYTES);
  header.writeUInt32LE(FLEET_MAGIC, 0);
  header.writeUInt32LE(FLEET_VERSION, 4);
  header.writeUInt32LE(directory.length, 8);
  header.writeUInt32LE(offset, 12);
  return gzipSync(Buffer.concat([header, directory, ...bodies]), { level: 9 });
}

export function fleetPackAsset(): Plugin {
  return {
    name: "fleet-pack",
    resolveId(id) {
      if (id === MODULE) return ID;
    },
    async load(id) {
      if (id !== ID) return;
      const { mode, config } = this.environment;
      if (mode !== "build" || !config.isProduction) return "export default undefined";
      const source = await buildFleetPack(config.root, (path) => this.addWatchFile(path));
      const ref = this.emitFile({ type: "asset", name: "mh-fleet.bin", source });
      return `export default import.meta.ROLLDOWN_FILE_URL_${ref}`;
    },
  };
}
