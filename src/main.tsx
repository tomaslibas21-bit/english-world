import { createRoot } from "react-dom/client";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "@fontsource/nunito/900.css";
import "@fontsource/eb-garamond/400.css";
import "@fontsource/eb-garamond/500.css";
import "@fontsource/eb-garamond/600.css";
import "@fontsource/gentium-book-plus/400.css";
import "./ui/styles.css";
import { App } from "./ui/App";
import { initVariety } from "./state/variety";

// the Spanish edition: Mexican or neutral Spanish, as the learner chose (nothing in the English edition)
initVariety();
const root = createRoot(document.getElementById("root")!);
if (import.meta.env.DEV && new URLSearchParams(location.search).get("karaokeHarness") === "1") {
  void import("./dev/KaraokeHarness").then(({ KaraokeHarness }) => root.render(<KaraokeHarness />));
} else {
  root.render(<App />);
}
