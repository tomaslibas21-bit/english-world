// The small marks on the round map for what one can take: the boats (a white hull in a yellow ring, so they are
// found from the beach) and the convertibles (a small car in its paint). Drawn where they are now.
export interface RideMark { kind: "car" | "boat"; x: number; z: number; heading: number; tint: string; taken: boolean }

/** `px`, `pz`: the map's middle (the player); `view` metres across `S` pixels; north (the sea) is up. */
export function drawRideMarks(c: CanvasRenderingContext2D, marks: RideMark[], px: number, pz: number, view: number, S: number) {
  for (const m of marks) {
    if (m.taken) continue;
    const x = ((m.x - px) / view + 0.5) * S, y = ((m.z - pz) / view + 0.5) * S;
    if (x < 6 || x > S - 6 || y < 6 || y > S - 6) continue;
    c.save();
    c.translate(x, y);
    if (m.kind === "boat") {
      c.fillStyle = "rgba(255, 210, 63, 0.9)"; c.strokeStyle = "#fff"; c.lineWidth = 2;
      c.beginPath(); c.arc(0, 0, 10, 0, Math.PI * 2); c.fill(); c.stroke();
      c.rotate(Math.PI - m.heading);
      c.fillStyle = "#fff"; c.strokeStyle = "#1f5f7a"; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(0, -7.5); c.quadraticCurveTo(4.2, -3, 3.6, 6); c.lineTo(-3.6, 6); c.quadraticCurveTo(-4.2, -3, 0, -7.5); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = m.tint; c.fillRect(-2.6, 1.5, 5.2, 2.4);
    } else {
      c.rotate(Math.PI - m.heading);
      c.fillStyle = m.tint; c.strokeStyle = "#fff"; c.lineWidth = 2;
      c.beginPath(); c.roundRect(-4, -7, 8, 14, 3); c.stroke(); c.fill();
      c.fillStyle = "rgba(255,255,255,0.85)"; c.fillRect(-2.6, -3.4, 5.2, 2.2);
    }
    c.restore();
  }
}
