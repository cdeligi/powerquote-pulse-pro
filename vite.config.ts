import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// Temporarily disabled lovable-tagger due to WS_TOKEN error
// import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: false, // Explicitly disable HMR
  },
  plugins: [
    react(),
    // Temporarily disabled lovable-tagger due to WS_TOKEN error
    // mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  envPrefix: ['VITE_'], // This is crucial for loading environment variables
}));
