// Song 85 "Thanks for Having Me": dinner at Dan and Nora's (both informal, "tu").
// The learner is the guest: says hello and thanks, gives a small gift, answers the drink offer,
// offers to help, compliments the home and the food, asks for the salt or the recipe, says
// yes or no to seconds and dessert, and leaves politely ("I should get going", "Thanks for
// having me"). Dan (m) and Nora (f) take turns speaking.
//
// Lithuanian: Dan and Nora say "tu" to the guest. When the guest speaks to both hosts, the
// hints use the plural "jūs" (pakvietėte, jūsų namai) — plural, not formal.
// Twists (later visits): Dan asks you to pass the bread, Nora burns the garlic bread, the cat
// (are you allergic?), a dietary question at the door, and "Can't you stay a little longer?".

import type { Ctx, EntityDef, Handler, Pending, SituationDef } from "../types";
import { ent, t } from "../dsl";
import { GLOBAL_HANDLERS } from "../global";

// ---------------------------------------------------------------------------
// Entities

const GIFTS: EntityDef[] = [
  ent("flowers", "flowers", "gėlės/gėlių/gėlėms/gėles/gėlėmis/gėlėse", "f", { art: "some", forms: ["flower", "a bouquet", "a bouquet of flowers", "roses", "tulips"], chip: "gėlių" }),
  ent("wine", "wine", "vynas/vyno/vynui/vyną/vynu/vyne", "m", { art: "some", forms: ["a bottle of wine", "bottle of wine", "red wine", "white wine", "a bottle of red", "a bottle of red wine"], chip: "vyno" }),
  ent("chocolates", "chocolates", "saldainiai/saldainių/saldainiams/saldainius/saldainiais/saldainiuose", "m",
    { art: "some", forms: ["chocolate", "a box of chocolates", "box of chocolates", "candy"], chip: "saldainių" }),
  ent("dessert", "dessert", "desertas/deserto/desertui/desertą/desertu/deserte", "m", { art: "", forms: ["something sweet", "a dessert"], chip: "desertą" }),
  ent("cake", "cake", "tortas/torto/tortui/tortą/tortu/torte", "m", { forms: ["a cake", "cheesecake", "a cheesecake", "a chocolate cake"], chip: "tortą" }),
  ent("pie", "pie", "pyragas/pyrago/pyragui/pyragą/pyragu/pyrage", "m", { forms: ["an apple pie", "apple pie", "a pie"], chip: "pyragą" }),
  ent("cookies", "cookies", "sausainiai/sausainių/sausainiams/sausainius/sausainiais/sausainiuose", "m", { art: "some", forms: ["cookie", "some cookies"], chip: "sausainių" }),
];

const VANDUO = "vanduo/vandens/vandeniui/vandenį/vandeniu/vandenyje";
const VYNAS = "vynas/vyno/vynui/vyną/vynu/vyne";
const DRINKS: EntityDef[] = [
  ent("water", "water", VANDUO, "m", { art: "", forms: ["just water", "some water", "a glass of water", "still water", "tap water"], chip: "vandens" }),
  ent("sparkling_water", "sparkling | water", `gazuotas/gazuoto/gazuotam/gazuotą/gazuotu/gazuotame | ${VANDUO}`, "m", { art: "", forms: ["soda water", "fizzy water", "mineral water", "seltzer"], chip: "gazuoto vandens" }),
  ent("red_wine", "red | wine", `raudonasis/raudonojo/raudonajam/raudonąjį/raudonuoju/raudonajame | ${VYNAS}`, "m", { art: "", forms: ["red", "a glass of red", "some red wine"], chip: "raudonojo vyno" }),
  ent("white_wine", "white | wine", `baltasis/baltojo/baltajam/baltąjį/baltuoju/baltajame | ${VYNAS}`, "m", { art: "", forms: ["white", "a glass of white", "some white wine"], chip: "baltojo vyno" }),
  ent("beer", "beer", "alus/alaus/alui/alų/alumi/alyje", "m", { forms: ["a beer", "a cold beer", "beers"], chip: "alaus" }),
  ent("lemonade", "lemonade", "limonadas/limonado/limonadui/limonadą/limonadu/limonade", "m", { forms: ["a lemonade", "some lemonade"], chip: "limonado" }),
  ent("juice", "juice", "sultys/sulčių/sultims/sultis/sultimis/sultyse", "f", { art: "some", forms: ["orange juice", "apple juice", "some juice"], chip: "sulčių" }),
  ent("tea", "tea", "arbata/arbatos/arbatai/arbatą/arbata/arbatoje", "f", { forms: ["a tea", "a cup of tea", "some tea", "hot tea", "green tea"], chip: "arbatos" }),
  ent("coffee", "coffee", "kava/kavos/kavai/kavą/kava/kavoje", "f", { forms: ["a coffee", "a cup of coffee", "some coffee"], chip: "kavos" }),
  ent("wine_glass", "wine", "vynas/vyno/vynui/vyną/vynu/vyne", "m", { art: "some", forms: ["a glass of wine", "glass of wine", "some wine"], chip: "vyno" }),
  ent("soda", "soda", "gazuotas gėrimas/gazuoto gėrimo/gazuotam gėrimui/gazuotą gėrimą/gazuotu gėrimu/gazuotame gėrime", "m", { forms: ["a soda", "coke", "a coke", "pop"], chip: "gazuoto gėrimo" }),
];

const PASS: EntityDef[] = [
  ent("salt", "salt", "druska/druskos/druskai/druską/druska/druskoje", "f", { art: "", chip: "druską" }),
  ent("pepper", "pepper", "pipirai/pipirų/pipirams/pipirus/pipirais/pipiruose", "m", { art: "", forms: ["black pepper"], chip: "pipirus" }),
  ent("bread", "bread", "duona/duonos/duonai/duoną/duona/duonoje", "f", { art: "", forms: ["the bread basket", "garlic bread"], chip: "duoną" }),
  ent("salad", "salad", "salotos/salotų/salotoms/salotas/salotomis/salotose", "f", { art: "", forms: ["the salad bowl"], chip: "salotas" }),
  ent("water_jug", "water", VANDUO, "m", { art: "", forms: ["the water", "the jug", "the pitcher", "water pitcher"], chip: "vandenį" }),
  ent("butter", "butter", "sviestas/sviesto/sviestui/sviestą/sviestu/svieste", "m", { art: "", chip: "sviestą" }),
  ent("cheese", "cheese", "sūris/sūrio/sūriui/sūrį/sūriu/sūryje", "m", { art: "", forms: ["parmesan", "the parmesan"], chip: "sūrį" }),
  ent("sauce", "sauce", "padažas/padažo/padažui/padažą/padažu/padaže", "m", { art: "", chip: "padažą" }),
];

// ---------------------------------------------------------------------------
// Helpers

const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const turnId = (c: Ctx) => ((c as any).conv?.history?.length ?? 0) + "|" + c.heard;
function once(c: Ctx, key: string): boolean {
  const k = key + "@" + turnId(c);
  const seen: string[] = (c.s.__once ||= []);
  if (seen.includes(k)) return false;
  seen.push(k);
  if (seen.length > 30) seen.shift();
  return true;
}
/** The goal is reached. Optional checklist items still open at this moment leave the list
 *  (their `when` checks goalMet), so a completed conversation never shows an unticked item. */
function win(c: Ctx) { c.s.goalMet = true; c.complete(); }
const asked = (c: Ctx, id: string) => (c.s.asks?.[id] ?? 0) as number;
const bump = (c: Ctx, id: string) => { c.s.asks ||= {}; c.s.asks[id] = asked(c, id) + 1; };
const dan = (c: Ctx, line: string, vars?: Record<string, any>) => { c.speaker("dan"); c.say(line, vars); };
const nora = (c: Ctx, line: string, vars?: Record<string, any>) => { c.speaker("nora"); c.say(line, vars); };
const hi = (c: Ctx) => { c.s.greeted = true; };

/** Pending questions: "Yeah, sure" / "Great!" count as yes, "No, sorry" as no. */
function yn(p: Pending): Pending {
  const on = { ...(p.on || {}) };
  if (p.yes && !on.agree) on.agree = (cc) => { p.yes!(cc); };
  if (p.yes && !on.g_ok) on.g_ok = (cc) => { p.yes!(cc); };
  if (p.no && !on.no_sorry) on.no_sorry = (cc) => { p.no!(cc); };
  return { ...p, on };
}

function stepYes(c: Ctx) {
  const st = dinner.steps.find((x) => x.id === c.step);
  if (st?.yes && !st.done(c)) st.yes(c);
}
function stepNo(c: Ctx) {
  const st = dinner.steps.find((x) => x.id === c.step);
  if (st?.no && !st.done(c)) st.no(c);
}

/** Goal: food praised, hosts thanked, left politely. */
function checkGoal(c: Ctx) {
  if (c.s.foodPraised && c.s.thanked && c.s.leaving) win(c);
}

// Automatic answers for the hosts' optional questions (simulations).
const AUTO: Record<string, string> = {
  drink: "Just some water, please", diet: "No, I eat everything", cat: "No, I love cats!", salad: "Sure!",
  pass: "Sure, here you go!", seconds: "Just a little, please", dessert: "Yes, please! Just a small piece", stay: "I wish I could, but I have work tomorrow",
  howisit: "It's delicious!", closing: "Thanks for having me! Good night!",
};

// ---------------------------------------------------------------------------
// Handlers

