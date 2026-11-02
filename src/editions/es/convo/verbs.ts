// Spanish verb forms for the language module (lang.ts, Spanish edition only): which words are finite verb forms. The
// language module uses them where the person, the mood or a "no" belong to a verb: "No la tiro" keeps its "no" on the
// verb, a slip never turns "tengo" into "tenga" or "tomo" into "toma", and "Si no me queda" is an "if".
// Folded spellings (no accents), as the engine compares words. Not a full conjugator: the common verbs of the town's
// conversations in the present, the present subjunctive (and so the usted commands), the preterite, the imperfect, the
// future and the conditional, and the imperfect subjunctive of a few. No infinitives, gerunds or participles: they are
// no person's verb ("cerrado" / "cerrada" is an adjective too, and keeps its gender slips).

type Forms = Set<string>;

/** Regular verbs by infinitive, with the stem change of their stressed forms: "ie" (cerrar → cierro), "ue" (encontrar →
 *  encuentro), "i" (pedir → pido); "zc" (conocer → conozco), "y" (incluir → incluyo). Spelling changes (c → qu, g → gu,
 *  z → c before e; g → j, gu → g before a and o) follow from the endings. */
const REGULAR: Record<string, string> = Object.fromEntries((
  // -ar
  "abordar acompanar aceptar agarrar agregar ahorrar alquilar anotar apagar apartar apuntar arrancar arreglar asegurar " +
  "atrasar avisar ayudar bajar borrar buscar cambiar cancelar cargar cenar checar cobrar cocinar comprar confirmar " +
  "contestar cortar cruzar cuidar dejar demorar desayunar descansar desinflar documentar echar empacar enganchar " +
  "ensenar entrar entregar enviar equivocar escuchar esperar estacionar explicar facturar faltar firmar funcionar " +
  "ganar gastar guardar gustar encantar hablar importar intentar invitar lavar levantar limpiar llamar llegar llenar " +
  "llevar mandar manejar marcar mirar necesitar olvidar ordenar pagar parar pasar pegar pesar picar pinchar platicar " +
  "ponchar practicar preguntar preparar prestar quedar quitar rayar regalar regresar rentar reportar reservar retirar " +
  "retrasar revisar robar sacar saludar sellar separar senalar tardar terminar tirar tocar tomar trabajar tratar ubicar " +
  "usar vaciar validar viajar visitar voltear apurar aterrizar acercar alcanzar avanzar anunciar copiar estudiar " +
  "mojar mudar notar ocupar opinar pintar platicar quejar rentar respirar sonar soltar tocar trabar triunfar " +
  "cerrar:ie calentar:ie comenzar:ie despertar:ie empezar:ie negar:ie pensar:ie recomendar:ie sentar:ie " +
  "acordar:ue acostar:ue almorzar:ue colgar:ue contar:ue costar:ue encontrar:ue jugar:ue mostrar:ue probar:ue " +
  "recordar:ue volar:ue " +
  // -er
  "aprender barrer beber comer comprender correr creer deber depender esconder leer meter prometer recoger responder " +
  "romper suceder temer toser vender escoger proteger " +
  "atender:ie encender:ie entender:ie perder:ie " +
  "devolver:ue doler:ue llover:ue mover:ue resolver:ue volver:ue torcer:ue " +
  "agradecer:zc aparecer:zc conocer:zc merecer:zc ofrecer:zc parecer:zc reconocer:zc " +
  // -ir
  "abrir asistir compartir cubrir cumplir decidir describir descubrir discutir dividir escribir existir imprimir " +
  "insistir ocurrir partir permitir recibir subir sufrir vivir " +
  "divertir:ie mentir:ie preferir:ie sentir:ie advertir:ie " +
  "dormir:ue morir:ue " +
  "conseguir:i corregir:i elegir:i medir:i pedir:i repetir:i seguir:i servir:i vestir:i " +
  "construir:y contribuir:y destruir:y huir:y incluir:y " +
  "conducir:zc producir:zc traducir:zc"
).split(/\s+/).filter(Boolean).map((w) => { const [inf, ch = ""] = w.split(":"); return [inf, ch]; }));

