import { paymentKey } from '../components/Chip';

/**
 * The marks of the chart kit, from the Spec's Charts section ("Mark" table). Every chart takes its numbers from
 * here, so no screen styles a chart by hand and the acceptance checks (AC-16 to AC-18) hold everywhere.
 */
export const MARKS = {
  barMaxWidth: 24, // bars are at most 24px wide
  barRadius: 4, // with a 4px rounded tip, flat on the baseline
  barGap: 2, // 2px of card colour between touching bars or segments
  lineWidth: 2, // lines are 2px thick with round joins
  areaOpacity: 0.1, // area fill at 10% of the line colour
  dotDiameter: 8, // dots are at least 8px across
  dotRing: 2, // with a 2px ring in the card colour
  gridWidth: 1, // gridlines are 1px, solid, very pale, horizontal only
  drawInMs: 300, // a chart draws in over 300ms (not at all with reduced motion)
  maxColours: 4, // at most four colours in one chart; a fifth becomes Other
};

// Colours are tokens, never hex: they follow the theme. Text is never a series colour (ink, ink-2 or muted).
export const COLOUR = {
  series: ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)'],
  other: 'var(--compare)',
  previous: 'var(--compare)',
  soft: 'var(--soft)',
  track: 'var(--track)',
  card: 'var(--surface)',
  grid: 'var(--line)',
  strong: 'var(--ink)',
  body: 'var(--ink-2)',
  muted: 'var(--muted)',
};

const BY_METHOD = { mpesa: 0, cash: 1, card: 2, credit: 3 };

/** M-Pesa, Cash, Card and On credit use series-1 to series-4 on every screen (AC-18); anything else is the compare grey */
export const paymentColour = (method) => {
  const index = BY_METHOD[paymentKey(method)];
  return index === undefined ? COLOUR.other : COLOUR.series[index];
};
