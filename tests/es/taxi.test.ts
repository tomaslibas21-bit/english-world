import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { TAXI_CAR, TAXI_ROUTES } from "../../src/content/taxi";
import { TAXI_LINES, TAXI_MERGES } from "../../src/content/taxi-lines";
import { NPCS } from "../../src/content/npcs";
import taxi from "../../src/content/situations/s66-taxi";
import { Ambient } from "../../src/game/ambient";
import { CameraRig } from "../../src/game/camera";
import { createCharacter } from "../../src/game/characters";
import type { ModeHost } from "../../src/game/kit/host";
import { conversationLine } from "../../src/game/kit/lines";
import { scoreShot } from "../../src/game/kit/scoreShot";
import { NavGrid } from "../../src/game/nav";
import { OcclusionField } from "../../src/game/occlusion";
import { PadButton } from "../../src/game/padButtons";
import { Rides } from "../../src/game/rides/Rides";
import { CAR, pushOutOfBox } from "../../src/game/rides/drive";
import { carFootprint, carLedges, carModelEntry } from "../../src/game/world/carModels";
import { PARKED_CARS, ROADS, TAXI, WORLD } from "../../src/game/world/layout";
import { RIDES } from "../../src/game/world/rides";
import { buildTown } from "../../src/game/world/town";
import { floorY } from "../../src/game/water";
import { Colliders } from "../../src/game/world/util";
import { approach, approachDistance, checkDecision, inStopZone, resetPose, taxiScore, type Point } from "../../src/game/taxi/route";
import { createTaxiMode } from "../../src/game/taxi/mode";
import { createStopBay } from "../../src/game/taxi/stopBay";
import { resetTaxiUi, useTaxi } from "../../src/game/taxi/store";

function withTown<T>(check: (town: ReturnType<typeof buildTown>) => T): T {
  const draw = () => {};
  const gradient = () => ({ addColorStop: draw });
  const canvas = new Proxy({
    measureText: (text: string) => ({ width: text.length * 9 }),
    createLinearGradient: gradient, createRadialGradient: gradient,
  }, { get: (target, key) => Reflect.get(target, key) ?? draw });
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => canvas }) });
  try { return check(buildTown()); } finally { vi.unstubAllGlobals(); }
}

