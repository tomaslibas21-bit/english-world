import type { PerspectiveCamera } from "three";

type SpeedModule = typeof import("./speedFeel");
type ImportSpeedFeel = () => Promise<SpeedModule>;

/** Vite's preload and the browser's module cache live for the page. Share asset recovery across Game instances. */
class SpeedFeelAssets {
  private loading?: Promise<SpeedModule>;
  private retryModule?: URL;
  private failedStyle?: HTMLLinkElement;
  private attempt = 0;

  acquire(load: ImportSpeedFeel) {
    return this.loading ??= this.importRide(load).catch((error: unknown) => {
      this.loading = undefined;
      this.rememberFailure(error);
      throw error;
    });
  }

  private async importRide(load: ImportSpeedFeel) {
    // Vite remembers preloaded URLs even on failure. Restore its stylesheet before mounting on a retry.
    if (this.failedStyle) {
      const link = this.failedStyle.cloneNode() as HTMLLinkElement;
      link.href = this.retryUrl(new URL(this.failedStyle.href));
      const ready = new Promise<void>((resolve, reject) => {
        link.onload = () => resolve();
        link.onerror = () => reject();
      });
      this.failedStyle.replaceWith(link);
      this.failedStyle = link;
      try { await ready; }
      finally { link.onload = link.onerror = null; }
      this.failedStyle = undefined;
    }
    // A failed module fetch can be cached for the life of the page.
    return this.retryModule ? import(/* @vite-ignore */ this.retryUrl(this.retryModule)) as Promise<SpeedModule> : load();
  }

  private retryUrl(url: URL) {
    url.searchParams.set("speed-feel-retry", String(++this.attempt));
    return url.href;
  }

  private rememberFailure(error: unknown) {
    const directory = new URL(/* @vite-ignore */ ".", import.meta.url);
    if (directory.origin !== location.origin) return;
    if (import.meta.env.DEV && error instanceof TypeError) {
      this.retryModule = new URL("./speedFeel.ts", directory);
      return;
    }
    if (!(error instanceof Error)) return;
    // Use the actual speed asset from Vite's dependency links, even if the browser gives no failed URL.
    for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel="modulepreload"], link[rel="stylesheet"]')) {
      if (!link.href.startsWith(directory.href)) continue;
      const url = new URL(link.href);
      const name = url.pathname.slice(directory.pathname.length);
      if (link.rel === "modulepreload" && error instanceof TypeError && /^speedFeel-[\w-]+\.js$/.test(name)) this.retryModule = url;
      if (link.rel === "stylesheet" && /^speedFeel-[\w-]+\.css$/.test(name)
        && error.message === `Unable to preload CSS for ${url.href}`) this.failedStyle = link;
    }
  }
}

let assets: SpeedFeelAssets | undefined;

/** Keeps one controller for the host and mounts it only for the latest eligible owner. */
export class SpeedFeelLoader {
  private feel?: InstanceType<SpeedModule["SpeedFeel"]>;
  private motion?: MediaQueryList;
  private accept?: () => boolean;
  private loading = false;
  private disposed = false;

  constructor(private stage: HTMLElement, private camera: PerspectiveCamera) {}

  get current() { return this.feel; }
  get reducedMotion() { return this.motion?.matches ?? false; }

  async acquire(load: ImportSpeedFeel, accept: () => boolean) {
    if (this.feel || this.disposed) return;
    this.motion ??= window.matchMedia?.("(prefers-reduced-motion: reduce)");
    this.accept = accept;
    if (this.loading) return;
    this.loading = true;
    try {
      const { SpeedFeel } = await (assets ??= new SpeedFeelAssets()).acquire(load);
      if (this.accept?.()) this.feel = new SpeedFeel(this.stage, this.camera, this.motion);
    } catch {
      // The next eligible board or road drive can try again after a failed fetch.
    } finally {
      this.loading = false;
      this.cancel();
    }
  }

  cancel() { this.accept = undefined; }

  dispose() {
    this.disposed = true;
    this.cancel();
    this.feel?.dispose();
    this.feel = undefined;
    this.motion = undefined;
  }
}
