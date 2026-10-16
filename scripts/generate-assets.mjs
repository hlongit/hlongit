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

  // The tagline types itself in once, then holds. Width is fixed (~94 chars at
  // mono 15px) so it cannot clip regardless of the renderer's metrics.
  const line2Chars = line2.length;
  const typeWidth = 1180;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(line1)} — ${esc(line2)}">
  <defs>
    <linearGradient id="auroraA" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${THEME.green}" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="${THEME.cyan}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${THEME.blue}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="auroraB" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${THEME.violet}" stop-opacity="0.42"/>
      <stop offset="50%" stop-color="${THEME.blue}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="${THEME.violet}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${THEME.ink}" stop-opacity="0"/>
      <stop offset="45%" stop-color="${THEME.ink}" stop-opacity="0.5"/>
      <stop offset="55%" stop-color="${THEME.ink}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${THEME.ink}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="nameFill" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${THEME.ink}"/>
      <stop offset="42%" stop-color="${THEME.greenLite}"/>
      <stop offset="72%" stop-color="${THEME.cyan}"/>
      <stop offset="100%" stop-color="${THEME.blue}"/>
      <animate attributeName="x1" values="-0.35;1.15" dur="9s" repeatCount="indefinite"/>
      <animate attributeName="x2" values="0;1.5" dur="9s" repeatCount="indefinite"/>
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

    <g transform="translate(58, 0)">
      <text x="0" y="112" font-family="${font}" font-size="66" font-weight="700" letter-spacing="10" fill="url(#nameFill)">${esc(line1)}</text>
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

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="presentation">
  <defs>
    <linearGradient id="dv" x1="0" y1="0" x2="1" y2="0">
${grad}
    </linearGradient>
  </defs>
  <rect x="0" y="${H / 2 - 0.75}" width="${W}" height="1.5" rx="0.75" fill="url(#dv)"/>
  <circle cx="${W / 2}" cy="${H / 2}" r="2.6" fill="${THEME.cyan}" opacity="0.9">
    <animate attributeName="opacity" values="0.25;0.95;0.25" dur="4.5s" repeatCount="indefinite"/>
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
