import type { HudState } from "../../state/store";
import type { Interior } from "../world/interiors";
import type { CaveQuest } from "./quest";

type Point = { x: number; z: number };
type CavePrompt = {
  kind: "exit" | "tree" | "glyph";
  id: string;
  label: string;
  prompt: NonNullable<HudState["prompt"]>;
};

export function createCavePrompts(quest: CaveQuest, exits: NonNullable<Interior["wild"]>["exits"],
  exitLabel: string, leaveLabel: string, stoneLabel: { en: string; lt: string }, treeLabel: string) {
  const exitPrompts = exits.map(({ id }): CavePrompt =>
    ({ kind: "exit", id, label: exitLabel, prompt: { kind: "exit", label: exitLabel, lt: leaveLabel } }));
  const tree: CavePrompt = {
    kind: "tree", id: quest.rules.config.treeNpc, label: treeLabel, prompt: { kind: "talk", label: treeLabel },
  };
  const stone: CavePrompt["prompt"] = { label: stoneLabel.en, lt: stoneLabel.lt, kind: "listen" };
  const glyphs = new Map(quest.rules.sites.map(({ stone: { id } }): [string, CavePrompt] =>
    [id, { kind: "glyph", id, label: stone.label, prompt: stone }]));

  return (at: Point, nearestDistance: number, occupied: boolean) => {
    let best: CavePrompt | undefined;
    for (let i = 0; i < exits.length; i++) {
      const exit = exits[i], d = Math.hypot(exit.x - at.x, exit.z - at.z);
      if (d < exit.reach && d < nearestDistance) { nearestDistance = d; best = exitPrompts[i]; }
    }
    if (best || occupied) return best;
    if (quest.treeNear(at)) return tree;
    const waiting = quest.near(at);
    if (waiting) return glyphs.get(waiting.id);
  };
}

export function startCaveEncounter(quest: CaveQuest, npc: string, at: Point,
  talkToKeeper: (npc: string) => boolean, talkToTree: () => boolean) {
  const target = quest.guideTo(npc, at);
  if (target?.id !== npc) return false;
  return target.kind === "tree" ? talkToTree() : target.kind === "npc" && talkToKeeper(target.id);
}

type ActiveSession = { active: boolean; sit: { id: string }; conv: { completed: boolean } };

/** Only the current, completed training session can release its own gate or finish the tree encounter. */
export function applyCaveEvent(quest: CaveQuest, session: ActiveSession | null,
  speaker: string | undefined, atTree: boolean, name: string, data: unknown) {
  const { config, keeperByNpc } = quest.rules;
  if ((name !== config.keeperEvent && name !== config.treeEvent) || !session?.active || !session.conv.completed) return false;
  if (name === config.treeEvent) return atTree && session.sit.id === config.treeSituation && quest.treeHeard();
  const keeper = speaker && keeperByNpc.get(speaker);
  return !!keeper && session.sit.id === keeper.sitId &&
    (data as { gate?: unknown } | null | undefined)?.gate === keeper.gate && quest.pass(keeper.gate);
}
