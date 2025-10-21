console.log("ENV TEST:", import.meta.env.VITE_SUPABASE_URL);

import { createRoot } from "react-dom/client";
import App from "./app.tsx";
import "./index.css";
import { ThemeProvider } from "./lib/theme-context";
import { registerSW } from "virtual:pwa-register";

// Register PWA service worker (immediate to catch updates quickly)
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
