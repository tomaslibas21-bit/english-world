import { create } from "zustand";
import { NPCS } from "../../content/npcs";
import { MEETING_DONE } from "../../content/phoneCalls";
import { MEETING_LINES } from "../../content/phoneMeeting";
import { useStore } from "../../state/store";
import { createCharacter, type GameCharacter } from "../characters";
import { ModeDialogue, type KitLine, type KitMic } from "../kit/dialogue";
import type { ModeHost } from "../kit/host";
import type { GameMode, ModeFrame, ModeInput } from "../kit/modes";
import { floorY } from "../water";
import type { Town } from "../world/town";
import { meetingShot, meetingSpot } from "./meetingScene";

export const useMeeting = create<{ line: KitLine | null; choices: KitLine[]; mic: KitMic; micOn: boolean }>(() => ({
  line: null, choices: [], mic: { status: "off", heard: "" }, micOn: true,
}));

export class FriendMeeting implements GameMode {
  readonly id = "friend-meeting";
  readonly cleanScreen = "menu";
  readonly camera = "talk";
  active = false;
  private actor: GameCharacter | null = null;
  private spot: ReturnType<typeof meetingSpot> = null;
  private location: string | null = null;
  private scenery;
  private leaving = 0;
  private heading = 0;

  private dialogue = new ModeDialogue({
    say: (line) => useMeeting.setState({ line }),
    choices: (choices) => useMeeting.setState({ choices }),
    mic: (mic) => useMeeting.setState({ mic }),
    acting: () => this.host.acting?.(),
    actor: () => this.actor ? { actor: this.actor, id: "lizzie", player: this.host.player() } : undefined,
  });

  constructor(private host: ModeHost, private town: Town, private done: () => void) {
    // Capture the town geometry before adding the friend to it.
    this.scenery = town.group.children.filter((o) => o.userData.v === undefined && !o.userData.gull && !o.userData.boat);
  }

  waitAt(location: string | null) {
    if (this.active || this.leaving > 0 || location === this.location) return;
    this.location = location;
    const spot = location ? meetingSpot(this.town, location) : null;
    if (!spot) { this.removeActor(); return; }
    this.spot = spot;
    if (!this.actor) {
      this.actor = createCharacter({ ...NPCS.lizzie.look, female: true });
      this.town.group.add(this.actor.root);
    }
    this.actor.root.position.set(spot.x, floorY(spot.x, spot.z), spot.z);
    this.actor.root.rotation.y = spot.rot;
  }

  updateActor(dt: number, outdoors: boolean) {
    const actor = this.actor;
    if (!actor || !outdoors) return;
    if (this.leaving > 0) {
      const p = actor.root.position;
      p.x += Math.sin(actor.root.rotation.y) * dt * 1.9;
      p.z += Math.cos(actor.root.rotation.y) * dt * 1.9;
      p.y = floorY(p.x, p.z);
      this.leaving -= dt;
      if (this.leaving <= 0) { this.removeActor(); this.location = null; return; }
    }
    actor.update(dt);
  }

  nearPlayer() {
    const p = this.host.player().root.position;
    return !!this.spot && this.leaving <= 0 && Math.hypot(p.x - this.spot.x, p.z - this.spot.z) < 3;
  }

  start() {
    const actor = this.actor, spot = this.spot;
    if (this.active || !actor || !spot || !this.nearPlayer() || !this.host.canStart()) return false;
    const player = this.host.player(), from = player.root.position, to = actor.root.position;
    const rig = this.host.rig;
    this.town.group.updateMatrixWorld(true);
    const shot = meetingShot(from, to, player.height, actor.height, spot.rot, this.town, this.scenery,
      (pos) => rig.space?.inside(pos) ?? false);
    if (!shot) return false;
    this.active = true;
    this.host.prepare();
    const dx = to.x - from.x, dz = to.z - from.z;
    this.heading = Math.hypot(dx, dz) >= 0.1 ? Math.atan2(dx, dz) : spot.rot + Math.PI;
    player.root.rotation.y = this.heading;
    player.setAnim("idle");
    actor.root.rotation.y = this.heading + Math.PI;
    actor.watch = from;
    actor.noticeWithin = 8;
    player.root.visible = !shot.covered;
    rig.talk = shot;
    rig.mode = "talk";
    rig.cam.fov = 50;
    rig.cam.clearViewOffset();
    rig.cam.updateProjectionMatrix();
    // A straight blend from the walking camera can cross walls on its way to the shoulder view.
    rig.snap();
    useMeeting.setState({ micOn: this.dialogue.micOn });
    this.host.entered(this.id);
    void this.run();
    return true;
  }

  private async run() {
    const lines = MEETING_LINES;
    if (!await this.dialogue.say("s83-invite-call", "lizzie", "phone_meet_hello", lines) || !this.active) return;
    this.dialogue.clearLine();
    if (!await this.dialogue.expect("s83-invite-call", "lizzie", ["phone_meet_ready", "phone_meet_tickets"], lines) || !this.active) return;
    if (!await this.dialogue.say("s83-invite-call", "lizzie", "phone_meet_go", lines) || !this.active) return;
    const st = useStore.getState();
    st.updateProgress((p) => { if (p.phone) delete p.phone.invitation; });
    const actor = this.actor!;
    const p = actor.root.position;
    const rot = this.spot!.rot;
    const direction = [rot, rot + Math.PI / 2, rot - Math.PI / 2, rot + Math.PI].find((angle) =>
      this.town.walkableAt(p.x + 2.7 * Math.sin(angle), p.z + 2.7 * Math.cos(angle)));
    if (direction === undefined) this.removeActor();
    else {
      actor.root.rotation.y = direction;
      actor.setAnim("walk");
      actor.moveSpeed = 1.9;
      this.leaving = 1.4;
    }
    this.exit();
    this.done();
    st.toast({ kind: "success", title: MEETING_DONE });
  }

  update(frame: ModeFrame) {
    this.host.updatePose(frame.dt, this.heading);
    this.dialogue.update(frame.dt, frame.blocked || document.hidden);
  }

  input(input: ModeInput) {
    if (input.kind !== "key" || input.repeat || !this.dialogue.key(input.key)) return false;
    useMeeting.setState({ micOn: this.dialogue.micOn });
    return true;
  }

  action(name: string, value?: string | boolean) {
    if (name === "answer" && typeof value === "string") this.dialogue.choose(value);
    if (name === "mic" && typeof value === "boolean") {
      this.dialogue.setMic(value);
      useMeeting.setState({ micOn: value });
    }
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    this.dialogue.cancel();
    if (this.actor) {
      this.actor.watch = null;
      if (!this.leaving && this.spot) this.actor.root.rotation.y = this.spot.rot;
    }
    this.host.player().root.visible = true;
    this.host.rig.talk = null;
    this.host.rig.mode = "follow";
    this.host.left(this.id);
  }

  private removeActor() {
    this.actor?.dispose?.();
    this.actor?.root.removeFromParent();
    this.actor = null;
    this.spot = null;
  }

  dispose() {
    this.exit();
    this.removeActor();
  }
}
