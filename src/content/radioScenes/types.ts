export interface SceneTitle { en: string; lt: string }

export interface SceneInfo {
  id: string;
  place: string;
  title: SceneTitle;
  poolSize: number;
  minTurns: number;
  maxTurns: number;
  minSeconds: number;
  maxSeconds: number;
  shortHappyPath?: true;
}

export interface SceneLine {
  text: string;
  translation: string;
  speed: number;
}

export interface LearnerSceneTurn extends SceneLine {
  speaker: "learner";
  /** The NPC whose question this example answers. */
  to: string;
}

export interface NpcSceneTurn extends SceneLine {
  speaker: string;
  voice: string;
  clipKey: string;
  duration: number;
}

export type SceneTurn = LearnerSceneTurn | NpcSceneTurn;

export interface ScenePath {
  context: { seed: number; visits: number; sim?: number; partner?: "sam" | "emma" };
  replies: string[];
}

export interface RadioScene {
  id: string;
  place: string;
  title: SceneTitle;
  /** Content fingerprint also invalidates an obsolete saved shuffle bag. */
  version: string;
  turns: SceneTurn[];
  /** Each route indexes the shared turn table, in playback order. */
  routes: number[][];
  /** Deduplicated replay evidence for checking the engine's slot bindings and branching. */
  paths: ScenePath[];
  routePaths: number[];
  /** Evidence for the exception when the authored complete happy path is shorter. */
  shortHappyPath?: ScenePath;
}
