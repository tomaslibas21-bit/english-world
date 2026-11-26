// Shape measures and offsets are in centimeters, relative to the player's grip.
function box(color: number, width: number, height: number, depth: number, x = 0, y = 0, z = 0, tilt = 0) {
  return { type: "box", color, width, height, depth, x, y, z, tilt } as const;
}
function cylinder(color: number, top: number, bottom: number, height: number, y: number) {
  return { type: "cylinder", color, top, bottom, height, x: 0, y, z: 0, tilt: 0 } as const;
}
function loop(color: number, radius: number, tube: number, x: number, y: number, z = 0) {
  return { type: "loop", color, radius, tube, x, y, z, tilt: 0 } as const;
}
function sphere(color: number, radius: number, y: number, height = 1) {
  return { type: "sphere", color, radius, height, x: 0, y, z: 0, tilt: 0 } as const;
}

export type KeepsakePart = ReturnType<typeof box | typeof cylinder | typeof loop | typeof sphere>;

const white = 0xfff8e9;
const blue = 0x3979b8;
const darkBlue = 0x203963;
const red = 0xce3549;
const gold = 0xdcab39;
const paper = 0xc58e54;
const silver = 0xbcc8d0;
const green = 0x3b8b58;
const black = 0x2a2e36;

export const KIND = {
  cue_chalk: {
    en: "Pool chalk", nominative: "Biliardo kreida", accusative: "biliardo kreidą",
    shape: [box(blue, 4.8, 4.6, 4.8), box(0x8cc8e6, 4.8, 0.4, 4.8, 0, 2.4)],
  },
  passport_stamp: {
    en: "Passport stamp", nominative: "Antspaudas pase", accusative: "antspaudą pase",
    shape: [box(darkBlue, 14, 10, 0.7), box(white, 6.3, 9, 0.25, -3.4, 0, 0.4),
      box(white, 6.3, 9, 0.25, 3.4, 0, 0.4), loop(red, 1.8, 0.2, 3.6, 0.8, 0.57)],
  },
  boarding_pass: {
    en: "Boarding pass", nominative: "Įlaipinimo talonas", accusative: "įlaipinimo taloną",
    shape: [box(white, 14, 6, 0.22), box(blue, 3, 6, 0.28, 5.5), box(blue, 6, 0.6, 0.28, -2, 1.2)],
  },
  baggage_tag: {
    en: "Baggage claim ticket", nominative: "Bagažo kvitas", accusative: "bagažo kvitą",
    shape: [box(0xed852d, 5, 9, 0.45, 0, -3.5), loop(white, 2, 0.25, 0, 2.5), box(white, 3.5, 2, 0.48, 0, -4.5)],
  },
  ticket: {
    en: "Ticket", nominative: "Bilietas", accusative: "bilietą",
    shape: [box(0xf3cb52, 12, 5.5, 0.24), box(0x976925, 0.5, 5.5, 0.28, 3), box(white, 4, 0.6, 0.28, -2, 0.7)],
  },
  room_key: {
    en: "Room key", nominative: "Kambario raktas", accusative: "kambario raktą",
    shape: [box(0x855533, 4.5, 6, 1.2, -2, 2, 0, -0.2), loop(gold, 1.6, 0.33, 0.5, -0.6),
      box(gold, 1.3, 7, 0.55, 1.4, -4.8, 0, 0.17), box(gold, 2.7, 1.2, 0.55, 2.6, -7)],
  },
  home_key: {
    en: "Apartment key", nominative: "Buto raktas", accusative: "buto raktą",
    shape: [loop(silver, 2.4, 0.34, 0, 2.2), box(silver, 3.4, 2.5, 0.55, 0, -1.5),
      box(silver, 1.3, 6.5, 0.55, 0, -5.2), box(silver, 2.5, 1.3, 0.55, 0.6, -7)],
  },
  car_key: {
    en: "Car key", nominative: "Automobilio raktelis", accusative: "automobilio raktelį",
    shape: [box(black, 4.5, 7.5, 1.6), box(silver, 1.5, 3.3, 0.55, 0, -5.1),
      box(0x6a7179, 2.5, 3.4, 0.25, 0, 0.7, 0.85)],
  },
  map: {
    en: "Town map", nominative: "Miesto žemėlapis", accusative: "miesto žemėlapį",
    shape: [box(0x84bda1, 4.6, 10, 0.22, -4.5, 0.3, 0, 0.12),
      box(white, 4.6, 10, 0.22), box(0x7ab5d9, 4.6, 10, 0.22, 4.5, -0.3, 0, -0.12),
      box(gold, 13.3, 0.7, 0.3, 0, 0.6, 0, 0.1)],
  },
  coffee_cup: {
    en: "Coffee cup", nominative: "Kavos puodelis", accusative: "kavos puodelį",
    shape: [cylinder(white, 4, 2.8, 10, 1), cylinder(paper, 3.8, 3.2, 4.4, 0.8),
      cylinder(0x473329, 3.8, 4.3, 1.4, 6.4)],
  },
  receipt: {
    en: "Receipt", nominative: "Kvitas", accusative: "kvitą",
    shape: [box(white, 5, 14, 0.18), box(0xa4a2a0, 2.7, 0.45, 0.22, 0, 3),
      box(0xa4a2a0, 2.7, 0.45, 0.22, 0, 1), box(0xa4a2a0, 1.6, 0.45, 0.22, -0.55, -2)],
  },
  shopping_bag: {
    en: "Shopping bag", nominative: "Pirkinių maišelis", accusative: "pirkinių maišelį",
    shape: [box(paper, 10, 10, 4.7, 0, -6.5), loop(0x845937, 2.6, 0.32, 0, -0.7, 1.7),
      loop(0x845937, 2.6, 0.32, 0, -0.7, -1.7)],
  },
  business_card: {
    en: "Business card", nominative: "Vizitinė kortelė", accusative: "vizitinę kortelę",
    shape: [box(white, 10, 6, 0.26), box(darkBlue, 3, 0.6, 0.3, -2, 1), box(blue, 5, 0.4, 0.3, -1, -1)],
  },
  badge: {
    en: "Employee badge", nominative: "Darbuotojo kortelė", accusative: "darbuotojo kortelę",
    shape: [box(blue, 7, 10, 0.55, 0, -2), box(white, 5.7, 6.6, 0.59, 0, -2.8),
      box(silver, 1.8, 2.6, 0.75, 0, 3.8), box(darkBlue, 2.7, 0.55, 0.62, 0, -3.4)],
  },
  note: {
    en: "Note", nominative: "Raštelis", accusative: "raštelį",
    shape: [box(0xffdf63, 9, 9, 0.26), box(0xa28746, 5, 0.36, 0.3, -0.5, 1.5),
      box(0xa28746, 3.3, 0.36, 0.3, -1.35, -0.3)],
  },
  flower: {
    en: "Flower", nominative: "Gėlė", accusative: "gėlę",
    shape: [cylinder(green, 0.35, 0.4, 11, -0.4), sphere(red, 2.5, 6, 0.8), box(green, 3.6, 1.3, 0.65, 1.2, 0.6, 0, 0.55)],
  },
  balloon: {
    en: "Balloon", nominative: "Balionas", accusative: "balioną",
    shape: [cylinder(white, 0.18, 0.18, 18, 9), cylinder(red, 0.55, 1, 1.5, 18),
      sphere(red, 6.6, 25.8, 1.16)],
  },
  water_bottle: {
    en: "Water bottle", nominative: "Gertuvė", accusative: "gertuvę",
    shape: [cylinder(0x328f95, 2.5, 2.7, 11, 0), cylinder(blue, 2.7, 2.7, 2.7, 6.2), cylinder(silver, 1.05, 1.05, 1.1, 8)],
  },
  prescription: {
    en: "Prescription", nominative: "Receptas", accusative: "receptą",
    shape: [box(white, 10, 13, 0.22), box(green, 4.1, 1.2, 0.26, 0, 2.3), box(green, 1.2, 4.1, 0.26, 0, 2.3)],
  },
  wallet: {
    en: "Wallet", nominative: "Piniginė", accusative: "piniginę",
    shape: [box(0x74472d, 11, 7.5, 1.45), box(0x9b633e, 11.1, 2.9, 0.5, 0, 1.8, 0.75),
      box(gold, 0.95, 0.95, 0.55, 0, 0.3, 0.85)],
  },
  slate_pebble: {
    en: "Small slate pebble", nominative: "Mažas skalūno akmenėlis", accusative: "mažą skalūno akmenėlį",
    shape: [sphere(0x59656e, 2.4, 0, 0.48)],
  },
  oak_leaf: {
    en: "Oak leaf", nominative: "Ąžuolo lapas", accusative: "ąžuolo lapą",
    shape: [box(0x77502a, 0.45, 8, 0.2), sphere(gold, 2, 1.7, 1.15), sphere(gold, 2.4, -0.7, 0.9)],
  },
} satisfies Record<string, { en: string; nominative: string; accusative: string; shape: KeepsakePart[] }>;

