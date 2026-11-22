import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { TAXI_CAR, TAXI_ROUTES } from "../src/content/taxi";
import { TAXI_LINES } from "../src/content/taxi-lines";
import { NPCS } from "../src/content/npcs";
import taxi from "../src/content/situations/s66-taxi";
import { Ambient } from "../src/game/ambient";
import { CameraRig } from "../src/game/camera";
import { createCharacter } from "../src/game/characters";
import { scoreShot } from "../src/game/kit/scoreShot";
import { NavGrid } from "../src/game/nav";
import { OcclusionField } from "../src/game/occlusion";
import { Rides } from "../src/game/rides/Rides";
import { CAR } from "../src/game/rides/drive";
import { floorY } from "../src/game/water";
import { carFootprint, carLedges, carModelEntry } from "../src/game/world/carModels";
import { BUILDINGS, PARKED_CARS, ROADS, TAXI, WORLD } from "../src/game/world/layout";
import { RIDES } from "../src/game/world/rides";
import { buildTown } from "../src/game/world/town";
import { Colliders } from "../src/game/world/util";
import { approach, approachDistance, checkDecision, inStopZone, resetPose, taxiScore, type Point } from "../src/game/taxi/route";

const taxiSize = carModelEntry(TAXI.model).collisionBox;

function makeRides(allowsHints?: () => boolean) {
  const colliders = new Colliders();
  const nav = new NavGrid(112, -16, 132, 8, 1, colliders);
  const ambient = new Ambient(nav, [[125, 2]], "low");
  const player = createCharacter(NPCS.vinnie.look);
  const quiet = () => {};
  const waiting = vi.fn();
  const rides = new Rides({ cam: new THREE.PerspectiveCamera(), colliders, nav, ambient, player, quality: "low",
    people: () => [], outdoors: () => true, say: quiet, thud: quiet, stuck: quiet, aground: quiet,
    allowsHints, waiting, freed: quiet, rescue: quiet, splash: quiet, fan: quiet,
  }, RIDES, []);
  return { rides, player, ambient, waiting };
}

