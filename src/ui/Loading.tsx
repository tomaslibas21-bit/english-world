/** Matches the static logo in index.html, so booting React and loading the town share one screen. */
export function Loading() {
  return (
    <div className="loading ew-loading" role="status" aria-label="Kraunamas „English World“">
      <svg className="ew-loading-logo" viewBox="0 0 306 198" aria-hidden="true"><use href={`${import.meta.env.BASE_URL}brand/loading-wordmark.svg#wordmark`} /></svg>
    </div>
  );
}
