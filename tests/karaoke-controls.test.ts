import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KaraokeMore, KaraokeTransport, karaokeCountdown } from "../src/ui/KaraokeStage";
import { KARAOKE_UI } from "../src/content/karaokeCopy";
import type { KaraokeState } from "../src/radio/karaokeSession";

const take: KaraokeState = { status: "playing", song: null, timeline: null, held: false, issue: null, canSlow: true, rate: 0.8 };
const echo = { ...take, status: "paused" as const, practice: { mode: "echo" as const, completed: 1, total: 3, turn: { start: 1, targetStart: 1, end: 3, rows: [0] }, remaining: 3.3 } };

describe("the stable stage controls", () => {
  it("keeps the same three buttons and one native speed selector in the same order for singing and Echo", () => {
    for (const state of [take, echo]) {
      const html = renderToStaticMarkup(createElement(KaraokeTransport, { take: state, hasLine: true, act() {} }));
      expect(html.match(/<button/g)).toHaveLength(3);
      expect(html.match(/<select/g)).toHaveLength(1);
      expect(html).not.toContain(KARAOKE_UI.another);
      expect(html.indexOf("karaoke-transport-replay")).toBeLessThan(html.indexOf("karaoke-transport-primary"));
      expect(html.indexOf("karaoke-transport-primary")).toBeLessThan(html.indexOf('class="karaoke-rate"'));
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain(state === echo ? KARAOKE_UI.continue : KARAOKE_UI.pause);
    }
  });

  it("keeps replay's slot during the intro and puts song switching and gap pause under More", () => {
    const intro = renderToStaticMarkup(createElement(KaraokeTransport, { take, hasLine: false, act() {} }));
    expect(intro).toContain('class="karaoke-transport-replay" disabled=""');
    const menu = renderToStaticMarkup(createElement(KaraokeMore, { take: echo, act() {}, close() {} }));
    expect(menu).toContain('data-pad-scope="karaoke-more"');
    expect(menu).toContain('data-pad-back="true"');
    expect(menu).toContain(KARAOKE_UI.another); expect(menu).toContain(KARAOKE_UI.pause);
    expect(karaokeCountdown(3.3)).toBe("4 s");
    expect(karaokeCountdown(0)).toBe("0 s");
  });
});
