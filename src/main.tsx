import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

const root = document.getElementById("root")!;
createRoot(root).render(<App />);