const H: Record<string, Handler> = {
  voc(c) { hi(c); },
  g_hello(c) { if (!c.s.greeted) { hi(c); return; } GLOBAL_HANDLERS.g_hello(c as any, {}); },
  g_howareyou(c, slots) { hi(c); GLOBAL_HANDLERS.g_howareyou(c as any, slots); },
  greet_back(c) { hi(c); },
  time_flies(c) { hi(c); if (once(c, "flies")) dan(c, /\bflies\b/i.test(c.heard || "") ? "it_sure_does" : "i_know"); },
  thanks_invite(c) {
    hi(c);
    c.s.thanked = true;
    if (c.s.leaving) { goodbyeThanks(c); return; }
    if (once(c, "thx")) dan(c, "our_pleasure");
  },
  gift(c, slots) {
    hi(c);
    if (c.s.gift) { if (once(c, "gift")) nora(c, "thanks_again"); return; }
    const g = toArr(slots.gift)[0] as string | undefined;
    c.s.gift = g || "something";
    if (!once(c, "gift")) return;
    if (g === "flowers") nora(c, "gift_flowers");
    else if (g === "wine") dan(c, "gift_wine");
    else if (g === "chocolates") nora(c, "gift_chocolates");
    else if (g === "cookies") nora(c, "gift_cookies");
    else if (g === "dessert" || g === "cake" || g === "pie") nora(c, "gift_dessert");
    else nora(c, "gift_any");
  },
  // drinks
  drink_ans(c, slots) {
    hi(c);
    const d = toArr(slots.drink)[0];
    c.s.drink = d || "water";
    if (once(c, "drink")) dan(c, "drink_ok");
  },
  no_drink(c) { hi(c); c.s.drink = "none"; if (once(c, "drink")) dan(c, "just_say"); },
  ask_drinks(c) { hi(c); c.s.listed = true; dan(c, "drink_list"); },
  // at the table and around the house
  offer_help(c) {
    hi(c);
    if (!once(c, "help")) return;
    if (c.s.helpDone) { nora(c, "relax"); return; }
    c.s.helpDone = true;
    if (c.s.saladTask) { c.s.saladAsked = true; c.ask("salad"); return; }
    nora(c, "relax");
  },
  praise_smell(c) { hi(c); if (once(c, "smell")) dan(c, "lasagna"); },
  praise_home(c, _slots, seg) {
    hi(c);
    if (!once(c, "home")) return;
    if (seg.tags.includes("pictures")) nora(c, "pictures");
    else nora(c, "home_thanks");
  },
  praise_food(c) {
    hi(c);
    // "Yes, it's so good!" answering "Would you like some more?" is a yes as well.
    if ((c.step === "seconds" || c.step === "dessert") && /^\W*(yes|yeah|sure|oh yes)\b/i.test(c.heard || "")) H.more_yes(c, {}, { intent: "more_yes", slots: {}, tags: [] });
    c.s.foodPraised = true;
    if (once(c, "food")) { if (c.chance(0.5)) nora(c, "glad_you_like"); else dan(c, "glad_you_like"); }
    checkGoal(c);
  },
  food_meh(c) { hi(c); if (once(c, "meh")) nora(c, "sorry_water"); },
  made_yourself(c) { hi(c); if (once(c, "made")) dan(c, "i_did"); },
  recipe(c) { hi(c); if (once(c, "recipe")) nora(c, "recipe_ok"); },
  pass(c, slots) {
    hi(c);
    const it = toArr(slots.pass)[0] as string | undefined;
    if (!once(c, "pass")) return;
    dan(c, it === "water_jug" ? "here_water" : "here_you_go");
  },
  late_sorry(c) { hi(c); if (once(c, "late")) { c.speaker("dan"); c.say("g_no_worries"); } },
  here_you_go(c) {
    hi(c);
    if (c.step === "pass" && !c.s.passDone) { c.s.passDone = true; dan(c, "thanks_pass"); return; }
    if (c.step === "salad" && !c.s.saladDone) { c.s.saladDone = true; nora(c, "star"); }
  },
  // seconds and dessert
  more_yes(c, _slots, seg) {
    hi(c);
    if (c.step === "dessert" || c.s.dessertAsked && c.s.dessert === undefined) {
      c.s.dessert = "yes"; if (once(c, "more")) nora(c, seg.tags.includes("little") ? "small_piece" : "here_cake");
      return;
    }
    c.s.seconds = "yes";
    if (once(c, "more")) nora(c, seg.tags.includes("little") ? "just_a_little" : "here_more");
  },
  more_no(c) {
    hi(c);
    if (c.step === "dessert" || c.s.dessertAsked && c.s.dessert === undefined) {
      c.s.dessert = "no"; if (once(c, "more")) nora(c, "more_for_dan");
      return;
    }
    c.s.seconds = "no";
    if (once(c, "more")) nora(c, "save_room");
  },
  // twists
  reassure(c) {
    hi(c);
    if (c.step === "burnt" || c.s.burntSaid && !c.s.burntOk) { c.s.burntOk = true; if (once(c, "burnt")) nora(c, "youre_sweet"); }
  },
  diet_ok_ctx(c) { hi(c); c.s.diet = "all"; if (once(c, "diet")) dan(c, "diet_great"); },
  diet_veg_ctx(c) { hi(c); c.s.diet = "veg"; if (once(c, "diet")) dan(c, "diet_veg_ok"); },
  diet_allergy_ctx(c) { hi(c); c.s.diet = "allergy"; if (once(c, "diet")) dan(c, "diet_allergy_ok"); },
  cat_ok_ctx(c) { hi(c); c.s.cat = "ok"; if (once(c, "cat")) dan(c, "cat_good"); },
  cat_allergic_ctx(c) { hi(c); c.s.cat = "allergic"; if (once(c, "cat")) dan(c, "cat_away"); },
  // leaving
  leave(c) {
    hi(c);
    if (!once(c, "leave")) return; // "I should go. I have work tomorrow" is one wish to leave
    if (c.s.leaving) { goodbyeThanks(c); return; }
    if (!c.s.dinnerSaid && !c.s.earlyLeave) { c.s.earlyLeave = true; nora(c, "but_dinner"); return; }
    if (c.s.stayTwist && !c.s.stayAsked) {
      c.s.stayAsked = true; c.twist("stay_longer");
      nora(c, "stay_longer");
      const go = (cc: Ctx) => {
        if (cc.s.leaving) return;
        if (/\bthank/i.test(cc.heard || "")) cc.s.thanked = true;
        letGo(cc);
        if (/good ?night|\bbye\b|see you/i.test(cc.heard || "")) goodbyeThanks(cc);
      };
      c.expect({
        id: "stay", expects: ["leave", "stay", "thanks_end"], hints: ["stay"],
        suggest: [{ lt: "Mandagiai atsisakyti", hint: "stay" }],
        yes: (cc) => H.stay(cc, {}, { intent: "stay", slots: {}, tags: [] }),
        no: go,
        on: { leave: go, thanks_end: go, thanks_invite: go, g_bye: go, g_thanks: go, no_sorry: go, stay: (cc, sl, sg) => H.stay(cc, sl, sg), agree: (cc, sl, sg) => H.stay(cc, sl, sg) },
        ask: (cc) => { if (cc.s.stayReasked) { letGo(cc); return; } cc.s.stayReasked = true; nora(cc, "stay_longer"); },
      });
      return;
    }
    letGo(c);
  },
  stay(c) {
    hi(c);
    if (c.s.leaving || !c.s.stayAsked || c.s.stayed) return;
    c.s.stayed = true;
    nora(c, "yay_stay");
  },
  thanks_end(c) {
    hi(c);
    c.s.thanked = true;
    if (c.s.leaving) { goodbyeThanks(c); return; }
    if (once(c, "thx")) dan(c, "our_pleasure");
    checkGoal(c);
  },
  g_thanks(c) {
    hi(c);
    // "Thank you" for the coat, a drink or the salt needs no "You're welcome".
    if (c.s.leaving) { c.s.thanked = true; goodbyeThanks(c); }
  },
  g_ok(c) { hi(c); stepYes(c); },
  agree(c) { hi(c); stepYes(c); },
  no_sorry(c) { hi(c); stepNo(c); },
  g_bye(c) {
    hi(c);
    if (!c.s.leaving) { H.leave(c, {}, { intent: "leave", slots: {}, tags: [] }); return; }
    goodbyeThanks(c);
  },
};

/** The hosts accept that the guest is leaving. */
function letGo(c: Ctx) {
  c.s.leaving = true;
  dan(c, "thanks_for_coming");
  checkGoal(c);
  c.expect({
    id: "closing", expects: ["thanks_end", "thanks_invite"], hints: ["goodbye"],
    suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "goodbye" }],
    on: Object.fromEntries([...Object.keys(dinner.intents).filter((k) => !k.endsWith("_ctx")), "g_bye", "g_thanks", "g_ok", "g_hello"].map((k) => [k, (cc: Ctx) => {
      if (/^(thanks_end|thanks_invite|g_thanks)$/.test(k) || /\bthank/i.test(cc.heard || "")) cc.s.thanked = true;
      goodbyeThanks(cc);
    }])),
    yes: (cc) => goodbyeThanks(cc), no: (cc) => goodbyeThanks(cc),
  });
}

/** Last lines at the door. */
function goodbyeThanks(c: Ctx) {
  if (c.s.byeSaid) return;
  c.s.byeSaid = true;
  checkGoal(c);
  if (c.s.thanked) dan(c, "anytime_come_again");
  nora(c, "get_home_safe");
  c.end();
}

// ---------------------------------------------------------------------------

