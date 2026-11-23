// The people of Puerto Colibrí (replaces src/content/npcs.ts in the Spanish edition). The ids are the town's role
// slots, shared with Maple Harbor: the world places "mia" behind the café's counter in both editions, and in this one
// she is Mariana. Each character gets a Mexican name, a role in Spanish (with its English gloss for the interface)
// and a look that follows their portrait (public/scenes-es/ref/cast/<id>.webp, docs/es/PICTURES.md section 4): LOOK
// below, over Maple Harbor's build.
// `informal` NPCs address the learner with tú (friends, colleagues, people of the learner's age); everyone else
// with usted. `informalSpain`: in Spain's Spanish (the Settings' third choice) these say tú too: casual service by
// young people (the café, the restaurant, the clothes shop, the salon, the gym; docs/es/STYLE.md "Spain Spanish").
import { NPCS as BASE, COACH_VOICE, type Look, type NpcDef } from "../../../content/npcs";

export type { Accessory, HairStyle, Look, NpcDef } from "../../../content/npcs";
export { COACH_VOICE };

type Cast = [name: string, roleEs: string, roleEn: string, extra?: Omit<Partial<NpcDef>, "look">];

const SKIN = ["#e3b58f", "#d9a47e", "#c68e63", "#b07a52", "#a0694a", "#8a5a3c", "#f0cfb0"];
const HAIR = { black: "#1f1a17", dark: "#2e2119", brown: "#5a3a25", gray: "#b8b3ac", white: "#e8e4dc" };

/** Each person's look, from their portrait (public/scenes-es/ref/cast/<id>.webp; docs/es/PICTURES.md section 4), over
 *  Maple Harbor's build (height and build stay its own unless given):
 *  - the skin: the portrait's face, whose narrow warm range is stretched onto the town's (Maple Harbor's light #f2d3bd
 *    to its dark #6e4630), so the faces keep their order from the lightest to the darkest;
 *  - the hair: its colour, grey where the portrait is grey, and for the men its style; every woman's is long
 *    (18 Nov 2026, the owner's rule: a bun or a ponytail showed nothing from the front and a short cut read as a
 *    man's): loose, wavy, long curls or a thick braid, the nearest to her portrait (Character.ts LONG_HAIR);
 *  - the clothes: their kind (a blazer, a white coat, a rebozo or an open shirt is a cardigan in its colour over the
 *    top) and their colours, each the hex that the town's light (as on /lineup.html) shows in the portrait's colour:
 *    the toon light washes pastels out to white and crushes the darkest to black, so a light blue shirt is given
 *    bluer than it looks and navy trousers lighter;
 *  - glasses, and a badge (or a lanyard's card) for the workers whose portrait has a name tag.
 *  Since graphics round 3 the builder makes the garments the portraits show (Character.ts; Maple Harbor uses none):
 *  Doña Carmen's hipil, embroidered at the neck and round the hem, under her yellow rebozo; Lucía's braid over her
 *  shoulder and her blouse embroidered with flowers, as Valeria's and Doña Licha's are; Don Pancho's jipi and the
 *  guayaberas of Don Pancho, Don Ernesto, Don Chuy and Luis (with his waist apron); Fátima's bandana. What it still
 *  can't make takes the nearest: Don Héctor's goatee is a beard; sleeveless and short-sleeved tops have long sleeves,
 *  as in Maple Harbor. No one wears the police cap (`police`): no officer's portrait shows one. */
