type Point = readonly [x: number, z: number];

export interface CenoteRoute {
  deck: Point;
  deckLook: readonly [number, number, number];
  deckGuide: Point;
  shore: Point;
  swimStart: Point;
  fishStop: Point;
  fishBend: Point;
  turtleStop: Point;
  returnBend: Point;
  returnEnd: Point;
  fish: {
    center: Point; radii: Point; period: number; count: number;
    lengths: readonly [number, number]; depths: readonly [number, number];
    side: string; tail: string;
  };
  turtles: {
    center: Point;
    paths: readonly { radii: Point; offset: Point; period: number; length: number; depth: number }[];
    shell: string; flipper: string; underside: string;
  };
}

export const CENOTE_ROUTE: CenoteRoute | null = null;
