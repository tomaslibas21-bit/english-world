import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GOFISH_DECKS } from "../../content/gofish";
import { roundRect } from "../world/util";
import { DINING } from "./framing";
import { PLAYERS, type Player, type Round, type Word } from "./logic";

const CARD_WIDTH = 0.148;
const CARD_LENGTH = 0.204;
const Y = DINING.surface + 0.004;
const COLORS = ["#b45048", "#4c794e", "#3a6f94"];
const ATLAS_COLUMNS = 4;
const ATLAS_ROWS = 3;
const TILE_W = 96;
const TILE_H = 128;
const POND = new THREE.Vector3(DINING.x, Y, DINING.z);
const HANDS = {
  learner: new THREE.Vector3(1.5, Y, -1.03),
  dan: new THREE.Vector3(0.84, Y, -1.99),
  nora: new THREE.Vector3(2.16, Y, -1.99),
};

function cardAtlas(deck: number) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = TILE_W * ATLAS_COLUMNS;
  canvas.height = TILE_H * ATLAS_ROWS;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  for (const [i, word] of [null, ...GOFISH_DECKS[deck].words].entries()) {
    const x = (i % ATLAS_COLUMNS) * TILE_W;
    const y = Math.floor(i / ATLAS_COLUMNS) * TILE_H;
    ctx.save();
    ctx.translate(x, y);
    roundRect(ctx, 2, 2, 92, 124, 9);
    ctx.fillStyle = word ? "#fff4db" : "#182f48";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = word ? COLORS[deck] : "#547991";
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (word) {
      ctx.font = "47px sans-serif";
      ctx.fillText(word.icon, 48, 54, 84);
      ctx.fillStyle = "#172e3e";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(word.en, 48, 101, 81);
    } else {
      ctx.fillStyle = "#a9c9cf";
      for (const [fx, fy] of [[30, 33], [60, 63], [30, 93]]) {
        ctx.beginPath();
        ctx.ellipse(fx, fy, 13, 7, 0, 0, Math.PI * 2);
        ctx.moveTo(fx + 9, fy);
        ctx.lineTo(fx + 20, fy - 6);
        ctx.lineTo(fx + 20, fy + 6);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** One merged mesh for the table and a second mesh while a card is in transit. */
export class TableCards {
  readonly root = new THREE.Group();
  private readonly still: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly moving: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly pulse: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly tiles: Map<Word, number>;
  private travel?: { from: THREE.Vector3; to: THREE.Vector3; elapsed: number; duration: number };
  private pulseTime = 0;

  constructor(deck: number) {
    this.tiles = new Map(GOFISH_DECKS[deck].words.map(({ id }, i) => [id, i + 1]));
    const material = new THREE.MeshBasicMaterial({ map: cardAtlas(deck), alphaTest: 0.45, side: THREE.DoubleSide });
    this.still = new THREE.Mesh(new THREE.BufferGeometry(), material);
    this.moving = new THREE.Mesh(new THREE.BufferGeometry(), material);
    this.still.visible = this.moving.visible = false;
    this.pulse = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.187, 28).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: "#3a8b99", transparent: true, depthWrite: false }));
    this.pulse.position.copy(POND).setY(Y - 0.001);
    this.pulse.visible = false;
    this.root.name = "gofish-table-cards";
    this.root.add(this.still, this.moving, this.pulse);
  }

  private card(word?: Word) {
    const tile = word ? this.tiles.get(word) ?? 0 : 0;
    const plane = new THREE.PlaneGeometry(CARD_WIDTH, CARD_LENGTH).rotateX(-Math.PI / 2);
    const uv = plane.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (uv.getX(i) + tile % ATLAS_COLUMNS) / ATLAS_COLUMNS,
        1 - (1 - uv.getY(i) + Math.floor(tile / ATLAS_COLUMNS)) / ATLAS_ROWS);
    }
    return plane;
  }

  private pondAt(i: number) {
    return POND.clone().add(new THREE.Vector3(Math.sin(i * 1.6) * 0.095, i * 0.004, Math.cos(i * 1.3) * 0.055));
  }

  sync(round: Round) {
    const cards = round.pond.map((_, i) => {
      const at = this.pondAt(i);
      return this.card().rotateY(i * 0.64).translate(at.x, at.y, at.z);
    });
    for (const player of PLAYERS) {
      const at = HANDS[player];
      round.pairs[player].forEach((word, i) => {
        const x = at.x + ((i % 5) - 2) * 0.155;
        const z = at.z + (player === "learner" ? -1 : 1) * Math.floor(i / 5) * 0.19;
        cards.push(this.card(word).rotateY(-0.17).translate(x - 0.036, Y + i * 0.001, z));
        cards.push(this.card(word).rotateY(0.13).translate(x + 0.03, Y + i * 0.001 + 0.004, z + 0.022));
      });
    }
    this.still.geometry.dispose();
    this.still.visible = cards.length > 0;
    this.still.geometry = cards.length ? mergeGeometries(cards)! : new THREE.BufferGeometry();
    cards.forEach((card) => card.dispose());
  }

  slide(from: Player | "pond", to: Player, pondLeft: number, word: Word, duration: number) {
    const start = from === "pond" ? this.pondAt(pondLeft) : HANDS[from];
    this.travel = { from: start, to: HANDS[to], elapsed: 0, duration };
    this.moving.geometry.dispose();
    this.moving.geometry = this.card(from !== "pond" || to === "learner" ? word : undefined);
    this.moving.position.copy(start);
    this.moving.visible = true;
  }

  update(dt: number, fishing: boolean) {
    this.pulse.visible = fishing;
    this.pulseTime = fishing ? this.pulseTime + dt : 0;
    if (fishing) {
      const swell = (1 - Math.cos(this.pulseTime * Math.PI * 1.7)) / 2;
      this.pulse.scale.setScalar(1 + swell * 0.2);
      this.pulse.material.opacity = 0.65 - 0.36 * swell;
    }
    if (!this.travel) return;
    const { from, to, duration } = this.travel;
    const t = THREE.MathUtils.smoothstep(this.travel.elapsed += dt, 0, duration);
    this.moving.position.lerpVectors(from, to, t);
    this.moving.position.y += 0.015 + Math.sin(Math.PI * t) * 0.07;
    this.moving.rotation.y = (1 - t) * 0.45;
    if (t === 1) { this.moving.visible = false; this.travel = undefined; }
  }

  dispose() {
    this.root.removeFromParent();
    this.still.geometry.dispose();
    this.moving.geometry.dispose();
    this.pulse.geometry.dispose();
    this.pulse.material.dispose();
    this.still.material.map?.dispose();
    this.still.material.dispose();
  }
}
