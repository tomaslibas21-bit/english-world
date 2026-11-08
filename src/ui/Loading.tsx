/** Matches the static logo in index.html, so booting React and loading the town share one screen. */
export function Loading() {
  return (
    <div className="loading ew-loading" role="status" aria-label="Kraunamas „English World“">
      <div className="ew-loading-logo" aria-hidden="true">English<em>World</em></div>
    </div>
  );
}
