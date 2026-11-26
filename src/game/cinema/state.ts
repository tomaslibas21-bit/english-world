import { create } from "zustand";

// Only cuts that change the controls or the title card need a React render.
export const useCinema = create(() => ({ title: true, paused: false }));
