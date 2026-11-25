/** The 2D context used by the street-world Node test, shared with the build-time town generator. */
export function townCanvasDocument() {
  const draw = () => {};
  const gradient = () => ({ addColorStop: draw });
  const canvas = new Proxy({
    measureText: (text: string) => ({ width: text.length * 9 }),
    createLinearGradient: gradient, createRadialGradient: gradient,
  }, { get: (target, key) => Reflect.get(target, key) ?? draw });
  return { createElement: () => ({ getContext: () => canvas }) };
}
