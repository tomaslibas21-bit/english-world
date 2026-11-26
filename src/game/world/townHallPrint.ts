import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from "three";

export const passportPrompt = { kind: "passport", label: "Open passport", lt: "Atversti pasą" } as const;
let material: MeshBasicMaterial | undefined;

/** Both printed signs share one atlas. Its upper half faces Oak Avenue. */
export function townHallPrint(width: number, height: number, desk = false) {
  if (!material) {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff6de"; ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = ctx.fillStyle = "#234e40";
    ctx.lineWidth = 4; ctx.strokeRect(5, 5, 502, 118); ctx.strokeRect(5, 133, 502, 118);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 72px Georgia, serif"; ctx.fillText("Town Hall", 256, 66);
    ctx.font = "bold 48px Georgia, serif"; ctx.fillText(passportPrompt.label, 256, 171);
    ctx.font = "34px Nunito, sans-serif"; ctx.fillText(passportPrompt.lt, 256, 219);
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; map.name = "Town Hall";
    material = new MeshBasicMaterial({ map, toneMapped: false });
  }
  const geo = new PlaneGeometry(width, height), uv = geo.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 0.5 + (desk ? 0 : 0.5));
  return new Mesh(geo, material);
}