const LOOK: Record<string, Partial<Look>> = {
  // the arrival
  diaz: { skin: "#b0754d", hair: { style: "braid", color: "#2e2119", side: -1, tie: "#22304a" }, top: "#b5cdff", bottom: "#303d50", acc: ["badge", "earrings"] },
  priya: { skin: "#9a6949", hair: { style: "long", color: "#1f1a17" }, top: "#cb4f41", bottom: "#2c4c5a", acc: ["lanyard", "earrings"] },
  vinnie: { skin: "#a06f4a", hair: { style: "short", color: "#8f8a85" }, top: "#fca938", bottom: "#304a54", acc: ["cap", "mustache"], accColor: "#706f4d", build: 1.16 },
  olivia: { skin: "#d4a07a", hair: { style: "wavy", color: "#74502f" }, top: "#fbf2e2", bottom: "#224250", acc: ["cardigan", "badge", "earrings"], accColor: "#375168" },
  chuck: { skin: "#b3784e", hair: { style: "bald", color: "#e8e2da" }, top: "#f7ecda", acc: ["glasses", "vest", "mustache", "guayabera"], accColor: "#635f52", build: 1.12 },
  tona: { skin: "#9c6a4e", hair: { style: "wavy", color: HAIR.white }, top: "#d5a2ba", bottom: "#4b2a47",
    skirt: true, acc: ["rebozo", "earrings"], accColor: "#60498d", height: 0.93, build: 1.06 },
  beto: { skin: "#ac7351", hair: { style: "short", color: "#5b534b" }, top: "#79a9a4", bottom: "#534338",
    acc: ["jipi", "mustache", "guayabera"], build: 1.13 },
  // the center
  mia: { skin: "#7d573b", hair: { style: "curls", color: "#1f1a17" }, top: "#f4e4d2", bottom: "#353d4a", acc: ["apron", "earrings"], accColor: "#33534f", build: 0.95 },
  rosa: { skin: "#a8734b", hair: { style: "braid", color: "#e6e0d8", side: -1, tie: "#e4007c" }, top: "#f9f3ee", bottom: "#f6f0ea", skirt: true, acc: ["glasses", "hipil", "rebozo", "earrings"], accColor: "#ffb142", height: 0.92, build: 0.94 },
  ben: { skin: "#c2895f", hair: { style: "short", color: "#1f1a17" }, top: "#6c4561", bottom: "#303038", acc: ["lanyard", "mustache"], build: 0.96 },
  harold: { skin: "#eabfa3", hair: { style: "short", color: "#e2dcd4" }, top: "#405172", bottom: "#2f3c54", acc: ["tie", "badge", "mustache"], accColor: "#2c2f37", build: 1.1 },
  marco: { skin: "#b77c52", hair: { style: "curly", color: "#1f1a17" }, top: "#fbf9f5", bottom: "#26262c", acc: ["waistapron", "guayabera"], accColor: "#39393f", build: 0.96 },
  chloe: { skin: "#e6be9c", hair: { style: "long", color: "#cfa06c" }, top: "#ef9093", bottom: "#2e4d53", acc: ["badge", "embroidered", "earrings"] },
  okafor: { skin: "#9c6a49", hair: { style: "buzz", color: "#8a8580" }, top: "#92adf8", bottom: "#35495e", acc: ["glasses", "beard", "cardigan", "badge"], accColor: "#fafafc" },
  jessie: { skin: "#d9a783", hair: { style: "wavy", color: "#6e2030" }, top: "#353436", bottom: "#30303a", acc: ["apron", "earrings"], accColor: "#993f6b" },
  aaron: { skin: "#c79166", hair: { style: "side", color: "#1f1a17" }, top: "#c8ecff", bottom: "#2f3e52", acc: ["tie", "badge"], accColor: "#283f5c" },
  gloria: { skin: "#946846", hair: { style: "curls", color: "#4a4644" }, top: "#5177bc", bottom: "#2f3f57", acc: ["glasses", "badge", "earrings"], build: 1.12 },
  marco_host: { skin: "#9a6949", hair: { style: "braid", color: "#1f1a17" }, top: "#723e41", bottom: "#2e5459", skirt: true, acc: ["embroidered", "earrings"] },
  walter: { skin: "#cd976e", hair: { style: "short", color: "#9a958f" }, top: "#fcfaf8", bottom: "#3f474f", acc: ["glasses", "vest", "mustache", "badge"], accColor: "#633139", height: 0.94, build: 0.95 },
  denise: { skin: "#7f563c", hair: { style: "long", color: "#2e2119" }, top: "#799ae9", bottom: "#2e435a", acc: ["badge", "earrings"] },
  jake: { skin: "#ebc7aa", hair: { style: "short", color: "#9a6a45" }, top: "#305d71", bottom: "#cdb08a", acc: ["badge"] },
  dot: { skin: "#aa754c", hair: { style: "curls", color: "#6e2a1a" }, top: "#b53f37", bottom: "#314a58", acc: ["cap", "badge", "earrings"], accColor: "#c03930", build: 1.08 },
  kevin: { skin: "#b37d4e", hair: { style: "side", color: "#1f1a17" }, top: "#313e5b", bottom: "#263142", acc: ["tie", "badge"], accColor: "#e8a54c" },
  grant: { skin: "#6d4933", hair: { style: "bald", color: "#1f1a17" }, top: "#ebecee", bottom: "#303d4d", acc: ["beard", "badge"], height: 1.05, build: 1.14 },
  nina: { skin: "#e8c1a1", hair: { style: "braid", color: "#7a5236", side: -1, tie: "#f2b632" }, top: "#34435f", bottom: "#27344a", acc: ["scarf", "badge", "earrings"], accColor: "#d68d3d" },
  linda: { skin: "#d8a581", hair: { style: "long", color: "#5d3626" }, top: "#55a9d4", bottom: "#55a9d4", acc: ["headset", "glasses", "badge"] },
  claire: { skin: "#886240", hair: { style: "long", color: "#1f1a17" }, top: "#6a4e90", bottom: "#383a3e", acc: ["headset", "badge"] },
  patel: { skin: "#9a6b49", hair: { style: "short", color: "#857f78" }, top: "#fff2d2", acc: ["glasses", "mustache", "guayabera"], build: 1.14 },
  rita: { skin: "#e8bfa1", hair: { style: "curls", color: "#b8461f" }, top: "#f76c3c", bottom: "#2a4e5b", acc: ["earrings"] },
  // work
  brooks: { skin: "#efceb6", hair: { style: "wavy", color: "#bfb7ae" }, top: "#fcf6ed", bottom: "#293948", acc: ["glasses", "earrings", "cardigan"], accColor: "#344057" },
  maria: { skin: "#bd865a", hair: { style: "wavy", color: "#53362a" }, top: "#ef9c3a", bottom: "#294b59", acc: ["lanyard", "earrings"] },
  kate: { skin: "#ecc9ae", hair: { style: "long", color: "#7a5035" }, top: "#5573c0", bottom: "#334855", acc: ["headset"] },
  paul: { skin: "#9e6d4a", hair: { style: "curly", color: "#1f1a17" }, top: "#7b4d34", acc: ["glasses", "beard"] },
  sara: { skin: "#926545", hair: { style: "long", color: "#1f1a17" }, top: "#bf4261", bottom: "#2c495a", acc: ["earrings"] },
  harris: { skin: "#edcaaf", hair: { style: "side", color: "#b5aea6" }, top: "#c0c8e9", bottom: "#3a3f48", acc: ["tie", "glasses"], accColor: "#87332f" },
  // people
  sophie: { skin: "#ae744c", hair: { style: "wavy", color: "#1f1a17" }, top: "#4f8689", bottom: "#faf1e4", skirt: false, acc: ["flower", "earrings"] },
  mark: { skin: "#bd855a", hair: { style: "short", color: "#1f1a17" }, top: "#ed643c", acc: ["beard"], build: 1.08 },
  lizzie: { skin: "#f1d4be", hair: { style: "wavy", color: "#b85a2e" }, top: "#4e6d6a", bottom: "#2a5065", acc: [] },
  sam: { skin: "#bc8358", hair: { style: "curly", color: "#5a3a25" }, top: "#4a5d86", acc: ["beard"] },
  emma: { skin: "#b5784f", hair: { style: "long", color: "#1f1a17" }, top: "#9a3141", bottom: "#9a3141", skirt: true, acc: ["earrings"] },
  dan: { skin: "#6c4b33", hair: { style: "short", color: "#1f1a17" }, top: "#9dc3ff", bottom: "#2b4656", acc: ["glasses"] },
  nora: { skin: "#f1d4be", hair: { style: "wavy", color: "#bf9a68" }, top: "#af5138", bottom: "#2f4f59", skirt: false, acc: ["earrings"] },
  lucy: { skin: "#e4bc99", hair: { style: "long", color: "#1f1a17" }, top: "#e85a2a", bottom: "#f7ecdb", acc: ["shades", "scarf", "earrings"], accColor: "#455e6d" },
  mrs_lee: { skin: "#a2724a", hair: { style: "braid", color: "#8a847c", side: -1, tie: "#f2b632" }, top: "#7a9459", acc: ["apron", "glasses", "earrings"], accColor: "#cf552d", height: 0.93 },
  reyes: { skin: "#8c6142", hair: { style: "buzz", color: "#1f1a17" }, top: "#33405b", bottom: "#304157", acc: ["mustache", "badge"] },
  // songs 31–35
  carter: { skin: "#9e6d4a", hair: { style: "braid", color: "#1f1a17", side: -1, tie: "#f4f6f8" }, top: "#314862", bottom: "#2c4159", acc: ["glasses", "cardigan", "badge"], accColor: "#fcfbfc" },
  marcus: { skin: "#a06d4a", hair: { style: "braid", color: "#4a3f38", side: -1, tie: "#2aa7a0" }, top: "#e25d44", bottom: "#2f3a5a", skirt: true, acc: ["apron", "embroidered", "earrings"], accColor: "#ffa636", height: 0.95, build: 1.08 },
  frank: { skin: "#e0b291", hair: { style: "short", color: "#e8e2da" }, top: "#a2b8a0", acc: ["glasses", "mustache", "jipi", "guayabera"], accColor: "#d6c393" },
  jordan: { skin: "#c58e63", hair: { style: "braid", color: "#4a3427", side: -1, tie: "#f0883e" }, top: "#2f617d", bottom: "#363e44", acc: ["badge"] },
  // chapter 8
  maggie: { skin: "#f0d2b8", hair: { style: "wavy", color: "#cfc7bf" }, top: "#5f78ac", bottom: "#f7e7d6", acc: ["shades", "earrings"] },
  kyle: { skin: "#c38b60", hair: { style: "short", color: "#1f1a17" }, top: "#e25e30", bottom: "#315360", acc: ["headset", "badge"] },
  brenda: { skin: "#8a5f41", hair: { style: "long", color: "#1f1a17" }, top: "#fcf9f3", bottom: "#2c3647", acc: ["headset", "glasses", "cardigan", "badge"], accColor: "#334461" },
  vanessa: { skin: "#edc9b1", hair: { style: "curls", color: "#33241c" }, top: "#2e2e30", bottom: "#2d2e32", acc: ["lanyard", "earrings", "cardigan"], accColor: "#c74232" },
  greg: { skin: "#e6bd9e", hair: { style: "short", color: "#8f8780" }, top: "#828482", bottom: "#353e4d", acc: ["readers", "beard"] },
  whitaker: { skin: "#80593c", hair: { style: "short", color: "#77716b" }, top: "#eef0f0", acc: ["apron", "beard"], accColor: "#fdfdfb" },
  russo: { skin: "#976a47", hair: { style: "braid", color: "#1f1a17", side: -1, tie: "#f4f1ea" }, top: "#f6eadc", acc: ["apron", "bandana", "earrings"], accColor: "#2e4255" },
  emily: { skin: "#ae774c", hair: { style: "long", color: "#4a2e20" }, top: "#e38837", bottom: "#2f4e5d", acc: ["lanyard", "earrings"] },
  tyler: { skin: "#c89367", hair: { style: "wavy", color: "#2a211c" }, top: "#5d5c43", acc: ["beard", "cardigan"], accColor: "#e9cab0" },
  mr_grant: { skin: "#6d4933", hair: { style: "bald", color: "#b8b2aa" }, top: "#9f4d41", acc: ["beard", "readers"] },
  // customs (s65b)
  // a coral rash guard and board shorts, barefoot in flip-flops (her portrait: public/scenes-es/ref/cast/surf.webp, 15 Nov 2026)
  surf: { skin: "#a8734b", hair: { style: "braid", color: "#3a2a1f", tie: "#ff7a59" }, top: "#ff6a3d", bottom: "#17708a", shoes: "#3a2a1f", shorts: true, sleeves: "short", flipflops: true, acc: ["earrings"], build: 0.96 },
  // Tienda El Faro's cashier (x05-tienda): a young man in the station's red polo with its name badge
  tienda: { skin: "#b07a52", hair: { style: "short", color: "#1f1a17" }, top: "#c8352a", bottom: "#2f3e55", sleeves: "short", acc: ["badge"], build: 0.98 },
  // the people of the ruins (x06–x08): Don Efraín in his jipi and guayabera, Citlali in her painter's apron, Doña Rosario
  // in her hipil with a red rebozo, her grey hair in a braid
  custodio: { skin: "#a8734b", hair: { style: "short", color: "#9a958f" }, top: "#f4efe2", bottom: "#6b5a44", acc: ["jipi", "mustache", "guayabera"], accColor: "#e3cf8e", build: 1.06 },
  pintora: { skin: "#b9814f", hair: { style: "wavy", color: "#1f1a17" }, top: "#e9f2f7", bottom: "#3a5a78", sleeves: "short", acc: ["apron", "earrings"], accColor: "#2f7fbf", build: 0.95 },
  rosario: { skin: "#a8734b", hair: { style: "braid", color: "#e6e0d8" }, top: "#f9f3ee", bottom: "#f6f0ea", skirt: true, acc: ["hipil", "rebozo", "earrings"], accColor: "#c8352a", height: 0.93, build: 1.08 },
  aduana: { skin: "#d2a177", hair: { style: "braid", color: "#533423", side: -1, tie: "#22304a" }, top: "#374359", bottom: "#2d3b4b", acc: ["badge", "earrings"] },
  // the aluxes of the grotto under Cenote Ka'an (src/game/cave): half a person's height, barefoot, in the forest's
  // greens and the yellow of the ceiba's flowers
  alux_kin: { skin: "#b9814f", hair: { style: "short", color: "#1f1a17" }, top: "#5fae5a", bottom: "#8a6a3c", shorts: true, flipflops: true, sleeves: "short", acc: ["jipi"], accColor: "#e3cf8e", height: 0.52, build: 1.2 },
  alux_nikte: { skin: "#c08a5a", hair: { style: "braid", color: "#1f1a17", side: -1, tie: "#f6c445" }, top: "#f2c14e", bottom: "#3f9a8c", skirt: true, flipflops: true, sleeves: "short", acc: ["flower", "embroidered", "earrings"], height: 0.5, build: 1.12 },
  // the Yaxché, the great tree of the grotto's heart (x04): it speaks, but nobody stands for it (its conversation has
  // no figure in the grotto: src/game/cave). The look is only what a person's record must have.
  yaxche: { skin: "#8f7f66", hair: { style: "long", color: "#3f8a3a" }, top: "#4f9a3e", bottom: "#857560" },
};

