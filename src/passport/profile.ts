import { EDITION } from "../edition";

export function courseProfile(
  edition = EDITION.id,
  helper = EDITION.helper,
  cardsTarget = import.meta.env?.VITE_CARDS_TARGET,
) {
  // Both course exports opt into same-origin integration with this existing flag.
  if (edition !== "es" || cardsTarget !== "fluentsteps") return null;
  return helper === "lt"
    ? { id: "sm-lt", missionPath: "/situacijos/", chapterPath: "/knygos/" }
    : { id: "sme-en", missionPath: "/situations/", chapterPath: "/books/" };
}

export type CourseProfile = NonNullable<ReturnType<typeof courseProfile>>;
export const passportCourse = courseProfile();
