import type { WebGLRenderer } from "three";
import { radio } from "../../radio";
import { useStore } from "../../state/store";
import { audio } from "../audio";
import type { ModeHost } from "../kit/host";
import type { GameMode, ModeInput } from "../kit/modes";
import { HarborFilm } from "./film";
import { CINEMA_SEAT, FILM_SECONDS, exposure, scoreNote } from "./program";
import { useCinema } from "./state";

export class CinemaMode implements GameMode {
  readonly id = "cinema";
  readonly cleanScreen = "menu";
  readonly indoorPrompt = true;
  readonly conversation = { situation: "x09-box-office", label: "Žiūrėti filmuką" };
  private film?: HarborFilm;
  private motion?: MediaQueryList;
  private elapsed = 0;
  private lastExposure = -1;
  private lastBeat = -1;
  private lastSize = "";
  private cutNote?: () => void;
  private seatHeight?: number;

  constructor(private host: ModeHost, private museum: () => boolean) {}
  get active() { return !!this.film; }
  available() {
    const { conv } = useStore.getState();
    return this.museum() && (!conv.active || conv.completed);
  }
  prompt(x: number, z: number) {
    if (this.active || !this.museum()) return null;
    const distance = Math.hypot(x - CINEMA_SEAT.x, z - CINEMA_SEAT.z);
    return distance < 1.8 ? { distance, kind: "cinema" as const, label: "Atsisėsti ir žiūrėti filmuką" } : null;
  }
  start() {
    if (this.active || !this.museum() || !this.host.canStart(true) || this.host.rides.riding) return false;
    this.film = new HarborFilm();
    this.elapsed = 0; this.lastExposure = this.lastBeat = -1; this.lastSize = "";
    this.motion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    this.host.prepare();
    this.host.place(CINEMA_SEAT.x, CINEMA_SEAT.z, CINEMA_SEAT.heading);
    const player = this.host.player();
    this.seatHeight = player.seatY; player.seatY = 0.455; player.setAnim("sit");
    radio.hold("cinema", true); audio.hush("cinema", true, true);
    useCinema.setState({ title: true, paused: false });
    useStore.getState().setHud({ prompt: null, zoneBanner: null });
    this.host.entered(this.id);
    return true;
  }
  project(renderer: WebGLRenderer, width: number, height: number, dt: number) {
    if (!this.film || document.hidden) return;
    const { paused, title } = useCinema.getState();
    if (!paused && this.lastExposure >= 0) this.elapsed += dt;
    if (this.elapsed >= FILM_SECONDS) { this.exit(); return; }
    const { shot, time } = exposure(this.elapsed, !!this.motion?.matches);
    if (title !== (shot === 0)) useCinema.setState({ title: shot === 0 });
    const beat = Math.floor(this.elapsed / 0.24);
    if (!paused && beat !== this.lastBeat) {
      this.silence();
      const note = scoreNote(beat, shot);
      if (note) this.cutNote = audio.pluck(note.hz, note.length, note.level);
      this.lastBeat = beat;
    }
    const size = width + "/" + height + "/" + renderer.getPixelRatio();
    if (this.lastExposure === time && this.lastSize === size) return;
    if (this.lastExposure !== time) this.film.pose(time, shot, Math.max(0, time - this.lastExposure));
    this.film.draw(renderer, width, height);
    this.lastSize = size; this.lastExposure = time;
  }
  silence() { this.cutNote?.(); this.cutNote = undefined; }
  action(name: string) {
    if (this.active && name === "pause") {
      this.silence();
      useCinema.setState(s => ({ paused: !s.paused }));
    }
  }
  input(input: ModeInput) {
    if (input.kind !== "key" || input.key !== "escape") return false;
    if (!input.repeat) this.exit();
    return true;
  }
  update() {} // The projector uses visible wall time and draws in place of the museum.
  exit() {
    if (!this.film) return;
    this.silence();
    this.film.dispose(); this.film = undefined;
    const player = this.host.player();
    player.seatY = this.seatHeight; player.setAnim("idle");
    this.host.place(CINEMA_SEAT.approachX, CINEMA_SEAT.z, CINEMA_SEAT.heading);
    audio.hush("cinema", false); radio.release("cinema");
    this.host.left(this.id);
  }
  dispose() { this.exit(); }
}
