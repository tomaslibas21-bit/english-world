// The people of Puerto Colibrí (replaces src/content/npcs.ts in the Spanish edition). The ids are the town's role
// slots, shared with Maple Harbor: the world places "mia" behind the café's counter in both editions, and in this one
// she is Mariana. Each character gets a Mexican name, a role in Spanish (with its English gloss for the interface)
// and a look: Maple Harbor's build and clothes with Mexican colouring, until the owner's new pictures arrive
// (docs/es/STYLE.md "People"; the looks then follow the pictures, as in the English edition).
// `informal` NPCs address the learner with tú (friends, colleagues, people of the learner's age); everyone else
// with usted.
import { NPCS as BASE, COACH_VOICE, type Look, type NpcDef } from "../../../content/npcs";

export type { Accessory, HairStyle, Look, NpcDef } from "../../../content/npcs";
export { COACH_VOICE };

type Cast = [name: string, roleEs: string, roleEn: string, extra?: Omit<Partial<NpcDef>, "look"> & { look?: Partial<Look> }];

const SKIN = ["#e3b58f", "#d9a47e", "#c68e63", "#b07a52", "#a0694a", "#8a5a3c", "#f0cfb0"];
const HAIR = { black: "#1f1a17", dark: "#2e2119", brown: "#5a3a25", gray: "#b8b3ac", white: "#e8e4dc" };

/** Who is who. Roles are neutral Spanish (a role label isn't a line: no Mexican-only words in them). */
const CAST: Record<string, Cast> = {
  // the arrival
  diaz: ["Oficial Ramírez", "Agente de migración", "Immigration officer"],
  priya: ["Itzel", "Servicio de equipaje", "Baggage services"],
  vinnie: ["Don Rigo", "Taxista", "Taxi driver", { bio: "Knows every hotel on the coast and the price to each one." }],
  olivia: ["Fernanda", "Recepción del hotel", "Hotel reception"],
  chuck: ["Don Chuy", "Voluntario de turismo", "Tourist information volunteer"],
  // the center
  mia: ["Mariana", "Barista", "Barista", { bio: "Draws a hummingbird in the foam of every latte." }],
  rosa: ["Doña Carmen", "Vecina de toda la vida", "Local, born and raised"],
  ben: ["Iván", "Taquilla del museo", "Museum tickets"],
  harold: ["Don Arturo", "Vigilante del museo", "Museum guard"],
  marco: ["Luis", "Mesero", "Waiter"],
  chloe: ["Valeria", "Vendedora", "Sales assistant"],
  okafor: ["Don Héctor", "Farmacéutico", "Pharmacist"],
  jessie: ["Paty", "Estilista", "Hairdresser"],
  aaron: ["Ricardo", "Cajero del banco", "Bank teller"],
  gloria: ["Gloria", "Empleada de correos", "Postal clerk"],
  marco_host: ["Lucía", "Anfitriona del restaurante", "Restaurant host"],
  walter: ["Don Raúl", "Taquilla de autobuses", "Bus ticket office"],
  denise: ["Ana", "Conductora de autobús", "Bus driver"],
  jake: ["Andrés", "Renta de autos", "Car rental agent"],
  dot: ["Doña Chela", "Despachadora de gasolina", "Gas station attendant"],
  kevin: ["Emilio", "Documentación de la aerolínea", "Airline check-in"],
  grant: ["Oficial Torres", "Seguridad del aeropuerto", "Airport security"],
  nina: ["Daniela", "Agente de la puerta", "Gate agent"],
  linda: ["Lorena", "Recepción del consultorio dental", "Dental office reception"],
  claire: ["Karla", "Atención a clientes", "Customer service"],
  netwave_bot: ["NetWave", "Menú telefónico", "Automated phone menu"],
  patel: ["Don Ernesto", "Dueño del departamento", "Landlord"],
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
  // s32: in Puerto Colibrí a fruit and vegetable stall in the mercado (docs/es/briefs/s32-mercado.md)
  marcus: ["Doña Lupe", "Puesto de frutas y verduras", "Fruit and vegetable stall", { gender: "f",
    bio: "Has sold fruit at the mercado for thirty years and calls every customer “güero” or “marchanta”.",
    look: { hair: { style: "bun", color: "#3a2a20" }, top: "#d8574a", bottom: "#2f3a5a", skirt: true, acc: ["apron", "earrings"], accColor: "#f2d06b", build: 1.08, height: 0.95 } }],
  sco: ["Caja de autoservicio", "Caja de autoservicio", "Self-checkout machine"],
  frank: ["Don Pancho", "Vecino", "Neighbor"],
  jordan: ["Mónica", "Entrenadora personal", "Personal trainer"],
  maggie: ["Doña Margarita", "Vende su auto", "Selling her car"],
  kyle: ["Jorge", "Atención a clientes", "Customer service"],
  harbor_bot: ["Mensaje grabado", "Mensaje grabado", "Recorded message"],
  brenda: ["Brenda", "Gerente de atención a clientes", "Customer care manager"],
  vanessa: ["Vanessa", "Líder de mercadotecnia", "Marketing lead"],
  greg: ["Gerardo", "Gerente de equipo", "Team manager"],
  whitaker: ["Chef Villanueva", "Jefe de cocina", "Head chef"],
  russo: ["Fátima", "Cocinera principiante", "Junior cook"],
  emily: ["Elena", "Tu jefa", "Your manager"],
  tyler: ["Toño", "Fundador", "Founder"],
  mr_grant: ["Don Gilberto", "Tu casero", "Your landlord"],
};

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Maple Harbor's look with Mexican colouring: a skin tone from the cast's palette, dark hair (grey stays grey). */
function mexican(id: string, look: Look): Look {
  const gray = look.hair.color === "#b8b3ac" || look.hair.color === "#e8e4dc";
  const h = hash(id);
  return {
    ...look,
    skin: SKIN[h % SKIN.length],
    hair: { ...look.hair, color: gray ? look.hair.color : [HAIR.black, HAIR.dark, HAIR.brown][h % 3] },
  };
}

export const NPCS: Record<string, NpcDef> = Object.fromEntries(Object.entries(BASE).map(([id, n]) => {
  const c = CAST[id];
  if (!c) return [id, { ...n, look: mexican(id, n.look) }];
  const [name, es, en, extra = {}] = c;
  const { look: lookPatch, ...rest } = extra;
  const look = { ...mexican(id, n.look), ...(lookPatch ?? {}) } as Look;
  return [id, { ...n, name, role: { en: es, lt: en }, bio: undefined, look, ...rest }];
}));
