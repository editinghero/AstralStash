import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AIProvider } from "@/contexts/AIContext";

// Dynamic theme-color based on dark mode - MUST RUN BEFORE ANYTHING ELSE
const updateThemeColor = () => {
  const isDark = document.documentElement.classList.contains("dark");
  const color = isDark ? "#141414" : "#faf8f4";
  
  // Update or create the main theme-color meta tag
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", color);
  
  // Also update apple-mobile-web-app-status-bar-style
  const appleMeta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (appleMeta) {
    appleMeta.setAttribute("content", isDark ? "black-translucent" : "default");
  }
};

// Run immediately on load
updateThemeColor();

// Watch for theme changes
const observer = new MutationObserver(() => {
  updateThemeColor();
});
observer.observe(document.documentElement, { 
  attributes: true, 
  attributeFilter: ["class"] 
});

// PWA service worker registration
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();

if (isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
} else if ("serviceWorker" in navigator) {
  import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({ immediate: true });
  }).catch(() => { /* noop */ });
}

createRoot(document.getElementById("root")!).render(
  <AIProvider>
    <App />
  </AIProvider>
);
