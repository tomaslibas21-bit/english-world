/** Canvas measurements for the build generator and the Node town tests. */
export function townCanvasDocument() {
  const draw = () => {};
  const gradient = () => ({ addColorStop: draw });
  return { createElement() {
    const context = new Proxy({
      font: "",
      createLinearGradient: gradient,
      createRadialGradient: gradient,
      measureText(text: string) {
        const size = Number(/([\d.]+)px/.exec(this.font)?.[1] ?? 12);
        return { width: Array.from(text).length * size * 0.56 };
      },
    }, { get: (target, key) => Reflect.get(target, key) ?? draw });
    return { width: 0, height: 0, getContext: () => context };
  } };
}
