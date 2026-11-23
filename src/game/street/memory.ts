export interface StreetMeeting {
  seen: number;
  helped: number;
  last?: string;
  cast?: Record<string, number>;
  helpedCast?: string;
  helpedDay?: string;
}

export interface StreetMemory {
  moments: Record<string, StreetMeeting>;
  bag: string[];
  chatterBag: string[];
  sessions?: number;
}

export function emptyStreet(): StreetMemory {
  return { moments: {}, bag: [], chatterBag: [] };
}

export function localStreetDay(now: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function meeting(memory: StreetMemory, id: string): StreetMeeting {
  return Object.hasOwn(memory.moments, id) ? memory.moments[id] : (memory.moments[id] = { seen: 0, helped: 0 });
}

export function recordStart(memory: StreetMemory, id: string, cast: string, day: string, bag: string[]) {
  const entry = meeting(memory, id);
  entry.seen++;
  entry.last = day;
  entry.cast ??= {};
  entry.cast[cast] = (entry.cast[cast] ?? 0) + 1;
  memory.bag = bag.filter((item) => item !== id);
}

export function recordHelp(memory: StreetMemory, id: string, cast: string, day: string) {
  const entry = meeting(memory, id);
  entry.helped++;
  entry.helpedCast = cast;
  entry.helpedDay = day;
}
