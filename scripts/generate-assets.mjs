#!/usr/bin/env node
/**
 * generate-assets.mjs
 * ----------------------------------------------------------------------------
 * Builds the committed SVG assets used by the profile README:
 *
 *   assets/banner.svg      animated hero banner (aurora sweep + typed tagline)
 *   assets/divider.svg     gradient hairline rule
 *   assets/avatar-ring.svg ring frame for the avatar image
 *
 * Everything is hand-rolled SVG: no build deps, no network, no external fonts.
 * GitHub sanitises <svg> in markdown but keeps <style>, CSS keyframes and
 * <animate> — which is all this needs. `<text>` relies on system fonts, so we
 * keep the font stack conservative and let all three render on GitHub's boxes.
 *
 * Usage:  node scripts/generate-assets.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "assets");

const cfg = JSON.parse(readFileSync(join(__dirname, "config.json"), "utf8"));

// ---------------------------------------------------------------------------
// Theme — kept in one place so the whole set stays visually in sync.
// ---------------------------------------------------------------------------
const THEME = {
  bg0: "#0d1117", // GitHub dark canvas
  bg1: "#161b22", // GitHub dark surface
  ink: "#e6edf3", // primary text
  dim: "#8b949e", // secondary text
  green: "#3fb950",
  greenLite: "#7ee787",
  cyan: "#39d353",
  blue: "#58a6ff",
  violet: "#bc8cff",
  amber: "#e3b341",
};

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const write = (name, svg) => {
  mkdirSync(OUT_DIR, { recursive: true });
  // Trailing newline keeps diffs and pre-commit hooks happy.
  writeFileSync(join(OUT_DIR, name), svg.trimEnd() + "\n", "utf8");
  console.log(`  written  assets/${name}`);
};

// ---------------------------------------------------------------------------
// banner.svg — aurora glow, starfield, typed tagline, thin scanline.
// ---------------------------------------------------------------------------
function banner() {
  const { line1, line2, line3, font, width: W, height: H } = cfg.banner;

  // Deterministic starfield: a seeded LCG, so regeneration produces byte-identical
  // files and the git history stays clean.
  let seed = 0x2f6e2b1;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  const stars = Array.from({ length: 90 }, () => {
    const x = +(rnd() * W).toFixed(1);
    const y = +(rnd() * H).toFixed(1);
    const r = +(0.4 + rnd() * 1.1).toFixed(2);
    const o = +(0.18 + rnd() * 0.6).toFixed(2);
    const dur = +(2.4 + rnd() * 3.6).toFixed(2);
    const delay = +(rnd() * 5).toFixed(2);
    return `    <circle cx="${x}" cy="${y}" r="${r}" fill="${THEME.ink}" opacity="${o}">
      <animate attributeName="opacity" values="${o};${(o * 0.25).toFixed(2)};${o}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
    </circle>`;
  }).join("\n");

  // F-15 silhouette for the banner, built from the vendored Font Awesome
  // `jet-fighter-up` geometry (CC BY 4.0 -- see ATTRIBUTION.md). Declared once
  // here and reused via <use>, so the banner stays small.
  const jetPath =
    "M270.7 9.7C268.2 3.8 262.4 0 256 0s-12.2 3.8-14.7 9.7l-44.1 102.9c-3.4 8-5.2 16.5-5.2 25.2v77l-144 84V280c0-13.3-10.7-24-24-24S0 266.7 0 280v112c0 13.3 10.7 24 24 24s24-10.7 24-24v-8h144v32.7L133.5 468c-3.5 3-5.5 7.4-5.5 12v16c0 8.8 7.2 16 16 16h96v-64c0-8.8 7.2-16 16-16s16 7.2 16 16v64h96c8.8 0 16-7.2 16-16v-16c0-4.6-2-9-5.5-12L320 416.7V384h144v8c0 13.3 10.7 24 24 24s24-10.7 24-24V280c0-13.3-10.7-24-24-24s-24 10.7-24 24v18.8l-144-84v-77c0-8.7-1.8-17.2-5.2-25.2z";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(line1)} — ${esc(line2)}">
  <defs>
    <path id="jetSilhouette" d="${jetPath}"/>
    <linearGradient id="auroraA" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${THEME.green}" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="${THEME.cyan}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${THEME.blue}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="auroraB" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${THEME.violet}" stop-opacity="0.30"/>
      <stop offset="50%" stop-color="${THEME.blue}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${THEME.violet}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${THEME.ink}" stop-opacity="0"/>
      <stop offset="45%" stop-color="${THEME.ink}" stop-opacity="0.5"/>
      <stop offset="55%" stop-color="${THEME.ink}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${THEME.ink}" stop-opacity="0"/>
    </linearGradient>
    <!-- Name fill: a slow shimmer that stays in the green family end to end, so
         the letters never read as blue no matter where the sweep lands. The
         travelling highlight is a lighter green rather than a hue shift. -->
    <linearGradient id="nameFill" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${THEME.greenLite}"/>
      <stop offset="30%" stop-color="${THEME.greenLite}"/>
      <stop offset="50%" stop-color="#c9ffd6"/>
      <stop offset="70%" stop-color="${THEME.cyan}"/>
      <stop offset="100%" stop-color="${THEME.green}"/>
      <animate attributeName="x1" values="-0.3;1.0" dur="9s" repeatCount="indefinite"/>
      <animate attributeName="x2" values="0.2;1.5" dur="9s" repeatCount="indefinite"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${THEME.green}" stop-opacity="0.9"/>
      <stop offset="38%" stop-color="${THEME.cyan}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${THEME.blue}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.42" r="0.78">
      <stop offset="55%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
    <clipPath id="frame">
      <rect x="0" y="0" width="${W}" height="${H}" rx="16" ry="16"/>
    </clipPath>
  </defs>

  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${THEME.bg0}"/>

    <g>
      <ellipse cx="${W * 0.2}" cy="${H * 0.1}" rx="${W * 0.55}" ry="${H * 0.85}" fill="url(#auroraA)">
        <animateTransform attributeName="transform" type="translate" values="0 0; 62 -16; 0 0" dur="17s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
      </ellipse>
      <ellipse cx="${W * 0.86}" cy="${H * 0.9}" rx="${W * 0.5}" ry="${H * 0.8}" fill="url(#auroraB)">
        <animateTransform attributeName="transform" type="translate" values="0 0; -54 14; 0 0" dur="21s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
      </ellipse>
    </g>

${stars}

    <!-- F-15 watermark: large and faint, sitting over the dimmer centre-left of
         the canvas so the aurora does not tint it blue. Drawn after the starfield
         but before the text, and kept very low-contrast so it reads as texture
         rather than as a foreground object.

         Transform order matters: scale-then-translate centres the 512x512 glyph
         on the origin. Swapping the order scales the translation too and throws
         the jet off-canvas entirely. -->
    <g opacity="0.07">
      <g>
        <animateTransform attributeName="transform" type="translate"
          values="690 128; 676 134; 690 128" dur="26s" repeatCount="indefinite"
          calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        <g transform="scale(0.5) translate(-256 -256)">
          <use href="#jetSilhouette" fill="${THEME.greenLite}"/>
        </g>
      </g>
    </g>

    <g transform="translate(58, 0)">
      <text x="0" y="112" font-family="${font}" font-size="66" font-weight="700" letter-spacing="10" fill="url(#nameFill)">${esc(line1)}</text>
      <use href="#jetSilhouette" fill="${THEME.greenLite}" opacity="0.9"
        transform="translate(432 88) scale(0.058) translate(-256 -256)"/>
      <text x="4" y="152" font-family="${font}" font-size="15" fill="${THEME.dim}" clip-path="url(#frame)">
        <tspan>${esc(line2)}</tspan>
        <animate attributeName="clip-path" values="inset(0 100% 0 0);inset(0 0% 0 0)" dur="1.8s" fill="freeze" calcMode="spline" keySplines="0.3 0 0.2 1" begin="0.3s"/>
      </text>
      <text x="4" y="182" font-family="${font}" font-size="13" fill="${THEME.dim}" opacity="0.72">${esc(line3)}</text>
      <rect x="4" y="196" width="212" height="2" rx="1" fill="url(#rule)"/>
    </g>

    <rect x="-260" y="0" width="180" height="${H}" fill="url(#sweep)" transform="skewX(-18)">
      <animateTransform attributeName="transform" type="translate" values="0 0; 1560 0" dur="7.5s" repeatCount="indefinite" begin="1.2s"/>
      <animate attributeName="opacity" values="0;0.55;0.55;0" dur="7.5s" repeatCount="indefinite" begin="1.2s"/>
    </rect>

    <rect width="${W}" height="${H}" fill="url(#vignette)"/>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" ry="16" fill="none" stroke="${THEME.green}" stroke-opacity="0.22"/>
  </g>
</svg>`;
}

// ---------------------------------------------------------------------------
// divider.svg — a hairline that fades out at both ends.
// ---------------------------------------------------------------------------
function divider() {
  const { width: W, height: H } = cfg.divider;
  const grad = ["green", "cyan", "blue", "violet"]
    .map((k, i, a) => {
      const pct = ((i / (a.length - 1)) * 100).toFixed(0);
      const op = i === 0 || i === a.length - 1 ? 0 : 0.85;
      return `      <stop offset="${pct}%" stop-color="${THEME[k]}" stop-opacity="${op}"/>`;
    })
    .join("\n");

  // Same vendored FA `jet-fighter-up` geometry as the banner.
  const jetPath =
    "M270.7 9.7C268.2 3.8 262.4 0 256 0s-12.2 3.8-14.7 9.7l-44.1 102.9c-3.4 8-5.2 16.5-5.2 25.2v77l-144 84V280c0-13.3-10.7-24-24-24S0 266.7 0 280v112c0 13.3 10.7 24 24 24s24-10.7 24-24v-8h144v32.7L133.5 468c-3.5 3-5.5 7.4-5.5 12v16c0 8.8 7.2 16 16 16h96v-64c0-8.8 7.2-16 16-16s16 7.2 16 16v64h96c8.8 0 16-7.2 16-16v-16c0-4.6-2-9-5.5-12L320 416.7V384h144v8c0 13.3 10.7 24 24 24s24-10.7 24-24V280c0-13.3-10.7-24-24-24s-24 10.7-24 24v18.8l-144-84v-77c0-8.7-1.8-17.2-5.2-25.2z";

  // The jet turns to fly right-to-left along the rule, nose left, trailing vapour.
  // Geometry note: `scale(s) translate(-256 -256)` centres the 512x512 glyph on
  // the origin; the -90deg rotation then points its nose along -x.
  const midY = H / 2;
  const jetScale = 0.042;
  const jetW = 512 * jetScale; // ~21.5px, fits comfortably in the 52px band

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="presentation">
  <defs>
    <linearGradient id="dv" x1="0" y1="0" x2="1" y2="0">
${grad}
    </linearGradient>
    <path id="jetGlyph" d="${jetPath}"/>
    <linearGradient id="vapour" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0%" stop-color="${THEME.greenLite}" stop-opacity="0"/>
      <stop offset="70%" stop-color="${THEME.greenLite}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${THEME.greenLite}" stop-opacity="0.9"/>
    </linearGradient>
  </defs>

  <rect x="0" y="${midY - 0.75}" width="${W}" height="1.5" rx="0.75" fill="url(#dv)"/>

  <g>
    <animateTransform attributeName="transform" type="translate"
      values="${W + 20} 0; ${-40} 0" dur="17s" repeatCount="indefinite"/>

    <!-- vapour trail streaming behind the nose-left jet, fading with distance -->
    <rect x="0" y="${midY - 0.5}" width="${jetW * 4.5}" height="1"
          fill="url(#vapour)">
      <animate attributeName="opacity" values="0.25;0.6;0.25" dur="2.4s" repeatCount="indefinite"/>
    </rect>

    <g transform="translate(${jetW * 4.5} ${midY})">
      <use href="#jetGlyph" fill="${THEME.greenLite}" opacity="0.95"
        transform="rotate(-90) scale(${jetScale}) translate(-256 -256)"/>
    </g>
  </g>

  <circle cx="${W / 2}" cy="${midY}" r="2.6" fill="${THEME.cyan}" opacity="0.75">
    <animate attributeName="opacity" values="0.2;0.8;0.2" dur="4.5s" repeatCount="indefinite"/>
  </circle>
</svg>`;
}

// ---------------------------------------------------------------------------
// avatar-ring.svg — a rotating ring to sit behind/around the avatar.
// ---------------------------------------------------------------------------
function avatarRing() {
  const { size: S, stroke } = cfg.avatarRing;
  const r = S / 2 - stroke;
  const c = S / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="presentation">
  <defs>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${THEME.greenLite}"/>
      <stop offset="45%" stop-color="${THEME.cyan}"/>
      <stop offset="100%" stop-color="${THEME.violet}"/>
    </linearGradient>
  </defs>
  <g transform="translate(${c} ${c})">
    <circle r="${r}" fill="none" stroke="url(#ring)" stroke-width="${stroke}"
            stroke-linecap="round" stroke-dasharray="${(2 * Math.PI * r * 0.62).toFixed(1)} ${(2 * Math.PI * r * 0.38).toFixed(1)}">
      <animateTransform attributeName="transform" type="rotate" values="0;360" dur="14s" repeatCount="indefinite"/>
    </circle>
  </g>
</svg>`;
}

// ---------------------------------------------------------------------------
console.log("generating profile assets");
write("banner.svg", banner());
write("divider.svg", divider());
write("avatar-ring.svg", avatarRing());
console.log("done.");
