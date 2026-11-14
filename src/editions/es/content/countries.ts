// The countries a learner can say they come from ("Soy de Lituania", "Vengo de Canadá", "Soy polaca"): one list for
// every conversation that asks where the learner is from, so a learner from anywhere is understood (owner, 14 Nov
// 2026: "Soy de Lituania" was not accepted in Doña Carmen's conversation).
//
// - `es` is the name as a Spanish speaker says it after "de" ("de Estados Unidos", "de El Salvador"): no article,
//   so a line can echo it ("¡Uy, de {X}!").
// - `forms` (folded: no accents, lower case) add other names: with an article, older or local spellings, the English
//   name (a recogniser set to Spanish writes "Lithuania" for a learner who says it in English), the capital or a big
//   city (`cities`: only where the conversation has no cities of its own), and what a Spanish recogniser writes for a foreign accent ("la tuania", "litoania").
// - `near`: in the Americas (Doña Carmen says "welcome", not "all that way").
// - `climate`: what a neighbor says about the weather back home (cold winters, rain, used to the heat).
// - `nat`: the nationality words ("Soy lituano"), a lexicon of their own so a bare "Soy" + an adjective never
//   becomes a country by accident.
import type { EntityDef } from "@/content/types";
import { ent } from "@/content/dsl";

