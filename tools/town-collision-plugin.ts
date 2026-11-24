import { build } from "esbuild";
import { resolve } from "node:path";
import { Worker } from "node:worker_threads";
import type { Plugin } from "vite";
import { overlayFile } from "./edition-overlay.mjs";

const MODULE = "virtual:town-collision-url";
const ID = "\0" + MODULE;

export function townCollisionAsset(edition: string, learner: string): Plugin {
  return {
    name: "town-collision",
    resolveId(id) {
      if (id === MODULE) return ID;
    },
    async load(id) {
      if (id !== ID) return;
      const config = this.environment.config;
      if (edition !== "es" || this.environment.mode !== "build" || !config.isProduction) return "export default undefined";
      const { outputFiles, metafile } = await build({
        absWorkingDir: config.root,
        entryPoints: ["tools/generate-town-collision.ts"],
        bundle: true,
        format: "cjs",
        platform: "node",
        define: { "import.meta.env": JSON.stringify({ ...config.env, DEV: false, PROD: true, VITE_EDITION: edition, VITE_LEARNER: learner }) },
        metafile: true,
        write: false,
        plugins: [{ name: "town-collision-edition-overlay", setup(builder) {
          builder.onResolve({ filter: /^(?:\.|@\/)/ }, async (args) => {
            if (args.pluginData?.resolving || !args.importer || args.importer.includes("/node_modules/")) return;
            const specifier = args.path.startsWith("@/") ? resolve(config.root, "src", args.path.slice(2)) : args.path;
            const result = await builder.resolve(specifier, {
              importer: args.importer, resolveDir: args.resolveDir, kind: args.kind, pluginData: { resolving: true },
            });
            if (result.errors.length) return { errors: result.errors };
            const path = overlayFile(result.path, edition, args.importer, learner);
            return path ? { ...result, path } : result;
          });
        } }],
      });
      for (const path of Object.keys(metafile.inputs)) this.addWatchFile(resolve(config.root, path));
      const { compressed, digest } = await new Promise<{ compressed: Uint8Array; digest: string }>((resolve, reject) => {
        const worker = new Worker(outputFiles[0].text, { eval: true, execArgv: [], workerData: { edition, learner } });
        worker.once("message", resolve);
        worker.once("error", reject);
        worker.once("exit", (code) => reject(new Error(`Town collision generator exited before emitting data (${code})`)));
      });
      const ref = this.emitFile({ type: "asset", name: "pc-town-collision.bin", source: compressed });
      return `import workerURL from "/src/game/town-collision.worker.ts?worker&url";
        export default { url: import.meta.ROLLDOWN_FILE_URL_${ref}, digest: ${JSON.stringify(digest)}, workerURL };`;
    },
  };
}
