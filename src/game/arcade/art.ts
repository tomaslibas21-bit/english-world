import type { Cabinet } from "./cabinets";

// One landscape print per machine. The room atlas and the card use the same master.
export function paintCabinetArt(ctx: CanvasRenderingContext2D, cabinet: Cabinet) {
  if (cabinet === "road") {
    const sky = ctx.createLinearGradient(0, 0, 0, 136);
    sky.addColorStop(0, "#6d3d57"); sky.addColorStop(0.50, "#e98454"); sky.addColorStop(1, "#ffd18a");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 256, 136);
    ctx.fillStyle = "#fff2b0"; ctx.beginPath(); ctx.arc(172, 44, 27, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#b96459"; ctx.beginPath(); ctx.moveTo(0, 78); ctx.lineTo(49, 45); ctx.lineTo(76, 65);
    ctx.lineTo(134, 37); ctx.lineTo(171, 67); ctx.lineTo(202, 49); ctx.lineTo(256, 70); ctx.lineTo(256, 93); ctx.lineTo(0, 93); ctx.fill();
    ctx.fillStyle = "#743e49"; ctx.beginPath(); ctx.moveTo(0, 65); ctx.lineTo(34, 66); ctx.lineTo(42, 51);
    ctx.lineTo(63, 50); ctx.lineTo(64, 63); ctx.lineTo(98, 78); ctx.lineTo(184, 77); ctx.lineTo(224, 58);
    ctx.lineTo(233, 38); ctx.lineTo(256, 38); ctx.lineTo(256, 94); ctx.lineTo(0, 94); ctx.fill();
    ctx.fillStyle = "#e5a164"; ctx.fillRect(0, 83, 256, 53);
    ctx.beginPath(); ctx.moveTo(26, 136); ctx.bezierCurveTo(63, 104, 206, 99, 158, 83);
    ctx.bezierCurveTo(213, 97, 141, 111, 147, 136); ctx.closePath();
    ctx.strokeStyle = "#ffdb90"; ctx.lineWidth = 5; ctx.stroke(); ctx.fillStyle = "#3b3540"; ctx.fill();
    ctx.strokeStyle = "#f8c978"; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]); ctx.beginPath();
    ctx.moveTo(77, 137); ctx.bezierCurveTo(119, 107, 191, 101, 159, 83); ctx.stroke(); ctx.setLineDash([]);
    // Agaves along the shoulder repeat the pointed leaves on the cantina tiles.
    ctx.fillStyle = "#335950";
    for (const [x, y, scale] of [[29, 111, 1], [222, 100, 0.65]]) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      for (const angle of [-1.1, -0.65, -0.25, 0.25, 0.65, 1.1]) {
        ctx.save(); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-5, -9, 0, -24); ctx.quadraticCurveTo(4, -10, 0, 0); ctx.fill(); ctx.restore();
      }
      ctx.restore();
    }
  } else {
    const felt = ctx.createRadialGradient(143, 59, 5, 143, 59, 151);
    felt.addColorStop(0, "#6ac4b1"); felt.addColorStop(0.58, "#26877f"); felt.addColorStop(1, "#124c50");
    ctx.fillStyle = felt; ctx.fillRect(0, 0, 256, 136);
    ctx.strokeStyle = "#a9c495"; ctx.lineWidth = 1; ctx.strokeRect(7, 7, 242, 122);
    ctx.fillStyle = "#e7d3a1";
    for (const x of [16, 240]) for (const y of [16, 120]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-3, -3, 6, 6); ctx.restore();
    }
    ctx.strokeStyle = "#d4b477"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(6, 136); ctx.lineTo(108, 85); ctx.stroke();
    ctx.strokeStyle = "#ffebbd"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#264b42"; ctx.beginPath(); ctx.ellipse(155, 111, 48, 10, -0.08, 0, Math.PI * 2); ctx.fill();
    const ball = ctx.createRadialGradient(128, 46, 1, 148, 63, 52);
    ball.addColorStop(0, "#65777a"); ball.addColorStop(0.34, "#344449"); ball.addColorStop(0.86, "#122329"); ball.addColorStop(1, "#08171c");
    ctx.fillStyle = ball; ctx.beginPath(); ctx.arc(148, 65, 49, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#e2dbac"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#fff1c9"; ctx.beginPath(); ctx.arc(147, 62, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#162d30"; ctx.font = "bold 39px Georgia"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("8", 147, 64);
    ctx.strokeStyle = "#afc9bf"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(145, 62, 39, 3.62, 4.43); ctx.stroke();
  }
}
