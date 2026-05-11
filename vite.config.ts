import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 9999,
    hmr: { 
      overlay: false,
      clientPort: 9999,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false },
      includeAssets: ["favicon.ico", "favicon-16x16.png", "favicon-32x32.png", "favicon-48x48.png", "apple-180x180.png", "android-192x192.png", "android-512x512.png"],
      manifest: {
        name: "AstralStash - Mind Manager",
        short_name: "AstralStash",
        description: "Your personal space for links, notes, and ideas — no account needed.",
        theme_color: "#141414",
        background_color: "#141414",
        display: "standalone",
        orientation: "portrait",
        start_url: "/app",
        scope: "/",
        icons: [
          { src: "/android-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/android-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/android-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@radix-ui/react-tooltip", "@tanstack/react-query", "@tanstack/query-core"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@radix-ui/react-tooltip"],
  },
}));