/** Who is who. Roles are neutral Spanish (a role label isn't a line: no Mexican-only words in them). */
const CAST: Record<string, Cast> = {
  // the arrival
  diaz: ["Oficial Ramírez", "Agente de migración", "Immigration officer"],
  priya: ["Itzel", "Servicio de equipaje", "Baggage services"],
  vinnie: ["Don Rigo", "Taxista", "Taxi driver", { bio: "Knows every hotel on the coast and the price to each one." }],
  olivia: ["Fernanda", "Recepción del hotel", "Hotel reception"],
  chuck: ["Don Chuy", "Voluntario de turismo", "Tourist information volunteer"],
  // the center
  mia: ["Mariana", "Barista", "Barista", { bio: "Draws a hummingbird in the foam of every latte.", informalSpain: true }],
  rosa: ["Doña Carmen", "Vecina de toda la vida", "Local, born and raised"],
  ben: ["Iván", "Taquilla del museo", "Museum tickets"],
  harold: ["Don Arturo", "Vigilante del museo", "Museum guard"],
  marco: ["Luis", "Mesero", "Waiter", { informalSpain: true, roleSpain: "Camarero" }],
  chloe: ["Valeria", "Vendedora", "Sales associate", { informalSpain: true }],
  okafor: ["Don Héctor", "Farmacéutico", "Pharmacist"],
  jessie: ["Paty", "Estilista", "Hairdresser", { informalSpain: true }],
  aaron: ["Ricardo", "Cajero del banco", "Bank teller"],
  gloria: ["Gloria", "Empleada de correos", "Postal clerk"],
  marco_host: ["Lucía", "Anfitriona del restaurante", "Restaurant host", { informalSpain: true }],
  walter: ["Don Raúl", "Taquilla de autobuses", "Bus ticket office"],
  denise: ["Ana", "Conductora de autobús", "Bus driver"],
  jake: ["Andrés", "Renta de autos", "Car rental agent", { roleSpain: "Alquiler de coches" }],
  dot: ["Doña Chela", "Despachadora de gasolina", "Gas station attendant", { roleSpain: "Empleada de la gasolinera" }],
  kevin: ["Emilio", "Documentación de la aerolínea", "Airline check-in", { roleSpain: "Facturación de la aerolínea" }],
  grant: ["Oficial Torres", "Seguridad del aeropuerto", "Airport security"],
  nina: ["Daniela", "Agente de la puerta", "Gate agent"],
  linda: ["Lorena", "Recepción del consultorio dental", "Dental office reception"],
  claire: ["Karla", "Atención a clientes", "Customer service"],
  netwave_bot: ["NetWave", "Menú telefónico", "Automated phone menu"],
  patel: ["Don Ernesto", "Dueño del departamento", "Landlord", { roleSpain: "Dueño del piso" }],
  rita: ["Doña Lupita", "Vecina", "Neighbor", { informal: false }],
  brooks: ["Licenciada Salinas", "Gerente de recursos humanos", "HR manager"],
  maria: ["María", "Compañera de trabajo", "Coworker"],
  kate: ["Sofía", "Líder de equipo", "Team lead"],
  paul: ["Pablo", "Colega", "Colleague"],
  sara: ["Sara", "Colega", "Colleague"],
  harris: ["Ingeniero Montes", "Tu jefe", "Your boss"],
  sophie: ["Ximena", "Anfitriona de la fiesta", "Party host"],
  mark: ["Marcos", "Invitado, chef", "Party guest, chef"],
  lizzie: ["Andrea", "Tu amiga", "Your friend"],
  sam: ["Santiago", "Tu cita", "Your date"],
  emma: ["Camila", "Tu cita", "Your date"],
  dan: ["Diego", "Tu amigo, anfitrión de la cena", "Your friend, dinner host"],
  nora: ["Natalia", "Esposa de Diego", "Diego's wife"],
  lucy: ["Paola", "Amiga de la escuela", "Old school friend"],
  mrs_lee: ["Doña Mari", "Puesto de flores", "Flower stall"],
  reyes: ["Oficial Reyes", "Policía", "Police officer"],
  carter: ["Doctora Herrera", "Médica familiar", "Family doctor"],
  // s32: in Puerto Colibrí a fruit and vegetable stall in the mercado (docs/es/briefs/s32-mercado.md). Doña Licha (Alicia),
  // not Doña Lupe, since 5 Nov 2026: the neighbor Doña Lupita (rita) is the town's Guadalupe (the lead's decision)
  marcus: ["Doña Licha", "Puesto de frutas y verduras", "Fruit and vegetable stall", { gender: "f",
    bio: "Has sold fruit at the mercado for thirty years and calls every customer “güero” or “marchanta”." }],
  sco: ["Caja de autoservicio", "Caja de autoservicio", "Self-checkout machine"],
  // an older neighbor at the bus stop says usted, as his lines in s33 do (Maple Harbor's Frank is informal)
  frank: ["Don Pancho", "Vecino", "Neighbor", { informal: false }],
  jordan: ["Mónica", "Entrenadora personal", "Personal trainer"],
  maggie: ["Doña Margarita", "Vende su auto", "Selling her car"],
  kyle: ["Jorge", "Atención a clientes", "Customer service"],
  harbor_bot: ["Mensaje grabado", "Mensaje grabado", "Recorded message"],
  brenda: ["Brenda", "Gerente de atención a clientes", "Customer care manager"],
  vanessa: ["Vanessa", "Líder de mercadotecnia", "Marketing lead", { roleSpain: "Responsable de marketing" }],
  greg: ["Gerardo", "Gerente de equipo", "Team manager"],
  whitaker: ["Chef Villanueva", "Jefe de cocina", "Head chef"],
  russo: ["Fátima", "Cocinera principiante", "Junior cook"],
  emily: ["Elena", "Tu jefa", "Your manager"],
  tyler: ["Toño", "Fundador", "Founder"],
  // p24: the administrador of Departamentos Las Palmas (the lead's decision, 5 Nov 2026); Don Ernesto (patel) owns it
  mr_grant: ["Don Gilberto", "Administrador del edificio", "Building manager"],
};

