import { EDITION } from "../edition";
import { L } from "./i18n";

/** Matches the static logo in index.html, so booting React and loading the town share one screen. The Spanish
 *  edition shows its own name the same way (vite.config.ts writes it into index.html too). */
export function Loading() {
  if (EDITION.id !== "en") {
    return (
      <div className="loading ew-loading" role="status" aria-label={L("Kraunamas „{name}“", { name: EDITION.brand })}>
        <div className="pc-loading-word" aria-hidden="true">{EDITION.brand}</div>
      </div>
    );
  }
  return (
    <div className="loading ew-loading" role="status" aria-label={L("Kraunamas „{name}“", { name: EDITION.brand })}>
      <svg className="ew-loading-logo" viewBox="0 0 306 198" aria-hidden="true"><use href={`${import.meta.env.BASE_URL}brand/loading-wordmark.svg#wordmark`} /></svg>
    </div>
  );
}
