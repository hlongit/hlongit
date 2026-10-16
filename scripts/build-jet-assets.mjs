#!/usr/bin/env node
/**
 * build-jet-assets.mjs
 * ----------------------------------------------------------------------------
 * Turns the third-party F-15 source SVGs in `assets/` into web-optimised,
 * dark-theme assets used by the profile README.
 *
 *   assets/McDonnell_F-15A_DraftSight.svg   (source, CC BY-SA 4.0, Kaboldy)
 *     -> assets/f15-blueprint.svg           dark-mode blueprint line drawing
 *
 *   assets/F15jet.svg                       (source, provenance unconfirmed)
 *     -> assets/f15-top.svg                 top-down Eagle, optimised
 *
 * WHY A SCRIPT: the DraftSight drawing is black-on-white and 664 KB. Rendering
 * it verbatim on a dark profile gives a white slab with unreadable hairline
 * detail. Converting it here keeps the transform reproducible and reviewable
 * instead of hand-editing a 2000-path file.
 *
 * Usage:  node scripts/build-jet-assets.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const A = (f) => join(ROOT, "assets", f);

const INK = "#7ee787"; // same green as the banner
const INK_DIM = "#3fb950";

const kb = (p) => (existsSync(p) ? (readFileSync(p).length / 1024).toFixed(0) + " KB" : "absent");

/**
 * Rewrite the root <svg> element's attributes in ONE pass.
 *
 * Doing this with chained `s.replace(/<svg\b/i, ...)` calls is a trap: each pass
 * re-matches the tag it just edited, so you end up with duplicated `xmlns`
 * declarations (a hard XML error) and stacked attributes. This helper parses the
 * existing opening tag once, drops the attributes we want gone, and re-emits it.
 */
function withRootAttrs(svg, { drop = [], set = {} }) {
  const m = svg.match(/<svg\b[^>]*>/i);
  if (!m) throw new Error("no <svg> root element found");

  const openTag = m[0];
  const dropSet = new Set(drop.map((d) => d.toLowerCase()));

  // Pull out existing attrs, then rebuild. Attr values may contain '>' so we
  // can't split naively on whitespace -- match name="value" pairs.
  const kept = [];
  const seen = new Set();
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;

  let a;
  while ((a = attrRe.exec(openTag)) !== null) {
    const name = a[1];
    const lname = name.toLowerCase();
    if (dropSet.has(lname)) continue;
    if (lname === "xmlns") continue; // re-added canonically below, exactly once
    if (lname.startsWith("xmlns:")) {
      // Keep only the namespaces still resolvable after we strip Inkscape cruft.
      if (/^xmlns:(dc|cc|rdf|svg)$/i.test(name)) continue;
    }
    if (seen.has(lname)) continue; // defensive: never emit a duplicate
    seen.add(lname);
    kept.push(`${name}=${a[2]}`);
  }

  for (const [k, v] of Object.entries(set)) {
    if (!seen.has(k.toLowerCase())) kept.push(`${k}="${v}"`);
  }

  const rebuilt = `<svg xmlns="http://www.w3.org/2000/svg" ${kept.join(" ")}>`;
  return svg.replace(openTag, rebuilt);
}

