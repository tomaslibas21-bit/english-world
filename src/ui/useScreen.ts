import { useLayoutEffect, useState } from "react";

export const PORTRAIT_PHONE = "(max-width: 600px) and (orientation: portrait)";
export const SIDEWAYS_PHONE = "(max-height: 520px) and (orientation: landscape)";

export function useScreen() {
  const read = () => ({
    w: window.innerWidth, h: window.innerHeight,
    portraitPhone: window.matchMedia(PORTRAIT_PHONE).matches,
    sidewaysPhone: window.matchMedia(SIDEWAYS_PHONE).matches,
  });
  const [screen, setScreen] = useState(read);
  useLayoutEffect(() => {
    const portrait = window.matchMedia(PORTRAIT_PHONE), sideways = window.matchMedia(SIDEWAYS_PHONE);
    const viewport = window.visualViewport;
    let frame = 0;
    const update = () => {
      const next = { w: window.innerWidth, h: window.innerHeight, portraitPhone: portrait.matches, sidewaysPhone: sideways.matches };
      setScreen((prev) => prev.w === next.w && prev.h === next.h && prev.portraitPhone === next.portraitPhone && prev.sidewaysPhone === next.sidewaysPhone ? prev : next);
    };
    const resize = () => {
      update();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    // A rotation can report the old size before layout has caught up.
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    window.addEventListener("pageshow", resize);
    viewport?.addEventListener("resize", resize);
    portrait.addEventListener("change", resize);
    sideways.addEventListener("change", resize);
    update();
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      window.removeEventListener("pageshow", resize);
      viewport?.removeEventListener("resize", resize);
      portrait.removeEventListener("change", resize);
      sideways.removeEventListener("change", resize);
      cancelAnimationFrame(frame);
    };
  }, []);
  return screen;
}
