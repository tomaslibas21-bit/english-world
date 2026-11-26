import { useEffect, useState } from "react";
import { addDays, startOfDay } from "../state/cards";

/** Refresh an open notebook or its due badge at local midnight and after a suspended tab resumes. */
export function useReviewDay() {
  const [day, setDay] = useState(() => startOfDay(Date.now()));
  useEffect(() => {
    let midnight: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(midnight);
      const now = Date.now();
      setDay(startOfDay(now));
      midnight = setTimeout(refresh, addDays(now, 1) - now);
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => { clearTimeout(midnight); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return day;
}
