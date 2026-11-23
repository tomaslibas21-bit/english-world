import type { PhotoThingId } from "../../content/townQuests";
import { PROGRESS_KEY } from "../../state/progress";

const PHOTO_KEY = `${PROGRESS_KEY}-photowalk`;

export function readPhoto(id: PhotoThingId): string | null {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(PHOTO_KEY) ?? "{}")?.[id];
    return typeof saved === "string" && saved.startsWith("data:image/jpeg;base64,") ? saved : null;
  } catch { return null; }
}

export function savePhoto(id: PhotoThingId, jpeg: string) {
  try {
    const photos = JSON.parse(localStorage.getItem(PHOTO_KEY) ?? "{}");
    localStorage.setItem(PHOTO_KEY, JSON.stringify({ ...photos, [id]: jpeg }));
  } catch { /* The book uses the subject icon. */ }
}

export function clearPhotos() {
  try { localStorage.removeItem(PHOTO_KEY); } catch { /* Storage is unavailable. */ }
}

/** Called in the render frame, before the browser clears the WebGL drawing buffer. */
export function takePhoto(canvas: HTMLCanvasElement, ndcX: number, ndcY: number) {
  try {
    const frame = document.createElement("canvas");
    frame.width = 160;
    frame.height = 120;
    const context = frame.getContext("2d");
    if (!context || !canvas.width || !canvas.height) return null;

    const width = Math.min(canvas.width, canvas.height * 4 / 3) * 0.72, height = width * 3 / 4;
    const x = Math.max(0, Math.min(canvas.width - width, canvas.width * (1 + ndcX) / 2 - width / 2));
    const y = Math.max(0, Math.min(canvas.height - height, canvas.height * (1 - ndcY) / 2 - height / 2));
    context.drawImage(canvas, x, y, width, height, 0, 0, frame.width, frame.height);
    return frame.toDataURL("image/jpeg", 0.76);
  } catch { return null; }
}
