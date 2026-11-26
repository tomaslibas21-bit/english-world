/** Screenshot the actual paper pieces, not the intentionally zero-size burst origin.
 * Rewind and pause the existing CSS animations at 350 ms so slow assertions cannot miss a two-second burst. */
export function freezeConfettiBurst() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const origin = document.querySelector(".confetti");
  if (!origin) return false;
  const animations = origin.getAnimations({ subtree: true });
  if (!animations.length) return false;
  for (const animation of animations) { animation.pause(); animation.currentTime = 350; }
  return Array.from(origin.querySelectorAll("i")).some((piece) => {
    const box = piece.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && Number(getComputedStyle(piece).opacity) > 0
      && box.right > 0 && box.bottom > 0 && box.left < window.innerWidth && box.top < window.innerHeight;
  });
}