describe("Maple Harbor taxi routes", () => {
  it("keeps the taxi outside the town rides and map while sharing driving and collision physics", () => {
    const { rides, player, ambient } = makeRides();
    const marks = rides.marksForMap();
    const parking = new THREE.Group(), standCar = new THREE.Group();
    parking.add(standCar);
    const car = rides.createModeCar(TAXI_CAR, standCar);
    expect(car.mesh).toBe(standCar);
    expect(parking.children).toHaveLength(0);
    expect(car.m.spec).toMatchObject({ half: taxiSize.length / 2, wide: taxiSize.width / 2 });
    expect(rides.modeCarPieces(TAXI.x, TAXI.z)).toEqual(carLedges(TAXI.model, TAXI.x, TAXI.z, TAXI.rot));
    expect(rides.list.filter((ride) => ride.kind === "car").map(({ id }) => id)).toEqual(RIDES.cars.map(({ id }) => id));
    expect(rides.list[0].owners).toHaveLength(1);
    expect(car.owners).toHaveLength(0);
    expect(rides.marksForMap()).toEqual(marks);
    expect(rides.near(car.m.x, car.m.z + 1.5)).toBeNull();

    const insideCar = new THREE.Vector3(car.m.x, 0, car.m.z);
    rides.resolvePlayer(insideCar, 0.38, false);
    expect(Math.abs(insideCar.z - car.m.z)).toBeGreaterThan(car.m.spec.wide);
    const trafficBox = ambient.rideBoxes.at(-1)!;
    expect(trafficBox).toMatchObject({ x: TAXI.x, z: TAXI.z });

    player.root.position.copy(insideCar);
    expect(rides.board(car)).toBe(true);
    expect(rides.modeCarPieces(TAXI.x, TAXI.z)).toEqual([]);
    for (let i = 1; i <= 40; i++) rides.update(0.05, i * 0.05, { throttle: 1, steer: 0, brake: false });
    expect(rides.phase).toBe("on");
    expect(car.m.x).toBeLessThan(TAXI.x - 1);
    expect(car.mesh.position.x).toBe(car.m.x);
    expect(trafficBox.x).toBe(car.m.x);

    const stop = { x: car.m.x, z: car.m.z, heading: car.m.heading };
    rides.abandon(true);
    expect(rides.riding).toBeNull();
    expect(car.m).toMatchObject({ ...stop, pace: 0 });
    expect(car.mesh.position).toMatchObject({ x: stop.x, z: stop.z });
    expect(trafficBox).toMatchObject(stop);
    expect(rides.modeCarPieces(stop.x, stop.z)).toEqual(carLedges(TAXI.model, stop.x, stop.z, stop.heading));

    player.root.position.set(stop.x, 0, stop.z + 1.5);
    expect(rides.board(car)).toBe(true);
    rides.abandon();
    expect(trafficBox.x).toBe(TAXI.x);
    expect(rides.modeCarPieces(TAXI.x, TAXI.z).map(({ top }) => top)).toContain(taxiSize.height);
    rides.removeModeCar(car);
    expect(ambient.rideBoxes).not.toContain(trafficBox);
  });

  it("frames the parked taxi and the learner at each destination", () => {
    const draw = () => {};
    const gradient = () => ({ addColorStop: draw });
    const canvas = new Proxy({
      measureText: (text: string) => ({ width: text.length * 9 }), createLinearGradient: gradient, createRadialGradient: gradient,
    }, { get: (target, key) => Reflect.get(target, key) ?? draw });
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => canvas }) });
    try {
      const { group, doors, colliders, parkedCars } = buildTown();
      const skip = (o: THREE.Object3D) => o.userData.v !== undefined || !!o.userData.gull || !!o.userData.boat || !!o.userData.thin || o === parkedCars.taxi?.root;
      const field = OcclusionField.fromObject(group, {
        minX: WORLD.minX - 24, maxX: WORLD.maxX + 24, minZ: WORLD.minZ - 24, maxZ: WORLD.maxZ + 24,
      }, { skip });
      field.fillFootprints(colliders.boxes, colliders.circles);
      const space = {
        free: (a: THREE.Vector3, b: THREE.Vector3) => field.free(a, b),
        inside: (p: THREE.Vector3) => field.solidAt(p.x, p.y, p.z, 0.15),
        overSolid: (x: number, z: number) => field.overSolid(x, z),
      };
      const blocked = (x: number, z: number) => colliders.blocked(x, z, 0.65);
      for (const route of TAXI_ROUTES) {
        const door = doors.find(({ loc }) => loc === route.destination)!;
        const { outX, outZ } = door;
        const ground = floorY(outX, outZ);
        const player = new THREE.Box3(new THREE.Vector3(outX - 0.35, ground, outZ - 0.35),
          new THREE.Vector3(outX + 0.35, ground + 1.9, outZ + 0.35));
        const { at } = route.decisions.at(-1)!;
        const from = approach(route, route.decisions.length - 1).at(-2)!;
        const rot = Math.atan2(at.x - from.x, at.z - from.z);
        for (const [along, across, turn] of [[0, 0, 0], [-3.5, 0, 0], [3.5, 0, 0], [-3.5, -1.3, -0.2], [3.5, 1.3, 0.2]]) {
          const x = at.x + Math.sin(rot) * along + Math.cos(rot) * across;
          const z = at.z + Math.cos(rot) * along - Math.sin(rot) * across;
          const { minX, maxX, minZ, maxZ } = carFootprint({ model: TAXI.model, x, z, rot: rot + turn });
          const taxi = new THREE.Box3(new THREE.Vector3(minX, 0, minZ), new THREE.Vector3(maxX, taxiSize.height, maxZ));
          for (const [width, height] of [[1280, 800], [390, 844]]) {
            const aspect = width / height;
            const shot = scoreShot(player, door.rot, aspect, space, blocked, taxi);
            const label = `${route.destination} (${along}, ${across}, ${width}×${height})`;
            expect(shot, label).not.toBeNull();
            expect(blocked(shot!.pos.x, shot!.pos.z), label).toBe(false);
            expect(taxi.distanceToPoint(shot!.pos.clone().setY(taxi.min.y)), label).toBeGreaterThanOrEqual(5);
            const rig = new CameraRig(aspect);
            rig.stage = shot;
            rig.mode = "stage";
            rig.stageSnap();
            rig.update(0, door.rot, false, true, true);
            rig.applyViewShift(width, height, 0, height * (shot!.shiftY ?? 0));
            rig.cam.updateMatrixWorld();
            for (const box of [taxi, player]) {
              const visible = box.getCenter(new THREE.Vector3());
              if (box === player) visible.y = player.max.y - 0.5;
              expect(field.free(visible, shot!.pos), label).toBe(1);
              for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
                const point = new THREE.Vector3(x, y, z).project(rig.cam);
                expect(Math.max(Math.abs(point.x), Math.abs(point.y)), label).toBeLessThanOrEqual(0.85);
                if (width < height) expect(point.y, label).toBeGreaterThanOrEqual(0.5);
              }
            }
          }
        }
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("shows the waiting hint only for a sustained obstruction while the mode allows hints", () => {
    let hints = false;
    const { rides, player, ambient, waiting } = makeRides(() => hints);
    const car = rides.createModeCar(TAXI_CAR, new THREE.Group());
    player.root.position.copy(car.mesh.position);
    expect(rides.board(car)).toBe(true);
    const obstacle = vi.spyOn(ambient, "personAhead").mockReturnValue(0);
    let time = 0;
    const drive = (frames: number) => {
      for (let i = 0; i < frames; i++) rides.update(0.05, time += 0.05, { throttle: 1, steer: 0, brake: false });
    };

    drive(80);
    expect(rides.phase).toBe("on");
    expect(waiting).not.toHaveBeenCalled();
    expect(rides.waitingForTraffic).toBe(false);

    hints = true;
    drive(40);
    expect(waiting).not.toHaveBeenCalled();
    drive(8);
    expect(waiting).toHaveBeenCalledOnce();
    expect(rides.waitingForTraffic).toBe(true);

    obstacle.mockReturnValue(Infinity);
    drive(1);
    expect(rides.waitingForTraffic).toBe(false);
    obstacle.mockReturnValue(0);
    drive(48);
    expect(rides.waitingForTraffic).toBe(true);
    rides.abandon();
    expect(rides.waitingForTraffic).toBe(false);
  });

  it("lets eastbound traffic clear Main Street while the taxi yields at Center Street", () => {
    const { rides, player, ambient } = makeRides();
    const route = TAXI_ROUTES[0], { at } = route.decisions[0];
    const traffic = ambient.traffic[0];
    const car = rides.createModeCar(TAXI_CAR, new THREE.Group());
    // The taxi's nose is at the side of the car that is already crossing the intersection.
    const z = traffic.lane - traffic.half.z - car.m.spec.half;
    rides.resetPosition(car, { x: at.x, z, rot: 0 });
    player.root.position.set(at.x, 0, z - 2);
    expect(rides.board(car)).toBe(true);
    ambient.riding = true;
    let time = 0;
    for (let i = 0; i < 16; i++) rides.update(0.05, time += 0.05, null);
    expect(rides.phase).toBe("on");
    traffic.x = at.x - traffic.half.x / 2;
    traffic.speed = 0;
    for (const other of ambient.traffic.slice(1)) other.hidden = 100;

    let peakBump = 0;
    for (let i = 0; i < 160; i++) {
      rides.update(0.05, time += 0.05, { throttle: 1, steer: 0, brake: false });
      ambient.update(0.05, player.root.position);
      peakBump = Math.max(peakBump, car.m.bump);
    }
    expect(traffic.x, "the traffic car must finish crossing").toBeGreaterThan(at.x + traffic.half.x);
    expect(checkDecision(route, 0, car.m)).toBe("followed");
    expect(peakBump).toBeLessThan(0.3);
  });

  it("uses the stand, late-bound conversation lines, ordered decision points and an actual door", () => {
    expect(TAXI_CAR).toMatchObject(TAXI);
    expect(RIDES.cars.map(({ id }) => id)).not.toContain(TAXI_CAR.id);
    expect(TAXI_ROUTES.map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
    for (const route of TAXI_ROUTES) {
      expect(route.start).toEqual(TAXI);
      expect(route.decisions).toHaveLength(6);
      const prefix = `tx_${route.id}`;
      for (const suffix of ["dest", "a_fare", "tip_great", "tip_good", "tip_ok"]) expect(TAXI_LINES[`${prefix}_${suffix}`]).toBeDefined();
      route.decisions.forEach((step, i) => {
        expect(step.key).toBe(`${prefix}_c${i + 1}`);
        expect(taxi.lines[step.key]).toBe(TAXI_LINES[step.key]);
        const path = approach(route, i);
        expect(path[0]).toEqual(i ? route.decisions[i - 1].at : route.start);
        expect(approachDistance(path, step.at).remaining).toBe(0);
        const incoming = path.at(-2)!;
        const f = { x: step.at.x - incoming.x, z: step.at.z - incoming.z };
        const next = route.decisions[i + 1];
        if (step.action === "left" || step.action === "right") {
          const to = next.via?.[0] ?? next.at;
          const turn = f.x * (to.z - step.at.z) - f.z * (to.x - step.at.x);
          expect(Math.sign(turn)).toBe(step.action === "right" ? 1 : -1);
        }
      });
      const door = BUILDINGS.find((b) => b.loc === route.destination)!;
      const stop = route.decisions.at(-1)!;
      expect(stop.action).toBe("stop");
      expect(stop.at.x).toBe(door.x);
      const offset = door.d / 2, doorZ = door.z + (door.face === "n" ? -offset : offset);
      expect(Math.abs(stop.at.z - doorZ)).toBeLessThan(7);
      expect(Math.sign(stop.at.z - doorZ)).toBe(door.face === "n" ? -1 : 1);
    }
  });

  it("keeps every driving leg on the street and clear of buildings and parked cars", () => {
    const cars = [
      ...PARKED_CARS.filter((car) => car !== TAXI).map((car) => ({ ...car, ...carModelEntry(car.model).collisionBox })),
      ...RIDES.cars.map((car) => ({ ...car, length: CAR.half * 2, width: CAR.wide * 2 })),
    ];
    function check(point: Point, carX: number, carZ: number, heading: number) {
      const onRoad = ROADS.some(({ x1, x2, z1, z2, w }) => point.x >= Math.min(x1, x2) - (x1 === x2 ? w / 2 : 0)
        && point.x <= Math.max(x1, x2) + (x1 === x2 ? w / 2 : 0) && point.z >= Math.min(z1, z2) - (z1 === z2 ? w / 2 : 0)
        && point.z <= Math.max(z1, z2) + (z1 === z2 ? w / 2 : 0));
      expect(onRoad, JSON.stringify(point)).toBe(true);
      const radius = taxiSize.width / 2, offset = taxiSize.length / 2 - radius;
      const footprint = { x: carX + offset * Math.sin(heading), z: carZ + offset * Math.cos(heading) };
      const building = BUILDINGS.find((b) => Math.abs(b.x - footprint.x) < b.w / 2 + radius && Math.abs(b.z - footprint.z) < b.d / 2 + radius);
      expect(building?.id, JSON.stringify(point)).toBeUndefined();
      const parked = cars.find((car) => {
        const x = footprint.x - car.x, z = footprint.z - car.z;
        return Math.abs(x * Math.sin(car.rot) + z * Math.cos(car.rot)) < car.length / 2 + radius
          && Math.abs(x * Math.cos(car.rot) - z * Math.sin(car.rot)) < car.width / 2 + radius;
      });
      expect(parked, JSON.stringify(point)).toBeUndefined();
    }
    for (const route of TAXI_ROUTES) for (const [i] of route.decisions.entries()) {
      const path = approach(route, i);
      for (let j = 1; j < path.length; j++) {
        const a = path[j - 1], b = path[j];
        const dx = b.x - a.x, dz = b.z - a.z, rot = Math.atan2(dx, dz);
        const n = Math.ceil(Math.hypot(dx, dz));
        for (let k = 0; k <= n; k++) {
          const x = a.x + dx * k / n, z = a.z + dz * k / n;
          check({ x, z }, x, z, rot);
          check({ x, z }, x, z, rot + Math.PI);
        }
      }
    }
  });
});

