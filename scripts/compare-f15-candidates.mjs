#!/usr/bin/env node
/**
 * compare-f15-candidates.mjs
 * ----------------------------------------------------------------------------
 * DEV-ONLY comparison harness (not part of the README build).
 *
 * Renders the same dark-blueprint transform applied to each candidate F-15
 * source, so the PD 3-view and the CC BY-SA DraftSight drawing can be compared
 * on equal footing before committing to one.
 *
 *   node scripts/compare-f15-candidates.mjs
 *
 * Output: .compare/out.svg + .compare/preview.png (git-ignored)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, ".compare");

const INK = "#7ee787";
const DIM = "#3fb950";

function stripCruft(s) {
  return s
    .replace(/<\?xml[^>]*\?>\s*/i, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<metadata[\s\S]*?<\/metadata>/g, "")
    .replace(/<sodipodi:namedview[\s\S]*?(?:\/>|<\/sodipodi:namedview>)/g, "")
    // Whole <defs> blocks in these files hold only Inkscape editing aids
    // (<inkscape:path-effect> etc.) that never render. Dropping the block also
    // removes the elements carrying the undeclared `inkscape:` prefix, which is
    // otherwise a hard XML parse error once the namespace declaration is gone.
    .replace(/<defs\b[\s\S]*?<\/defs>/g, "")
    .replace(/<defs\s*\/>/g, "")
    .replace(/\s(?:inkscape|sodipodi|dc|cc|rdf|svg):[a-zA-Z-]+="[^"]*"/g, "")
    .replace(/\sxmlns:(?:inkscape|sodipodi|dc|cc|rdf|svg)="[^"]*"/g, "")
    // Belt and braces: any self-closing namespaced element left behind.
    .replace(/<(?:inkscape|sodipodi):[a-zA-Z-]+[\s\S]*?\/>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function withRootAttrs(svg, { drop = [], set = {} }) {
  const openTag = svg.match(/<svg\b[^>]*>/i)[0];
  const dropSet = new Set(drop.map((d) => d.toLowerCase()));
  const kept = [];
  const seen = new Set();
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;

  let a;
  while ((a = re.exec(openTag)) !== null) {
    const name = a[1];
    const lname = name.toLowerCase();
    if (dropSet.has(lname)) continue;
    if (lname === "xmlns") continue;
    if (/^xmlns:(dc|cc|rdf|svg)$/.test(lname)) continue;
    if (seen.has(lname)) continue;
    seen.add(lname);
    kept.push(`${name}=${a[2]}`);
  }
  for (const [k, v] of Object.entries(set)) {
    if (!seen.has(k.toLowerCase())) kept.push(`${k}="${v}"`);
  }
  return svg.replace(openTag, `<svg xmlns="http://www.w3.org/2000/svg" ${kept.join(" ")}>`);
}

function convert(srcPath, viewBox, recolor = false) {
  let s = stripCruft(readFileSync(srcPath, "utf8"));
  s = s.replace(/<rect[^>]*style="[^"]*fill:#fff(?:fff)?[^"]*"[^>]*\/>/gi, "");
  if (recolor) {
    s = s.replace(/(fill:\s*)#([0-9a-f]{6})/gi, (m, p, hex) => {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      return `${p}rgba(126,231,135,${(0.25 + lum * 0.75).toFixed(2)})`;
    });
  }
  s = s.replace(/(stroke:\s*)#0{3}(?:0{3})?\b/gi, `$1${INK}`);
  s = s.replace(/(stroke:\s*)black\b/gi, `$1${INK}`);
  s = s.replace(/(fill:\s*)#0{3}(?:0{3})?\b/gi, `$1${DIM}`);
  s = s.replace(/stroke-width:\s*([0-9.]+)/g, (m, w) => {
    const n = parseFloat(w);
    return `stroke-width:${(n < 1.6 ? 2.2 : Math.min(n * 1.35, 3.4)).toFixed(2)}`;
  });
  s = withRootAttrs(s, {
    drop: ["width", "height", "id", "version"],
    set: { viewBox, preserveAspectRatio: "xMidYMid meet", role: "img" },
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n${s.trim()}\n`;
}

mkdirSync(OUT, { recursive: true });

const jobs = [
  {
    name: "ccbysa-draftsight (current)",
    src: join(ROOT, "assets", "McDonnell_F-15A_DraftSight.svg"),
    vb: "0 0 1437.1428 1085.7142",
    file: "a-ccbysa.svg",
  },
  {
    name: "pd-3view (alternative)",
    src: join(OUT, "pd3view.svg"),
    vb: "0 0 617 480",
    file: "b-pd.svg",
  },
];

const made = [];
for (const j of jobs) {
  if (!existsSync(j.src)) {
    console.log(`  skip  ${j.name} — source missing: ${j.src}`);
    continue;
  }
  writeFileSync(join(OUT, j.file), convert(j.src, j.vb), "utf8");
  console.log(`  built ${j.file}  (${j.name})`);
  made.push(j.file);
}

writeFileSync(join(OUT, "manifest.json"), JSON.stringify(made, null, 2), "utf8");
console.log(`\n${made.length} candidate(s) in .compare/`);
