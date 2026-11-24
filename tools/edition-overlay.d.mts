import type { Plugin } from "vite";

export const ROOT: string;
export function editionFromEnv(): string;
export function learnerFromEnv(): string;
export function overlayFile(file: string, edition: string, importer?: string, learner?: string): string | null;
export function editionOverlay(edition?: string, page?: { lang?: string; title?: string; description?: string }, learner?: string): Plugin;
