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

const root = document.getElementById("root")!;
if ((import.meta.env.DEV || import.meta.env.VITE_BOOK_REVIEW === "1") &&
    new URLSearchParams(location.search).get("bookHarness") === "1") {
  void import("./radio/bookHarness").then(({ mountBookHarness }) => mountBookHarness(root));
} else createRoot(root).render(<App />);