/** Characters only Puerto Colibrí has, each on a Maple Harbor character's base (build, voice) under an id of its own. */
const EXTRA: Record<string, [base: string, ...cast: Cast]> = {
  // customs after the baggage hall (s65b): another agency than immigration (s65a), so another officer
  aduana: ["diaz", "Agente Medina", "Aduana", "Customs"],
  // the aluxes (small spirits of the Maya forest, friendly and full of mischief) who live in the grotto under Cenote
  // Ka'an: Kin ("sun") keeps its way in, Nikté ("flower") asks riddles further down. They say tú to everyone.
  alux_kin: ["tyler", "Kin", "Alux, guardián de la gruta", "Alux, keeper of the grotto", { gender: "m", informal: true, informalSpain: true }],
  alux_nikte: ["chloe", "Nikté", "Alux de las adivinanzas", "Alux of the riddles", { gender: "f", informal: true, informalSpain: true }],
  // the Yaxché: the first tree of the Maya, the ceiba that holds up the sky, in the grotto's last chamber. It speaks
  // once all fifteen stones are lit (x04): slowly, kindly, tú to everyone.
  yaxche: ["mrs_lee", "Yaxché", "El árbol sagrado", "The sacred tree", { gender: "f", informal: true, informalSpain: true }],
  // the watersports palapa on the beach west of El Muelle (x01-surf, and the surf game: src/game/surf/): a surfer from
  // Puerto Escondido on the Pacific coast, who teaches beginners on the Caribbean's small waves; tú to everyone
  // the store at Gasolinera El Faro (x05-tienda), behind its counter: the attendant (Doña Chela, s71b) works the pumps
  // outside, so the store has its own cashier; usted to customers, as the station's staff
  tienda: ["marcus", "Paco", "Cajero de la tienda", "Store cashier", { gender: "m", roleSpain: "Dependiente de la tienda",
    bio: "Works the counter at Tienda El Faro: fresh coffee, ice, snacks and cold drinks for the road." }],
  // the ruins on the point past the beach (x06–x08), walked into since 18 Nov 2026: their keeper at the gateway, a
  // young painter at her easel (tú to everyone), and a weaver in the shade of the wall with the iguana Pepe
  custodio: ["walter", "Don Efraín", "Custodio de las ruinas", "Keeper of the ruins", { gender: "m", informal: false, informalSpain: false,
    bio: "Has looked after the Temple of the Sea for thirty years. He knows every stone, and every iguana." }],
  pintora: ["chloe", "Citlali", "Pintora", "Painter", { gender: "f", informal: true, informalSpain: true,
    bio: "Studies art in Mérida and paints the temple every afternoon, for the light." }],
  rosario: ["rosa", "Doña Rosario", "Tejedora de hamacas", "Hammock weaver", { gender: "f", informal: false, informalSpain: false,
    bio: "Weaves hammocks in the shade of the ruins' wall, with Pepe the iguana for company." }],
  tona: ["brooks", "Doña Toña", "Vecina, fan de la lotería", "Neighbor and lotería regular", { gender: "f", informal: false, informalSpain: false,
    bio: "Never misses a Friday lotería night in the zócalo, and always brings an extra board." }],
  beto: ["patel", "Don Beto", "El gritón de la lotería", "The lotería caller", { gender: "m", informal: false, informalSpain: false,
    bio: "Has called the cards at the zócalo's lotería for twenty years, with a verse for almost every one." }],
  surf: ["jordan", "Nayeli", "Instructora de surf", "Surf instructor", { informal: true, informalSpain: true,
    bio: "Grew up surfing in Puerto Escondido, on the Pacific. Here she teaches beginners on the Caribbean's gentle waves." }],
};

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Maple Harbor's look with Mexican colouring, for the ids with no portrait (the phone menus, the self-checkout): a skin
 *  tone from the cast's palette, dark hair (grey stays grey). */
