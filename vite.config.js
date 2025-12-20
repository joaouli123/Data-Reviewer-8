import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

let expressApp = null;

export default defineConfig({
  plugins: [
    react(),
    {
      name: "express-server",
      configResolved(config) {
        if (config.command === "serve") {
          return;
        }
      },
      configureServer(server) {
        return () => {
          server.middlewares.use(async (req, res, next) => {
            try {
              if (!expressApp) {
                const module = await import("./server/index.ts");
                expressApp = module.default || module.app;
              }
              if (expressApp) {
                expressApp(req, res, next);
              } else {
                next();
              }
            } catch (e) {
              console.error("Error loading Express app:", e);
              next();
            }
          });
        };
      },
    },
  ],
  server: {
    allowedHosts: true,
    port: 5000,
    host: "0.0.0.0",
    middlewareMode: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@assets": path.resolve(__dirname, "./attached_assets"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
    extensions: [".mjs", ".js", ".jsx", ".ts", ".tsx", ".json"],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});
