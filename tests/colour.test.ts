import { describe, expect, it } from 'vitest';
import config from '../tailwind.config.js';
import { SERIES } from '../src/lib/palette';

/**
 * COLOUR CONTRAST IS A TEST, NOT A VIBE
 * ---------------------------------------------------------------------------
 * The white theme shipped with 14 failing WCAG pairs — including a progress bar
 * whose fill was 1.17:1 against its own track, i.e. invisible at low values.
 * Nobody caught it by looking, because a lime bar on a pale track "looks like
 * design". So the audit lives here now and runs with `npm test`.
 *
 * The rules this file enforces:
 *   · text                     needs 4.5:1  (AA, normal size)
 *   · large text / marks       needs 3.0:1  (AA, graphics + UI boundaries)
 *   · brand lime on white      needs 3.0:1  — it scores 1.17, therefore lime is
 *     PROHIBITED as a mark or tint on white. It survives only as a fill behind
 *     ink (16.4:1). This single rule is why the palette reads as "lime brand"
 *     without a single unreadable element.
 */

const C = config.theme.extend.colors as Record<string, any>;

/** Resolve a token path like `brand.deep` or `ink` to a hex string. */
function token(path: string): string {
  if (path.startsWith('#')) return path; // literal, e.g. the WhatsApp green
  const [head, tail] = path.split('.');
  const v = C[head];
  const hex = tail ? v[tail] : typeof v === 'string' ? v : v.DEFAULT;
  if (typeof hex !== 'string' || !hex.startsWith('#')) throw new Error(`unknown token: ${path}`);
  return hex;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: string, bg: string): number {
  const [a, b] = [luminance(fg), luminance(bg)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Render what `bg-<token>/<alpha>` actually paints on top of a surface. */
function over(hex: string, surface: string, alpha: number): string {
  const f = hex.replace('#', '');
  const s = surface.replace('#', '');
  const out = [0, 2, 4].map((i) =>
    Math.round(parseInt(f.slice(i, i + 2), 16) * alpha + parseInt(s.slice(i, i + 2), 16) * (1 - alpha)),
  );
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const AA_TEXT = 4.5;
const AA_MARK = 3;

/** [description, foreground token, background token-or-literal, required ratio] */
const TEXT_PAIRS: [string, string, string, number][] = [
  ['ink on white', 'ink', 'surface', AA_TEXT],
  ['ink on surface-2', 'ink', 'surface.2', AA_TEXT],
  ['ink on surface-3', 'ink', 'surface.3', AA_TEXT],
  ['ink-muted on white', 'ink.muted', 'surface', AA_TEXT],
  ['ink-muted on surface-2', 'ink.muted', 'surface.2', AA_TEXT],
  ['ink-muted on surface-3', 'ink.muted', 'surface.3', AA_TEXT],
  ['ink-faint (10px labels) on white', 'ink.faint', 'surface', AA_TEXT],
  ['ink-faint on surface-2', 'ink.faint', 'surface.2', AA_TEXT],
  ['ink-faint on surface-3', 'ink.faint', 'surface.3', AA_TEXT],
  ['brand-deep on white', 'brand.deep', 'surface', AA_TEXT],
  ['brand-deep on brand tint', 'brand.deep', 'brand.tint', AA_TEXT],
  // the highlighter: the strongest pair we own, and the reason lime exists
  ['ink on the lime highlighter', 'ink', 'lime', AA_TEXT],
  ['lime-ink text on white', 'lime.ink', 'surface', AA_TEXT],
  ['lime-ink text on the lime tint', 'lime.ink', 'lime.tint', AA_TEXT],
  ['white on brand fill (primary CTA)', '#FFFFFF', 'brand', AA_TEXT],
  ['violet on white', 'violet', 'surface', AA_TEXT],
  ['violet on violet soft', 'violet', 'violet.soft', AA_TEXT],
  ['cyan on white', 'cyan', 'surface', AA_TEXT],
  ['cyan on cyan soft', 'cyan', 'cyan.soft', AA_TEXT],
  ['ember on white', 'ember', 'surface', AA_TEXT],
  ['ember on ember soft', 'ember', 'ember.soft', AA_TEXT],
  ['white on ink (btn-ink)', '#FFFFFF', 'ink', AA_TEXT],
  ['white on brand-deep fill', '#FFFFFF', 'brand.deep', AA_TEXT],
  ['white on violet fill', '#FFFFFF', 'violet', AA_TEXT],
  ['white on cyan fill', '#FFFFFF', 'cyan', AA_TEXT],
  ['white on ember fill', '#FFFFFF', 'ember', AA_TEXT],
  // WhatsApp keeps its own brand green + its own dark ink.
  ['WhatsApp button label', '#04240F', '#25D366', AA_TEXT],
];

const MARK_PAIRS: [string, string, string, number][] = [
  ['progress fill head vs track', 'brand.deep', 'surface.4', AA_MARK],
  ['progress fill tail vs track', 'brand.edge', 'surface.4', AA_MARK],
  ['field border on white', 'line.strong', 'surface', AA_MARK],
  ['field border on surface-2', 'line.strong', 'surface.2', AA_MARK],
  ['field border on surface-3', 'line.strong', 'surface.3', AA_MARK],
  ['strikethrough rule on white', 'line.strong', 'surface', AA_MARK],
  ['status dot on white', 'brand.deep', 'surface', AA_MARK],
  ['indigo on the lime highlighter', 'brand', 'lime', AA_MARK],
];

describe('palette contrast (WCAG 2.1 AA)', () => {
  it.each(TEXT_PAIRS)('%s ≥ 4.5:1', (_label, fg, bg, need) => {
    const r = contrast(token(fg), token(bg));
    expect(r, `${fg} on ${bg} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(need);
  });

  it.each(MARK_PAIRS)('%s ≥ 3:1', (_label, fg, bg, need) => {
    const r = contrast(token(fg), token(bg));
    expect(r, `${fg} on ${bg} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(need);
  });

  it('keeps lime a highlighter by proving it is unusable as anything else', () => {
    // The load-bearing rule of the white theme. Lime is loud where it is a fill
    // behind ink, and invisible everywhere else — so if a future edit uses it
    // for a dot, a hairline or body text, it disappears. This test is the guard.
    expect(contrast(token('lime'), token('surface'))).toBeLessThan(AA_MARK);
    expect(contrast(token('lime'), token('surface'), )).toBeLessThan(AA_TEXT);
    // …and ink on lime is the strongest pair in the entire system.
    const inkOnLime = contrast(token('ink'), token('lime'));
    expect(inkOnLime).toBeGreaterThan(15);
    expect(inkOnLime).toBeGreaterThan(contrast('#FFFFFF', token('brand')));
  });

  it('keeps lime-ink dark enough to be the only readable lime', () => {
    expect(contrast(token('lime.ink'), token('surface'))).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('keeps indigo readable in both directions (fill and text)', () => {
    // A button is the one place a colour has to work as fill AND the text on it.
    expect(contrast(token('brand'), token('surface'))).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast('#FFFFFF', token('brand'))).toBeGreaterThanOrEqual(AA_TEXT);
    // …and the fill is distinct from its own hover state, so the button changes
    // visibly on hover rather than subtly.
    expect(contrast(token('brand'), token('brand.deep'))).toBeGreaterThan(1.5);
  });

  it('keeps the three ink tiers genuinely distinct', () => {
    const on = (t: string) => contrast(token(t), token('surface.3'));
    const [strong, muted, faint] = [on('ink'), on('ink.muted'), on('ink.faint')];
    expect(strong).toBeGreaterThan(muted + 4);
    expect(muted).toBeGreaterThan(faint + 2);
    expect(faint).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('keeps tinted chips legible when the text sits on the tint, not on white', () => {
    // `bg-brand/24 text-brand-deep` and friends — the tint lightens the surface,
    // which is exactly where a "passes on white" value can silently fail.
    const pairs: [string, string, string, number][] = [
      ['brand-deep on brand/24', 'brand.deep', 'brand', 0.24],
      ['brand-deep on brand/16', 'brand.deep', 'brand', 0.16],
      ['brand-deep on brand/14', 'brand.deep', 'brand', 0.14],
      ['cyan on cyan/12', 'cyan', 'cyan', 0.12],
      ['ember on ember/12', 'ember', 'ember', 0.12],
      ['violet on violet/12', 'violet', 'violet', 0.12],
    ];
    for (const [label, fg, tint, alpha] of pairs) {
      const bg = over(token(tint), token('surface'), alpha);
      const r = contrast(token(fg), bg);
      expect(r, `${label} = ${r.toFixed(2)}:1 on ${bg}`).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('keeps every categorical chart hue visible on a white card', () => {
    // Charts are the one place the bright accents are allowed, but a mark still
    // has to be seen. Lime (#CCFF4D) is 1.02:1 here — this is the check that
    // explains why no chart series is allowed to be lime.
    for (const hue of SERIES) {
      const r = contrast(hue, token('surface'));
      expect(r, `${hue} on white = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_MARK);
    }
  });

  it('keeps every pair of chart hues separable by hue OR by lightness', () => {
    // Lightness alone is the wrong test: on a white chart all marks are mid-dark,
    // so the lightness range collapses and hue does the separating. A pair is
    // safe if the hues are far enough apart, OR if one is clearly lighter —
    // which is what keeps the chart readable for colour-blind viewers too.
    const hue = (hex: string) => {
      const h = hex.replace('#', '');
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      if (d === 0) return 0;
      const deg =
        max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (deg * 60 + 360) % 360;
    };
    const hueGap = (a: string, b: string) => {
      const d = Math.abs(hue(a) - hue(b));
      return Math.min(d, 360 - d);
    };

    expect(new Set(SERIES).size).toBe(SERIES.length);
    for (let i = 0; i < SERIES.length; i += 1) {
      for (let j = i + 1; j < SERIES.length; j += 1) {
        const [a, b] = [SERIES[i], SERIES[j]];
        const gap = hueGap(a, b);
        const lr = contrast(a, b);
        expect(
          gap >= 40 || lr >= 1.4,
          `${a} vs ${b}: hue gap ${gap.toFixed(0)}°, lightness ${lr.toFixed(2)}:1`,
        ).toBe(true);
      }
    }
  });

  it('has enough hue steps for six categories', () => {
    // Guards the other failure mode: adding a 7th channel that just reuses a
    // neighbouring violet. Six is the most this palette can carry honestly.
    expect(SERIES.length).toBeLessThanOrEqual(6);
  });
});