/** The irregular verbs, every finite form written out (folded). */
const IRREGULAR = (
  // ser
  "soy eres es somos sois son sea seas seamos seais sean fui fuiste fue fuimos fuisteis fueron era eras eramos erais eran " +
  "sere seras sera seremos sereis seran seria serias seriamos seriais serian fuera fueras fueramos fueran " +
  // estar
  "estoy estas esta estamos estais estan este estes estemos esteis esten estuve estuviste estuvo estuvimos estuvisteis " +
  "estuvieron estaba estabas estabamos estabais estaban estare estaras estara estaremos estareis estaran estaria " +
  "estarias estariamos estariais estarian estuviera estuvieras estuvieramos estuvieran " +
  // ir
  "voy vas va vamos vais van vaya vayas vayamos vayais vayan iba ibas ibamos ibais iban ire iras ira iremos ireis iran " +
  "iria irias iriamos iriais irian " +
  // haber
  "he has ha hemos habeis han hay haya hayas hayamos hayais hayan hube hubo hubieron habia habias habiamos habian " +
  "habra habran habria habrian hubiera " +
  // tener
  "tengo tienes tiene tenemos teneis tienen tenga tengas tengamos tengais tengan tuve tuviste tuvo tuvimos tuvisteis " +
  "tuvieron tenia tenias teniamos teniais tenian tendre tendras tendra tendremos tendreis tendran tendria tendrias " +
  "tendriamos tendrian tuviera tuvieras tuvieramos tuvieran ten " +
  // poner
  "pongo pones pone ponemos poneis ponen ponga pongas pongamos pongais pongan puse pusiste puso pusimos pusieron ponia " +
  "ponias poniamos ponian pondre pondras pondra pondremos pondran pondria pondrias pondriamos pondrian pusiera pon " +
  // traer
  "traigo traes trae traemos traeis traen traiga traigas traigamos traigais traigan traje trajiste trajo trajimos " +
  "trajeron traia traias traiamos traian traere traeras traera traeremos traeran traeria traerias traeriamos traerian trajera " +
  // hacer
  "hago haces hace hacemos haceis hacen haga hagas hagamos hagais hagan hice hiciste hizo hicimos hicieron hacia hacias " +
  "haciamos hacian hare haras hara haremos hareis haran haria harias hariamos harian hiciera haz " +
  // decir
  "digo dices dice decimos decis dicen diga digas digamos digais digan dije dijiste dijo dijimos dijeron decia decias " +
  "deciamos decian dire diras dira diremos direis diran diria dirias diriamos dirian dijera di " +
  // venir
  "vengo vienes viene venimos venis vienen venga vengas vengamos vengais vengan vine viniste vino vinimos vinieron venia " +
  "venias veniamos venian vendre vendras vendra vendremos vendran vendria vendrias vendriamos vendrian viniera ven " +
  // salir
  "salgo sales sale salimos salis salen salga salgas salgamos salgais salgan sali saliste salio salieron salia salias " +
  "saliamos salian saldre saldras saldra saldremos saldran saldria saldrias saldriamos saldrian saliera sal " +
  // oir
  "oigo oyes oye oimos ois oyen oiga oigas oigamos oigais oigan oi oiste oyo oyeron oia oias oiamos oian oire oiras oira " +
  "oiremos oiran oiria oyera " +
  // dar
  "doy das da damos dais dan de des demos deis den di diste dio dimos disteis dieron daba dabas dabamos daban dare daras " +
  "dara daremos daran daria darias dariamos darian diera " +
  // ver
  "veo ves ve vemos veis ven vea veas veamos veais vean vi viste vio vimos visteis vieron veia veias veiamos veian vere " +
  "veras vera veremos veran veria verias veriamos verian viera " +
  // saber
  "se sabes sabe sabemos sabeis saben sepa sepas sepamos sepais sepan supe supiste supo supimos supieron sabia sabias " +
  "sabiamos sabian sabre sabras sabra sabremos sabran sabria sabrias sabriamos sabrian supiera " +
  // poder
  "puedo puedes puede podemos podeis pueden pueda puedas podamos podais puedan pude pudiste pudo pudimos pudieron podia " +
  "podias podiamos podian podre podras podra podremos podran podria podrias podriamos podrian pudiera pudieras pudieramos pudieran " +
  // querer
  "quiero quieres quiere queremos quereis quieren quiera quieras queramos querais quieran quise quisiste quiso quisimos " +
  "quisieron queria querias queriamos querian querre querras querra querremos querran querria querrias querriamos " +
  "querrian quisiera quisieras quisieramos quisieran"
).split(/\s+/).filter(Boolean);

