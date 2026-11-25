// Every conversation's own icon: what the situation is about, at a glance, beside its title (the task card, the
// lists, the map, the phone). One style throughout: Lucide's line icons (ISC license, docs/licenses/lucide.txt), drawn
// with this game's stroke. The names are Lucide's; their shapes are in src/ui/situationIconNodes.gen.ts, written by
// tools/situation-icons.mjs from this list. Both towns' conversations are here (the same file in both editions), so a
// conversation keeps its icon wherever it appears.
export const SITUATION_ICONS: Record<string, string> = {
  // the airport
  "s64a-checkin": "tickets-plane",       // checking in: the boarding pass
  "s64b-security": "laptop",             // security: laptops out
  "s64c-gate": "plane-takeoff",          // the gate, boarding
  "s65a-passport": "book-user",          // passport control
  "s65b-baggage": "luggage",             // the bag that didn't arrive
  // getting around
  "s66-taxi": "car-taxi-front",
  "s67a-tickets": "ticket",
  "s67b-bus": "bus",
  "s71a-rental": "key-round",            // the rental car's key
  "s71b-gas": "fuel",
  "p25-used-car": "car",                 // the convertible for sale
  // a place to stay, the town
  "s68-hotel": "concierge-bell",
  "s62-visitor-center": "signpost",      // a map and the way
  "s69-local": "thumbs-up",              // a local's recommendations
  "s70-museum": "landmark",
  "s33-small-talk": "cloud-sun",         // the weather, at the bus stop
  "s86-old-friend": "users-round",
  "s91a-lost-wallet": "wallet",
  "s91b-police": "siren",
  // eating and shopping
  "s72-cafe": "coffee",
  "s73-restaurant": "utensils",
  "s32-supermarket": "shopping-cart",
  "s32-mercado": "shopping-basket",
  "s74-clothes": "shirt",
  "s75-pharmacy": "pill",
  "s77-salon": "scissors",
  "s78-bank": "credit-card",             // the card the ATM kept
  "s79-post": "package",
  "x05-tienda": "cup-soda",              // a coffee and a snack for the road
  // health and sport
  "s31-doctor": "stethoscope",
  "s35-gym": "dumbbell",
  // home and friends
  "s81-apartment": "door-open",          // viewing an apartment
  "s82-neighbor": "volume-2",            // the noise
  "p29-landlord": "wrench",              // getting it repaired
  "s63-party": "party-popper",
  "s84-date": "heart",
  "s85-dinner": "wine",                  // a guest at dinner
  "p30-start-over": "heart-handshake",   // making up
  // work
  "s87-interview": "briefcase-business",
  "s88-first-day": "id-card-lanyard",    // the first day's badge
  "s34-meeting": "presentation",
  "p27-meeting": "scale",                // disagreeing, and a compromise
  "p28b-review": "clipboard-check",      // the year's review
  "p28-kitchen": "chef-hat",
  "p18-startup": "rocket",
  // on the phone
  "s76-dentist-call": "calendar-plus",   // booking a visit
  "s80-support-call": "wifi-off",        // the internet is down
  "s83-invite-call": "calendar-heart",   // free on Friday?
  "s89-video-call": "mic-off",           // you're on mute
  "s90-running-late": "alarm-clock",
  "p24-flood": "droplets",
  "p26-complaint": "message-square-exclamation-point",
  // Puerto Colibrí's own
  "x01-surf": "waves-horizontal",
  "x02-alux-kin": "flame",               // the grotto's keeper, by torchlight
  "x03-alux-nikte": "puzzle",            // her riddles
  "x04-yaxche": "tree-deciduous",        // the great tree
  "x06-custodio": "pyramid",             // the Temple of the Sea
  "x07-pintora": "palette",
  "x08-rosario": "umbrella",             // in the shade
  "x09-alberca": "waves-ladder",         // the hotel pool
  "x10-loteria": "grid-3x3",             // the lotería board
  "x11-billar": "circle-dot",            // pool at Cantina La Buchaca
  // Maple Harbor's own
  "x02-photo-walk": "camera",          // Hana’s photo book
  "x03-ask-the-way": "route",          // Earl’s directions
  "x01-pool-hall": "circle-dot",         // pool at The Corner Pocket
  "x04-surf": "waves-horizontal",
  "x05-lighthouse-keeper": "flame",
  "x06-bram": "mountain",                // Bram on the gray path under the slate cliffs (the keeper has the flame)
  "x07-fern": "puzzle",
  "x08-old-oak": "tree-deciduous",
};
