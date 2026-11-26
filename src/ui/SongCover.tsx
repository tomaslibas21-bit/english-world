import { EDITION } from "../edition";
import type { KaraokeCatalogEntry } from "../radio/songs";

export function SongCover({ entry, width = 160 }: { entry: KaraokeCatalogEntry; width?: 160 | 320 }) {
  const src = width === 160 ? entry.thumbnail : entry.jacket;
  return (
    <div className="karaoke-cover" style={{ maxWidth: width }}>
      <div className="karaoke-sleeve" aria-hidden>
        <span className="karaoke-sleeve-disc" />
        <small>{entry.song.id}</small>
        <span lang={EDITION.target}>{entry.song.t}</span>
      </div>
      {src && <img key={src} src={src} alt="" width={width} height={width} loading={width === 160 ? "lazy" : "eager"} decoding="async"
        onError={(event) => { event.currentTarget.hidden = true; }} />}
    </div>
  );
}