export const dinner: SituationDef = {
  id: "s85-dinner",
  song: 85,
  songTitle: "Thanks for Having Me",
  title: { en: "Thanks for Having Me", lt: "Ačiū, kad pakvietėte" },
  topic: { en: "Being a dinner guest", lt: "Svečiuose vakarienėje" },
  chapter: 5,
  order: 4,
  location: "dans-house",
  npc: "dan",
  npcs: ["nora"],
  goal: "Pabūk svečiuose vakarienėje: padėkok, pagirk maistą ir mandagiai atsisveikink.",
  intro: "Dan ir Nora pakvietė tave vakarienės. Septinta valanda, stovi prie jų durų su dovanėle rankose.",
  entities: { gift: GIFTS, drink: DRINKS, pass: PASS },

  grammar: {
    macros: {
      both: "[(both | you both | you two | guys | everyone | dan | nora)]",
      v: "[(dan | nora | guys | everyone | dan and nora | nora and dan)]",
      gift_np: "[(a | an | some | a bottle of | a box of | a little | this | these)] {gift}",
      great: "(delicious | amazing | so good | really good | great | wonderful | fantastic | excellent | perfect | tasty | lovely | incredible | yummy | so tasty | really tasty | awesome)",
      food: "(this | it | dinner | the food | the lasagna | this lasagna | everything | the salad | this salad | the bread | the cake | this cake | dessert | the dessert | the meal | the sauce)",
      home: "(home | house | place | apartment | kitchen | garden | living room)",
      sorry: "[(sorry | i am sorry | i am so sorry | unfortunately)]",
      pls: "[please]",
    },
  },

  intents: {
    voc: { patterns: ["(dan | nora | everyone | guys | you two | danny)"] },
    greet_back: { patterns: ["@v (nice | great | good | so nice | so good | lovely) to see you [again | too | both | guys] [@v]", "@v (nice | great | good | so nice) to meet you [too] [@v]", "@v it is [so] (nice | good | great | lovely) to see you [again | too | both]"] },
    time_flies: { patterns: ["[wow] time flies", "[wow] look at the time", "(oh no | oh wow | oh my | oh my god | wow) look at the time", "(where | how) did the time go"] },
    thanks_invite: { patterns: [
      "@v (thank you | thanks) [so much | very much] for (inviting me | the invitation | the invite) [@v] #h:gr_thanks_invite",
      "@v (thank you | thanks) [so much | very much] for (your invitation | inviting me (to dinner | over | tonight | here)) [@v]", "@v (thank you | thanks) that you (invited | invite) me [@v]", "@v (thank you | thanks) [so much] for having me [@v] #h:gb_having_me",
      "it is [so] (nice | great | good | lovely) to be here @both", "i am [so | really] (happy | glad) to be here", "thanks for (inviting | having) me over",
    ] },
    gift: { patterns: [
      "@v (these are | this is) for you @both #h:gf_for_you", "@v i brought [you | you both | you guys] @gift_np [for you] [@both] #h:gf_brought",
      "here (is | are) @gift_np [for you] [@both]", "(it is | this is | these are) (a bottle of | a box of | a bunch of | a little | a small) {gift} [for you] [@both]", "[a | some | a little] {gift} for you [@both] #h:gf_short", "i got [you | you both] @gift_np",
      "[just] a little something [for you] #h:gf_short", "here is a little something [for you] #h:gf_short", "(this | these) [is | are] for you [@both] i hope you like (it | them)", "here this is for you",
      "@v (this | these | the) {gift} (is | are) for you [@both]", "i hope you like {gift}",
      "i (made | baked | bought | got) [you] @gift_np [for you] [@both]", "(this | it) is a [little | small] (gift | present) [for you] [@both]",
      "[here] i brought [you] [a | some] [small | little] (gift | present | something) [for you] [@both]",
    ] },
    drink_ans: { patterns: [
      "[(i will have | i would like | i would love | can i (get | have) | could i (get | have) | maybe | i think i will have)] [(a | some | a glass of | a bottle of)] {drink} @pls [for now] #h:dr_have",
      "[just] [(some | a glass of)] {drink} [for now] [please] #h:dr_just", "[i think] [(a | some | a glass of)] {drink} would be (great | nice | perfect | lovely) #h:dr_would_be", "[a] {drink} sounds (good | great | nice)",
      "[(a | some | a glass of)] {drink} is (fine | great | good | perfect) [thanks | for me]", "do you have [any | some] {drink}",
      "[just] [(some | a glass of)] {drink} [for me] (i am driving | i have to drive)", "(i do not drink [alcohol] | i am driving) [so] [just] [(some | a glass of)] {drink}",
      "(whatever | the same as) you are having", "something (without alcohol | non alcoholic | soft | cold)",
    ] },
    // "Sorry I'm a little late!"
    late_sorry: { patterns: ["[i am] [so | really] sorry (i am | for being) [a (little | bit)] late", "sorry for the delay", "[i am] sorry to keep you waiting"] },
    no_drink: { patterns: ["i am (fine | good | okay | all set) (for now | right now | thanks) [thanks] #h:dr_nothing", "nothing (for now | for me | right now) [thanks]", "not right now [thanks]", "maybe later [thanks]"] },
    ask_drinks: { patterns: ["what do you have", "what (drinks | kind of drinks) do you have", "what (are the options | have you got | kind of drinks do you have)", "what is there", "what kind of (wine | beer | juice | drinks) do you have"] },
    offer_help: { patterns: [
      "(can | could | may) i help [you] [with (anything | something | dinner | the table)] #h:hp_can_i", "is there anything i can do [to help] #h:hp_anything", "(do | can) you need [any] help",
      "let me help [you] [with (the dishes | the table | that)] #h:hp_let_me", "(can | could) i help (set | with) the table", "what can i do to help",
      "(can | could) i help (clear | with) the (table | dishes)", "i can help with the dishes", "what can i do", "(should | can | shall) i set the table", "(can | could) i do (something | anything) [to help]", "(do you want | would you like) me to help [you]",
      "(do | can) you need [any] help (in the kitchen | with (dinner | anything | the table))", "(can | could) i help you in the kitchen",
      "is there anything i can help [you] with", "is there anything i can help",
    ] },
    praise_smell: { patterns: [
      "(something | it | dinner | the food | that | everything) smells (amazing | great | delicious | so good | wonderful | fantastic | incredible | really good) #h:cm_smells",
      "what smells so (good | great | amazing)", "mmm [what] smells (good | great | amazing | delicious)", "it smells so good in here", "what are you (cooking | making)", "smells (amazing | great | delicious | so good | wonderful | fantastic | incredible | really good)",
    ] },
    praise_home: { patterns: [
      "you [guys | two | both] have a (lovely | beautiful | nice | great | wonderful | cozy) @home #h:cm_home", "(what a | such a) (lovely | beautiful | nice | great | cozy) @home",
      "(your | this) @home is (lovely | beautiful | so nice | amazing | really nice | so cozy | great)", "i love your @home",
      "i love (the | your) (pictures | paintings) [on the wall] #pictures", "(the | your) (pictures | paintings) are (beautiful | amazing | great | lovely) #pictures", "(nice | beautiful | lovely | great) (pictures | paintings) #pictures", "(what a | such a) (nice | beautiful | lovely | great) view", "(you have | there is) a (nice | beautiful | lovely | great) view",
    ] },
    praise_food: { patterns: [
      "@food is [so | really | absolutely] @great #h:cm_delicious", "@food is [so | really | absolutely] @great really #h:cm_delicious", "(very | really | so) (very | really | so) @great", "[mmm] @great", "[mmm] (this | it) is @great", "i love (it | this | the lasagna | the food | the cake)",
      "(this is | it is) the best lasagna [i have ever had]", "you are a (great | wonderful | amazing | fantastic | really good) cook #h:cm_cook", "it tastes (great | amazing | delicious | wonderful)",
      "[mmm] (so good | yum | yummy) #h:cm_so_good", "(wow | mmm) (this | it) is (so | really) good", "(it was | that was | everything was) [so | really | absolutely] @great",
      "@food is (okay | fine | all right | good) #tip:weak_praise", "[it is] not bad [at all]", "(really | very) good",
      "@food (looks | smells) [so | really] @great", "it all (looks | smells | tastes) [so | really] @great", "(very | really | so) @great", "super",
      "[this is | it is] the best lasagna [i have ever (had | eaten)]",
    ] },
    food_meh: { patterns: ["it is a (little | bit) (spicy | salty | hot)", "it is (good | nice | delicious | tasty) but [a little | a bit] (spicy | salty | hot)", "(this | it) is (too | very | really) (spicy | salty | hot)", "it is spicy"] },
    made_yourself: { patterns: [
      "did you (make | cook | bake) (this | it | everything | the lasagna | the cake | dinner) [yourself | yourselves] #h:cm_made", "is (this | it) homemade",
      "who (made | cooked | baked) (this | it | the lasagna | the cake | dinner)",
    ] },
    recipe: { patterns: [
      "(can | could) i (have | get) the recipe #h:cm_recipe", "you (have to | must) (send | give) me the recipe", "(what is | what's) in (it | this | the sauce)",
      "how do you make (it | this)", "(can | could) you (send | give) me the recipe",
    ] },
    pass: { patterns: [
      "(can | could) you pass [me] the {pass} @pls #h:ps_could_you", "(can | could) i have the {pass} @pls #h:ps_can_i", "pass [me] the {pass} @pls #blunt",
      "(would you | do you) mind passing [me] the {pass}", "(can | could) i (get | have) some {pass} @pls", "(where is | is there) (the | some) {pass}",
      "(can | could) you give me the {pass} @pls", "i will (take | have) some {pass}", "(would | will) you pass [me] the {pass} @pls",
    ] },
    here_you_go: { patterns: ["[sure] here you (go | are) #h:ps_here", "[sure] there you go", "[sure] of course here you go", "here it is", "[yes | sure] here", "(done | all done)"] },
    more_yes: { patterns: [
      "[yes] [please] just a (little | bit | little bit | small piece | small one) [please] #little #h:mo_little", "(maybe | yes) just a little [more] #little",
      "maybe a little [bit] [more] #little", "a little [bit] [more] [please] #little",
      "[yes] a small piece [please] #little #h:mo_small", "(only | just) a small (piece | one | portion) #little", "i am not full yet",
      "[yes] i love (chocolate cake | cake | chocolate)", "i always have room for dessert", "[sure] but (a small piece | just a little | only a little) #little", "[chocolate] cake (yes | sure) [please]", "[yes] i would love (some | some more | a piece | one) #h:mo_love", "[yes] (i will have | can i have) (some | a little) more #little",
      "go on then #tip:uk_go_on", "oh go on #tip:uk_go_on", "(how | why) could i say no", "yes please it is [so] (delicious | good)",
    ] },
    more_no: { patterns: [
      "[no] [thanks | thank you] i am (full | stuffed | good | fine | okay) [thanks | thank you] #h:mo_full", "i could not eat another bite #h:mo_bite",
      "(no | no thanks | no thank you) (it was | that was) (delicious | amazing | great | so good) [but i am full]", "i am (too | so) full [thanks]", "no more for me [thanks]",
      "@sorry i do not (have | have any) room [left] [for dessert]", "not for me [thanks]", "[no] i am good thanks",
      "[no] i am on a diet", "maybe later", "i can not [eat any more] i am [so | too | really] full", "no (cake | dessert | more) for me [thanks]", "no more [for me] [thanks]", "i am not hungry [anymore]", "i do not want [any] more [thanks]", "i am full but it was (delicious | amazing | great | so good)", "@sorry i do not eat (sweets | sugar | cake | dessert)",
    ] },
    reassure: { patterns: [
      "no (worries | problem) [at all]", "(do not | don't) worry [about it] [it is (fine | okay | still delicious | still good)] #h:tw_dont_worry",
      "(it is | that is) (fine | okay | all right | no problem) [really]", "it is still (delicious | good | great | tasty) #h:tw_still_good", "i like it [a little | a bit] crispy",
      "it happens [to everyone]", "it still (smells | tastes | looks) @great", "we have (enough | plenty of) food",
    ] },
    diet_ok_ctx: { patterns: ["[no] i eat everything #h:dt_all", "[no] i am fine with (everything | anything)", "everything is (fine | okay)", "[no] nothing [at all]", "[no] i am not picky", "[no] i can eat anything", "no allergies"] },
    diet_veg_ctx: { patterns: ["i am [a] vegetarian #h:dt_veg", "i do not eat (meat | pork | beef | fish | chicken) [but everything else is (fine | okay)]", "i am [a] vegan", "no meat for me [please]"] },
    diet_allergy_ctx: { patterns: ["i am allergic to (nuts | peanuts | gluten | dairy | milk | shellfish | eggs | fish) #h:dt_allergic", "i can not (eat | have) (nuts | gluten | dairy | milk | eggs | lactose)", "i am lactose intolerant"] },
    cat_ok_ctx: { patterns: ["[no] i love cats #h:ct_love", "[no] not at all #h:ct_not_at_all", "[no] i am not allergic [to cats]", "[no] she is [so] (cute | beautiful | sweet)", "[no] cats are (fine | great)", "[no] i have (a cat | cats | two cats) [too | at home]", "(hi | hello | hey) [there] mittens"] },
    cat_allergic_ctx: { patterns: ["[yes] i am [a little | a bit | very] allergic [to cats] [actually] #h:ct_allergic", "[yes] a little [actually]", "[yes] (a bit | unfortunately)"] },
    leave: { patterns: [
      "[well] i (should | better | had better) (get going | go | go home | head home | be going | get home) [now] #h:lv_should", "[well] i (have | need) to (go | go home | get going | head home | leave) [now]",
      "it is getting late [i should (go | get going)] #h:lv_late", "it is late", "i should go it is late", "[well] i think i should (go | get going | head home)", "i am going to (head home | head out | get going)",
      "i have (to work | work) tomorrow [so i should (go | get going)] #h:lv_work_tmrw", "[sorry] i really have to go #h:lv_really", "time to go [home]", "i must go [now]",
      "i (have | need) to get up early [tomorrow]", "i (have | need) to (work | be at work | wake up | start work) early [tomorrow] [morning]", "i have (to work | work) early tomorrow [morning] [so i should (go | get going)]", "i have an early (morning | day | start) tomorrow", "(can | could) i call a (taxi | cab | uber)", "it is (so | really | already) late", "[i think] it is time (for me)? to go [home]", "i (need | have) to catch (the | my) (bus | train)", "my (taxi | uber | ride) is (here | coming | waiting)",
    ] },
    stay: { patterns: ["[okay] [maybe | just] (a little longer | ten more minutes | one more coffee | a few more minutes) [then] #h:st_ok", "okay i can stay a (little | bit) [longer]", "why not"] },
    thanks_end: { patterns: [
      "@v (thank you | thanks) [so much | very much] for [a | this | the] (lovely | wonderful | great | nice | beautiful | perfect | delicious | fun) (evening | night | dinner | meal | time) [@v] #h:gb_lovely",
      "@v (thank you | thanks) [so much | very much] again for [a | this | the] [lovely | wonderful | great | nice | beautiful | perfect | delicious | fun] (evening | night | dinner | meal | time | everything) [@v]",
      "(thank you | thanks) [so much] for (everything | dinner | tonight | the dinner) #h:gb_everything", "(it was | this was | what) a (lovely | wonderful | great | perfect) (evening | night | dinner)",
      "i had a (great | lovely | wonderful | really nice) time [tonight]", "everything was (delicious | perfect | amazing | wonderful)",
      "i wish i could [but i (have work | have to work | need to get up early | have to get up early) tomorrow]", "i would love to but i (have work | have to work | need to go) [tomorrow] #h:lv_work",
      "i would love to but i can not", "next time [you come] (at my place | to my place | you come to me)",
    ] },
    agree: { patterns: [
      "sure #h:ag_sure", "of course #h:ag_of_course", "happy to help #h:ag_happy",
      "(yes | yeah | yep | sure | okay) (sure | of course | definitely | absolutely | why not | no problem | happy to | with pleasure | great | perfect)",
      "(of course | sure) i can [do that]", "with pleasure", "[sure] where (should | do | can) i put it",
    ] },
    no_sorry: { patterns: ["(no | nope) sorry", "sorry no", "sorry not (really | now)", "maybe next time", "[no] sorry i can not", "[no] i really can not [sorry]"] },
  },

  lines: {
    // at the door
    door_dan: [
      t("Hey! | You | made it! | Come on in!", "Labas! | Tu | atvykai! | Užeik!", "Labas! Atvykai! Užeik!"),
      t("Hi! | So | glad | you | could | make it! | Come on in!", "Labas! | Taip | džiaugiuosi, | kad tu | galėjai | atvykti! | Užeik!", "Labas! Taip džiaugiuosi, kad galėjai atvykti! Užeik!"),
    ],
    door_nora: [
      t("Hi! | Welcome!", "Labas! | {m:Sveikas atvykęs|f:Sveika atvykusi}!", "Labas! {m:Sveikas atvykęs|f:Sveika atvykusi}!"),
      t("Hello! | We're | so | happy | you're | here!", "Labas! | Mes esame | tokie | laimingi, | kad tu esi | čia!", "Labas! Taip džiaugiamės, kad atėjai!"),
    ],
    coat: [
      t("Here, | let | me | take | your | coat.", "Še, | leisk | man | paimti | tavo | paltą.", "Še, leisk paimti tavo paltą."),
      t("Let | me | take | your | jacket.", "Leisk | man | paimti | tavo | striukę.", "Leisk paimti tavo striukę."),
    ],
    our_pleasure: [
      t("Of course! | We're | so | glad | you're | here.", "Žinoma! | Mes | taip | džiaugiamės, | kad tu esi | čia.", "Žinoma! Taip džiaugiamės, kad atėjai.",
        { flags: { 1: "“’re” (are) has no separate word: džiaugiamės (be glad) is a verb." } }),
      t("Our | pleasure!", "Mūsų | malonumas!", "Mums malonu!"),
    ],
    gift_flowers: [
      t("Oh, | you | shouldn't have! | They're | beautiful!", "O, | tau | nereikėjo! | Jos yra | nuostabios!", "O, nereikėjo! Jos nuostabios!"),
    ],
    gift_wine: [
      t("Ooh, | nice! | We'll open | it | with | dinner.", "O, | šaunu! | Atidarysime | jį | prie | vakarienės.", "O, šaunu! Atidarysime prie vakarienės."),
    ],
    gift_chocolates: [
      t("Chocolates! | Oh, | you're | too | kind.", "Saldainiai! | O, | tu esi | per | {m:malonus|f:maloni}.", "Saldainiai! O, tu per {m:malonus|f:maloni}."),
    ],
    gift_cookies: [
      t("Cookies! | Oh, | you're | too | kind.", "Sausainiai! | O, | tu esi | per | {m:malonus|f:maloni}.", "Sausainiai! O, tu per {m:malonus|f:maloni}."),
    ],
    gift_dessert: [
      t("Dessert? | You're | the | best!", "Desertas? | Tu esi | — | {m:geriausias|f:geriausia}!", "Desertas? Tu {m:geriausias|f:geriausia}!"),
    ],
    gift_any: [
      t("Oh, | thank | you! | You | shouldn't have!", "O, | ačiū | tau! | Tau | nereikėjo!", "O, ačiū! Nereikėjo!"),
    ],
    thanks_again: [
      t("Thank | you | again!", "Ačiū | tau | dar kartą!", "Dar kartą ačiū!"),
    ],
    ask_diet: [
      t("Oh, | I | forgot | to ask: | is | there | anything | you | don't eat?", "O, | aš | pamiršau | paklausti: | ar yra | — | kas nors, ko | tu | nevalgai?",
        "O, pamiršau paklausti: ar yra kas nors, ko nevalgai?", { flags: { 5: "Existential “there”: ar yra already carries it.", 6: "Lithuanian adds the relative ko (that) after kas nors." } }),
    ],
    diet_great: [
      t("Great!", "Puiku!", "Puiku!"),
    ],
    diet_veg_ok: [
      t("No | problem! | We | made | a | veggie | lasagna | too.", "Jokių | problemų! | Mes | pagaminome | — | vegetarišką | lazaniją | irgi.", "Jokių problemų! Pagaminome ir vegetarišką lazaniją."),
    ],
    diet_allergy_ok: [
      t("Good | to know! | Don't worry, | it's | safe.", "Gera | žinoti! | Nesijaudink, | ji yra | saugi.", "Gerai, kad pasakei! Nesijaudink, ji saugi."),
    ],
    ask_drink: [
      t("Can | I | get | you | something | to drink? | We | have | wine, | beer, | lemonade, | or | water.",
        "Ar galiu | aš | paduoti | tau | ko nors | atsigerti? | Mes | turime | vyno, | alaus, | limonado | ar | vandens.",
        "Gal ko nors atsigerti? Turime vyno, alaus, limonado ar vandens."),
      t("What | can | I | get | you | to drink?", "Ką | galiu | aš | paduoti | tau | atsigerti?", "Ką tau paduoti atsigerti?"),
    ],
    what_can_i_get: [
      t("So, | what | can | I | get | you?", "Tai | ką | galiu | aš | paduoti | tau?", "Tai ką tau paduoti?"),
    ],
    drink_list: [
      t("We | have | red | and | white | wine, | beer, | lemonade, | juice, | or | water.", "Mes | turime | raudonojo | ir | baltojo | vyno, | alaus, | limonado, | sulčių | ar | vandens.",
        "Turime raudonojo ir baltojo vyno, alaus, limonado, sulčių ar vandens."),
    ],
    drink_ok: [
      t("Coming right up!", "Tuoj bus!", "Tuoj bus!"),
      t("Sure | thing!", "Žinoma, | tuoj!", "Žinoma!"),
    ],
    just_say: [
      t("Okay! | Just | let | me | know.", "Gerai! | Tiesiog | pasakyk | man | —.", "Gerai! Tik pasakyk.", { flags: { 4: "“know” (let me know): pasakyk (tell) covers “let … know”." } }),
    ],
    cat_intro: [
      t("Oh, | and | this | is | Mittens. | Are | you | allergic | to cats?", "O, | ir | čia | yra | Mitens. | Ar | tu | {m:alergiškas|f:alergiška} | katėms?",
        "O, čia Mitens. Ar tau nėra alergijos katėms?"),
    ],
    cat_good: [
      t("Good! | She | loves | guests.", "Gerai! | Ji | dievina | svečius.", "Gerai! Ji dievina svečius."),
    ],
    cat_away: [
      t("Oh | no! | I'll put | her | in | the | bedroom.", "O | ne! | Uždarysiu | ją | — | — | miegamajame.", "O ne! Uždarysiu ją miegamajame.",
        { flags: { 4: "“in”: the locative ending of miegamajame carries it." } }),
    ],
    almost_ready: [
      t("Dinner's | almost | ready. | Make yourself at home!", "Vakarienė yra | beveik | paruošta. | Jauskis kaip namie!", "Vakarienė beveik paruošta. Jauskis kaip namie!"),
      t("Dinner | will be | ready | in | five | minutes!", "Vakarienė | bus | paruošta | po | penkių | minučių!", "Vakarienė bus po penkių minučių!"),
    ],
    relax: [
      t("No, | no, | just | relax!", "Ne, | ne, | tiesiog | atsipalaiduok!", "Ne, ne, tiesiog atsipalaiduok!"),
      t("That's | so | sweet, | but | we're | fine. | Just | relax!", "Tai | taip | miela, | bet | mums | viskas gerai. | Tiesiog | atsipalaiduok!", "Kaip miela, bet mums viskas gerai. Tiesiog atsipalaiduok!",
        { flags: { 4: "“we're” = dative experiencer: mums (to us)." } }),
    ],
    salad_task: [
      t("Sure! | Could | you | put | the | salad | on | the | table?", "Žinoma! | Ar galėtum | tu | padėti | — | salotas | ant | — | stalo?", "Žinoma! Ar galėtum padėti salotas ant stalo?"),
    ],
    star: [
      t("Thanks! | You're | a | star.", "Ačiū! | Tu esi | — | {m:šaunuolis|f:šaunuolė}.", "Ačiū! Tu {m:šaunuolis|f:šaunuolė}."),
    ],
    lasagna: [
      t("Thanks! | It's | lasagna. | Nora's | recipe.", "Ačiū! | Tai yra | lazanija. | Noros | receptas.", "Ačiū! Tai lazanija – Noros receptas."),
    ],
    home_thanks: [
      t("Aw, | thank | you! | We | just | painted | the | living room.", "Oi, | ačiū | tau! | Mes | ką tik | nudažėme | — | svetainę.", "Oi, ačiū! Ką tik nudažėme svetainę."),
    ],
    pictures: [
      t("Thanks! | My | sister | painted | them.", "Ačiū! | Mano | sesuo | nutapė | juos.", "Ačiū! Juos nutapė mano sesuo."),
    ],
    dinner_ready: [
      t("Okay, | everyone, | dinner's | ready! | Help yourself!", "Gerai, | visi, | vakarienė yra | paruošta! | Vaišinkis!", "Gerai, visi, vakarienė paruošta! Vaišinkis!"),
      t("Dinner | is | served! | Please, | help yourself!", "Vakarienė | yra | patiekta! | Prašau, | vaišinkis!", "Vakarienė patiekta! Prašom, vaišinkis!"),
    ],
    how_is_it: [
      t("How's | the | lasagna?", "Kaip | — | lazanija?", "Na, kaip lazanija?", { flags: { 0: "“’s” (is) has no separate word: Lithuanian asks kaip lazanija? without a verb." } }),
      t("So... | do | you | like | it?", "Tai... | ar | tau | patinka | tai?", "Tai... ar patinka?", { flags: { 1: "Question “do” = the particle ar." } }),
    ],
    glad_you_like: [
      t("Aw, | I'm | so | glad | you | like | it!", "Oi, | aš | taip | džiaugiuosi, | kad tau | patinka | tai!", "Oi, taip džiaugiuosi, kad patinka!",
        { flags: { 1: "“’m” (am) has no separate word: džiaugiuosi (be glad) is a verb." } }),
      t("Thank | you! | Have | some | more!", "Ačiū | tau! | Imk | — | daugiau!", "Ačiū! Imk daugiau!", { flags: { 3: "Partitive “some”: daugiau needs no separate word." } }),
    ],
    sorry_water: [
      t("Oh, | sorry! | Here, | have | some | water.", "O, | atsiprašau! | Še, | išgerk | — | vandens.", "O, atsiprašau! Še, išgerk vandens.", { flags: { 4: "Partitive: the genitive vandens carries “some”." } }),
    ],
    i_did: [
      t("I | did! | Well, | Nora | made | the | dessert.", "Aš | [pagaminau]! | Na, | Nora | pagamino | — | desertą.", "Pats! Na, desertą pagamino Nora.",
        { flags: { 1: "Elliptical “did”: Lithuanian repeats the verb (pagaminau)." } }),
    ],
    recipe_ok: [
      t("Of course! | I'll text | it | to you.", "Žinoma! | Atsiųsiu | jį | tau.", "Žinoma! Atsiųsiu tau žinute."),
    ],
    here_you_go: [
      t("Sure, | here you go.", "Žinoma, | prašom.", "Žinoma, prašom."),
      t("Here you go!", "Prašom!", "Prašom!"),
    ],
    here_water: [
      t("Sure! | Here's | the | water.", "Žinoma! | Štai | — | vanduo.", "Žinoma! Štai vanduo."),
    ],
    ask_pass: [
      t("Could | you | pass | the | bread, | please?", "Ar galėtum | tu | paduoti | — | duoną, | prašau?", "Ar galėtum paduoti duoną?"),
    ],
    thanks_pass: [
      t("Thanks!", "Ačiū!", "Ačiū!"),
    ],
    burnt: [
      t("Oh | no, | I | think | I | burned | the | garlic | bread!", "O | ne, | aš | manau, | aš | sudeginau | — | česnakinę | duoną!", "O ne, atrodo, sudeginau česnakinę duoną!"),
    ],
    youre_sweet: [
      t("Aw, | you're | sweet.", "Oi, | tu esi | {m:mielas|f:miela}.", "Oi, koks tu {m:mielas|f:miela}."),
    ],
    ask_seconds: [
      t("Would | you | like | some | more?", "Ar | tu | norėtum | — | dar?", "Gal įdėti dar?", { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtum.", 3: "Partitive “some”: dar (more) needs no separate word." } }),
      t("There's | plenty! | More?", "Yra | daug! | Dar?", "Yra daug! Įdėti dar?"),
    ],
    here_more: [
      t("Here | you | go!", "Štai | tau | —!", "Prašom!", { flags: { 2: "“go” (here you go): štai tau hands it over." } }),
    ],
    just_a_little: [
      t("Just | a little. | Here | you | go.", "Tik | truputį. | Štai | tau | —.", "Tik truputį. Prašom.", { flags: { 4: "“go” (here you go): štai tau hands it over." } }),
    ],
    save_room: [
      t("Okay! | Save | room | for dessert!", "Gerai! | Palik | vietos | desertui!", "Gerai! Palik vietos desertui!"),
    ],
    ask_dessert: [
      t("Who's | ready | for dessert? | I | made | chocolate | cake!", "Kas yra | pasiruošęs | desertui? | Aš | iškepiau | šokoladinį | tortą!", "Kas nori deserto? Iškepiau šokoladinį tortą!"),
    ],
    here_cake: [
      t("Here | you | go!", "Štai | tau | —!", "Prašom!", { flags: { 2: "“go” (here you go): štai tau hands it over." } }),
    ],
    small_piece: [
      t("A | small | piece, | coming up!", "— | Mažas | gabalėlis, | tuoj bus!", "Mažas gabalėlis – tuoj bus!"),
    ],
    more_for_dan: [
      t("No | problem! | More | for Dan!", "Jokių | problemų! | Daugiau | Danui!", "Jokių problemų! Danui liks daugiau!"),
    ],
    it_sure_does: [
      t("It | sure | does!", "Tikrai | taip | [bėga]!", "Tikrai bėga!", { flags: { 2: "Elliptical “does”: Lithuanian repeats the verb (bėga, time flies)." } }),
    ],
    // "Look at the time!" / "Where did the time go?"
    i_know: [
      t("I | know!", "Aš | žinau!", "Žinau!"),
    ],
    late: [
      t("Wow, | it's | already | almost | eleven!", "Oho, | yra | jau | beveik | vienuolikta!", "Oho, jau beveik vienuolikta!"),
      t("Wow, | where | did | the | time | go?", "Oho, | kur | — | — | laikas | dingo?", "Oho, kaip greitai prabėgo laikas!", { flags: { 2: "Question “did” has no Lithuanian word (linked to “go”)." } }),
    ],
    anything_else: [
      t("Can | I | get | you | anything | else?", "Ar galiu | aš | paduoti | tau | ką nors | daugiau?", "Gal dar ko nors?"),
      t("More | coffee?", "Dar | kavos?", "Dar kavos?"),
    ],
    stay_longer: [
      t("Already? | Can't | you | stay | a little | longer?", "Jau? | Ar negali | tu | pasilikti | truputį | ilgiau?", "Jau? Negali pasilikti truputį ilgiau?"),
    ],
    yay_stay: [
      t("Yay! | Just | a | little | longer, | then.", "Valio! | Tik | — | truputį | ilgiau, | tada.", "Valio! Tada dar truputį."),
    ],
    but_dinner: [
      t("Already? | But | dinner | is | almost | ready!", "Jau? | Bet | vakarienė | yra | beveik | paruošta!", "Jau? Bet vakarienė beveik paruošta!"),
    ],
    thanks_for_coming: [
      t("Of course! | Thanks | so much | for coming!", "Žinoma! | Ačiū | labai, | kad atėjai!", "Žinoma! Labai ačiū, kad atėjai!"),
      t("Of course. | We're | so | glad | you | came!", "Žinoma. | Mes | taip | džiaugiamės, | kad tu | atėjai!", "Žinoma. Taip džiaugiamės, kad atėjai!",
        { flags: { 1: "“’re” (are) has no separate word: džiaugiamės (be glad) is a verb." } }),
    ],
    anytime_come_again: [
      t("Anytime! | Come | again | soon!", "Visada prašom! | Užsuk | vėl | greitai!", "Visada prašom! Užsuk vėl greitai!"),
    ],
    get_home_safe: [
      t("Get | home | safe!", "Pareik | namo | saugiai!", "Saugiai pareik namo!"),
      t("Good | night! | Get | home | safe!", "Labos | nakties! | Pareik | namo | saugiai!", "Labos nakties! Saugiai pareik!"),
    ],
  },

  hints: {
    door: {
      lt: "Pasisveikinti ir padėkoti už kvietimą",
      items: [
        { id: "gr_thanks_invite", s: t("Thank | you | for | inviting | me!", "Ačiū | jums, | kad | pakvietėte | mane!", "Ačiū, kad mane pakvietėte!"),
          note: "Kalbi abiem šeimininkams, todėl lietuviškai – daugiskaita „jūs“." },
        { id: "gf_for_you", s: t("These | are | for you.", "Tai | yra | jums.", "Čia jums.") },
        { id: "gf_brought", s: t("I | brought | you | some | flowers.", "Aš | atnešiau | jums | — | gėlių.", "Atnešiau jums gėlių.", { flags: { 3: "Partitive: the genitive gėlių carries “some”." } }) },
        { id: "cm_home", s: t("You | have | a | lovely | home!", "Jūs | turite | — | nuostabius | namus!", "Jūsų namai nuostabūs!") },
      ],
    },
    coat: {
      lt: "Padėkoti",
      items: [
        { id: "s_thanks", s: t("Thank | you!", "Ačiū | tau!", "Ačiū!") },
        { id: "gf_for_you", s: t("These | are | for you.", "Tai | yra | jums.", "Čia jums.") },
        { id: "gf_brought", s: t("I | brought | you | some | flowers.", "Aš | atnešiau | jums | — | gėlių.", "Atnešiau jums gėlių.", { flags: { 3: "Partitive: the genitive gėlių carries “some”." } }) },
      ],
    },
    gift: {
      lt: "Įteikti dovanėlę", slot: "gift", examples: ["flowers", "wine", "chocolates", "cake"],
      items: [
        { id: "gf_for_you", s: t("These | are | for you.", "Tai | yra | jums.", "Čia jums.") },
        { id: "gf_brought", s: t("I | brought | you | {X.np}.", "Aš | atnešiau | jums | {X.np:acc}.", "Atnešiau jums {X.np:acc}.") },
        { id: "gf_short", s: t("Here's | a | little | something | for you.", "Štai | — | maža | dovanėlė | jums.", "Štai jums mažytė dovanėlė.",
          { flags: { 3: "“something” here is a small gift: dovanėlė." } }) },
      ],
    },
    drinks: {
      lt: "Pasirinkti gėrimą", slot: "drink", examples: ["water", "red_wine", "lemonade", "beer"],
      items: [
        { id: "dr_just", s: t("{X.np}, | please.", "{X.np:acc}, | prašau.", "{X.np:acc}, prašau.") },
        { id: "dr_have", s: t("I'll have | {X.np}, | thanks.", "Imsiu | {X.np:acc}, | ačiū.", "Imsiu {X.np:acc}, ačiū.") },
        { id: "dr_nothing", s: t("I'm | fine | for now, | thanks.", "Man | gerai | kol kas, | ačiū.", "Kol kas nieko, ačiū.") },
        { id: "dr_just", s: t("Just | some | {X}, | please.", "Tik | — | {X:gen}, | prašau.", "Tik {X:gen}, prašau.", { flags: { 1: "Partitive: the genitive carries “some”." } }), only: (e) => e.art === "" || e.art === "some" },
        { id: "dr_would_be", s: t("I | think | {X.np} | would be | great.", "Aš | manau, | {X.np:nom} | būtų | puiku.", "Manau, {X.np:nom} būtų puiku.") },
      ],
    },
    help: {
      lt: "Pasiūlyti pagalbą",
      items: [
        { id: "hp_can_i", s: t("Can | I | help | with | anything?", "Ar galiu | aš | padėti | su | kuo nors?", "Ar galiu kuo nors padėti?") },
        { id: "hp_anything", s: t("Is | there | anything | I | can | do?", "Ar yra | — | kas nors, | ką | galiu | padaryti?", "Gal galiu kuo nors padėti?",
          { flags: { 1: "Existential “there”: ar yra already carries it.", 3: "“I”: Lithuanian adds the relative ką (that) before galiu; aš is left out." } }) },
        { id: "hp_let_me", s: t("Let | me | help | you | with | the | dishes.", "Leisk | man | padėti | tau | su | — | indais.", "Leisk padėti suplauti indus.") },
      ],
    },
    food: {
      lt: "Pagirti maistą",
      items: [
        { id: "cm_delicious", s: t("This | is | delicious!", "Tai | yra | labai skanu!", "Labai skanu!") },
        { id: "cm_so_good", s: t("Mmm, | so | good!", "Mmm, | taip | skanu!", "Mmm, kaip skanu!") },
        { id: "cm_cook", s: t("You're | a | great | cook!", "Tu esi | — | {sm:puikus|sf:puiki} | {sm:virėjas|sf:virėja}!", "Tu {sm:puikus virėjas|sf:puiki virėja}!") },
      ],
    },
    compliments: {
      lt: "Pagirti namus ir maistą",
      items: [
        { id: "cm_smells", s: t("Something | smells | amazing!", "Kažkas | kvepia | nuostabiai!", "Kažkas nuostabiai kvepia!") },
        { id: "cm_home", s: t("You | have | a | lovely | home!", "Jūs | turite | — | nuostabius | namus!", "Jūsų namai nuostabūs!") },
        { id: "cm_made", s: t("Did | you | make | this | yourself?", "Ar | tu | pagaminai | tai | {sm:pats|sf:pati}?", "Ar {sm:pats|sf:pati} tai pagaminai?",
          { flags: { 0: "Question “Did” = the particle ar; the past tense sits on pagaminai." } }) },
        { id: "cm_recipe", s: t("Can | I | have | the | recipe?", "Ar galiu | aš | gauti | — | receptą?", "Ar galėčiau gauti receptą?") },
      ],
    },
    table: {
      lt: "Paprašyti paduoti", slot: "pass", examples: ["salt", "bread", "pepper", "salad"],
      items: [
        { id: "ps_could_you", s: t("Could | you | pass | the | {X}, | please?", "Ar galėtum | tu | paduoti | — | {X:acc}, | prašau?", "Ar galėtum paduoti {X:acc}?") },
        { id: "ps_can_i", s: t("Can | I | have | the | {X}, | please?", "Ar galiu | aš | gauti | — | {X:acc}, | prašau?", "Ar galiu gauti {X:acc}?") },
      ],
    },
    more: {
      lt: "Atsakyti, ar dar norėsi",
      items: [
        { id: "mo_little", s: t("Just | a little, | please.", "Tik | truputį, | prašau.", "Tik truputį, prašau.") },
        { id: "mo_full", s: t("I'm | full, | thanks. | It | was | delicious!", "Aš esu | {m:sotus|f:soti}, | ačiū. | Tai | buvo | labai skanu!", "Esu {m:sotus|f:soti}, ačiū. Buvo labai skanu!") },
        { id: "mo_love", s: t("Yes, | I'd love | some!", "Taip, | labai norėčiau | —!", "Taip, labai norėčiau!", { flags: { 2: "Partitive “some”: norėčiau needs no separate object here." } }) },
        { id: "mo_bite", s: t("I | couldn't eat | another | bite!", "Aš | nebegalėčiau suvalgyti | nė vieno | kąsnio!", "Nebegalėčiau suvalgyti nė kąsnio!",
          { flags: { 2: "Negative concord: another → nė vieno after the negated verb; kąsnio is genitive." } }) },
      ],
    },
    dessert: {
      lt: "Atsakyti dėl deserto",
      items: [
        { id: "mo_small", s: t("A | small | piece, | please.", "— | Mažą | gabalėlį, | prašau.", "Mažą gabalėlį, prašau.") },
        { id: "mo_love", s: t("Yes, | I'd love | some!", "Taip, | labai norėčiau | —!", "Taip, labai norėčiau!", { flags: { 2: "Partitive “some”: norėčiau needs no separate object here." } }) },
        { id: "mo_bite", s: t("I | couldn't eat | another | bite!", "Aš | nebegalėčiau suvalgyti | nė vieno | kąsnio!", "Nebegalėčiau suvalgyti nė kąsnio!",
          { flags: { 2: "Negative concord: another → nė vieno after the negated verb; kąsnio is genitive." } }) },
      ],
    },
    salad_yes: {
      lt: "Sutikti padėti",
      items: [
        { id: "ag_sure", s: t("Sure!", "Žinoma!", "Žinoma!") },
        { id: "ag_of_course", s: t("Of course!", "Žinoma!", "Žinoma!") },
        { id: "ag_happy", s: t("Happy | to help!", "Mielai | padėsiu!", "Mielai padėsiu!", { flags: { 1: "“to help”: Lithuanian uses the future padėsiu (I'll help) after mielai." } }) },
      ],
    },
    pass_bread: {
      lt: "Paduoti duoną",
      items: [
        { id: "ps_here", s: t("Sure, | here you go!", "Žinoma, | prašom!", "Žinoma, prašom!") },
        { id: "ps_here", s: t("Here you are!", "Prašom!", "Prašom!") },
      ],
    },
    burnt: {
      lt: "Nuraminti šeimininkę",
      items: [
        { id: "tw_dont_worry", s: t("Don't worry, | it's | fine!", "Nesijaudink, | tai yra | gerai!", "Nesijaudink, viskas gerai!") },
        { id: "tw_still_good", s: t("It's | still | delicious!", "Tai yra | vis tiek | labai skanu!", "Vis tiek labai skanu!") },
      ],
    },
    diet: {
      lt: "Pasakyti, ar ko nors nevalgai",
      items: [
        { id: "dt_all", s: t("No, | I | eat | everything!", "Ne, | aš | valgau | viską!", "Ne, valgau viską!") },
        { id: "dt_veg", s: t("I'm | a | vegetarian.", "Aš esu | — | {m:vegetaras|f:vegetarė}.", "Esu {m:vegetaras|f:vegetarė}.") },
        { id: "dt_allergic", s: t("I'm | allergic | to nuts.", "Aš esu | {m:alergiškas|f:alergiška} | riešutams.", "Esu {m:alergiškas|f:alergiška} riešutams.") },
      ],
    },
    cat: {
      lt: "Atsakyti apie alergiją katėms",
      items: [
        { id: "ct_love", s: t("No, | I | love | cats!", "Ne, | aš | dievinu | kates!", "Ne, dievinu kates!") },
        { id: "ct_not_at_all", s: t("No, | not | at all.", "Ne, | visai | ne.", "Ne, visai ne.") },
        { id: "ct_allergic", s: t("I'm | a little | allergic, | actually.", "Aš esu | truputį | {m:alergiškas|f:alergiška}, | tiesą sakant.", "Tiesą sakant, esu truputį {m:alergiškas|f:alergiška}.") },
      ],
    },
    stay: {
      lt: "Mandagiai atsisakyti",
      items: [
        { id: "lv_work", s: t("I'd love to, | but | I | have | work | tomorrow.", "Mielai, | bet | aš | turiu | darbo | rytoj.", "Mielai, bet rytoj dirbu.") },
        { id: "lv_really", s: t("Sorry, | I | really | have | to go.", "Atsiprašau, | aš | tikrai | turiu | eiti.", "Atsiprašau, tikrai turiu eiti.") },
        { id: "st_ok", s: t("Okay, | just | a little | longer!", "Gerai, | tik | truputį | ilgiau!", "Gerai, dar truputį!") },
      ],
    },
    leave: {
      lt: "Pasakyti, kad laikas eiti",
      items: [
        { id: "lv_should", s: t("I | should | get going.", "Man | reikėtų | eiti.", "Man jau reikėtų eiti.") },
        { id: "lv_late", s: t("It's getting | late.", "Darosi | vėlu.", "Jau vėlu.") },
        { id: "lv_work_tmrw", s: t("I | have | work | tomorrow.", "Aš | turiu | darbo | rytoj.", "Rytoj dirbu.") },
      ],
    },
    goodbye: {
      lt: "Padėkoti ir atsisveikinti",
      items: [
        { id: "gb_having_me", s: t("Thanks | for | having | me!", "Ačiū, | kad | pakvietėte | mane!", "Ačiū, kad pakvietėte!"), note: "Taip dėkojama šeimininkams, išeinant iš svečių." },
        { id: "gb_lovely", s: t("Thank | you | for | a | lovely | evening!", "Ačiū | jums | už | — | nuostabų | vakarą!", "Ačiū už nuostabų vakarą!") },
        { id: "gb_everything", s: t("Thanks | for | everything!", "Ačiū | už | viską!", "Ačiū už viską!") },
        { id: "s_bye2", s: t("Good | night!", "Labos | nakties!", "Labos nakties!") },
      ],
    },
  },

  tips: {
    weak_praise: { key: "weak_praise", lt: "Suprasta! „It's okay“ skamba gana šaltai – šeimininkams maloniau išgirsti „It's delicious!“", better: "It's delicious!" },
    uk_go_on: { key: "uk_go_on", lt: "Suprasta! „Oh, go on then“ – britiškas posakis. Amerikoje dažniau: „Maybe just a little!“", better: "Maybe just a little!" },
  },

  merges: {
    "made it": { reason: "lexical_expression", split: "made → padarei + it → tai is false; arriving somewhere = atvykai.", minimal: "Two words." },
    "make it": { reason: "lexical_expression", split: "make → padaryti + it → tai is false; managing to come = atvykti.", minimal: "Two words." },
    "come on in": { reason: "lexical_expression", split: "come → ateik, on → ant, in → į: an invitation to enter = užeik.", minimal: "Three words, one invitation." },
    "shouldn't have": { reason: "grammatical_fusion", split: "shouldn't → neturėtum + have → turėti: the elliptical perfect “you shouldn't have (done it)” = nereikėjo.", minimal: "Two words." },
    "make yourself at home": { reason: "lexical_expression", split: "make → daryk, yourself → save, at → —, home → namie is a calque; the welcome = jauskis kaip namie.", minimal: "The whole formula." },
    "help yourself": { reason: "lexical_expression", split: "help → padėk + yourself → sau is false; at the table = vaišinkis.", minimal: "Two words." },
    "living room": { reason: "lexical_expression", split: "living → gyvenamasis + room → kambarys is a room, not the room's name; = svetainė.", minimal: "A compound noun." },
    "get going": { reason: "lexical_expression", split: "get → gauti + going → einantis is false; leaving = eiti.", minimal: "Two words." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives “small”; the degree/amount = truputį.", minimal: "Two words." },
    "sure thing": { reason: "lexical_expression", split: "sure → tikras + thing → daiktas is false; agreeing = žinoma.", minimal: "Two words." },
    "coming up": { reason: "lexical_expression", split: "coming → ateinantis + up → aukštyn is false; a service promise = tuoj bus.", minimal: "Two words." },
    "here you are": { reason: "lexical_expression", split: "here → čia, you → tu, are → esi is false; handing something over = prašom (as “here you go”).", minimal: "The whole formula." },
    "would be": { reason: "grammatical_fusion", split: "would → — (no word) + be → būti: the conditional būtų carries both.", minimal: "Two words." },
    "i'd love to": { reason: "lexical_expression", split: "I'd → aš norėčiau, love → mylėti, to → į: the elliptical infinitive has no word for “to”; = mielai.", minimal: "The reply." },
    "i'd love": { reason: "grammatical_fusion", split: "I'd → aš drops “would”; the conditional labai norėčiau carries would + love.", minimal: "The object stays outside." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Padėkok už kvietimą", done: (c) => !!c.s.thanked },
    { lt: "Įteik dovanėlę", optional: true, when: (c) => (!c.s.dinnerSaid || !!c.s.gift) && !c.s.goalMet, done: (c) => !!c.s.gift },
    // shown from the start; if the guest leaves before choosing, the item simply drops out
    { step: "drink", lt: "Pasirink gėrimą", optional: true, when: (c) => !c.s.goalMet },
    { lt: "Pagirk maistą", done: (c) => !!c.s.foodPraised },
    { lt: "Pasakyk, kad laikas eiti", done: (c) => !!c.s.leaving },
  ],
  steps: [
    { id: "arrive", done: (c) => !!c.s.greeted,
      ask: (c) => { if (c.s.skipAsk) { c.s.skipAsk = false; return; } dan(c, "door_dan"); },
      expects: ["thanks_invite", "gift", "late_sorry"],
      suggest: [{ lt: "Pasisveikinti ir padėkoti už kvietimą", hint: "door" }, { lt: "Įteikti dovanėlę", hint: "gift", options: "gift" }] },
    { id: "coat", done: (c) => !!c.s.coatSaid,
      ask: (c) => { c.s.coatSaid = true; dan(c, "coat"); },
      expects: ["gift", "thanks_invite"],
      suggest: [{ lt: "Padėkoti", hint: "coat" }, { lt: "Įteikti dovanėlę", hint: "gift", options: "gift" }] },
    { id: "diet", when: (c) => !!c.s.dietTwist, done: (c) => !!c.s.diet || asked(c, "diet") >= 2,
      ask: (c) => { bump(c, "diet"); c.twist("diet"); dan(c, "ask_diet"); },
      expects: ["diet_ok_ctx", "diet_veg_ctx", "diet_allergy_ctx"],
      suggest: [{ lt: "Pasakyti, ar ko nors nevalgai", hint: "diet" }],
      no: (c) => { c.s.diet = "all"; dan(c, "diet_great"); } },
    { id: "drink", done: (c) => !!c.s.drink || asked(c, "drink") >= 2,
      ask: (c) => { bump(c, "drink"); dan(c, c.s.listed ? "what_can_i_get" : "ask_drink"); },
      expects: ["drink_ans", "no_drink", "ask_drinks"],
      suggest: [{ lt: "Pasirinkti gėrimą", hint: "drinks", options: "drink" }],
      yes: (c) => { dan(c, "drink_list"); }, no: (c) => { c.s.drink = "none"; dan(c, "just_say"); } },
    { id: "cat", when: (c) => !!c.s.catTwist, done: (c) => !!c.s.cat || asked(c, "cat") >= 2,
      ask: (c) => { bump(c, "cat"); c.twist("cat"); dan(c, "cat_intro"); },
      expects: ["cat_ok_ctx", "cat_allergic_ctx"],
      suggest: [{ lt: "Atsakyti apie alergiją katėms", hint: "cat" }],
      yes: (c) => { c.s.cat = "allergic"; dan(c, "cat_away"); }, no: (c) => { c.s.cat = "ok"; dan(c, "cat_good"); } },
    { id: "salad", when: (c) => !!c.s.saladAsked, done: (c) => !!c.s.saladDone || asked(c, "salad") >= 2,
      ask: (c) => { bump(c, "salad"); nora(c, "salad_task"); },
      expects: ["here_you_go", "agree"],
      suggest: [{ lt: "Sutikti padėti", hint: "salad_yes" }],
      yes: (c) => { c.s.saladDone = true; nora(c, "star"); }, no: (c) => { c.s.saladDone = true; nora(c, "relax"); } },
    { id: "ready_soon", done: (c) => !!c.s.readySaid,
      ask: (c) => { c.s.readySaid = true; nora(c, "almost_ready"); },
      expects: ["offer_help", "praise_home", "praise_smell"],
      suggest: [{ lt: "Pasiūlyti pagalbą", hint: "help" }, { lt: "Pagirti namus ar kvapą", hint: "compliments" }] },
    { id: "dinner", done: (c) => !!c.s.dinnerSaid,
      ask: (c) => { c.s.dinnerSaid = true; dan(c, "dinner_ready"); },
      expects: ["praise_food", "praise_smell", "pass"],
      suggest: [{ lt: "Pagirti maistą", hint: "food" }, { lt: "Paprašyti ką nors paduoti", hint: "table", options: "pass" }] },
    { id: "pass", when: (c) => !!c.s.passTwist, done: (c) => !!c.s.passDone || asked(c, "pass") >= 2,
      ask: (c) => { bump(c, "pass"); c.twist("pass_bread"); dan(c, "ask_pass"); },
      expects: ["here_you_go"],
      suggest: [{ lt: "Paduoti duoną", hint: "pass_bread" }],
      yes: (c) => { c.s.passDone = true; dan(c, "thanks_pass"); } },
    { id: "burnt", when: (c) => !!c.s.burntTwist, done: (c) => !!c.s.burntSaid,
      ask: (c) => { c.s.burntSaid = true; c.twist("burnt_bread"); nora(c, "burnt"); },
      expects: ["reassure"],
      suggest: [{ lt: "Nuraminti šeimininkę", hint: "burnt" }] },
    { id: "howisit", when: (c) => !c.s.foodPraised, done: (c) => !!c.s.foodPraised,
      ask: (c) => { bump(c, "howisit"); if (c.chance(0.5)) nora(c, "how_is_it"); else dan(c, "how_is_it"); },
      expects: ["praise_food", "food_meh", "made_yourself"],
      suggest: [{ lt: "Pagirti maistą", hint: "food" }],
      yes: (c) => { c.s.foodPraised = true; nora(c, "glad_you_like"); } },
    { id: "seconds", when: (c) => !!c.s.askSeconds, done: (c) => c.s.seconds !== undefined || asked(c, "seconds") >= 2,
      ask: (c) => { bump(c, "seconds"); nora(c, "ask_seconds"); },
      expects: ["more_yes", "more_no"],
      suggest: [{ lt: "Atsakyti, ar dar norėsi", hint: "more" }],
      yes: (c) => { c.s.seconds = "yes"; nora(c, "here_more"); }, no: (c) => { c.s.seconds = "no"; nora(c, "save_room"); } },
    { id: "dessert", when: (c) => !!c.s.askDessert, done: (c) => c.s.dessert !== undefined || asked(c, "dessert") >= 2,
      ask: (c) => { bump(c, "dessert"); c.s.dessertAsked = true; nora(c, "ask_dessert"); },
      expects: ["more_yes", "more_no"],
      suggest: [{ lt: "Atsakyti dėl deserto", hint: "dessert" }],
      yes: (c) => { c.s.dessert = "yes"; nora(c, "here_cake"); }, no: (c) => { c.s.dessert = "no"; nora(c, "more_for_dan"); } },
    { id: "late", when: (c) => !c.s.leaving, done: (c) => !!c.s.lateSaid,
      ask: (c) => { c.s.lateSaid = true; dan(c, "late"); },
      expects: ["leave", "thanks_end"],
      suggest: [{ lt: "Pasakyti, kad laikas eiti", hint: "leave" }, { lt: "Padėkoti už vakarą", hint: "goodbye" }] },
    { id: "leave", when: (c) => !c.s.leaving, done: (c) => !!c.s.leaving,
      ask: (c) => { bump(c, "leave"); dan(c, "anything_else"); },
      expects: ["leave", "thanks_end", "no_drink"],
      suggest: [{ lt: "Pasakyti, kad laikas eiti", hint: "leave" }, { lt: "Padėkoti už vakarą", hint: "goodbye" }],
      no: (c) => { if (asked(c, "leave") >= 2) H.leave(c, {}, { intent: "leave", slots: {}, tags: [] }); } },
  ],

  init: (c) => {
    c.s.askSeconds = c.chance(0.7);
    c.s.askDessert = c.chance(0.6);
    c.s.saladTask = c.chance(0.4);
    c.s.catTwist = c.chance(0.3);
    c.s.passTwist = c.visits >= 1 && c.chance(0.45);
    c.s.burntTwist = c.visits >= 1 && c.chance(0.35);
    c.s.stayTwist = c.visits >= 1 && c.chance(0.45);
    c.s.dietTwist = c.visits >= 2 && c.chance(0.4);
  },

  start: (c) => {
    dan(c, "door_dan");
    nora(c, "door_nora");
    c.s.skipAsk = true;
  },

  handlers: H,

  finish: (c) => {
    // Every step is done only once the guest is leaving; the closing pending ends the visit.
    if (!c.s.leaving) letGo(c);
  },

  tests: [
    { say: "Thank you for inviting me!", intent: "thanks_invite", step: "arrive" },
    { say: "Hi Dan! Thanks so much for having me", intent: "thanks_invite", step: "arrive" },
    { say: "These are for you", intent: "gift", step: "coat" },
    { say: "I brought you some flowers", intent: "gift", step: "coat", slots: { gift: "flowers" } },
    { say: "Here's a bottle of wine for you", intent: "gift", slots: { gift: "wine" } },
    { say: "Just some water, please", intent: "drink_ans", step: "drink", slots: { drink: "water" } },
    { say: "A glass of red wine would be great", intent: "drink_ans", step: "drink", slots: { drink: "red_wine" } },
    { say: "I'm fine for now, thanks", intent: "no_drink", step: "drink", not: ["drink_ans"] },
    { say: "What do you have?", intent: "ask_drinks", step: "drink" },
    { say: "Can I help with anything?", intent: "offer_help" },
    { say: "Is there anything I can do to help?", intent: "offer_help" },
    { say: "Something smells amazing!", intent: "praise_smell" },
    { say: "You have a lovely home!", intent: "praise_home" },
    { say: "I love the pictures on the wall", intent: "praise_home" },
    { say: "This is delicious!", intent: "praise_food", step: "howisit" },
    { say: "Mmm, so good!", intent: "praise_food", step: "howisit" },
    { say: "You're a great cook", intent: "praise_food" },
    { say: "It's a little spicy", intent: "food_meh", step: "howisit", not: ["praise_food"] },
    { say: "Did you make this yourself?", intent: "made_yourself" },
    { say: "Can I have the recipe?", intent: "recipe" },
    { say: "Could you pass the salt, please?", intent: "pass", slots: { pass: "salt" } },
    { say: "Pass the pepper", intent: "pass", slots: { pass: "pepper" } },
    { say: "Sure, here you go!", intent: "here_you_go", step: "pass" },
    { say: "Just a little, please", intent: "more_yes", step: "seconds" },
    { say: "I'm full, thanks", intent: "more_no", step: "seconds", not: ["more_yes"] },
    { say: "No, I'm good, thanks", intent: "more_no", step: "seconds", not: ["g_howareyou_answer"] },
    { say: "I couldn't eat another bite", intent: "more_no", step: "dessert" },
    { say: "Oh, go on then", intent: "more_yes", step: "seconds" },
    { say: "I'm a vegetarian", intent: "diet_veg_ctx", step: "diet" },
    { say: "No, I eat everything", intent: "diet_ok_ctx", step: "diet" },
    { say: "I'm allergic to nuts", intent: "diet_allergy_ctx", step: "diet" },
    { say: "No, I love cats!", intent: "cat_ok_ctx", step: "cat", not: ["cat_allergic_ctx"] },
    { say: "I'm not allergic", intent: "cat_ok_ctx", step: "cat", not: ["cat_allergic_ctx"] },
    { say: "I'm a little allergic, actually", intent: "cat_allergic_ctx", step: "cat" },
    { say: "Don't worry, it's still delicious!", intent: "reassure", step: "burnt" },
    { say: "I should get going", intent: "leave", step: "late" },
    { say: "It's getting late, I should go", intent: "leave", step: "leave" },
    { say: "I don't want to go", intent: "none", not: ["leave"] },
    { say: "Thanks for having me!", intent: "thanks_invite" },
    { say: "Hi! Nice to see you!", intent: "greet_back", step: "arrive", not: ["thanks_invite"] },
    { say: "Here, this is for you. It's a bottle of wine.", intent: "gift" },
    { say: "Oh no, look at the time!", intent: "time_flies" },
    { say: "I have to work early tomorrow.", intent: "leave" },
    { say: "Thanks again for a wonderful evening!", intent: "thanks_end" },
    { say: "Thank you for a lovely evening", intent: "thanks_end" },
    { say: "the television is swimming in soup", intent: "none" },
    { say: "Purple tractor", intent: "none" },
    // wider phrasing (learner English and natural alternatives)
    { say: "Hi! Sorry I'm a little late", intent: "late_sorry", step: "arrive" },
    { say: "Thank you for your invitation", intent: "thanks_invite" },
    { say: "Thanks that you invited me", intent: "thanks_invite" },
    { say: "I made cookies for you", intent: "gift", slots: { gift: "cookies" } },
    { say: "Just water for me, I'm driving", intent: "drink_ans", step: "drink", slots: { drink: "water" } },
    { say: "Do you have tea?", intent: "drink_ans", step: "drink", slots: { drink: "tea" } },
    { say: "I'm lactose intolerant", intent: "diet_allergy_ctx", step: "diet" },
    { say: "Hello, Mittens!", intent: "cat_ok_ctx", step: "cat" },
    { say: "Should I set the table?", intent: "offer_help" },
    { say: "Mmm, what are you cooking?", intent: "praise_smell" },
    { say: "This looks delicious!", intent: "praise_food" },
    { say: "Can you give me the bread, please?", intent: "pass", slots: { pass: "bread" } },
    { say: "It still smells great", intent: "reassure", step: "burnt" },
    { say: "No, I'm on a diet", intent: "more_no", step: "seconds" },
    { say: "I always have room for dessert", intent: "more_yes", step: "dessert" },
    { say: "I have to get up early tomorrow", intent: "leave", step: "late" },
    { say: "Can I call a taxi?", intent: "leave" },
    // meaning must not flip
    { say: "It's good, but a little salty", intent: "food_meh", step: "howisit", not: ["praise_food"] },
    { say: "I'm not full yet", intent: "more_yes", step: "seconds", not: ["more_no"] },
    { say: "Maybe later", intent: "more_no", step: "dessert", not: ["more_yes"] },
    { say: "No cake for me, thanks", intent: "more_no", step: "dessert", not: ["more_yes"] },
    { say: "I don't eat fish, but everything else is fine", intent: "diet_veg_ctx", step: "diet", not: ["diet_ok_ctx"] },
    { say: "Yes, please!", intent: "yn:yes", step: "seconds", not: ["more_no"] },
  ],

  sims: [
    { name: "perfect guest", turns: [
      "Hi! Thank you for inviting me!", "These are for you", "A glass of red wine would be great", "Can I help with anything?", "Something smells amazing!",
      "This is delicious!", "I should get going", "Thanks for having me! Good night!",
    ], expect: { complete: true }, auto: AUTO },
    { name: "quiet guest, short answers", turns: [
      "Hi!", "Thanks!", "Water, please", "Mmm, so good!", "I'm full, thanks", "It's getting late", "Thank you for a lovely evening", "Bye!",
    ], expect: { complete: true }, auto: AUTO },
    { name: "chatty guest", turns: [
      "Hi Dan, hi Nora! I brought you some chocolates", "What do you have?", "Just some juice, please", "You have a lovely home!", "Could you pass the salt, please?",
      "You're a great cook! Did you make this yourself?", "Can I have the recipe?", "Well, I should get going. I have work tomorrow", "Thanks for everything!",
    ], expect: { complete: true }, auto: AUTO },
  ],
};

export default dinner;
