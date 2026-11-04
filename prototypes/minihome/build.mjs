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
// the pixel font (Galmuri, OFL: vendor/galmuri/LICENSE.txt) ships inside the page; the artifact host only allows Google Fonts
const font = (file, weight) => `@font-face { font-family: "Galmuri11"; font-weight: ${weight}; font-display: swap; src: url(data:font/woff2;base64,${readFileSync(join(here, "vendor/galmuri", file)).toString("base64")}) format("woff2"); }`;
const fonts = [font("Galmuri11.woff2", 400), font("Galmuri11-Bold.woff2", 700)].join("\n");
const page = readFileSync(join(here, "src/page.html"), "utf8").replace("/*FONTS*/", () => fonts).replace("/*BUNDLE*/", () => js);
mkdirSync(join(here, "dist"), { recursive: true });
writeFileSync(join(here, "dist/artifact.html"), page);
writeFileSync(join(here, "dist/index.html"), `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${page}\n</body>\n</html>\n`);
console.log(`built dist/index.html (${(page.length / 1024).toFixed(1)} KB)`);
