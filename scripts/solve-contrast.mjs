// Solve for the smallest change to a colour token that clears a contrast
// target on the worst surface it appears on, preserving hue and saturation.
// Scaling in sRGB shifts hue slightly, so this walks HSL lightness instead
// and reports the resulting ratio on every surface, not just the worst.

const hex = (s) => {
  const n = parseInt(s.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const toHex = (c) =>
  "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const lum = (c) => {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};
const ratio = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h, s, l };
}
function hslToRgb({ h, s, l }) {
  if (s === 0) { const v = l * 255; return { r: v, g: v, b: v }; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { r: hue(h + 1 / 3) * 255, g: hue(h) * 255, b: hue(h - 1 / 3) * 255 };
}

function solve(name, start, surfaces, target, direction) {
  const hsl = rgbToHsl(hex(start));
  let best = null;
  for (let i = 0; i <= 1000; i++) {
    const l = direction === "darken" ? hsl.l - i / 1000 : hsl.l + i / 1000;
    if (l < 0 || l > 1) break;
    const cand = hslToRgb({ ...hsl, l });
    const worst = Math.min(...surfaces.map((s) => ratio(cand, hex(s))));
    if (worst >= target) { best = { cand, worst }; break; }
  }
  const before = Math.min(...surfaces.map((s) => ratio(hex(start), hex(s))));
  console.log(`\n${name}`);
  console.log(`  current ${start}  worst ${before.toFixed(2)}:1`);
  if (!best) { console.log(`  no solution reaching ${target}`); return; }
  console.log(`  solved  ${toHex(best.cand)}  worst ${best.worst.toFixed(2)}:1`);
  for (const s of surfaces) {
    console.log(`     on ${s}: ${ratio(hex(start), hex(s)).toFixed(2)} -> ${ratio(best.cand, hex(s)).toFixed(2)}`);
  }
}

const LIGHT_SURFACES = ["#f7f4ef", "#fffdfa", "#f1ece4"];
const DARK_SURFACES = ["#131009", "#1d1810", "#262016"];

// 4.6 rather than 4.5: a hair of margin so a later surface tweak does not
// silently drop a token back under the line.
solve("--fg-faint (light)", "#857f71", LIGHT_SURFACES, 4.6, "darken");
solve("--warn (light)", "#a8720f", LIGHT_SURFACES, 4.6, "darken");
solve("--fg-faint (dark)", "#8b8375", DARK_SURFACES, 4.6, "lighten");