/** The last vowel of a stem, with what follows it (the u of "gu" / "qu" is no vowel: seguir → sig-). */
const LAST_E = /e((?:[^aeiou]|(?<=[gq])u)*)$/;
const LAST_O = /o((?:[^aeiou]|(?<=[gq])u)*)$/;
const STRESSED: Record<string, (stem: string) => string> = {
  ie: (s) => s.replace(LAST_E, "ie$1"),
  ue: (s) => (s === "jug" ? "jueg" : s.replace(LAST_O, "ue$1")),
  i: (s) => s.replace(LAST_E, "i$1"),
};
/** The stem before an ending that starts with e/i (c → qu, g → gu, z → c) or with a/o (g → j, gu → g, c → zc, z after
 *  a vowel stays). */
const beforeE = (s: string) => s.replace(/c$/, "qu").replace(/g$/, "gu").replace(/z$/, "c");
const beforeAO = (s: string, ch: string) => (ch === "zc" ? s.replace(/c$/, "zc") : /gu$/.test(s) ? s.slice(0, -1) : s.replace(/g$/, "j"));

function conjugate(inf: string, ch: string, out: Forms) {
  const conj = inf.slice(-2);
  const s = inf.slice(0, -2);
  const st = STRESSED[ch] ? STRESSED[ch](s) : s; // the stressed stem: cierr-, encuentr-, pid-
  const add = (...ws: string[]) => { for (const w of ws) out.add(w); };
  // the future and the conditional are built on the infinitive
  for (const e of ["e", "as", "a", "emos", "eis", "an", "ia", "ias", "iamos", "iais", "ian"]) out.add(inf + e);
  if (conj === "ar") {
    add(st + "o", st + "as", st + "a", s + "amos", s + "ais", st + "an");
    AR_PRESENT.add(st + "a"); AR_PRESENT.add(st + "as");
    const se = beforeE(s), ste = beforeE(st);
    add(ste + "e", ste + "es", se + "emos", se + "eis", ste + "en");
    add(se + "e", s + "aste", s + "o", s + "asteis", s + "aron");
    add(s + "aba", s + "abas", s + "abamos", s + "abais", s + "aban", s + "ara", s + "aras", s + "aramos", s + "aran");
    return;
  }
  // -er / -ir
  const y = ch === "y"; // incluir: incluyo, incluye, incluya, incluyo (pret. incluyó), incluyeron
  const sAO = y ? s + "y" : beforeAO(st, ch); // the stressed stem before a and o: conozc-, recoj-, sig-, incluy-
  const sAO1 = y ? s + "y" : beforeAO(s, ch === "zc" ? "zc" : ""); // the same, unstressed (nosotros)
  const weak = ch === "i" || (conj === "ir" && ch === "ie") ? s.replace(LAST_E, "i$1") : conj === "ir" && ch === "ue" ? s.replace(LAST_O, "u$1") : s;
  const stE = y ? s + "y" : st; // the stressed stem before e: incluye
  add(sAO + "o", stE + "es", stE + "e", s + (conj === "er" ? "emos" : "imos"), s + (conj === "er" ? "eis" : "is"), stE + "en");
  add(sAO + "a", sAO + "as", (conj === "ir" && ch ? beforeAO(weak, "") : sAO1) + "amos", sAO1 + "ais", sAO + "an");
  const pret3 = y || /[aeo]$/.test(s) ? s + "y" : weak + "i"; // leyó, creyó, incluyó; pidió, durmió
  add(s + "i", s + "iste", pret3 + "o", s + "imos", s + "isteis", pret3 + "eron");
  add(s + "ia", s + "ias", s + "iamos", s + "iais", s + "ian", pret3 + "era", pret3 + "eras", pret3 + "eramos", pret3 + "eran");
}

/** "toma", "tomas", "cuenta", "compra": the present of an -ar verb in -a / -as, which is often a noun as well. */
const AR_PRESENT: Forms = new Set();
const FINITE: Forms = (() => {
  const out: Forms = new Set(IRREGULAR);
  for (const [inf, ch] of Object.entries(REGULAR)) conjugate(inf, ch, out);
  return out;
})();

/** A finite form of one of the common verbs: "tiro", "tire", "tomaste", "quiero", "tengo", "hay", "pagara". */
export const isFiniteVerb = (w: string | undefined): boolean => !!w && FINITE.has(w);
/** "la toma", "la cuenta", "las compras": an -ar present in -a / -as, after "la" / "las" as likely a noun as a verb. */
export const isArPresentA = (w: string | undefined): boolean => !!w && AR_PRESENT.has(w);
