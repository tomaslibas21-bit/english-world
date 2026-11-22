import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { addDent, CrashGeometry, crashSeverity, crashSide, dentFalloff, MAX_DEPTH, mergedVertexCount, type Dent } from "../src/game/rides/crashGeometry";
import { CAR, Motion, type MotionImpact } from "../src/game/rides/drive";
import { convertibleGeometry } from "../src/game/rides/shapes";
import { ParkedFleet } from "../src/game/world/parkedFleet";
import { Crashes } from "../src/game/rides/crash";
import type { Ride, RideHost } from "../src/game/rides/Rides";
import { GAS_FORECOURT } from "../src/game/world/layout";
import { carParts, mergeCarParts, mxTaxiParts } from "../src/game/world/car";

const front = { x: 0, y: 0.65, z: 2.16, nx: 0, nz: -1, side: "front" } as const;

describe("crash impacts", () => {
  it("scales from a scrape to a hard crash", () => {
    expect([0, 1.9, 2, 4, 10, 12, 20].map(crashSeverity)).toEqual([0, 0, 0, 0.2, 0.8, 1, 1]);
  });

  it("classifies each side in the car's heading", () => {
    expect(crashSide(0, -1)).toBe("front");
    expect(crashSide(0, 1)).toBe("back");
    expect(crashSide(-1, 0)).toBe("left");
    expect(crashSide(1, 0)).toBe("right");
    expect(crashSide(-1, 0, Math.PI / 2)).toBe("front");
    expect(crashSide(0, 1, Math.PI / 2)).toBe("left");
  });

  it("reports the contacting circle and incoming speed without changing settling", () => {
    const run = (impact?: MotionImpact) => {
      const motion = new Motion(CAR, "car");
      motion.set(0, 0, 0);
      motion.speed = 8;
      const moved = motion.settle((p, r) => { p.z = Math.min(p.z, 1.95 - r); }, impact);
      return { moved, x: motion.x, z: motion.z, heading: motion.heading, speed: motion.speed, bump: motion.bump };
    };
    const hit: MotionImpact = { into: 0, nx: 0, nz: 0, x: 0, z: 0, circle: 1 };
    expect(run(hit)).toEqual(run());
    expect(hit).toEqual({ into: 8, nx: 0, nz: -1, x: 0, z: 1.95, circle: 0 });
  });
});

