import { L } from "../ui/i18n";

// Match the catalog's historical field names. They carry the target and active helper languages.
export interface Words { en: string; lt: string }
export const words = (target: string, helper: string): Words => ({ en: target, lt: helper });
export const sections = {
  situations: words("Situaciones", L("Situacijos")),
  places: words("Lugares", L("Vietos")),
  games: words("Juegos", L("Žaidimai")),
  keepsakes: words("Recuerdos", L("Suvenyrai")),
  cards: words("Tarjetas", L("Kortelės")),
  songs: words("Canciones", L("Dainos")),
  books: words("Libros", L("Knygos")),
};
export type Section = keyof typeof sections;
export const copy = {
  title: words("Mi pasaporte del pueblo", L("Mano miesto pasas")),
  index: words("Índice de sellos", L("Antspaudų rodyklė")),
  earned: words("Obtenido", L("Gauta")),
  available: words("Pendiente", L("Dar negauta")),
  fresh: words("Sellos nuevos", L("Nauji antspaudai")),
  next: words("Ver el siguiente sello", L("Peržiūrėti kitą antspaudą")),
  view: words("Ver el sello", L("Peržiūrėti antspaudą")),
  back: words("Volver", L("Grįžti (pase)")),
  close: words("Cerrar", L("Uždaryti")),
  link: words("Abrir en el curso", L("Atverti kurse")),
  favorites: words("Canciones favoritas", L("Mėgstamos dainos")),
  empty: words("Al terminar una conversación obtendrás tu primer sello de situación.", L("Užbaik pokalbį ir gausi pirmąjį situacijos antspaudą.")),
  sit: words("Termina esta conversación.", L("Užbaik šį pokalbį.")),
  place: words("Termina una conversación aquí.", L("Užbaik pokalbį šioje vietoje.")),
  game: words("Inicia este juego.", L("Pradėk šį žaidimą.")),
  keepsake: words("Termina una de estas conversaciones.", L("Užbaik vieną iš šių pokalbių.")),
  card: words("Guarda una tarjeta en el pueblo.", L("Išsisaugok kortelę mieste.")),
  song: words("Escucha esta canción en el curso.", L("Išklausyk šią dainą kurse.")),
  chapter: words("Lee o escucha este capítulo en el curso.", L("Perskaityk arba išklausyk šį skyrių kurse.")),
  cover: words("Termina todos los capítulos.", L("Užbaik visus skyrius.")),
  times: words("Conversaciones terminadas", L("Užbaigtų pokalbių skaičius")),
  here: words("Conversación completada aquí", L("Čia užbaigtas pokalbis")),
  starts: words("Partidas iniciadas", L("Pradėtų žaidimų skaičius")),
  pocket: words("Bolsillo de tarjetas", L("Kortelių kišenėlė")),
  inCards: words("En tus tarjetas", L("Tavo kortelėse")),
  heard: words("Escuchado en el curso", L("Išklausyta kurse")),
  read: words("Leído en el curso", L("Perskaityta kurse")),
  chapters: words("Capítulos terminados", L("Užbaigta skyrių")),
  complete: words("Libro terminado", L("Knyga užbaigta")),
  prevPage: words("Página anterior", L("Ankstesnis puslapis")),
  nextPage: words("Página siguiente", L("Kitas puslapis")),
  loading: words("Abriendo la página…", L("Atverčiamas puslapis…")),
  unavailable: words("Esta página no está disponible.", L("Šis puslapis nepasiekiamas.")),
  waves: words("Olas surfeadas", L("Įveiktos bangos")),
  finds: words("Hallazgos fotografiados", L("Nufotografuoti objektai")),
  rounds: words("Rondas terminadas", L("Baigtų raundų skaičius")),
};

export const withCount = (label: Words, count: number | string) =>
  words(label.en + " · " + count, label.lt + " · " + count);
