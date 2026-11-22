import * as THREE from "three";
import type { TrafficCar } from "../ambient";
import { GAS_FORECOURT } from "../world/layout";
import { addDent, CrashGeometry, crashSeverity, crashSide, type Dent } from "./crashGeometry";
import type { MotionImpact } from "./drive";
import type { Ride, RideHost } from "./Rides";

type Car = Ride | TrafficCar;
export type CrashTarget = Car | "town";
export type CrashSound = "crunch" | "glass" | "steam" | "honk" | "chirp" | "tick" | "ding";
type Damage = {
  surface?: CrashGeometry;
  dents: Dent[];
  last: number; k: number;
  driver: boolean;
  hazardUntil: number;
  blink: number;
  steam?: { x: number; y: number; z: number; next: number; interval: number; remaining: number };
};
type Puff = { x: number; y: number; z: number; dx: number; dz: number; rise: number; start: number; life: number; size: number; kind: PuffKind };
type PuffKind = "steam" | "dust" | "sparkle";

const isTraffic = (car: Car): car is TrafficCar => "dir" in car;
const HAZARD_HZ = 1.6;
const LAMP_NAMES = ["front-right", "front-left", "back-right", "back-left"] as const;
const PUFF_COLORS = { dust: new THREE.Color("#a39b90"), steam: new THREE.Color("#fffdf6"), sparkle: new THREE.Color("#ffdf83") };
const STEAM_EMISSION_TIME = 1.25;

