// What passers-by say when you click on them (townspeople without a conversation of their own).
// Pre-generated in two voices by tools/build-audio.ts.
export const AMBIENT_VOICES = { f: "af_river", m: "am_adam" } as const;

export const AMBIENT_LINES: { en: string; lt: string }[] = [
  { en: "Hi there!", lt: "Labas!" },
  { en: "Hey, how's it going?", lt: "Sveiki, kaip sekasi?" },
  { en: "Beautiful day, isn't it?", lt: "Graži diena, ar ne?" },
  { en: "Welcome to Maple Harbor!", lt: "Sveiki atvykę į Maple Harborą!" },
  { en: "Have a good one!", lt: "Geros dienos!" },
  { en: "Sorry, I'm in a bit of a hurry!", lt: "Atsiprašau, šiek tiek skubu!" },
  { en: "Enjoy your stay!", lt: "Malonios viešnagės!" },
];

/** What staff with no conversation of their own say when talked to (roomPeople.ts `says`), in the passers-by's voice of
 *  their gender: a friendly line that points to where the talking is. */
export const STAFF_LINES: Record<string, { en: string; lt: string; female?: boolean }> = {
  lighthouse_keeper: { en: "Not many visitors make it out here. Enjoy the view!", lt: "Nedaug kas atplaukia iki čia. Pasigrožėkite vaizdu!", female: false },
  lighthouse_keeper_2: { en: "Watch your step on the rocks. They get slippery!", lt: "Atsargiai ant akmenų – jie slidūs!", female: false },
  // the airport's coffee stand by the gate (roomPeople.ts): its barista sends you to Mia at Sunny Cup (s72)
  airport_coffee: { en: "Sorry, we're closed for cleaning! For a good coffee, try Sunny Cup in town.", lt: "Atsiprašau, uždaryta – valome! Gerą kavą rasite „Sunny Cup“ kavinėje mieste." },
};

/** What the vendors standing behind market stalls say when clicked (theme.ts `vendors`): none in Maple Harbor. */
export const VENDOR_LINES: { en: string; lt: string }[] = [];
