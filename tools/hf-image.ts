// Scene pictures through the Higgsfield developer API (api.higgsfield.ai), with plain fetch (no SDK).
// Credentials: HF_CREDENTIALS=<key id>:<secret> in .env.local (git-ignored, created by the owner).
// The key is only sent in the Authorization header; it is never printed or logged.
//
//   npx tsx tools/hf-image.ts estimate <model> <request.json>
//   npx tsx tools/hf-image.ts generate <model> <request.json> <out.png>
//
// request.json holds the model's parameters, plus "refs": local pictures (e.g. public/scenes/…/greet.webp)
// that are uploaded first and passed as "image_urls". Models: see https://open.higgsfield.ai/explore
// (e.g. "xai/grok-imagine-image-2.0": prompt, image_urls, quality low|medium, resolution 1k|2k, aspect_ratio).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const API = "https://api.higgsfield.ai";

function credentials(): string {
  if (process.env.HF_CREDENTIALS) return process.env.HF_CREDENTIALS.trim();
  const file = path.join(ROOT, ".env.local");
  if (existsSync(file)) {
    const line = readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith("HF_CREDENTIALS="));
    if (line) return line.slice("HF_CREDENTIALS=".length).trim();
  }
  throw new Error("No HF_CREDENTIALS: put HF_CREDENTIALS=<key id>:<secret> in .env.local");
}

async function api(route: string, body?: unknown): Promise<any> {
  const res = await fetch(route.startsWith("http") ? route : `${API}/${route}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Key ${credentials()}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${route}: HTTP ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

const TYPES: Record<string, string> = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };

/** Uploads a local picture (presigned URL) and returns its public URL for image_urls. */
async function upload(file: string): Promise<string> {
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) throw new Error(`unsupported picture type: ${file}`);
  const u = await api("files/generate-upload-url", { content_type: type });
  const put = await fetch(u.upload_url, { method: "PUT", headers: u.upload_headers ?? { "Content-Type": type }, body: readFileSync(path.resolve(ROOT, file)) });
  if (!put.ok) throw new Error(`upload of ${file} failed: HTTP ${put.status}`);
  return u.public_url;
}

async function params(requestFile: string): Promise<Record<string, unknown>> {
  const { refs, ...rest } = JSON.parse(readFileSync(requestFile, "utf8"));
  if (Array.isArray(refs) && refs.length) rest.image_urls = [...(rest.image_urls ?? []), ...(await Promise.all(refs.map(upload)))];
  return rest;
}

async function waitFor(statusUrl: string): Promise<any> {
  const t0 = Date.now();
  for (let delay = 3000; ; delay = Math.min(delay * 1.4, 10000)) {
    await new Promise((r) => setTimeout(r, delay));
    const s = await api(statusUrl);
    if (["completed", "failed", "nsfw", "canceled"].includes(s.status)) return s;
    if (Date.now() - t0 > 10 * 60_000) throw new Error(`still ${s.status} after 10 minutes: ${statusUrl}`);
  }
}

const [cmd, model, requestFile, out] = process.argv.slice(2);
if (!cmd || !model || !requestFile) {
  console.log("usage: npx tsx tools/hf-image.ts estimate|generate <model> <request.json> [out.png]");
  process.exit(1);
}
if (cmd === "estimate") {
  const { image_urls, ...rest } = JSON.parse(readFileSync(requestFile, "utf8"));
  // pictures don't change the price estimate much; send placeholders instead of uploading
  const refs = JSON.parse(readFileSync(requestFile, "utf8")).refs as string[] | undefined;
  delete (rest as any).refs;
  if (refs?.length || image_urls?.length) (rest as any).image_urls = ["https://example.com/ref.webp"];
  console.log(JSON.stringify(await api(`estimate/${model}`, rest)));
} else if (cmd === "generate") {
  if (!out) throw new Error("generate needs an output file");
  const input = await params(requestFile);
  const sub = await api(model, input);
  console.log(`submitted ${sub.request_id} (${sub.status})`);
  const done = await waitFor(sub.status_url);
  if (done.status !== "completed") {
    console.log(`not completed: ${done.status}${done.error ? " – " + JSON.stringify(done.error) : ""} (request ${sub.request_id})`);
    process.exit(2);
  }
  const url = done.images?.[0]?.url;
  if (!url) throw new Error(`completed without an image: ${JSON.stringify(done).slice(0, 300)}`);
  const img = await fetch(url);
  mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  writeFileSync(out, Buffer.from(await img.arrayBuffer()));
  console.log(`saved ${out} (request ${sub.request_id})`);
} else {
  console.log(`unknown command ${cmd}`);
  process.exit(1);
}
