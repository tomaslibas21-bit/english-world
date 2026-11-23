// The town radio's own spots (batch 5, item 7): short ads for the town's businesses and the station's jingles, played
// between two songs once their recordings exist (src/radio: a spot whose clip is not in the voice manifest is never
// played, so until the recordings arrive the radio is exactly as before). The lyric strip shows a spot's lines, with
// their meaning when the sentence translation is on. Scripts, voices and music: RADIO-SCRIPTS.md in the batch's notes.
// The practised language and the learner's: each edition has its own file of this name.
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
    { en: "From the square to the shore, this is Maple Harbor Radio!", lt: "Nuo aikštės iki kranto skamba „Maple Harbor Radio“!" },
  ] },
  { id: "spot:jingle-2", kind: "jingle", lines: [
    { en: "Out for a walk? Take a song with you. Maple Harbor Radio.", lt: "Eini pasivaikščioti? Pasiimk ir dainą. Čia „Maple Harbor Radio“." },
  ] },
  { id: "spot:jingle-3", kind: "jingle", lines: [
    { en: "Know the words? Sing along with us on Maple Harbor Radio.", lt: "Moki žodžius? Dainuok kartu su mumis! Čia „Maple Harbor Radio“." },
  ] },
  { id: "spot:jingle-4", kind: "jingle", lines: [
    { en: "A little English goes a long way. This is Maple Harbor Radio.", lt: "Net ir truputis anglų kalbos praverčia. Čia „Maple Harbor Radio“." },
  ] },
  // ---- ads
  { id: "spot:ad-sunny-cup", kind: "ad", place: "sunny-cup", lines: [
    { en: "Hi, it's Mia from Sunny Cup Café.", lt: "Labas! Čia Mia iš kavinės „Sunny Cup“." },
    { en: "Coffee and a cinnamon roll?", lt: "Kavos ir cinamoninės bandelės?" },
    { en: "For here or to go?", lt: "Čia ar išsinešti?" },
    { en: "Here's a Sunny Cup tip. Get two rolls. One might not make it home.", lt: "Kavinės „Sunny Cup“ patarimas. Imk dvi bandeles. Viena namų gali ir nepasiekti." },
  ] },
  { id: "spot:ad-gas-station", kind: "ad", place: "gas-station", lines: [
    { en: "Fill it up on pump three, please.", lt: "Pilną baką prie trečios kolonėlės, prašau." },
    { en: "Sure thing! How about a coffee for the road?", lt: "Žinoma! Gal kavos į kelią?" },
    { en: "Yes, please. Fill that up, too.", lt: "Taip, prašau. Ir pilną puodelį kavos!" },
    { en: "Gas & Go. Fuel for your car and fuel for you.", lt: "Degalinė „Gas & Go“. Degalų ir mašinai, ir tau." },
  ] },
  { id: "spot:ad-pool-hall", kind: "ad", place: "pool-hall", lines: [
    { en: "Seven ball, corner pocket!", lt: "Septintas kamuolys – į kampinę kišenę!" },
    { en: "That's how you call your shot. Say the ball and the pocket.", lt: "Taip paskelbi smūgį. Pasakyk, kurį kamuolį į kurią kišenę muši." },
    { en: "Go ahead. Give it a try!", lt: "Na, pabandyk!" },
    { en: "The Corner Pocket. The ball doesn't always listen.", lt: "Biliardo salė „The Corner Pocket“. Kamuolys ne visada klauso." },
  ] },
  { id: "spot:ad-trattoria", kind: "ad", place: "trattoria", lines: [
    { en: "This isn't what I ordered. Is that tiramisu?", lt: "Čia ne tai, ką užsisakiau. Čia tiramisu?" },
    { en: "Oh! That's for the next table.", lt: "Oi! Čia gretimam staliukui." },
    { en: "In that case, I'd like one, too.", lt: "Tada ir man vieną, prašau." },
    { en: "Lucia's Trattoria. Funny how there's always room for dessert.", lt: "Restoranas „Lucia's“. Desertui kažkaip visada atsiranda vietos." },
  ] },
  { id: "spot:ad-salon", kind: "ad", place: "salon", lines: [
    { en: "Just a trim, please.", lt: "Tik truputį patrumpinkite, prašau." },
    { en: "Of course. How much should I take off?", lt: "Žinoma. Kiek patrumpinti?" },
    { en: "Just a little. So, how's Mochi?", lt: "Tik truputį. Tai kaip laikosi Mochi?" },
    { en: "Snip & Style. A quick trim, a long story about my cat.", lt: "Kirpykla „Snip & Style“. Plaukus patrumpinsiu greitai, o apie katę galiu kalbėti ilgai." },
  ] },
  { id: "spot:ad-gym", kind: "ad", place: "gym", lines: [
    { en: "One more rep! You've got this.", lt: "Dar vienas pakartojimas! Tu gali." },
    { en: "That's it. Take a break and grab some water.", lt: "Štai ir viskas. Pailsėk ir atsigerk vandens." },
    { en: "How about one more… break?", lt: "O gal dar vieną… pertraukėlę?" },
    { en: "Harbor Fitness. You've earned that break, too.", lt: "Sporto klubas „Harbor Fitness“. Pertraukėlės irgi nusipelnei." },
  ] },
  { id: "spot:ad-threads", kind: "ad", place: "threads", lines: [
    { en: "Can I try on that yellow jacket?", lt: "Ar galiu pasimatuoti tą geltoną striukę?" },
    { en: "Sure! The fitting room is right over there.", lt: "Žinoma! Matavimosi kabina štai ten." },
    { en: "Well? Want a bag, or will you wear it out?", lt: "Na, kaip? Dėti į maišelį, ar eisite su ja?" },
    { en: "Threads. Some jackets never see the inside of a bag.", lt: "Drabužių parduotuvė „Threads“. Kai kurios striukės taip ir nepatenka į maišelį." },
  ] },
  { id: "spot:ad-market", kind: "ad", place: "market", lines: [
    { en: "Unexpected item in the bagging area.", lt: "Pakavimo zonoje – netikėta prekė." },
    { en: "Those are just my bananas.", lt: "Čia tik mano bananai." },
    { en: "I can help. Come on over to register four.", lt: "Aš padėsiu. Ateikite prie ketvirtos kasos." },
    { en: "Harbor Market. We were expecting the bananas.", lt: "Prekybos centras „Harbor Market“. Bananų mes kaip tik laukėm." },
  ] },
];
