// Radio Puerto Colibrí's own spots (replaces src/content/radioSpots.ts): short ads for the town's businesses and the
// station's jingles, played between two songs once their recordings exist. Easy Spanish, a little funny; usted to the
// listener, and said the same everywhere (the spots are voiced once, in Mexican voices). With the English meaning (the Lithuanian layer:
// src/editions/es-lt/content/radioSpots.ts). Scripts, voices and music: RADIO-SCRIPTS.md in the batch's notes.
export interface SpotLine { en: string; lt: string; neutral?: string }
export interface RadioSpot {
  /** Also the recording's text in the voice manifest: audioKey(RADIO_SPOT_VOICE, 1, id). */
  id: string;
  kind: "jingle" | "ad";
  /** The business an ad is for (content/locations.ts id). */
  place?: string;
  lines: SpotLine[];
}

/** The voice the spots' finished recordings (voices mixed over their music) are filed under in the manifest. */
export const RADIO_SPOT_VOICE = "g_radio_spot";

export const RADIO_SPOTS: RadioSpot[] = [
  // ---- jingles
  { id: "spot:jingle-1", kind: "jingle", lines: [
    { en: "De la plaza al mar, suena Radio Puerto Colibrí.", lt: "From the square to the sea, it's Radio Puerto Colibrí!" },
  ] },
  { id: "spot:jingle-2", kind: "jingle", lines: [
    { en: "Otra canción para su paseo. Esto es Radio Puerto Colibrí.", lt: "Here's another song for your walk. This is Radio Puerto Colibrí." },
  ] },
  { id: "spot:jingle-3", kind: "jingle", lines: [
    { en: "Hoy se le va a pegar una canción. Radio Puerto Colibrí.", lt: "One of these songs is going to get stuck in your head today. Radio Puerto Colibrí." },
  ] },
  { id: "spot:jingle-4", kind: "jingle", lines: [
    { en: "Hasta las olas llevan el ritmo. Radio Puerto Colibrí.", lt: "Even the waves keep the beat. Radio Puerto Colibrí." },
  ] },
  // ---- ads
  { id: "spot:ad-la-ceiba", kind: "ad", place: "sunny-cup", lines: [
    { en: "Hola, soy Mariana, del Café La Ceiba.", lt: "Hi, it's Mariana from Café La Ceiba." },
    { en: "En la espuma de su latte le dibujo un colibrí.", lt: "I'll draw a hummingbird in your latte foam." },
    { en: "¿Para aquí o para llevar?", lt: "For here or to go?" },
    { en: "Y si es para llevar, ¡el colibrí viaja en vaso!", lt: "And if it's to go, your hummingbird gets a ride in a cup!" },
  ] },
  { id: "spot:ad-el-faro", kind: "ad", place: "gas-station", lines: [
    { en: "¿Cuánto le pongo?", lt: "How much gas would you like?" },
    { en: "Lleno, por favor. Y un café para el camino.", lt: "Fill it up, please. And a coffee for the road." },
    { en: "El café se lo sirve Paco, en la tienda.", lt: "Paco can get you coffee in the store." },
    { en: "Gasolinera El Faro. La bomba de café todavía no existe.", lt: "Gasolinera El Faro. The coffee pump hasn't been invented yet." },
  ] },
  { id: "spot:ad-la-buchaca", kind: "ad", place: "pool-hall", lines: [
    { en: "¿Una partida de billar?", lt: "Up for a game of pool?" },
    { en: "Soy Don Memo, de la Cantina La Buchaca.", lt: "It's Don Memo from Cantina La Buchaca." },
    { en: "Antes de tirar, cante la bola y la tronera.", lt: "Before you shoot, “sing out” which ball goes in which pocket." },
    { en: "Y no se preocupe. ¡No hace falta cantar afinado!", lt: "And don't worry. You don't have to sing in tune!" },
  ] },
  { id: "spot:ad-cocina-lucia", kind: "ad", place: "trattoria", lines: [
    { en: "Esto no es lo que pedí. ¿Es sopa de lima?", lt: "This isn't what I ordered. Is that lime soup?" },
    { en: "Sí. Disculpe, le traigo lo que pidió.", lt: "Yes. Sorry, I'll bring what you ordered." },
    { en: "Espere. Mejor déjeme la sopa. ¡Qué bien huele!", lt: "Wait. I'll keep the soup. It smells amazing!" },
    { en: "La Cocina de Lucía. Su nariz también sabe pedir.", lt: "La Cocina de Lucía. Your nose knows how to order, too." },
  ] },
  { id: "spot:ad-tijeras", kind: "ad", place: "salon", lines: [
    { en: "Nada más las puntas, por favor.", lt: "Just a trim, please." },
    { en: "Claro. ¿Le conté lo que hizo mi gata Canela?", lt: "Of course. Did I tell you what my cat Canela did?" },
    { en: "¿Otra vez hizo de las suyas? Cuénteme todo.", lt: "She's been up to her old tricks again? Tell me everything." },
    { en: "Estética Tijeras. Las puntas se cortan. Las historias de Canela van completas.", lt: "Estética Tijeras. We trim the ends. You get the whole story about Canela." },
  ] },
  { id: "spot:ad-gimnasio", kind: "ad", place: "gym", lines: [
    { en: "¡Una más! Usted puede.", lt: "One more rep! You've got this." },
    { en: "Con esa sonrisa hasta parece fácil.", lt: "When you smile like that, it almost sounds easy." },
    { en: "Para eso sonrío. Vamos, que ya termina.", lt: "That's why I smile. Come on, you're almost done." },
    { en: "Gimnasio Colibrí. La sonrisa es de Mónica. Las pesas sí pesan.", lt: "Gimnasio Colibrí. Mónica brings the smile. The weights are still heavy." },
  ] },
  { id: "spot:ad-la-ola", kind: "ad", place: "surf-palapa", lines: [
    { en: "¿Probamos una ola? Yo le enseño.", lt: "Want to try a wave? I'll show you how." },
    { en: "¿Y si me caigo?", lt: "What if I fall off?" },
    { en: "Se vuelve a subir. Su tabla flota.", lt: "You climb back on. Your board floats." },
    { en: "Escuela de Surf La Ola. La foto buena puede esperar a la segunda ola.", lt: "La Ola Surf School. Save the good photo for the second wave." },
  ] },
  { id: "spot:ad-mercado", kind: "ad", place: "market", lines: [
    { en: "¿A cómo el kilo de aguacate?", lt: "How much are the avocados per kilo?" },
    { en: "Soy Doña Licha, del Mercado Municipal. ¿Para hoy o para mañana?", lt: "I'm Doña Licha from the municipal market. Are they for today or tomorrow?" },
    { en: "Para hoy. Mis invitados ya llegaron.", lt: "For today. My guests have already arrived." },
    { en: "Entonces lleve estos. ¡El guacamole va un poquito atrasado!", lt: "Then take these. The guacamole's running a little late!" },
  ] },
];
