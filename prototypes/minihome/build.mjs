// Bundles src/main.js (+ vendored pixelfx) into one self-contained page.
//   npm i --no-save esbuild && node build.mjs
// Writes dist/index.html (open it by double-click) and dist/artifact.html (body fragment for hosting).
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = await build({ entryPoints: [join(here, "src/main.js")], bundle: true, format: "iife", minify: true, write: false, target: "es2020" });
const js = out.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const page = readFileSync(join(here, "src/page.html"), "utf8").replace("/*BUNDLE*/", () => js);
mkdirSync(join(here, "dist"), { recursive: true });
writeFileSync(join(here, "dist/artifact.html"), page);
writeFileSync(join(here, "dist/index.html"), `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${page}\n</body>\n</html>\n`);
console.log(`built dist/index.html (${(page.length / 1024).toFixed(1)} KB)`);