function mexican(id: string, look: Look): Look {
  const gray = look.hair.color === "#b8b3ac" || look.hair.color === "#e8e4dc";
  const h = hash(id);
  return {
    ...look,
    skin: SKIN[h % SKIN.length],
    hair: { ...look.hair, color: gray ? look.hair.color : [HAIR.black, HAIR.dark, HAIR.brown][h % 3] },
  };
}

/** The look of `id` over the base character's `look`: its portrait's (LOOK), else Maple Harbor's with Mexican colouring;
 *  and its face's own touches (faceOf). */
const lookOf = (id: string, look: Look, gender: NpcDef["gender"]): Look => { const l = LOOK[id] ? { ...look, ...LOOK[id] } : mexican(id, look); return { ...l, face: faceOf(id, l, gender) }; };

/** A face of their own for each person (graphics round 3; Character.ts Look.face): the lines of a life of smiling for
 *  the grey-haired, heavier brows for the men (heavier still with a moustache or a beard), finer and more arched for the
 *  women, and each one's brows tilted a little their own way. */
function faceOf(id: string, look: Look, gender: NpcDef["gender"]): NonNullable<Look["face"]> {
  const c = parseInt(look.hair.color.slice(1), 16), r = c >> 16, g = (c >> 8) & 255, b = c & 255;
  const grey = Math.max(r, g, b) > 140 && Math.max(r, g, b) - Math.min(r, g, b) < 40;
  const man = gender !== "f";
  const whiskers = ["beard", "mustache"].some((a) => look.acc?.includes(a as never));
  const t = ((hash(id) % 9) - 4) * 0.02;
  return man ? { brow: whiskers ? 1.4 : 1.25, arch: 0.95, tilt: t, lines: grey } : { brow: 0.85, arch: 1.25, tilt: t + 0.04, lines: grey };
}

