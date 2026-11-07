import { useLayoutEffect, useRef, type RefObject } from "react";
import { mobileConversationBudget } from "./conversationLayout";

/** Budget the narrow conversation screen in both modes; the roaming town keeps its existing layout. */
export function useConversationLayout(panel: RefObject<HTMLDivElement | null>, enabled: boolean, run: number, content: string) {
  const picture = useRef<{ run: number; height: number } | null>(null);
  useLayoutEffect(() => {
    if (!enabled) return;
    const el = panel.current;
    if (!el) return;
    document.body.classList.add("conversation-open");
    let frame = 0;
    const measure = () => {
      if (!window.matchMedia("(max-width: 900px)").matches) {
        document.body.style.removeProperty("--conversation-scene-height");
        el.style.removeProperty("--conversation-transcript-height");
        return;
      }
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const height = (selector: string) => el.querySelector<HTMLElement>(selector)?.getBoundingClientRect().height ?? 0;
      const transcript = el.querySelector<HTMLElement>(".transcript");
      const lastLine = transcript?.lastElementChild?.getBoundingClientRect().height ?? 0;
      // A readable window onto the latest turn; its own scroll keeps earlier or longer lines reachable.
      let transcriptHeight = Math.min(Math.max(lastLine + 16, 84), vh * 0.18);
      let sceneHeight = picture.current?.run === run ? picture.current.height : mobileConversationBudget(vh, 0).sceneHeight;
      const scroll = el.querySelector<HTMLElement>(".yt-scroll");
      const examples = el.querySelectorAll<HTMLElement>(".guide-examples > .gx");
      const lastExample = examples[Math.min(2, examples.length - 1)];
      if (scroll && lastExample) {
        // Include the guide instruction, chips, padding and title before the third answer.
        const answerHeight = lastExample.getBoundingClientRect().bottom - scroll.getBoundingClientRect().top + scroll.scrollTop + 10;
        const fixedHeight = height(".convo-head") + height(".beta-strip") + height(".mission") + height(".call-strip") + height(".yt-bottom");
        const budget = mobileConversationBudget(vh, fixedHeight + transcriptHeight + answerHeight, transcriptHeight);
        sceneHeight = budget.sceneHeight;
        transcriptHeight = budget.transcriptHeight;
      } else {
        // Retain the picture size while the NPC speaks, so each turn does not move the screen around.
        sceneHeight = Math.min(sceneHeight, mobileConversationBudget(vh, 0).sceneHeight);
      }
      picture.current = { run, height: sceneHeight };
      el.style.setProperty("--conversation-transcript-height", `${Math.round(transcriptHeight)}px`);
      document.body.style.setProperty("--conversation-scene-height", `${sceneHeight}px`);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    for (const child of el.querySelectorAll<HTMLElement>(".convo-head, .beta-strip, .mission, .call-strip, .yt-bottom, .yt-title, .guide, .transcript > :last-child")) observer.observe(child);
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      document.body.classList.remove("conversation-open");
      document.body.style.removeProperty("--conversation-scene-height");
      el.style.removeProperty("--conversation-transcript-height");
    };
  }, [panel, enabled, run, content]);
}