describe("dent geometry", () => {
  it("falls off smoothly and keeps a budget of five dents and 22 cm", () => {
    const dents: Dent[] = [];
    addDent(dents, { ...front, k: 0.2 });
    const light = dents[0];
    expect(light.depth).toBeCloseTo(0.06, 2);
    expect(dentFalloff(light, light.x, light.y, light.z)).toBe(1);
    expect(dentFalloff(light, light.x + 0.12, light.y, light.z)).toBeGreaterThan(dentFalloff(light, light.x + 0.22, light.y, light.z));
    expect(dentFalloff(light, light.x + 0.4, light.y, light.z)).toBe(0);
    for (let i = 0; i < 8; i++) addDent(dents, { ...front, x: i * 0.1, k: 1 });
    expect(dents).toHaveLength(5);
    expect(dents[4].depth).toBeCloseTo(0.18);
    expect(dents.reduce((sum, d) => sum + d.depth, 0)).toBeCloseTo(MAX_DEPTH);
  });

  it("deforms duplicate positions together, preserves wheels, and restores the shared original", () => {
    const original = convertibleGeometry("#e45b4f");
    const mesh = new THREE.Mesh(original, new THREE.MeshLambertMaterial({ vertexColors: true }));
    const sibling = new THREE.Mesh(original, mesh.material);
    const before = original.getAttribute("position"), color = original.getAttribute("color");
    const positions = Array.from(before.array), colors = Array.from(color.array);
    const dents: Dent[] = [];
    addDent(dents, { ...front, x: 0.67, k: 0.8 });
    const surface = new CrashGeometry(mesh, mesh, dents);
    expect(surface.rebuild(dents)).toBe(true);
    expect(surface.lamps.filter((lamp) => lamp.cracked)).toHaveLength(1);
    expect(surface.hanging).toBe(true);

    const after = surface.geometry.getAttribute("position"), afterColor = surface.geometry.getAttribute("color");
    const [wheelStart, wheelEnd] = original.userData.crashWheels;
    expect(after.count).toBeGreaterThan(before.count);
    expect(after.count).toBeLessThanOrEqual(8000);
    expect(Array.from(after.array.slice(wheelStart * 3, wheelEnd * 3))).toEqual(positions.slice(wheelStart * 3, wheelEnd * 3));
    expect(Array.from(afterColor.array.slice(wheelStart * 3, wheelEnd * 3))).toEqual(colors.slice(wheelStart * 3, wheelEnd * 3));
    const seen = new Map<string, number>();
    let changed = 0, duplicateDent = 0;
    for (let i = 0; i < wheelStart; i++) {
      const key = [before.getX(i), before.getY(i), before.getZ(i)].join(",");
      const dented = after.getZ(i) !== before.getZ(i);
      if (dented) changed++;
      const j = seen.get(key);
      if (j !== undefined && dented) {
        expect(after.getX(i)).toBe(after.getX(j));
        expect(after.getY(i)).toBe(after.getY(j));
        expect(after.getZ(i)).toBe(after.getZ(j));
        duplicateDent++;
      }
      seen.set(key, i);
    }
    expect(changed).toBeGreaterThan(0);
    expect(duplicateDent).toBeGreaterThan(0);
    expect(sibling.geometry).toBe(original);
    expect(Array.from(before.array)).toEqual(positions);
    expect(Array.from(color.array)).toEqual(colors);
    surface.show(0);
    expect(Array.from(after.array.slice(0, positions.length))).toEqual(positions);
    expect(Array.from(afterColor.array.slice(0, colors.length))).toEqual(colors);
    surface.restore();
    expect(mesh.geometry).toBe(original);
  });

  it("gives a coarse side panel a broad bowl with a shallower shoulder", () => {
    const geometry = new THREE.BoxGeometry(1.64, 0.8, 1.4, 1, 1, 2).translate(0, 0.77, 0);
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(geometry.getAttribute("position").count * 3).fill(1), 3));
    const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial());
    const dents: Dent[] = [];
    addDent(dents, { side: "right", x: -1, y: 0.77, z: 0, nx: 0.83, nz: 0.56, k: 0.7 });
    const surface = new CrashGeometry(mesh, mesh, dents);
    surface.rebuild(dents);
    const positions = surface.geometry.getAttribute("position"), rest = surface.geometry.getAttribute("crashRest");
    let center = 0, shoulder = 0;
    for (let i = 0; i < rest.count; i++) {
      if (rest.getX(i) > -0.8 || Math.abs(rest.getY(i) - 0.77) > 0.11) continue;
      const along = Math.abs(rest.getZ(i));
      const inset = positions.getX(i) - rest.getX(i);
      if (along < 0.05) center = Math.max(center, inset);
      if (along > 0.3 && along < 0.55) shoulder = Math.max(shoulder, inset);
      expect(positions.getZ(i)).toBe(rest.getZ(i));
    }
    expect(center).toBeGreaterThan(0.09);
    expect(shoulder).toBeGreaterThan(0.025);
    expect(shoulder).toBeLessThan(center);
    expect(positions.count).toBeGreaterThan(geometry.getAttribute("position").count);
    surface.restore();
  });

  it("returns temporarily damaged cars to the shared draw until they have been driven", () => {
    const group = new THREE.Group(), fleet = new ParkedFleet(group);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshLambertMaterial());
    fleet.add({ model: "sedan", color: "#a8543f", x: 1, z: 0, rot: 0 }, mesh);
    const [car] = fleet.cars;
    fleet.refresh();
    fleet.take(car, false);
    expect(mesh.visible).toBe(true);
    expect(group.children).toHaveLength(0);
    fleet.untake(car);
    expect(mesh.visible).toBe(false);
    expect(group.children).toHaveLength(1);
    fleet.take(car, false);
    fleet.take(car);
    fleet.untake(car);
    expect(mesh.visible).toBe(true);
    expect(group.children).toHaveLength(0);
    fleet.dispose();
    mesh.material.dispose();
  });

  it("protects all the Mexican taxi fallback wheels and leaves the trim outside the wheel range", () => {
    const body = "#f4f6f8";
    const plain = mergeCarParts(carParts(body)), parts = mxTaxiParts(body, "#1f8a4c");
    const count = mergedVertexCount(parts), taxi = mergeCarParts(parts);
    const [plainFirst, plainEnd] = plain.userData.crashWheels;
    const [taxiFirst, taxiEnd] = taxi.userData.crashWheels;
    expect(taxiFirst).toBeGreaterThan(plainFirst);
    expect(taxiEnd).toBe(count);
    expect(taxi.getAttribute("position").array.slice(taxiFirst * 3, taxiEnd * 3))
      .toEqual(plain.getAttribute("position").array.slice(plainFirst * 3, plainEnd * 3));
    plain.dispose();
    taxi.dispose();
  });
});