function makeRides(allowsHints?: () => boolean, colliders = new Colliders()) {
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

const taxiBox = carModelEntry(TAXI.model).collisionBox;
const taxiSurfaces = carLedges(TAXI.model, TAXI.x, TAXI.z, TAXI.rot);

describe("Puerto Colibrí taxi routes", () => {
  it("keeps physical and pad cue holds independent through release, loss of focus and unplug", () => {
    const { rides } = makeRides();
    const drive = vi.fn(), horn = vi.fn();
    const mode = createTaxiMode({
      rides, drive, horn, add: () => {}, dismount: () => {}, left: () => {}, standTaxi: { root: new THREE.Group(), fallback: new THREE.Group() },
    } as unknown as ModeHost)!;
    const route = TAXI_ROUTES[0], decision = route.decisions[0], pose = resetPose(approach(route, 0));
    const run = { route, index: 0, phase: "drive", help: 0, nearTime: 0, spoken: true, pending: true };
    Object.assign(mode, { run });
    rides.riding = mode.car;
    const sample = (pressed = 0, released = 0) => mode.padTick(null, pressed, released);
    const step = () => {
      mode.update({ dt: 0.05, time: 1, x: 0, y: 0, brake: false, blocked: false });
      return drive.mock.lastCall?.[1];
    };
    const neutral = { throttle: 0, steer: 0, brake: false };
    const assisted = { throttle: 1, steer: -1, brake: false };
    try {
      rides.resetPosition(mode.car, pose);
      const sentence = conversationLine(taxi.id, "vinnie", decision.key, TAXI_LINES, false)!;
      useTaxi.setState({ line: { key: decision.key, sentence } });
      sample(PadButton.A);
      expect(step()).toMatchObject(neutral);
      expect(useTaxi.getState().action).toBe("left");
      sample();
      expect(step()).toMatchObject(neutral);
      sample(0, PadButton.A);
      sample(PadButton.A | PadButton.RB);
      expect(horn).toHaveBeenCalledOnce();
      expect(step()).toMatchObject(assisted);
      sample(0, PadButton.A);
      expect(step()).toMatchObject(neutral);

      mode.action("assist", true);
      mode.action("assist-space", true);
      mode.action("assist-enter", true);
      sample(PadButton.A);
      mode.padCancel();
      mode.action("assist", false);
      mode.action("assist-space", false);
      expect(step()).toMatchObject(assisted);
      mode.action("assist-enter", false);
      expect(step()).toMatchObject(neutral);

      mode.action("assist", true);
      mode.action("assist-blur");
      expect(step()).toMatchObject(neutral);
      mode.action("assist", false);
      expect(step()).toMatchObject(neutral);

      sample(PadButton.A);
      mode.action("assist", true);
      mode.action("assist-space", true);
      mode.action("assist-blur");
      expect(step()).toMatchObject(assisted);
      mode.action("assist-enter", true);
      mode.blur();
      expect(step()).toMatchObject(neutral);
    } finally {
      mode.dispose();
      resetTaxiUi();
    }
  });

  it("paints two meshes alongside the curb at each stop and clears the hotel's parked van", () => {
    for (const route of TAXI_ROUTES) {
      const bay = createStopBay(route), stop = route.decisions.at(-1)!.at;
      const [paint, glow] = bay.root.children as [
        THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>,
        THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>,
      ];
      expect(bay.root.visible).toBe(false);
      expect(bay.root.children).toHaveLength(2);
      expect(paint.geometry.groups).toHaveLength(0);
      expect(Math.abs(bay.root.rotation.y)).toBeCloseTo(Math.PI / 2);
      bay.root.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(paint, true);
      expect(bounds.min.x).toBeCloseTo(stop.x - 4);
      expect(bounds.max.x).toBeCloseTo(stop.x + 4);
      const curb = route.destination === "hotel" ? -13 : route.destination === "market" ? -50.5 : -3;
      const offset = route.destination === "hotel" ? bounds.min.z - curb : curb - bounds.max.z;
      expect(offset).toBeGreaterThan(0);
      if (route.destination === "hotel") {
        const van = PARKED_CARS.find(({ model, x }) => model === "van" && x === -88)!;
        expect(bounds.min.z).toBeGreaterThan(carFootprint(van).maxZ);
        expect(bounds.min.z - carFootprint(van).maxZ).toBeLessThan(0.3);
        expect(bounds.max.z).toBeLessThan(-8.09);
      } else expect(offset).toBeLessThan(0.25);

      const centre = new THREE.Vector3().fromBufferAttribute(glow.geometry.getAttribute("position"), 0);
      expect(centre.z).toBeGreaterThan(3.5);
      bay.pulse(0);
      const peak = glow.material.opacity;
      bay.pulse(1);
      expect(glow.material.opacity).toBeLessThan(peak);
      bay.dispose();
    }
  });

  it("boards the existing stand car and keeps it out of the town rides and map", () => withTown(({ parkedCars, colliders }) => {
    const { rides, player, ambient } = makeRides();
    const marks = rides.marksForMap();
    const stand = parkedCars.taxi!;
    expect(stand.fallback?.parent).toBe(stand.root);
    expect(stand.root.parent).toBe(parkedCars.group);
    expect(colliders.blocked(TAXI.x, TAXI.z, 0.1)).toBe(false);
    const otherTaxi = PARKED_CARS.find((spot) => spot !== TAXI && spot.model === "taxi")!;
    expect(colliders.boxes).toContainEqual({ ...carFootprint(otherTaxi), tag: "car", split: true });
    const car = rides.createModeCar(TAXI_CAR, stand.root);
    expect(car.mesh).toBe(stand.root);
    expect(car.mesh.parent).toBe(rides.group);
    expect(car.m.spec).toMatchObject({ half: taxiBox.length / 2, wide: taxiBox.width / 2, town: TAXI_CAR.speedLimit });
    expect(rides.modeCarPieces(TAXI.x, TAXI.z)).toEqual(taxiSurfaces);
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
    expect(car.m.pace).toBeLessThanOrEqual(TAXI_CAR.speedLimit);
    expect(trafficBox.x).toBe(car.m.x);
    const stop = { x: car.m.x, z: car.m.z, rot: car.m.heading };
    rides.abandon(true);
    expect(rides.riding).toBeNull();
    expect(car.m.pace).toBe(0);
    expect(trafficBox).toMatchObject({ x: stop.x, z: stop.z });
    expect(rides.modeCarPieces(stop.x, stop.z)).toEqual(carLedges(TAXI.model, stop.x, stop.z, stop.rot));

    player.root.position.set(stop.x, 0, stop.z + 1.5);
    expect(rides.board(car)).toBe(true);
    rides.abandon();
    expect(trafficBox.x).toBe(TAXI.x);
    expect(rides.modeCarPieces(TAXI.x, TAXI.z)).toEqual(taxiSurfaces);
    rides.removeModeCar(car);
    expect(ambient.rideBoxes).not.toContain(trafficBox);
  }));

  it("frames the parked taxi and the learner at each destination", () => withTown(({ group, doors, colliders, parkedCars }) => {
    const field = OcclusionField.fromObject(group, {
      minX: WORLD.minX - 24, maxX: WORLD.maxX + 24, minZ: WORLD.minZ - 24, maxZ: WORLD.maxZ + 24,
    }, { skip: (o) => o.userData.v !== undefined || !!o.userData.gull || !!o.userData.boat || !!o.userData.thin || o === parkedCars.taxi?.root });
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
        const taxi = new THREE.Box3(new THREE.Vector3(minX, 0, minZ), new THREE.Vector3(maxX, taxiBox.height, maxZ));
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
  }));

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
    rides.abandon();
    expect(rides.waitingForTraffic).toBe(false);
  });

  it("lets the bus clear Juárez while the taxi yields during the first turn", () => withTown(({ colliders, parkedCars }) => {
    const { rides, player, ambient } = makeRides(undefined, colliders);
    const route = TAXI_ROUTES[0], { at } = route.decisions[0];
    const bus = ambient.traffic[0];
    const taxi = rides.createModeCar(TAXI_CAR, parkedCars.taxi!.root);
    const za = bus.lane - bus.half.z - taxi.m.spec.half;
    // The bus is already alongside, at the position where the taxi's nose comes to rest against its side.
    rides.resetPosition(taxi, { x: at.x, z: za, rot: 0 });
    player.root.position.set(at.x, 0, za - 2);
    expect(rides.board(taxi)).toBe(true);
    ambient.riding = true;
    let time = 0;
    for (let i = 0; i < 16; i++) rides.update(0.05, time += 0.05, null);
    expect(rides.phase).toBe("on");
    bus.x = at.x - bus.half.x / 2;
    bus.speed = 0;
    for (const other of ambient.traffic.slice(1)) other.hidden = 100;

    let peakBump = 0;
    for (let i = 0; i < 160; i++) {
      rides.update(0.05, time += 0.05, { throttle: 1, steer: 0, brake: false });
      ambient.update(0.05, player.root.position);
      peakBump = Math.max(peakBump, taxi.m.bump);
    }
    expect(bus.x, "the bus must finish crossing").toBeGreaterThan(at.x + bus.half.x);
    expect(checkDecision(route, 0, taxi.m)).toBe("followed");
    expect(peakBump).toBeLessThan(0.3);
  }));

  it("uses the stand, late-bound conversation lines, ordered decision points and an actual door", () => {
    expect(TAXI_CAR).toMatchObject(TAXI);
    expect(RIDES.cars.map(({ id }) => id)).not.toContain(TAXI_CAR.id);
    expect(TAXI_ROUTES.map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
    for (const route of TAXI_ROUTES) {
      expect(route.start).toEqual({ ...TAXI, z: -9.5 });
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
    }
    expect(TAXI_ROUTES.map(({ destination, fare }) => [destination, fare]))
      .toEqual([["hotel", 12000], ["market", 10000], ["bank", 10000]]);
    expect(TAXI_ROUTES.every(({ tips }) => tips.great === 2000 && tips.good === 1000 && tips.ok === 500)).toBe(true);
    for (const [key, lines] of Object.entries(TAXI_LINES)) {
      expect(taxi.lines[key]).toBe(lines);
      expect(lines).toHaveLength(1);
    }
    for (const [key, merge] of Object.entries(TAXI_MERGES)) expect(taxi.merges?.[key]).toBe(merge);
  });

  it("keeps all driving legs and their stopping points clear in the built town", () => withTown(({ doors, colliders }) => {
    const obstacles = RIDES.cars;
    function check(point: Point, heading: number) {
      const onRoad = ROADS.some(({ x1, x2, z1, z2, w }) => point.x >= Math.min(x1, x2) - (x1 === x2 ? w / 2 : 0)
        && point.x <= Math.max(x1, x2) + (x1 === x2 ? w / 2 : 0) && point.z >= Math.min(z1, z2) - (z1 === z2 ? w / 2 : 0)
        && point.z <= Math.max(z1, z2) + (z1 === z2 ? w / 2 : 0));
      expect(onRoad, JSON.stringify(point)).toBe(true);
      const radius = taxiBox.width / 2;
      const offset = taxiBox.length / 2 - radius;
      for (const distance of [-offset, 0, offset]) {
        const x = point.x + distance * Math.sin(heading), z = point.z + distance * Math.cos(heading);
        expect(colliders.blocked(x, z, radius), `town obstacle at (${x}, ${z})`).toBe(false);
        for (const car of obstacles) {
          expect(pushOutOfBox({ x, z }, radius, car.x, car.z, car.rot, CAR.half, CAR.wide),
            `${car.id} convertible at (${x}, ${z})`).toBe(false);
        }
      }
    }
    for (const route of TAXI_ROUTES) {
      const door = doors.find(({ loc }) => loc === route.destination)!;
      const stop = route.decisions.at(-1)!;
      expect(stop.action).toBe("stop");
      expect(stop.at.x).toBe(door.x);
      expect(Math.abs(stop.at.z - door.z)).toBeLessThan(9);
      expect(Math.sign(stop.at.z - door.z)).toBe(door.face === "n" ? -1 : 1);
      let length = 0;
      for (const [i, decision] of route.decisions.entries()) {
        if (decision.lead) expect(decision.lead).toBeGreaterThan(90);
        const path = approach(route, i);
        for (let j = 1; j < path.length; j++) {
          const a = path[j - 1], b = path[j];
          const dx = b.x - a.x, dz = b.z - a.z, rot = Math.atan2(dx, dz);
          length += Math.hypot(dx, dz);
          const n = Math.ceil(Math.hypot(dx, dz));
          for (let k = 0; k <= n; k++) check({ x: a.x + dx * k / n, z: a.z + dz * k / n }, rot);
        }
      }
      expect(length).toBeGreaterThan(330);
      expect(length).toBeLessThan(420);
    }
  }));
});

describe("taxi scoring", () => {
  const [route] = TAXI_ROUTES;
  it("advances only after following the correct exit and puts a wrong turn back on its approach", () => {
    const index = 0;
    const at = route.decisions[index].at;
    expect(checkDecision(route, index, { x: at.x, z: at.z + 4, heading: 0, pace: 3 })).toBe("continue");
    expect(checkDecision(route, index, { x: at.x, z: at.z + 9, heading: 0, pace: 3 })).toBe("followed");
    expect(checkDecision(route, index, { x: at.x - 11, z: at.z, heading: -Math.PI / 2, pace: 3 })).toBe("continue");
    expect(checkDecision(route, index, { x: at.x - 20, z: at.z, heading: -Math.PI / 2, pace: 3 })).toBe("wrong");
    expect(resetPose(approach(route, index))).toEqual({ x: at.x + 14, z: at.z, rot: -Math.PI / 2 });
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