function hazardMesh() {
  const slots = 24, size = 48, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x + 0.5) / size * 2 - 1, v = (y + 0.5) / size * 2 - 1;
    const r = Math.hypot(u, v), i = (y * size + x) * 4;
    pixels[i] = Math.round(255 * (1 - THREE.MathUtils.smoothstep(Math.hypot(u, v * 1.23), 0.20, 0.31)));
    pixels[i + 1] = Math.round(255 * (1 - THREE.MathUtils.smoothstep(r, 0.16, 0.98)) ** 2);
    pixels[i + 3] = 255;
  }
  const map = new THREE.DataTexture(pixels, size, size);
  map.magFilter = map.minFilter = THREE.LinearFilter;
  map.needsUpdate = true;
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.setAttribute("blink", new THREE.InstancedBufferAttribute(new Float32Array(slots), 1).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.ShaderMaterial({
    uniforms: { gradient: { value: map } },
    transparent: true, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float blink;
      varying vec2 lensUV;
      varying float intensity;
      void main() {
        lensUV = uv;
        intensity = blink;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D gradient;
      varying vec2 lensUV;
      varying float intensity;
      void main() {
        vec2 lens = texture2D(gradient, lensUV).rg;
        vec3 amber = mix(vec3(1.0, 0.32, 0.018), vec3(1.0, 0.73, 0.28), lens.r);
        gl_FragColor = vec4(amber, (0.78 * lens.r + 0.27 * lens.g) * intensity);
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.InstancedMesh(geometry, material, slots);
}

function puffGeometry() {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.setAttribute("puffAlpha", new THREE.InstancedBufferAttribute(new Float32Array(16), 1).setUsage(THREE.DynamicDrawUsage));
  return geometry;
}

const puffMaterial = () => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, toneMapped: false,
  vertexShader: `
    attribute float puffAlpha;
    varying vec2 shape;
    varying vec3 tint;
    varying float opacity;
    void main() {
      shape = uv - 0.5;
      tint = instanceColor;
      opacity = puffAlpha;
      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    varying vec2 shape;
    varying vec3 tint;
    varying float opacity;
    void main() {
      float core = 1.0 - smoothstep(0.05, 0.5, length(shape));
      float mask = core * (0.68 + 0.32 * core);
      if (opacity < 0.0) {
        vec2 axis = abs(shape);
        float rays = (1.0 - smoothstep(0.02, 0.10, min(axis.x, axis.y)))
          * (1.0 - smoothstep(0.12, 0.49, max(axis.x, axis.y)));
        mask = max(rays, core * core * core);
      }
      gl_FragColor = vec4(tint, mask * abs(opacity));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});

export class Crashes {
  private readonly damage = new Map<Car, Damage>();
  private readonly hazards = hazardMesh();
  private readonly blink = this.hazards.geometry.getAttribute("blink") as THREE.InstancedBufferAttribute;
  private readonly clouds = new THREE.InstancedMesh(puffGeometry(), puffMaterial(), 16);
  private readonly alpha = this.clouds.geometry.getAttribute("puffAlpha") as THREE.InstancedBufferAttribute;
  private readonly puffs: Puff[] = Array.from({ length: 16 }, () => ({
    x: 0, y: 0, z: 0, dx: 0, dz: 0, rise: 0, start: 0, life: 0, size: 0, kind: "dust",
  }));
  private readonly frustum = new THREE.Frustum();
  private readonly sphere = new THREE.Sphere(new THREE.Vector3(), 3);
  private readonly matrix = new THREE.Matrix4();
  private readonly pos = new THREE.Vector3();
  private readonly scale = new THREE.Vector3();
  private now = 0;
  private pumpTime = 0;
  private puffLimit: number;
  private puffCount = 0;
  private lastBuildMs = 0;
  private warmup?: { group: THREE.Group; bodies: THREE.BufferGeometry[]; materials: THREE.Material[]; instances: THREE.InstancedMesh[] };
  private lastImpact?: Readonly<{ id: string; k: number; into: number; side: Dent["side"]; target: "town" | "traffic" | "parked" }>;

  constructor(private readonly host: RideHost, group: THREE.Group, private readonly driver: () => Ride | null) {
    this.puffLimit = host.quality === "low" ? 6 : 16;
    for (const [mesh, name] of [[this.hazards, "crash-hazards"], [this.clouds, "crash-puffs"]] as const) {
      mesh.name = name;
      mesh.visible = false;
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(mesh);
    }
    this.clouds.renderOrder = 2;
    this.clouds.setColorAt(0, PUFF_COLORS.steam);
    this.clouds.instanceColor!.setUsage(THREE.DynamicDrawUsage);
  }

  readonly inspect = Object.freeze({
    stats: () => this.stats(),
    info: (which: Car | string) => this.info(which),
    last: () => this.lastImpact,
    ...(import.meta.env.DEV ? { healAll: () => this.healAll(), age: (seconds: number) => this.age(seconds) } : {}),
  });

  async compileShaders(renderer: THREE.WebGLRenderer, scene: THREE.Scene, rides: Iterable<Ride>) {
    const group = new THREE.Group();
    group.scale.setScalar(0.01);
    const sources = new Map<THREE.Material, THREE.BufferGeometry>();
    const addSource = (car: Car, mesh?: THREE.Mesh) => {
      const surface = this.damage.get(car)?.surface;
      const material = surface?.originalMaterial ?? mesh?.material;
      const geometry = surface?.original ?? mesh?.geometry;
      if (material && !Array.isArray(material) && geometry && !sources.has(material)) sources.set(material, geometry);
    };
    for (const ride of rides) if (ride.kind === "car") addSource(ride, this.visual(ride));
    for (const car of this.host.ambient.traffic) addSource(car, car.batchBody ?? car.mesh);

    // Use the real body attributes on the probes so the renderer selects exactly the same shader variants.
    const bodies: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [];
    for (const [material, geometry] of sources) {
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const { min, max } = geometry.boundingBox!;
      const dents: Dent[] = [];
      addDent(dents, { x: min.x * 0.46, y: 0.65, z: max.z, nx: 0, nz: -1, k: 0.75, side: "front" });
      addDent(dents, { x: min.x, y: 0.77, z: (min.z + max.z) * 0.5, nx: 1, nz: 0, k: 0.7, side: "right" });
      const mesh = new THREE.Mesh(geometry, material);
      const surface = new CrashGeometry(mesh, mesh, dents);
      surface.rebuild(dents);
      bodies.push(mesh.geometry);
      materials.push(mesh.material);
      group.add(mesh);
    }

    const instances = [this.hazards, this.clouds].map((effect) => {
      const mesh = new THREE.InstancedMesh(effect.geometry, effect.material, 1);
      if (effect.instanceColor) mesh.setColorAt(0, PUFF_COLORS.steam);
      group.add(mesh);
      return mesh;
    });
    for (const obj of group.children) obj.frustumCulled = false;
    this.warmup = { group, bodies, materials, instances };
    await renderer.compileAsync(group, this.host.cam, scene);
    return group;
  }

  finishShaderWarmup() {
    // Keep the material references alive so Three keeps their linked programs after repairs.
    const warmup = this.warmup;
    if (!warmup?.group.children.length) return;
    warmup.group.clear();
    for (const geometry of warmup.bodies) geometry.dispose();
    warmup.bodies.length = 0;
    for (const mesh of warmup.instances) mesh.dispose();
    warmup.instances.length = 0;
  }

  impact(ride: Ride, target: CrashTarget, hit: MotionImpact) {
    const { into } = hit;
    const k = crashSeverity(into);
    if (!k || !this.accepts(ride, k)) return;

    const own = this.hit(ride, hit, k, true);
    const what = target === "town" ? "town" : isTraffic(target) ? "traffic" : "parked";
    if (own) {
      this.lastImpact = Object.freeze({ id: ride.id, k, into, side: own.side, target: what });
      this.host.crashSound?.("crunch", k);
    }
    if (target === "town" || !this.accepts(target, k)) return;
    const other = this.hit(target, hit, k, false);
    if (isTraffic(target)) {
      target.crashStop = 3;
      this.host.crashSound?.("honk", k);
    } else if (other) this.host.crashSound?.("chirp", k);
  }

  private accepts(car: Car, k: number) {
    const state = this.damage.get(car);
    return !state || this.now - state.last >= 0.35 || k > state.k;
  }

  private hit(car: Car, hit: MotionImpact, k: number, driver: boolean) {
    let state = this.damage.get(car);
    if (!state) {
      state = { dents: [], last: this.now, k, driver, hazardUntil: 0, blink: -1 };
      this.damage.set(car, state);
      if (!isTraffic(car)) car.crashParking?.take();
      this.trim(isTraffic(car), car);
    }
    const traffic = isTraffic(car);
    const spec = traffic ? undefined : car.m.spec;
    const wide = traffic ? car.half.z : spec!.wide, half = traffic ? car.half.x : spec!.half;
    const bounds = state.surface?.bounds;
    const minX = bounds?.min.x ?? -wide, maxX = bounds?.max.x ?? wide;
    const minZ = bounds?.min.z ?? -half, maxZ = bounds?.max.z ?? half;
    const root = car.mesh;
    const heading = traffic ? car.dir * Math.PI / 2 : car.m.heading;
    const c = Math.cos(heading), s = Math.sin(heading);
    const cx = traffic ? car.x : car.m.x, cz = traffic ? car.lane : car.m.z;
    const { x, z, scrape } = hit, dx = driver ? hit.nx : -hit.nx, dz = driver ? hit.nz : -hit.nz;
    const nx = dx * c - dz * s, nz = dx * s + dz * c, side = crashSide(nx, nz);
    const clamp = THREE.MathUtils.clamp;
    let lx = clamp((x - cx) * c - (z - cz) * s, minX, maxX);
    let lz = clamp((x - cx) * s + (z - cz) * c, minZ, maxZ);
    const end = side === "front" || side === "back";
    if (end) lz = side === "front" ? maxZ : minZ;
    else lx = side === "left" ? maxX : minX;
    const y = end ? 0.65 : 0.77;
    const dent = { x: lx, y, z: lz, nx, nz, side, k, scrape };
    addDent(state.dents, dent);
    state.last = this.now; state.k = k;
    state.driver ||= driver;
    const hazards = driver ? (k >= 0.4 ? 4 : 0) : isTraffic(car) ? 7 : 3;
    if (hazards) { state.hazardUntil = this.now + hazards; state.blink = -1; }
    const previous = this.crackedLamps(state);
    const build = !state.surface?.covers(state.dents[state.dents.length - 1]);
    if (build) {
      state.surface?.restore();
      state.surface = undefined;
      this.bind(car, state);
    } else state.surface?.rebuild(state.dents);
    if (!state.surface) { this.heal(car); return; }
    if (this.crackedLamps(state) & ~previous) this.host.crashSound?.("glass", k);
    if (side === "front" && k >= 0.6) {
      const x = lx * 0.35, y = state.surface.hoodHeight + 0.10, z = lz * 0.72;
      const remaining = this.puffLimit === 6 ? 4 : 6;
      const interval = STEAM_EMISSION_TIME / remaining;
      state.steam = { x, y, z, next: this.now + interval, interval, remaining };
      this.puff("steam", cx + s * z + c * x, root.position.y + y, cz + c * z - s * x, 2);
      this.host.crashSound?.("steam", k);
    } else this.puff("dust", cx + c * lx + s * lz, root.position.y + y, cz - s * lx + c * lz, 2);
    return dent;
  }

  private crackedLamps(state: Damage) {
    return state.surface?.lamps.reduce((mask, lamp, i) => mask | (Number(lamp.cracked) << i), 0) ?? 0;
  }

  private visual(car: Car) {
    if (isTraffic(car)) return car.batchBody ? car.damagedBody : car.mesh;
    if (car.crashParking) return car.crashParking.visual();
    if ((car.mesh as THREE.Mesh).isMesh) return car.mesh as THREE.Mesh;
    const mesh = car.mesh.getObjectByName("body") ?? car.mesh.getObjectByName("stand-taxi-fallback");
    return (mesh as THREE.Mesh | undefined)?.isMesh ? mesh as THREE.Mesh : undefined;
  }

  private bind(car: Car, state: Damage) {
    if (state.surface) return;
    if (isTraffic(car) && car.batchBody && !car.damagedBody) {
      const body = car.damagedBody = new THREE.Mesh(car.batchBody.geometry, car.batchBody.material);
      body.name = "damaged-traffic";
      body.receiveShadow = true;
      this.trafficPose(car, state);
      this.host.ambient.group.add(body);
    }
    const mesh = this.visual(car);
    if (!mesh || Array.isArray(mesh.material)) return;
    const start = performance.now();
    const body = mesh as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
    state.surface = new CrashGeometry(body, isTraffic(car) ? mesh : car.mesh, state.dents);
    state.surface.rebuild(state.dents);
    this.lastBuildMs = performance.now() - start;
  }

  // Model loading can replace a procedural fallback while it is dented.
  releaseVisual(mesh: THREE.Mesh) {
    for (const [car, state] of this.damage) {
      if (state.surface?.mesh !== mesh) continue;
      state.surface.restore();
      state.surface = undefined;
      if (isTraffic(car)) mesh.rotation.x = mesh.rotation.z = 0;
      return;
    }
  }

  private trim(traffic: boolean, keep?: Car) {
    const driver = this.driver();
    let count = 0, oldest: Car | undefined, at = Infinity;
    for (const [car, state] of this.damage) {
      if (isTraffic(car) !== traffic || car === driver) continue;
      count++;
      if (car !== keep && state.last < at) { oldest = car; at = state.last; }
    }
    if (count > (traffic ? 2 : 3) && oldest) this.heal(oldest);
  }

  /** Called after traffic moves, before its instance matrices are uploaded. */
  update(dt: number, phase: Ride | null) {
    this.now += dt;
    if (!this.damage.size && !this.puffCount) return;
    this.trim(false);
    this.step(dt, phase, true);
  }

  private step(dt: number, phase: Ride | null, gas: boolean) {
    const cam = this.host.cam;
    this.frustum.setFromProjectionMatrix(this.matrix.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const player = this.host.player.root.position;
    if (!phase || !this.damage.has(phase)) this.pumpTime = 0;
    let lights = 0;
    for (const [car, state] of this.damage) {
      const elapsed = this.now - state.last;
      const traffic = isTraffic(car), root = car.mesh;
      state.driver ||= car === this.driver();
      const visible = root.visible && this.frustum.intersectsSphere(this.sphere.set(this.pos.copy(root.position).addScaledVector(THREE.Object3D.DEFAULT_UP, 0.85), 3));
      if ((traffic && car.hidden > 0)
        || (state.driver && (elapsed >= 92 || (car !== phase && elapsed >= 30 && !visible)))
        || (!state.driver && elapsed >= 45 && (!visible || (!traffic && player.distanceToSquared(root.position) > 900)))) {
        this.heal(car);
        continue;
      }
      if (gas && car === phase && !traffic) {
        const { x0, x1, z0, z1 } = GAS_FORECOURT;
        const m = car.m;
        this.pumpTime = m.pace < 0.25 && m.x > x0 && m.x < x1 && m.z > z0 && m.z < z1 ? this.pumpTime + dt : 0;
        if (this.pumpTime >= 1.5) {
          this.heal(car);
          this.puff("sparkle", m.x, 1.05, m.z, 5);
          this.host.crashSound?.("ding", 1);
          continue;
        }
      }
      this.bind(car, state);
      if (state.driver && elapsed >= 90) state.surface?.show(1 - THREE.MathUtils.smoothstep(elapsed, 90, 92));
      if (traffic) this.trafficPose(car, state);
      const pose = traffic ? car.damagedBody ?? root : root;
      const steam = state.steam;
      if (steam && this.now >= steam.next) {
        if (this.now - steam.next < steam.interval) {
          pose.updateMatrix();
          this.pos.set(steam.x, steam.y, steam.z).applyMatrix4(pose.matrix);
          this.puff("steam", this.pos.x, this.pos.y, this.pos.z, 1);
          steam.next += steam.interval;
          if (--steam.remaining === 0) state.steam = undefined;
        } else state.steam = undefined;
      }
      if (!state.surface || state.hazardUntil <= this.now) continue;
      const flash = Math.floor(elapsed * HAZARD_HZ * 2);
      if (car === phase && flash !== state.blink) this.host.crashSound?.("tick", 1);
      state.blink = flash;
      if (!visible || flash % 2) continue;
      const t = (elapsed * HAZARD_HZ * 2) % 1;
      const intensity = THREE.MathUtils.smoothstep(t, 0, 0.14) * (1 - THREE.MathUtils.smoothstep(t, 0.82, 1));
      pose.updateMatrix();
      this.scale.setScalar(0.37 * pose.scale.x);
      for (let i = 0; i < state.surface.lamps.length; i++) {
        const lamp = state.surface.lamps[i];
        this.pos.set(lamp.x, lamp.y, state.surface.lampDepth[i]).applyMatrix4(pose.matrix);
        this.matrix.compose(this.pos, cam.quaternion, this.scale);
        this.blink.setX(lights, intensity);
        this.hazards.setMatrixAt(lights++, this.matrix);
      }
    }
    this.finish(this.hazards, lights);
    if (lights) this.blink.needsUpdate = true;
    this.drawPuffs();
  }

  private trafficPose(car: TrafficCar, state: Damage) {
    const root = car.mesh, body = car.damagedBody ?? root;
    const elapsed = this.now - state.last;
    const contact = state.dents[state.dents.length - 1];
    const rock = elapsed < 0.8 ? Math.sin(elapsed * 24) * (1 - elapsed / 0.8) ** 2 * (0.025 + state.k * 0.11) : 0;
    if (body !== root) {
      body.visible = root.visible;
      body.position.copy(root.position);
      body.scale.copy(root.scale);
    }
    body.rotation.set(rock * (contact?.nz ?? 0), car.dir * Math.PI / 2, rock * (contact?.nx ?? 0), "YXZ");
  }

  private puff(kind: PuffKind, x: number, y: number, z: number, count: number) {
    for (let i = 0; i < count; i++) {
      let first = this.puffs[0];
      for (let j = 0; j < this.puffLimit; j++) {
        const p = this.puffs[j];
        if (!p.life) { first = p; break; }
        if (p.start + p.life < first.start + first.life) first = p;
      }
      if (!first.life) this.puffCount++;
      const a = Math.random() * Math.PI * 2, steam = kind === "steam";
      const spread = kind === "sparkle" ? 1.15 : steam ? 0.18 : 0.38;
      first.x = x + Math.cos(a) * spread * 0.4; first.y = y + i * 0.07; first.z = z + Math.sin(a) * spread * 0.4;
      first.dx = Math.cos(a) * spread; first.dz = Math.sin(a) * spread;
      first.start = this.now;
      first.life = steam ? 1.25 + Math.random() * 0.12 : 0.62 + i * 0.07;
      first.rise = steam ? 1.5 / first.life : 0.42;
      first.size = steam ? 0.79 + Math.random() * 0.09 : kind === "dust" ? 0.80 : 0.23;
      first.kind = kind;
    }
  }

  private drawPuffs() {
    let n = 0, alive = 0;
    for (let i = 0; i < this.puffLimit; i++) {
      const p = this.puffs[i];
      if (!p.life) continue;
      const elapsed = this.now - p.start;
      if (elapsed >= p.life) { p.life = 0; continue; }
      alive++;
      this.pos.set(p.x + p.dx * elapsed, p.y + p.rise * elapsed, p.z + p.dz * elapsed);
      if (!this.frustum.intersectsSphere(this.sphere.set(this.pos, 1))) continue;
      const t = elapsed / p.life;
      const steam = p.kind === "steam";
      this.scale.setScalar(p.size * (steam ? 0.58 + 0.42 * Math.sqrt(t) : 0.65 + 0.8 * t));
      this.clouds.setMatrixAt(n, this.matrix.compose(this.pos, this.host.cam.quaternion, this.scale));
      this.clouds.setColorAt(n, PUFF_COLORS[p.kind]);
      const sparkle = p.kind === "sparkle";
      const opacity = steam ? 0.94 * (1 - THREE.MathUtils.smoothstep(t, 0.26, 1)) : (sparkle ? -0.95 : 0.58) * (1 - t);
      this.alpha.setX(n++, opacity * Math.min(1, (steam ? 0.68 : 0.35) + t * 8));
    }
    this.puffCount = alive;
    this.finish(this.clouds, n);
    if (n) { this.alpha.needsUpdate = true; this.clouds.instanceColor!.needsUpdate = true; }
  }

  private finish(mesh: THREE.InstancedMesh, count: number) {
    mesh.count = count;
    mesh.visible = count > 0;
    if (count) mesh.instanceMatrix.needsUpdate = true;
  }

  private info(which: Car | string) {
    const car = typeof which === "string" ? [...this.damage.keys()].find((car) => !isTraffic(car) && car.id === which) : which;
    const state = car && this.damage.get(car);
    if (!state) return null;
    return {
      sides: [...new Set(state.dents.map(({ side }) => side))],
      dentCount: state.dents.length, scuffs: state.dents.length > 0, k: state.k,
      depth: state.dents.reduce((sum, dent) => sum + dent.depth, 0),
      lampCracked: state.surface?.lamps.some((lamp) => lamp.cracked) ?? false,
      crackedLamps: LAMP_NAMES.filter((_, i) => state.surface?.lamps[i].cracked),
      bumperHanging: state.surface?.hanging ?? false,
      hazards: state.hazardUntil > this.now,
    };
  }

  private stats() {
    let hazards = 0, ownDraws = 0;
    for (const [car, state] of this.damage) {
      if (state.hazardUntil > this.now) hazards++;
      if (isTraffic(car) ? car.damagedBody : car.crashParking?.solo()) ownDraws++;
    }
    const sparkles = this.puffs.filter((p) => p.life > 0 && p.kind === "sparkle").length;
    return { damaged: this.damage.size, hazards, puffs: this.puffCount, ownDraws, sparkles, lastBuildMs: this.lastBuildMs };
  }

  setQuality(quality: "low" | "high") {
    this.puffLimit = quality === "low" ? 6 : 16;
    for (let i = this.puffLimit; i < 16; i++) this.puffs[i].life = 0;
  }

  heal(car: Car) {
    const state = this.damage.get(car);
    if (!state) return;
    this.damage.delete(car);
    state.surface?.restore();
    if (car === this.driver()) this.pumpTime = 0;
    if (isTraffic(car)) {
      car.crashStop = 0;
      car.mesh.rotation.set(0, car.dir * Math.PI / 2, 0);
      car.damagedBody?.removeFromParent();
      car.damagedBody = undefined;
    } else car.crashParking?.untake();
  }

  healAll() {
    for (const car of this.damage.keys()) this.heal(car);
    for (const p of this.puffs) p.life = 0;
    this.puffCount = this.pumpTime = 0;
    this.lastBuildMs = 0;
    this.lastImpact = undefined;
    this.finish(this.hazards, 0);
    this.finish(this.clouds, 0);
  }

  private age(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    this.now += seconds;
    for (const car of this.damage.keys()) if (isTraffic(car) && car.crashStop) car.crashStop = Math.max(0, car.crashStop - seconds);
    this.step(0, this.driver(), false);
  }

  dispose() {
    this.healAll();
    this.finishShaderWarmup();
    for (const material of this.warmup?.materials ?? []) material.dispose();
    this.warmup = undefined;
    this.hazards.material.uniforms.gradient.value.dispose();
    for (const mesh of [this.clouds, this.hazards]) {
      mesh.geometry.dispose(); mesh.material.dispose(); mesh.dispose();
    }
  }
}
