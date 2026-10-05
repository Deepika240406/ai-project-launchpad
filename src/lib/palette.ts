/**
 * CATEGORICAL CHART PALETTE
 * ---------------------------------------------------------------------------
 * Two rules govern this list, both learned from auditing the light theme:
 *
 * 1. **Brand lime (#CCFF4D) is never a chart mark.** On a white card it is
 *    1.17:1 against the background — a chart drawn in lime looks empty. The
 *    readable cousin of the brand hue is `lime` below (#4A7500, 5.5:1), so the
 *    primary channel still reads as "ours" without disappearing.
 * 2. **Six channels need six separable hues.** Two earlier attempts failed the
 *    audit, and both failures are instructive:
 *      · #5B3DF5 next to #7C5CF5 — two violets a viewer cannot tell apart.
 *      · a light grey-blue for the smallest channel — to look "quiet" it had to
 *        be light, and anything light on white drops below 3:1 and stops being
 *        a visible mark at all.
 *    On a white chart every mark has to be mid-to-dark, which collapses the
 *    lightness range — so HUE differences are the only separator left. These
 *    six sit ~40-85 degrees apart around the wheel and all clear 3:1 on white.
 *
 * Charts are also the one place where the *bright* accents are legitimate:
 * large filled areas sitting next to each other, always with an ink legend and
 * ink tooltip text, so they do not carry a text-contrast requirement.
 */

/** Six hue families, ordered by the size of the channel they represent. */
export const CHART = {
  lime: '#4A7500', //  WhatsApp / primary channel — brand family, readable
  teal: '#0E93B0', //  College clubs
  violet: '#6D28D9', // Referral loop — the growth engine (kept clear of the indigo brand)
  amber: '#E2621A', //  Email
  rose: '#C2185B', //  LinkedIn
  green: '#15803D', // Organic / direct — the one gap left in the wheel
} as const;

/** Convenience array for indexed series. Same six hues, no duplicates. */
export const SERIES = [CHART.lime, CHART.green, CHART.teal, CHART.violet, CHART.rose, CHART.amber];

/** Chart chrome — axis ticks, grid lines and tooltip text. */
export const CHART_INK = {
  grid: '#EDF0F6',
  axis: '#68707E', // matches ink-faint, so axis labels stay readable at 11px
  tooltip: '#68707E',
};
