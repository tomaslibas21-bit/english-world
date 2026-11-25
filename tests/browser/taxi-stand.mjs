import assert from "node:assert/strict";

export const taxiStandStart = { zone: "town", x: 121, z: -2.4, rot: Math.PI };

export function atTaxiStand(routeId) {
  const game = window.__ew.game, mode = game.modes.get("taxi");
  const stand = game.town.parkedCars.taxi;
  const spot = routeId ? mode.route?.start : mode.car.home;
  if (!spot) return false;
  const { m, mesh } = mode.car;
  const sameHeading = Math.cos(m.heading - spot.rot) > 0.999;
  return mesh === stand?.root && stand.instance?.parent === mesh && mesh.parent === game.rides.group
    && Math.hypot(m.x - spot.x, m.z - spot.z) < 0.01 && sameHeading
    && Math.hypot(mesh.position.x - spot.x, mesh.position.z - spot.z) < 0.01
    && (routeId ? game.rides.riding === mode.car && mode.route.id === routeId : !game.rides.riding);
}

export function taxiSightlines() {
  const { rig } = window.__ew.game;
  const shot = rig.taxiShot;
  if (!shot) return { active: false };
  return {
    active: true, rays: rig.taxiSnapRays,
    points: rig.taxiSightPoints(shot.subject).map((point) => ({
      clear: shot.clear(rig.cam.position, point),
      visible: point.clone().project(rig.cam).toArray().every((n) => Math.abs(n) < 1),
    })),
  };
}

export function checkSightlines(view, moment) {
  assert(view.active && view.rays >= 4 && view.rays <= 20 && view.rays % 4 === 0,
    `${moment} uses a taxi shot selected with at most 20 rays: ${JSON.stringify(view)}`);
  assert.equal(view.points.length, 4);
  assert(view.points.every(({ clear, visible }) => clear && visible),
    `${moment}: roof, rear corners and road are visible: ${JSON.stringify(view)}`);
}
