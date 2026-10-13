import react from "@vitejs/plugin-react"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, type Plugin } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

const configDir = path.dirname(fileURLToPath(import.meta.url));
const pkgRequire = createRequire(path.join(configDir, "package.json"));
const { pkgRoot } = pkgRequire("./dist/pkg.js") as typeof import("./dist/pkg.js");
const { viteResolveForCanvas } = pkgRequire(
  "./dist/paths.js",
) as typeof import("./dist/paths.js");
const { viteDataModule } = pkgRequire(
  "./dist/util.js",
) as typeof import("./dist/util.js");

const stem = process.env.OPEN_CANVAS_STEM ?? "index";
const outDir = process.env.OPEN_CANVAS_OUT_DIR
  ? path.resolve(pkgRoot, process.env.OPEN_CANVAS_OUT_DIR)
  : path.join(pkgRoot, "example", "out");
const canvasPath = process.env.OPEN_CANVAS_CANVAS_PATH
  ? path.resolve(pkgRoot, process.env.OPEN_CANVAS_CANVAS_PATH)
  : undefined;
const theme = process.env.OPEN_CANVAS_THEME === "dark" ? "dark" : "light";
const title = process.env.OPEN_CANVAS_TITLE ?? "Canvas";
const viteBuildDir = path.join(outDir, "_build");
const base = process.env.BASE_PATH ?? "./";

if (!canvasPath) {
  throw new Error("OPEN_CANVAS_CANVAS_PATH is required for vite build");
}


const canvasResolve = viteResolveForCanvas(canvasPath);

function htmlTitle(): Plugin {
  return {
    name: "html-title",
    transformIndexHtml(html) {
      return html.replace(
        "<title>Canvas</title>",
        `<title>${escapeHtml(title)}</title>`,
      );
    },
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function openCanvasDataImports(): Plugin {
  return {
    name: "open-canvas-data-imports",
    transform(src, id) {
      const mod = viteDataModule(id, src);
      if (!mod) {
        return;
      }
      return { ...mod, map: null };
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), openCanvasDataImports(), htmlTitle(), viteSingleFile()],
  define: {
    __OPEN_CANVAS_THEME__: JSON.stringify(theme),
  },
  resolve: {
    modules: canvasResolve.modules,
    alias: canvasResolve.alias,
  },
  server: {
    fs: {
      allow: canvasResolve.fsAllow,
    },
  },
  root: path.join(pkgRoot, "src", "shell"),
  build: {
    outDir: viteBuildDir,
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
  },
});
