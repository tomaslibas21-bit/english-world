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

createRoot(document.getElementById("root")!).render(<App />);