const fold = (x: string) => (x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface Country { id: string; es: string; en: string; g: "m" | "f"; near?: boolean; climate?: "cold" | "rain" | "warm"; cities?: string[]; forms?: string[]; nat: string[] }

const LIST: Country[] = [
  // --- the Americas ---------------------------------------------------------------------------------------------------
  { id: "usa", es: "Estados Unidos", en: "the United States", g: "m", near: true, forms: ["los estados unidos", "eeuu", "ee uu", "eu", "e u", "eua", "usa", "u s a", "america", "norteamerica", "united states", "the states", "the us"], cities: ["nueva york", "california", "texas", "tejas", "chicago", "florida"],
    nat: ["estadounidense", "estadounidenses", "americano", "americana", "americanos", "americanas", "norteamericano", "norteamericana", "gringo", "gringa", "gringos"] },
  { id: "canada", climate: "cold", es: "Canadá", en: "Canada", g: "m", near: true, forms: ["el canada", "canadá"], cities: ["toronto", "vancouver", "montreal", "quebec"], nat: ["canadiense", "canadienses"] },
  { id: "mexico", climate: "warm", es: "México", en: "Mexico", g: "m", near: true, forms: ["mejico", "mexico"], cities: ["la ciudad de mexico", "cdmx", "el df", "guadalajara", "monterrey", "merida", "cancun", "yucatan", "quintana roo"], nat: ["mexicano", "mexicana", "mexicanos", "mexicanas"] },
  { id: "guatemala", climate: "warm", es: "Guatemala", en: "Guatemala", g: "f", near: true, nat: ["guatemalteco", "guatemalteca"] },
  { id: "belize", climate: "warm", es: "Belice", en: "Belize", g: "m", near: true, forms: ["belize"], nat: ["beliceno", "belicena"] },
  { id: "honduras", climate: "warm", es: "Honduras", en: "Honduras", g: "f", near: true, nat: ["hondureno", "hondurena"] },
  { id: "el_salvador", climate: "warm", es: "El Salvador", en: "El Salvador", g: "m", near: true, forms: ["salvador"], nat: ["salvadoreno", "salvadorena"] },
  { id: "nicaragua", climate: "warm", es: "Nicaragua", en: "Nicaragua", g: "f", near: true, nat: ["nicaraguense", "nica"] },
  { id: "costa_rica", climate: "warm", es: "Costa Rica", en: "Costa Rica", g: "f", near: true, nat: ["costarricense", "tico", "tica"] },
  { id: "panama", climate: "warm", es: "Panamá", en: "Panama", g: "m", near: true, nat: ["panameno", "panamena"] },
  { id: "cuba", climate: "warm", es: "Cuba", en: "Cuba", g: "f", near: true, forms: [], cities: ["la habana"], nat: ["cubano", "cubana"] },
  { id: "dominican", climate: "warm", es: "República Dominicana", en: "the Dominican Republic", g: "f", near: true, forms: ["la republica dominicana", "dominicana", "dominican republic"], cities: ["santo domingo"], nat: ["dominicano"] },
  { id: "puerto_rico", climate: "warm", es: "Puerto Rico", en: "Puerto Rico", g: "m", near: true, forms: [], cities: ["san juan"], nat: ["puertorriqueno", "puertorriquena", "boricua"] },
  { id: "jamaica", climate: "warm", es: "Jamaica", en: "Jamaica", g: "f", near: true, nat: ["jamaicano", "jamaicana", "jamaiquino", "jamaiquina"] },
  { id: "haiti", climate: "warm", es: "Haití", en: "Haiti", g: "m", near: true, nat: ["haitiano", "haitiana"] },
  { id: "colombia", climate: "warm", es: "Colombia", en: "Colombia", g: "f", near: true, forms: [], cities: ["bogota", "medellin"], nat: ["colombiano", "colombiana"] },
  { id: "venezuela", climate: "warm", es: "Venezuela", en: "Venezuela", g: "f", near: true, forms: [], cities: ["caracas"], nat: ["venezolano", "venezolana"] },
  { id: "ecuador", climate: "warm", es: "Ecuador", en: "Ecuador", g: "m", forms: ["el ecuador"], cities: ["quito"], nat: ["ecuatoriano", "ecuatoriana"] },
  { id: "peru", climate: "warm", es: "Perú", en: "Peru", g: "m", forms: ["el peru"], nat: ["peruano", "peruana"] },
  { id: "bolivia", es: "Bolivia", en: "Bolivia", g: "f", nat: ["boliviano", "boliviana"] },
  { id: "chile", es: "Chile", en: "Chile", g: "m", forms: [], cities: ["santiago de chile"], nat: ["chileno", "chilena"] },
  { id: "argentina", es: "Argentina", en: "Argentina", g: "f", forms: ["la argentina"], cities: ["buenos aires"], nat: ["argentino"] },
  { id: "uruguay", es: "Uruguay", en: "Uruguay", g: "m", forms: ["el uruguay"], cities: ["montevideo"], nat: ["uruguayo", "uruguaya"] },
  { id: "paraguay", es: "Paraguay", en: "Paraguay", g: "m", forms: ["el paraguay"], nat: ["paraguayo", "paraguaya"] },
  { id: "brazil", climate: "warm", es: "Brasil", en: "Brazil", g: "m", forms: ["el brasil", "brazil"], cities: ["rio de janeiro", "sao paulo"], nat: ["brasileno", "brasilena", "brasilero", "brasilera"] },
  // --- Europe ---------------------------------------------------------------------------------------------------------
  { id: "uk", climate: "rain", es: "Inglaterra", en: "England", g: "f", forms: ["el reino unido", "reino unido", "gran bretana", "england", "uk", "britain", "united kingdom"], cities: ["londres", "london", "manchester", "liverpool"], nat: ["ingles", "inglesa", "ingleses", "britanico", "britanica"] },
  { id: "scotland", climate: "rain", es: "Escocia", en: "Scotland", g: "f", forms: ["scotland"], cities: ["edimburgo", "glasgow"], nat: ["escoces", "escocesa"] },
  { id: "wales", climate: "rain", es: "Gales", en: "Wales", g: "m", forms: ["el pais de gales", "pais de gales", "wales"], nat: ["gales", "galesa"] },
  { id: "ireland", climate: "rain", es: "Irlanda", en: "Ireland", g: "f", forms: ["ireland", "irlanda del norte"], cities: ["dublin"], nat: ["irlandes", "irlandesa", "irlandeses"] },
  { id: "france", es: "Francia", en: "France", g: "f", forms: ["france"], cities: ["paris"], nat: ["frances", "francesa"] },
  { id: "germany", es: "Alemania", en: "Germany", g: "f", forms: ["germany"], cities: ["berlin", "munich"], nat: ["aleman", "alemana", "alemanes"] },
  { id: "spain", es: "España", en: "Spain", g: "f", forms: ["espana", "spain"], cities: ["madrid", "barcelona"], nat: ["espanol", "espanola", "espanoles"] },
  { id: "portugal", es: "Portugal", en: "Portugal", g: "m", forms: [], cities: ["lisboa"], nat: ["portugues", "portuguesa"] },
  { id: "italy", es: "Italia", en: "Italy", g: "f", forms: ["italy"], cities: ["roma", "milan"], nat: ["italiano", "italiana"] },
  { id: "netherlands", climate: "rain", es: "Holanda", en: "the Netherlands", g: "f", forms: ["paises bajos", "los paises bajos", "holland", "netherlands", "the netherlands"], cities: ["amsterdam"], nat: ["holandes", "holandesa", "neerlandes", "neerlandesa"] },
  { id: "belgium", climate: "rain", es: "Bélgica", en: "Belgium", g: "f", forms: ["belgium"], cities: ["bruselas"], nat: ["belga"] },
  { id: "luxembourg", es: "Luxemburgo", en: "Luxembourg", g: "m", forms: ["luxembourg"], nat: ["luxemburgues", "luxemburguesa"] },
  { id: "switzerland", es: "Suiza", en: "Switzerland", g: "f", forms: ["switzerland"], cities: ["zurich", "ginebra"], nat: ["suizo", "suiza"] },
  { id: "austria", es: "Austria", en: "Austria", g: "f", forms: [], cities: ["viena"], nat: ["austriaco", "austriaca"] },
  { id: "sweden", climate: "cold", es: "Suecia", en: "Sweden", g: "f", forms: ["sweden"], cities: ["estocolmo"], nat: ["sueco", "sueca"] },
  { id: "norway", climate: "cold", es: "Noruega", en: "Norway", g: "f", forms: ["norway"], cities: ["oslo"], nat: ["noruego", "noruega"] },
  { id: "denmark", climate: "cold", es: "Dinamarca", en: "Denmark", g: "f", forms: ["denmark"], cities: ["copenhague"], nat: ["danes", "danesa"] },
  { id: "finland", climate: "cold", es: "Finlandia", en: "Finland", g: "f", forms: ["finland"], cities: ["helsinki"], nat: ["finlandes", "finlandesa"] },
  { id: "iceland", climate: "cold", es: "Islandia", en: "Iceland", g: "f", forms: ["iceland"], nat: ["islandes", "islandesa"] },
  { id: "poland", climate: "cold", es: "Polonia", en: "Poland", g: "f", forms: ["poland"], cities: ["varsovia"], nat: ["polaco", "polaca"] },
  { id: "lithuania", climate: "cold", es: "Lituania", en: "Lithuania", g: "f", forms: ["lithuania", "litoania", "lituanya", "la tuania", "litania", "lituanía"], cities: ["vilna", "vilnius", "kaunas"], nat: ["lituano", "lituana", "lituanos", "lituanas"] },
  { id: "latvia", climate: "cold", es: "Letonia", en: "Latvia", g: "f", forms: ["latvia"], cities: ["riga"], nat: ["leton", "letona"] },
  { id: "estonia", climate: "cold", es: "Estonia", en: "Estonia", g: "f", forms: [], cities: ["tallin"], nat: ["estonio", "estonia"] },
  { id: "ukraine", climate: "cold", es: "Ucrania", en: "Ukraine", g: "f", forms: ["ukraine"], cities: ["kiev", "kyiv"], nat: ["ucraniano", "ucraniana"] },
  { id: "russia", climate: "cold", es: "Rusia", en: "Russia", g: "f", forms: ["russia"], cities: ["moscu"], nat: ["ruso", "rusa"] },
  { id: "belarus", climate: "cold", es: "Bielorrusia", en: "Belarus", g: "f", forms: ["belarus"], nat: ["bielorruso", "bielorrusa"] },
  { id: "czechia", es: "República Checa", en: "the Czech Republic", g: "f", forms: ["la republica checa", "chequia", "czech republic", "czechia"], cities: ["praga"], nat: ["checo", "checa"] },
  { id: "slovakia", es: "Eslovaquia", en: "Slovakia", g: "f", forms: ["slovakia"], nat: ["eslovaco", "eslovaca"] },
  { id: "hungary", es: "Hungría", en: "Hungary", g: "f", forms: [], cities: ["budapest"], nat: ["hungaro", "hungara"] },
  { id: "romania", es: "Rumania", en: "Romania", g: "f", forms: ["rumania", "rumanía", "romania"], cities: ["bucarest"], nat: ["rumano", "rumana"] },
  { id: "bulgaria", es: "Bulgaria", en: "Bulgaria", g: "f", nat: ["bulgaro", "bulgara"] },
  { id: "greece", es: "Grecia", en: "Greece", g: "f", forms: ["greece"], cities: ["atenas"], nat: ["griego", "griega"] },
  { id: "croatia", es: "Croacia", en: "Croatia", g: "f", forms: ["croatia"], nat: ["croata"] },
  { id: "slovenia", es: "Eslovenia", en: "Slovenia", g: "f", forms: ["slovenia"], nat: ["esloveno", "eslovena"] },
  { id: "serbia", es: "Serbia", en: "Serbia", g: "f", nat: ["serbio", "serbia"] },
  { id: "turkey", es: "Turquía", en: "Turkey", g: "f", forms: ["turkey", "turkiye"], cities: ["estambul"], nat: ["turco", "turca"] },
  // --- Asia, Africa, Oceania ------------------------------------------------------------------------------------------
  { id: "israel", es: "Israel", en: "Israel", g: "m", nat: ["israeli"] },
  { id: "lebanon", es: "Líbano", en: "Lebanon", g: "m", forms: ["el libano", "lebanon"], nat: ["libanes", "libanesa"] },
  { id: "india", climate: "warm", es: "India", en: "India", g: "f", forms: ["la india"], nat: ["indio", "india", "hindu"] },
  { id: "pakistan", es: "Pakistán", en: "Pakistan", g: "m", nat: ["paquistani", "pakistani"] },
  { id: "china", es: "China", en: "China", g: "f", forms: [], cities: ["pekin", "shanghai"], nat: ["chino", "china"] },
  { id: "taiwan", es: "Taiwán", en: "Taiwan", g: "m", nat: ["taiwanes", "taiwanesa"] },
  { id: "japan", es: "Japón", en: "Japan", g: "m", forms: ["japan"], cities: ["tokio"], nat: ["japones", "japonesa"] },
  { id: "korea", es: "Corea", en: "Korea", g: "f", forms: ["corea del sur", "korea", "south korea"], cities: ["seul"], nat: ["coreano", "coreana"] },
  { id: "philippines", climate: "warm", es: "Filipinas", en: "the Philippines", g: "f", forms: ["las filipinas", "philippines"], cities: ["manila"], nat: ["filipino", "filipina"] },
  { id: "vietnam", climate: "warm", es: "Vietnam", en: "Vietnam", g: "m", nat: ["vietnamita"] },
  { id: "thailand", climate: "warm", es: "Tailandia", en: "Thailand", g: "f", forms: ["thailand"], cities: ["bangkok"], nat: ["tailandes", "tailandesa"] },
  { id: "indonesia", climate: "warm", es: "Indonesia", en: "Indonesia", g: "f", nat: ["indonesio", "indonesia"] },
  { id: "south_africa", es: "Sudáfrica", en: "South Africa", g: "f", forms: ["africa del sur", "south africa"], nat: ["sudafricano", "sudafricana"] },
  { id: "egypt", climate: "warm", es: "Egipto", en: "Egypt", g: "m", forms: ["egypt"], cities: ["el cairo"], nat: ["egipcio", "egipcia"] },
  { id: "morocco", es: "Marruecos", en: "Morocco", g: "m", forms: ["morocco"], nat: ["marroqui"] },
  { id: "nigeria", climate: "warm", es: "Nigeria", en: "Nigeria", g: "f", nat: ["nigeriano", "nigeriana"] },
  { id: "kenya", climate: "warm", es: "Kenia", en: "Kenya", g: "f", forms: ["kenya"], nat: ["keniano", "keniana"] },
  { id: "australia", es: "Australia", en: "Australia", g: "f", forms: [], cities: ["sidney", "sydney", "melbourne"], nat: ["australiano", "australiana"] },
  { id: "nz", es: "Nueva Zelanda", en: "New Zealand", g: "f", forms: ["nueva zelandia", "new zealand"], nat: ["neozelandes", "neozelandesa"] },
];

const entity = (c: Country, cities: boolean) =>
  ent(c.id, c.es, c.en, c.g, { art: "", forms: [...new Set([fold(c.es), ...(c.forms ?? []), ...(cities ? c.cities ?? [] : [])].map(fold))], attrs: { near: !!c.near, climate: c.climate } });
/** The countries as entities, a big city also naming its country ("Soy de Kaunas"): `attrs.near` for the Americas,
 *  `attrs.climate`. */
export const WORLD_COUNTRIES: EntityDef[] = LIST.map((c) => entity(c, true));
/** …without the cities, for a conversation with city entities of its own. */
const WORLD_NO_CITIES: EntityDef[] = LIST.map((c) => entity(c, false));

/** A conversation's own countries (its forms and attrs first), then every other country of the world list with
 *  `more(country)` as its attrs; `except`: countries left out (Mexico, where a reaction would be odd). */
export function withWorld(own: EntityDef[], more: (e: EntityDef) => Record<string, unknown> = () => ({}), except: string[] = []): EntityDef[] {
  const ids = new Set([...own.map((e) => e.id), ...except]);
  const world = new Map(WORLD_NO_CITIES.map((e) => [e.id, e]));
  return [
    ...own.map((e) => { const w = world.get(e.id); return w ? { ...e, forms: [...new Set([...(e.forms ?? []), ...(w.forms ?? [])])] } : e; }),
    ...WORLD_NO_CITIES.filter((e) => !ids.has(e.id)).map((e) => ({ ...e, attrs: { ...e.attrs, ...more(e) } })),
  ];
}

/** "Soy lituana": the nationality words, for a `{country:nat}` slot (`slots: { nat: { lexicon: WORLD_NATIONALITIES } }`). */
export const WORLD_NATIONALITIES = LIST.map((c) => ({ id: c.id, forms: [...new Set(c.nat.map(fold))] }));