describe("taxi scoring", () => {
  const [route] = TAXI_ROUTES;
  it("subtracts each fare from the amounts Vinnie hands over", () => {
    const paid = [
      { great: 3000, good: 2800, ok: 2600 },
      { great: 2600, good: 2400, ok: 2200 },
      { great: 2500, good: 2400, ok: 2200 },
    ] as const;
    expect(TAXI_ROUTES.map(({ fare }) => fare)).toEqual([2450, 2100, 2050]);
    for (const [i, { fare, tips }] of TAXI_ROUTES.entries()) {
      for (const tier of ["great", "good", "ok"] as const) expect(tips[tier]).toBe(paid[i][tier] - fare);
    }
  });

  it("advances only after following the correct exit and puts a wrong turn back on its approach", () => {
    const index = 0;
    expect(checkDecision(route, index, { x: 0, z: -5, heading: 0, pace: 3 })).toBe("continue");
    expect(checkDecision(route, index, { x: 0, z: 0, heading: 0, pace: 3 })).toBe("followed");
    expect(checkDecision(route, index, { x: -11, z: -9, heading: -Math.PI / 2, pace: 3 })).toBe("continue");
    expect(checkDecision(route, index, { x: -20, z: -9, heading: -Math.PI / 2, pace: 3 })).toBe("wrong");
    expect(resetPose(approach(route, index))).toEqual({ x: 14, z: -9, rot: -Math.PI / 2 });
  });

  it("requires a full stop in the zone and detects a pass", () => {
    const index = 5, at = route.decisions[index].at;
    const measure = (x: number, z: number, pace: number) => checkDecision(route, index, { x, z, pace, heading: -Math.PI / 2 });
    expect(measure(at.x + 4, at.z, 0.49)).toBe("stopped");
    expect(measure(at.x + 4.1, at.z, 0)).toBe("continue");
    expect(measure(at.x, at.z + 2, 0)).toBe("continue");
    expect(measure(at.x, at.z, 0.5)).toBe("continue");
    expect(inStopZone(route, { x: at.x + 4, z: at.z })).toBe(true);
    expect(inStopZone(route, { x: at.x + 4.1, z: at.z })).toBe(false);
    expect(inStopZone(route, { x: at.x, z: at.z + 2 })).toBe(false);
    expect(measure(at.x - 16, at.z, 1)).toBe("passed");
    const other = TAXI_ROUTES[1];
    const reset = resetPose(approach(other, index));
    expect(checkDecision(other, index, { ...reset, heading: reset.rot, pace: 0 })).toBe("continue");
  });

  it("awards tip tiers for first attempts, a calm stop and a clean car", () => {
    expect(taxiScore(5, 5, true, 0)).toMatchObject({ tier: "great", points: 7, max: 7 });
    expect(taxiScore(5, 4, true, 0)).toMatchObject({ tier: "good", points: 6 });
    expect(taxiScore(5, 5, true, 1)).toMatchObject({ tier: "good", points: 6 });
    expect(taxiScore(5, 4, false, 1)).toMatchObject({ tier: "ok", points: 4 });
  });
});
