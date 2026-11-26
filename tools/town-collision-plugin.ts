import { build } from "esbuild";
import { resolve } from "node:path";
import { Worker } from "node:worker_threads";
import type { Plugin } from "vite";

const MODULE = "virtual:town-collision-url";
const ID = "\0" + MODULE;

export function townCollisionAsset(): Plugin {
  return {
    name: "town-collision",
    resolveId(id) {
      if (id === MODULE) return ID;
    },
    async load(id) {
      if (id !== ID) return;
      const config = this.environment.config;
      if (this.environment.mode !== "build" || !config.isProduction) return "export default undefined";
      const { outputFiles, metafile } = await build({
        absWorkingDir: config.root,
        entryPoints: ["tools/generate-town-collision.ts"],
        bundle: true,
        format: "cjs",
        platform: "node",
        define: { "import.meta.env": JSON.stringify({ DEV: false, PROD: true, BASE_URL: config.base,
          VITE_RADIO_FILES: config.env.VITE_RADIO_FILES, VITE_BOOK_REVIEW: config.env.VITE_BOOK_REVIEW,
          VITE_BOOK_PROFILE: config.env.VITE_BOOK_PROFILE }) },
        metafile: true,
        write: false,
      });
      for (const path of Object.keys(metafile.inputs)) this.addWatchFile(resolve(config.root, path));
      const source = await new Promise<Uint8Array>((resolve, reject) => {
        const worker = new Worker(outputFiles[0].text, { eval: true, execArgv: [] });
        worker.once("message", resolve);
        worker.once("error", reject);
        worker.once("exit", (code) => reject(new Error(`Town collision worker exited before emitting data (${code})`)));
      });
      const ref = this.emitFile({ type: "asset", name: "mh-town-collision.bin", source });
      return `export default import.meta.ROLLDOWN_FILE_URL_${ref}`;
    },
  };
}
