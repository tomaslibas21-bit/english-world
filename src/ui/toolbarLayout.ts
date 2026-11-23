export function portraitToolbarRows({ hasHelp, hasRadio, hasCourse, modeExit }: { hasHelp: boolean; hasRadio: boolean; hasCourse: boolean; modeExit?: boolean }) {
  // Six town actions and LR are always visible when the drawer is open.
  const single = 7 + Number(hasHelp) + Number(hasRadio) + Number(hasCourse) + Number(!!modeExit);
  return { single, split: Math.ceil(single / 2) };
}

export function toolbarColumns(buttons: number, maxRows: number) {
  const count = Math.ceil(buttons / Math.max(1, maxRows));
  const rows = Math.floor(buttons / count);
  const extra = buttons % count;
  return Array.from({ length: count }, (_, i) => rows + Number(i < extra));
}
