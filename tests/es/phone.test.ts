import { checkPhoneBooth } from "../phone-booth-checks";
import { expect, it, vi } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { NPCS } from "@/content/npcs";
import { PHONE_CALLS, FLOOD_INCOMING_INTRO, MEETING_DONE, OFFICE_TASK, concertInvitation, invitationLocation, invitationTitle } from "@/content/phoneCalls";
import { loadSituation } from "@/content/situations/catalog";
import { createCharacter } from "@/game/characters";
import { OcclusionField } from "@/game/occlusion";
import { meetingShot, meetingSpot } from "@/game/phone/meetingScene";
import { floorY } from "@/game/water";
import { DROPOFF, WORLD } from "@/game/world/layout";
import { buildTown } from "@/game/world/town";
import { L } from "@/ui/i18n";

it("uses Puerto Colibrí's callers, portraits, reminders and incoming intro", () => {
  expect(PHONE_CALLS).toEqual({
    "s76-dentist-call": { npc: "linda", organization: "Clínica Dental Coral", name: "Lorena · Clínica Dental Coral", kind: "reminder",
      reason: "A tooth has been bothering you for days. Time to make a dentist appointment?" },
    "s80-support-call": { npc: "claire", organization: "NetWave", name: "NetWave", kind: "reminder",
      reason: "Your internet is down and the modem light is blinking red. Call your provider." },
    "s89-video-call": { npc: "kate", organization: "Línea Clara", name: "Sofía · Línea Clara", kind: "incoming", video: true },
    "s90-running-late": { npc: "harris", organization: "Línea Clara", name: "Ingeniero Montes", kind: "reminder",
      reason: "It's 8:50, and the meeting starts at nine. Let your boss know you're running late." },
    "s83-invite-call": { npc: "lizzie", name: "Andrea", kind: "reminder",
      reason: "You have two tickets for Friday's concert. Invite a friend!" },
    "p26-complaint": { npc: "kyle", organization: "Hogar Puerto", name: "Hogar Puerto", kind: "reminder",
      reason: "Your new sofa came late and broken. Call the store: polite, but firm." },
    "p24-flood": { npc: "lizzie", name: "Andrea", kind: "incoming" },
  });
  expect(FLOOD_INCOMING_INTRO).toBe("Saturday, 8:30 a.m., and your feet are wet: a pipe burst upstairs in the night, and there's a river on your kitchen floor. Andrea is calling. You were meeting her for breakfast at nine. Tell her what happened (tú), then call Don Gilberto, the building manager (usted).");
  expect(OFFICE_TASK).toBe("Hurry to the office: the meeting has already started");
  expect(MEETING_DONE).toBe("You met Andrea. Enjoy the concert!");
  expect(L("Perskambinti")).toBe("Call back");
  expect(L("Skambučiai einant po miestą")).toBe("Phone calls around town");
});

it.each([
  ["kiosco", "at the bandstand"], ["malecon", "on the boardwalk"],
  ["taqueria", "at the taco place by the market"], ["mercado", "at the market"],
  ["cafe", "at the café"], ["entrada", "at the concert entrance"], ["iglesia", "at the church"],
])("shows the English chip and evening time for %s", (place, chip) => {
  const state = { place, day: "friday", meetTime: { h: 7, m: 30 } };
  const invitation = concertInvitation(state)!;
  expect(invitation).toEqual({ place, chip, when: "Friday, 7:30 p.m." });
  expect(invitationTitle(invitation)).toBe(`Meet Andrea ${chip} · Friday, 7:30 p.m.`);
  expect(concertInvitation({ ...state, meetTime: { h: 19, m: 5 } })?.when).toBe("Friday, 7:05 p.m.");
  expect(concertInvitation({ ...state, meetTime: { h: 12, m: 0 } })?.when).toBe("Friday, 12:00 p.m.");
});

it("loads the Spanish meeting dialogue with English glosses through the s83 catalog", async () => {
  const sit = await loadSituation("s83-invite-call");
  expect(sit?.lines.phone_meet_hello[0]).toEqual({
    en: "¡Hola! | ¡Llegaste | justo | a tiempo!", lt: "Hi! | You-made-it | just | on time!", nat: "Hi! You're right on time!",
  });
});

it("can reach Andrea from each arrival point with a clear meeting shot", () => {
  const draw = () => {};
  const gradient = () => ({ addColorStop: draw });
  const canvas = new Proxy({
    measureText: (text: string) => ({ width: text.length * 9 }), createLinearGradient: gradient, createRadialGradient: gradient,
  }, { get: (target, key) => Reflect.get(target, key) ?? draw });
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => canvas }) });
  try {
    const town = buildTown();
    const scenery = town.group.children.filter((o) => o.userData.v === undefined && !o.userData.gull && !o.userData.boat);
    const field = OcclusionField.fromObject(town.group, WORLD, {
      skip: (o) => !scenery.includes(o) || o.userData.thin || o === town.parkedCars.taxi?.root,
    });
    field.fillFootprints(town.colliders.boxes, town.colliders.circles);
    const inside = (p: Vector3) => field.solidAt(p.x, p.y, p.z, 0.15);
    const andrea = createCharacter({ ...NPCS.lizzie.look, female: true });
    town.group.updateMatrixWorld(true);
    for (const place of ["kiosco", "malecon", "mercado", "cafe"]) {
      const location = invitationLocation(place)!;
      const spot = meetingSpot(town, location);
      expect(spot, location).not.toBeNull();
      const door = town.doors.find((d) => d.loc === location);
      const arrival = door ? { x: door.outX + 1.5 * Math.sin(door.rot), z: door.outZ + 1.5 * Math.cos(door.rot) } : DROPOFF[location];
      expect(Math.hypot(spot!.x - arrival.x, spot!.z - arrival.z), location).toBeLessThan(3);
      const player = new Vector3(arrival.x, floorY(arrival.x, arrival.z), arrival.z);
      const friend = new Vector3(spot!.x, floorY(spot!.x, spot!.z), spot!.z);
      const shot = meetingShot(player, friend, 1.8, andrea.height, spot!.rot, town, scenery, inside);
      expect(shot, location).not.toBeNull();
      const camera = new PerspectiveCamera(50, 390 / 844, 0.1, 900);
      camera.position.copy(shot!.pos);
      camera.lookAt(shot!.look);
      camera.updateMatrixWorld();
      const face = friend.clone().add(new Vector3(0, andrea.height * 0.9, 0)).project(camera);
      expect(Math.abs(face.x), location).toBeLessThan(0.8);
      expect(face.y, location).toBeGreaterThan(0);
      expect(face.y, location).toBeLessThan(0.8);
    }
    andrea.dispose?.();
  } finally {
    vi.unstubAllGlobals();
  }
});

checkPhoneBooth("en");
