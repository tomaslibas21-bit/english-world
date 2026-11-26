/** The player's six shirt swatches are sRGB hex. Use their linear RGB hue, as the town does,
 * without importing the renderer in picture mode. */
export function backpackColor(top: string) {
  const hex = top.replace(/^#/, "");
  const digits = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  const linear = (offset: number) => {
    const channel = parseInt(digits.slice(offset, offset + 2), 16) / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  };
  const r = linear(0), g = linear(2), b = linear(4);
  const high = Math.max(r, g, b), delta = high - Math.min(r, g, b);
  let hue = 0;
  if (delta && high === r) hue = ((g - b) / delta + 6) % 6;
  else if (delta && high === g) hue = (b - r) / delta + 2;
  else if (delta) hue = (r - g) / delta + 4;
  return hue / 6 < .17 || hue / 6 > .92 ? "#1d3557" : "#e9a23b";
}
