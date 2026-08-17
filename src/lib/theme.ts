import type { TenantTheme } from "./types";

/**
 * Tenant temasını CSS değişkenlerine çevirir — server'da çağrılır,
 * değerler HTML'e gömülür (FOUC yok, client JS gerekmez).
 */

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance */
function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Accent üstüne binecek yazı rengi: koyu mu açık mı? */
export function accentForeground(accentHex: string): string {
  const rgb = hexToRgb(accentHex);
  if (!rgb) return "#0B0B0D";
  return luminance(rgb) > 0.45 ? "#0B0B0D" : "#FFFFFF";
}

export interface ThemeCssVars {
  [key: `--${string}`]: string;
}

/** Modun zemin parlaklığı — okunabilir accent türetmek için */
const SURFACE_LUMINANCE: Record<string, number> = {
  dark: luminance([11, 11, 13]),
  light: 1,
  sand: luminance([250, 243, 231]),
};

function contrast(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const ch = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [ch(h + 1 / 3) * 255, ch(h) * 255, ch(h - 1 / 3) * 255];
}

/**
 * Accent METİN olarak da kullanılıyor (fiyat, "öne çıkanlar", footer linkleri).
 * Pastel bir accent krem zeminde okunmaz → AA'ya (4.5:1) çeken bir ikiz üretiriz.
 * Koyultma HSL'de yapılır ve doygunluk yükseltilir: RGB'yi doğrudan çarparak
 * koyultmak pastel altını çamurlu zeytine düşürüyordu, bu yol bronzda tutuyor.
 * Dolgular (bg-accent) tenant'ın seçtiği tonda kalır.
 */
function readableAccent(rgb: [number, number, number], mode: string): string {
  const bg = SURFACE_LUMINANCE[mode] ?? SURFACE_LUMINANCE.dark;
  const towardsBlack = bg > 0.4;
  const [h, s0, l0] = rgbToHsl(rgb);
  const s = Math.min(1, s0 * 1.45 + 0.06);
  let l = l0;
  let cur = hslToRgb([h, s, l]);
  for (let i = 0; i < 40; i++) {
    if (contrast(luminance(cur), bg) >= 4.5) break;
    l = towardsBlack ? Math.max(0, l - 0.025) : Math.min(1, l + 0.025);
    cur = hslToRgb([h, s, l]);
  }
  return toHex(cur);
}

export function themeToCssVars(theme: TenantTheme, mode: string = "dark"): ThemeCssVars {
  const accent = /^#?[0-9a-f]{6}$/i.test(theme.accent ?? "")
    ? (theme.accent.startsWith("#") ? theme.accent : `#${theme.accent}`)
    : "#C8A24B";
  const rgb = hexToRgb(accent)!;
  return {
    "--mq-accent": accent,
    "--mq-accent-rgb": rgb.join(" "),
    "--mq-accent-fg": accentForeground(accent),
    "--mq-accent-ink": readableAccent(rgb, mode),
  };
}
