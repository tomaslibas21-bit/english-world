import type { KaraokeCatalogEntry } from "../radio/songs";

export function SongCover({ entry, width = 160 }: { entry: KaraokeCatalogEntry; width?: 160 | 320 }) {
  const src = width === 160 ? entry.thumbnail : entry.jacket;
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: width, aspectRatio: "1", background: "#e8d3aa", color: "#252940" }}>
      {src && <img key={src} src={src} alt="" width={width} height={width} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.hidden = true; }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "#e8d3aa" }} />}
      <div aria-hidden style={{ display: "grid", placeContent: "center", height: "100%", textAlign: "center", padding: 12 }}>
        <span style={{ fontSize: 30, color: "#934637" }}>●</span>
        <small>{entry.song.id}</small>
        <span>{entry.song.t}</span>
      </div>
    </div>
  );
}