function cast(id: string, n: NpcDef, [name, es, en, extra = {}]: Cast): NpcDef {
  return { ...n, id, name, role: { en: es, lt: en }, bio: undefined, look: lookOf(id, n.look, extra.gender ?? n.gender), ...extra };
}

export const NPCS: Record<string, NpcDef> = Object.fromEntries([
  ...Object.entries(BASE).map(([id, n]) => [id, CAST[id] ? cast(id, n, CAST[id]) : { ...n, look: lookOf(id, n.look, n.gender) }]),
  ...Object.entries(EXTRA).map(([id, [base, ...c]]) => [id, cast(id, BASE[base], c)]),
]);

for (const kid of [
  { id: "vale", name: "Vale", gender: "f", voice: "ef_dora", look: {
    skin: SKIN[2], hair: { style: "braid", color: HAIR.dark, side: -1, tie: "#ffd166" },
    top: "#ee5c77", bottom: "#ee5c77", height: 0.78, build: 0.8, swim: "suit",
  } },
  { id: "diego", name: "Diego", gender: "m", voice: "em_alex", look: {
    skin: SKIN[3], hair: { style: "short", color: HAIR.black },
    top: "#27b5aa", bottom: "#2a6389", height: 0.85, build: 0.83, swim: "trunks",
  } },
  { id: "santi", name: "Santi", gender: "m", voice: "em_santa", look: {
    skin: SKIN[2], hair: { style: "curly", color: HAIR.dark },
    top: "#f5bb43", bottom: "#ec7752", height: 0.66, build: 0.72, swim: "trunks", swimRing: true,
  } },
] satisfies { id: string; name: string; gender: NpcDef["gender"]; voice: string; look: Look }[]) {
  NPCS[kid.id] = { ...kid, role: { en: "", lt: "" }, informal: true, look: { ...kid.look, sleeves: "none", child: true, flipflops: true } };
}
