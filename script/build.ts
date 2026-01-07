import { build } from "esbuild";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBuild() {
  const rootDir = path.resolve(__dirname, "..");
  const distDir = path.resolve(rootDir, "dist");

  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }

  // 1. Build frontend
  console.log("Building frontend...");
  // Note: We'll assume 'vite build' is run separately or we could spawn it
  
  // 2. Build backend
  console.log("Building backend...");
  await build({
    entryPoints: [path.resolve(rootDir, "server/index.ts")],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "esm",
    outdir: path.resolve(distDir, "server"),
    external: [
      "express",
      "vite",
      "@neondatabase/serverless",
      "drizzle-orm",
      "lucide-react",
      "recharts",
      "framer-motion",
      "react",
      "react-dom",
      "wouter",
      "path",
      "fs",
      "url",
      "http"
    ],
    outExtension: { ".js": ".js" },
    loaders: {
      ".ts": "ts",
    },
  });

  console.log("Build complete!");
}

runBuild().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