describe("crash effects", () => {
  const makeCar = (id: string, x = 0): Ride => {
    const m = new Motion(CAR, "car");
    m.set(x, 0, 0);
    const mesh = new THREE.Mesh(convertibleGeometry("#e45b4f"), new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.position.x = x;
    return {
      id, kind: "car", mesh, m, home: { x, z: 0, rot: 0 }, owners: [], chat: null,
      awayT: 0, thanked: true, phase: 0, tint: "#e45b4f",
      sus: { y: 0, vy: 0, p: 0, vp: 0, road: [true, true], side: [[], []] },
    };
  };

  function fixture(quality: "low" | "high" = "low") {
    const group = new THREE.Group(), cam = new THREE.PerspectiveCamera(50, 1);
    cam.position.set(0, 3, 8); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
    const crashSound = vi.fn();
    const host = { cam, crashSound, quality, ambient: { traffic: [] }, player: { root: new THREE.Group() } } as unknown as RideHost;
    const car = makeCar("driver");
    const crashes = new Crashes(host, group, () => car);
    const frontHit = { circle: 0, x: 0.67, z: 2.16, nx: 0, nz: -1, into: 10 } as const;
    return { crashes, car, group, crashSound, frontHit };
  }

  it.each([{ quality: "low", limit: 6 }, { quality: "high", limit: 8 }] as const)(
    "feeds a plume over time within the $quality quality budget", ({ quality, limit }) => {
      const { crashes, car, frontHit } = fixture(quality);
      crashes.impact(car, "town", frontHit);
      expect(crashes.inspect.stats().puffs).toBe(2);
      let peak = 0;
      for (let i = 0; i < 47; i++) {
        crashes.update(0.05, car);
        peak = Math.max(peak, crashes.inspect.stats().puffs);
      }
      expect(peak).toBeGreaterThanOrEqual(limit - 1);
      expect(peak).toBeLessThanOrEqual(limit);
      expect(crashes.inspect.stats().puffs).toBeGreaterThan(0);
      crashes.update(0.4, car);
      expect(crashes.inspect.stats().puffs).toBe(0);
      crashes.dispose();
    },
  );

  it("precompiles the damage program and both instanced effects and keeps their programs alive", async () => {
    const { crashes, car, group, frontHit } = fixture();
    const scene = new THREE.Scene();
    const compileAsync = vi.fn<THREE.WebGLRenderer["compileAsync"]>().mockImplementation(async (probes) => probes);
    const probes = await crashes.compileShaders({ compileAsync } as unknown as THREE.WebGLRenderer, scene, [car]);
    expect(compileAsync).toHaveBeenCalledWith(probes, expect.any(THREE.PerspectiveCamera), scene);
    expect(probes.parent).toBeNull();
    const [panel, hazards, clouds] = probes.children as THREE.Mesh[];
    expect(hazards.material).toBe((group.getObjectByName("crash-hazards") as THREE.Mesh).material);
    expect(clouds.material).toBe((group.getObjectByName("crash-puffs") as THREE.Mesh).material);
    const retained = panel.material as THREE.Material, dispose = vi.fn();
    retained.addEventListener("dispose", dispose);
    crashes.finishShaderWarmup();
    expect(dispose).not.toHaveBeenCalled();
    expect(probes.children).toHaveLength(0);
    crashes.impact(car, "town", frontHit);
    expect(((car.mesh as THREE.Mesh).material as THREE.Material).customProgramCacheKey()).toBe(retained.customProgramCacheKey());
    crashes.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("debounces repeats, keeps three parked cars damaged, and ages out the damage on the driven car", () => {
    const { crashes, car, frontHit } = fixture();
    crashes.impact(car, "town", frontHit);
    crashes.impact(car, "town", { ...frontHit, into: 4 });
    expect(crashes.inspect.info(car)?.dentCount).toBe(1);
    crashes.impact(car, "town", { ...frontHit, into: 11 });
    expect(crashes.inspect.info(car)?.dentCount).toBe(2);
    for (let i = 0; i < 4; i++) {
      crashes.update(0.4, car);
      crashes.impact(car, makeCar(`parked-${i}`, 9 + i), frontHit);
    }
    expect(crashes.inspect.stats().damaged).toBe(4);
    expect(crashes.inspect.info("parked-0")).toBeNull();
    expect(crashes.inspect.stats().puffs).toBeLessThanOrEqual(6);
    crashes.inspect.age?.(91);
    expect(crashes.inspect.info(car)).toBeTruthy();
    crashes.inspect.age?.(1.1);
    expect(crashes.inspect.info(car)).toBeNull();
    crashes.dispose();
  });

  it("repairs after a continuous stop by the pumps and plays the ding", () => {
    const { crashes, car, frontHit, crashSound } = fixture();
    const original = (car.mesh as THREE.Mesh).geometry;
    crashes.impact(car, "town", frontHit);
    const { x1, z1 } = GAS_FORECOURT;
    const x = x1 - 1, z = z1 - 1;
    car.m.set(x1 + 0.1, z, 0);
    car.mesh.position.set(x1 + 0.1, 0, z);
    crashes.update(1.5, car);
    expect(crashes.inspect.info(car)).toBeTruthy();
    car.m.set(x, z, 0);
    car.mesh.position.set(x, 0, z);
    crashes.update(1, car);
    expect(crashes.inspect.info(car)).toBeTruthy();
    car.m.speed = 1;
    crashes.update(0.1, car);
    car.m.speed = 0;
    crashes.update(1, car);
    expect(crashes.inspect.info(car)).toBeTruthy();
    crashes.update(0.5, car);
    expect(crashes.inspect.info(car)).toBeNull();
    expect((car.mesh as THREE.Mesh).geometry).toBe(original);
    expect(crashes.inspect.stats().sparkles).toBe(5);
    expect(crashes.inspect.stats().puffs).toBeLessThanOrEqual(6);
    expect(crashSound).toHaveBeenCalledWith("ding", 1);
    crashes.dispose();
  });

  it("uses one additive lamp mesh and fades it to a dark phase", () => {
    const { crashes, car, group, frontHit } = fixture();
    crashes.impact(car, "town", frontHit);
    const lamps = group.getObjectByName("crash-hazards") as THREE.InstancedMesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
    const intensity = lamps.geometry.getAttribute("blink");
    expect(lamps.material).toMatchObject({ blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    crashes.update(0.015, car);
    expect(lamps.count).toBe(4);
    expect(intensity.getX(0)).toBeGreaterThan(0);
    expect(intensity.getX(0)).toBeLessThan(1);
    crashes.update(0.12, car);
    expect(intensity.getX(0)).toBe(1);
    crashes.update(0.2, car);
    expect(lamps.visible).toBe(false);
    expect(lamps.count).toBe(0);
    crashes.dispose();
  });

  it("dents a nested taxi body at its stand and restores its material and geometry", () => {
    const { crashes, car, crashSound, frontHit } = fixture();
    const root = new THREE.Group(), kit = new THREE.Group();
    const taxi: Ride = { ...makeCar("taxi"), mesh: root };
    taxi.m.set(0, 2.9, 0);
    root.position.set(0, 0, 2.9);
    kit.scale.set(1.12, 0.94, 1.03);
    root.add(kit);
    const original = new THREE.BoxGeometry(1.85, 0.9, 3.96).translate(0, 0.6, 0);
    original.setAttribute("color", new THREE.BufferAttribute(new Float32Array(original.getAttribute("position").count * 3).fill(1), 3));
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    const body = new THREE.Mesh(original, material);
    body.name = "body";
    kit.add(body);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.25), material), wheelBefore = wheel.geometry;
    kit.add(wheel);
    crashes.impact(car, taxi, { ...frontHit, x: 0.4, z: 0.75, into: 6 });
    expect(crashes.inspect.info(taxi)).toMatchObject({ dentCount: 1, sides: ["back"], hazards: true, scuffs: true });
    expect(body.geometry).not.toBe(original);
    expect(body.material).not.toBe(material);
    expect(body.geometry.hasAttribute("crashRest")).toBe(true);
    expect(wheel.geometry).toBe(wheelBefore);
    expect(crashSound).toHaveBeenCalledWith("chirp", 0.4);
    crashes.dispose();
    expect(body.geometry).toBe(original);
    expect(body.material).toBe(material);
  });
});
