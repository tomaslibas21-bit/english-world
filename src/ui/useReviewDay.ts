import { useEffect, useState } from "react";
import { addDays } from "../state/cards";

/** Refresh an open notebook or its due badge at local midnight and after a suspended tab resumes. */
export function useReviewDay() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let midnight: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(midnight);
      const now = Date.now();
      setNow(now);
      midnight = setTimeout(refresh, addDays(now, 1) - now);
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => { clearTimeout(midnight); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return now;
}
