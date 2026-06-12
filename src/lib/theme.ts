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

export function themeToCssVars(theme: TenantTheme): ThemeCssVars {
  const accent = /^#?[0-9a-f]{6}$/i.test(theme.accent ?? "")
    ? (theme.accent.startsWith("#") ? theme.accent : `#${theme.accent}`)
    : "#C8A24B";
  const rgb = hexToRgb(accent)!;
  return {
    "--mq-accent": accent,
    "--mq-accent-rgb": rgb.join(" "),
    "--mq-accent-fg": accentForeground(accent),
  };
}