/** Strip Inkscape/Sodipodi/RDF cruft that bloats the file and never renders. */
function stripEditorCruft(s) {
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

/**
 * Fail loudly if the output would still contain an undeclared namespace prefix.
 * We strip the xmlns:* declarations, so any surviving `foo:` element or attribute
 * produces invalid XML that renders as a broken image -- which is exactly the bug
 * this check exists to catch before it reaches the README.
 */
function assertNoStrayPrefixes(svg, label) {
  // `xml` is bound implicitly by the XML specification and never needs (or
  // allows) an xmlns:xml declaration; `xmlns` itself is a reserved name.
  const IMPLICIT = new Set(["xml", "xmlns"]);
  const declared = new Set(
    [...svg.matchAll(/\sxmlns:([a-zA-Z-]+)\s*=/g)].map((m) => m[1])
  );
  const used = new Set(
    [
      ...svg.matchAll(/<([a-zA-Z-]+):[a-zA-Z-]+/g),
      ...svg.matchAll(/\s([a-zA-Z-]+):[a-zA-Z-]+\s*=/g),
    ].map((m) => m[1])
  );
  const stray = [...used].filter((p) => !declared.has(p) && !IMPLICIT.has(p));
  if (stray.length) {
    throw new Error(
      `${label}: undeclared XML namespace prefix(es) ${stray.join(", ")} -- ` +
        `a parser will reject this file. Check stripEditorCruft().`
    );
  }
}

// ---------------------------------------------------------------------------
// 1. DraftSight three-view  ->  dark blueprint
// ---------------------------------------------------------------------------
function blueprint() {
  const src = A("McDonnell_F-15A_DraftSight.svg");
  if (!existsSync(src)) return console.log("  skip  f15-blueprint.svg (source missing)");

  let s = stripEditorCruft(readFileSync(src, "utf8"));

  // (a) Kill the white background rect. This is the single change that makes
  //     the drawing usable on a dark page.
  s = s.replace(/<rect[^>]*style="[^"]*fill:#fff(?:fff)?[^"]*"[^>]*\/>/gi, "");

  // (b) Invert the ink: every black stroke becomes the theme green. The drawing
  //     is monochrome, so a blanket swap is safe and preserves all detail.
  s = s.replace(/(stroke:\s*)#0{3}(?:0{3})?\b/gi, `$1${INK}`);
  s = s.replace(/(stroke:\s*)black\b/gi, `$1${INK}`);
  s = s.replace(/(fill:\s*)#0{3}(?:0{3})?\b/gi, `$1${INK_DIM}`);

  // (c) Thin the stroke weight so hairline detail survives downscaling in a
  //     README (which renders this at a fraction of its natural size).
  s = s.replace(/stroke-width:\s*([0-9.]+)/g, (m, w) => {
    const n = parseFloat(w);
    const bumped = n < 1.6 ? 2.2 : Math.min(n * 1.35, 3.4);
    return `stroke-width:${bumped.toFixed(2)}`;
  });

  // (d) One-pass root rewrite: drop the fixed mm dimensions and the stale
  //     namespaces, guarantee a responsive viewBox.
  s = withRootAttrs(s, {
    drop: ["width", "height", "id", "version"],
    set: {
      viewBox: "0 0 1437.1428 1085.7142",
      preserveAspectRatio: "xMidYMid meet",
      role: "img",
    },
  });

  s = `<?xml version="1.0" encoding="UTF-8"?>\n${s.trim()}`;
  assertNoStrayPrefixes(s, "f15-blueprint.svg");
  writeFileSync(A("f15-blueprint.svg"), s.trimEnd() + "\n", "utf8");
  console.log(`  built  f15-blueprint.svg   ${kb(src)} -> ${kb(A("f15-blueprint.svg"))}`);
}

// ---------------------------------------------------------------------------
// 2. Top-down Eagle  ->  optimised, optionally recoloured
// ---------------------------------------------------------------------------
const { recolorTop } = JSON.parse(
  readFileSync(join(__dirname, "config.json"), "utf8")
).f15 ?? { recolorTop: false };

function topView() {
  const src = A("F15jet.svg");
  if (!existsSync(src)) return console.log("  skip  f15-top.svg (source missing)");

  let s = stripEditorCruft(readFileSync(src, "utf8"));

  if (recolorTop) {
    // Flatten the grey shading to theme green, keeping relative luminance so
    // the panel lines and shading gradients still read.
    s = s.replace(/(fill:\s*)#([0-9a-f]{6})/gi, (m, p, hex) => {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      return `${p}rgba(126,231,135,${(0.25 + lum * 0.75).toFixed(2)})`;
    });
  }

  s = withRootAttrs(s, {
    drop: ["width", "height", "id", "version"],
    set: { viewBox: "0 0 1616.5938 2571.6842", preserveAspectRatio: "xMidYMid meet", role: "img" },
  });

  s = `<?xml version="1.0" encoding="UTF-8"?>\n${s.trim()}`;
  assertNoStrayPrefixes(s, "f15-top.svg");
  writeFileSync(A("f15-top.svg"), s.trimEnd() + "\n", "utf8");
  console.log(`  built  f15-top.svg         ${kb(src)} -> ${kb(A("f15-top.svg"))}${recolorTop ? " (recoloured)" : ""}`);
}

// ---------------------------------------------------------------------------
// 3. Small inline jet glyph for section headers / the divider
//    Vendored geometry: Font Awesome Free 6 (CC BY 4.0) `jet-fighter-up`.
// ---------------------------------------------------------------------------
function glyph() {
  // Path data vendored from Font Awesome Free 6 (fa-solid:jet-fighter-up),
  // licensed CC BY 4.0 -- see ATTRIBUTION.md. Vendored rather than hotlinked so
  // the profile keeps rendering if the icon CDN changes.
  const d =
    "M270.7 9.7C268.2 3.8 262.4 0 256 0s-12.2 3.8-14.7 9.7l-44.1 102.9c-3.4 8-5.2 16.5-5.2 25.2v77l-144 84V280c0-13.3-10.7-24-24-24S0 266.7 0 280v112c0 13.3 10.7 24 24 24s24-10.7 24-24v-8h144v32.7L133.5 468c-3.5 3-5.5 7.4-5.5 12v16c0 8.8 7.2 16 16 16h96v-64c0-8.8 7.2-16 16-16s16 7.2 16 16v64h96c8.8 0 16-7.2 16-16v-16c0-4.6-2-9-5.5-12L320 416.7V384h144v8c0 13.3 10.7 24 24 24s24-10.7 24-24V280c0-13.3-10.7-24-24-24s-24 10.7-24 24v18.8l-144-84v-77c0-8.7-1.8-17.2-5.2-25.2z";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="fighter jet">
  <path d="${d}" fill="${INK}"/>
</svg>`;

  writeFileSync(A("jet-glyph.svg"), svg, "utf8");
  console.log(`  built  jet-glyph.svg       vendored FA6 jet-fighter-up (CC BY 4.0)`);
}

// ---------------------------------------------------------------------------
console.log("building jet assets");
blueprint();
topView();
glyph();
console.log("done.");