export type KeepsakeKind = keyof typeof KIND;

export const KEEPSAKES: Record<string, KeepsakeKind> = {
  "p18-startup": "business_card",
  "p24-flood": "note",
  "p25-used-car": "car_key",
  "p26-complaint": "receipt",
  "p27-meeting": "business_card",
  "p28-kitchen": "coffee_cup",
  "p28b-review": "note",
  "p29-landlord": "receipt",
  "p30-start-over": "note",
  "s31-doctor": "prescription",
  "s32-supermarket": "shopping_bag",
  "s33-small-talk": "note",
  "s34-meeting": "business_card",
  "s35-gym": "water_bottle",
  "s62-visitor-center": "map",
  "s63-party": "balloon",
  "s64a-checkin": "boarding_pass",
  "s64b-security": "boarding_pass",
  "s64c-gate": "boarding_pass",
  "s65a-passport": "passport_stamp",
  "s65b-baggage": "baggage_tag",
  "s66-taxi": "receipt",
  "s67a-tickets": "ticket",
  "s67b-bus": "ticket",
  "s68-hotel": "room_key",
  "s69-local": "map",
  "s70-museum": "ticket",
  "s71a-rental": "car_key",
  "s71b-gas": "receipt",
  "s72-cafe": "coffee_cup",
  "x01-pool-hall": "cue_chalk",
  "x02-photo-walk": "note",
  "x03-ask-the-way": "map",
  "x04-surf": "note",
  "s73-restaurant": "receipt",
  "s74-clothes": "shopping_bag",
  "s75-pharmacy": "shopping_bag",
  "s76-dentist-call": "note",
  "s77-salon": "receipt",
  "s78-bank": "receipt",
  "s79-post": "receipt",
  "s80-support-call": "note",
  "s81-apartment": "home_key",
  "s82-neighbor": "note",
  "s83-invite-call": "note",
  "s84-date": "flower",
  "s85-dinner": "flower",
  "s86-old-friend": "note",
  "s87-interview": "business_card",
  "s88-first-day": "badge",
  "s89-video-call": "note",
  "s90-running-late": "note",
  "s91a-lost-wallet": "map",
  "s91b-police": "note",
  "x05-lighthouse-keeper": "note",
  "x06-bram": "slate_pebble",
  "x07-fern": "slate_pebble",
  "x08-old-oak": "oak_leaf",
};

export function keepsakeFor(sitId: string): KeepsakeKind {
  return Object.hasOwn(KEEPSAKES, sitId) ? KEEPSAKES[sitId] : "receipt";
}
