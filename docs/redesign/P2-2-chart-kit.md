# P2-2: The chart kit

## What changed

A shared set of chart parts in `src/newlook/charts/`. Every chart on the new Home page is built from these, so no screen styles a chart by hand.

| Part | What it is |
|---|---|
| `ChartCard` | The card every chart sits in: title that names the unit, a Chart and Table toggle, the chart, a legend when there are two or more series, and one plain sentence that states the main finding. It also owns the loading, empty and error states, so one failing chart never takes the page down. |
| `SalesChart` | Sales over time. Columns when there are fewer than 7 days of history, a line with a 10% area from 7 days up, and the previous period as a grey line. Revenue, Profit and Sales count can be switched (a cashier is given no Profit). Today is a lighter column labelled "so far". Days with no sales show as a small tick. The peak is named once. |
| `PaymentsChart` | One stacked bar. M-Pesa, Cash, Card and On credit keep series-1 to series-4; anything else is Other in grey. A part under 2% is named in the legend but not drawn. The legend carries the amount and the share. |
| `TopProductsChart` | Five horizontal bars, highest first. Names are cut at 24 characters on the axis; the full name is in the tooltip and the table. |
| `HoursChart` | Columns from 8am to 7pm. The peak hour is series-1, the rest the soft colour. A one-line tip appears only when the peak is at least twice the average. |
| `Sparkline`, `MonthProgress` | The tiny trend line (decorative, hidden from screen readers) and the "Day 12 of 31" meter used while there are fewer than 7 days of data. |
| `chartTheme`, `chartFormat`, `chartData` | The marks, the colours (tokens only), the number and date formats, and the arithmetic, kept separate from drawing so each can be tested alone. |

A sample page with made-up numbers is at `/new-look/charts` (owner only, while New look is on). It has buttons to show every chart in its data, loading, empty and error states.

## How each Done-when was checked

| Rule from the Spec | Check |
|---|---|
| Bars at most 24px, 4px rounded tip, 2px gaps | Unit test on the marks table; browser check measured every bar: thickest is 24px. |
| Lines 2px with round joins | Browser check: every line is 2px. |
| Gridlines 1px, solid, pale, horizontal only | Browser check: 1px, and zero vertical gridlines on the page. |
| Dots at least 8px with a 2px ring | Marks table test (8 and 2); dots are drawn from those numbers. |
| At most four colours; a fifth becomes Other | Unit test of `capSeries` and `paymentColour` (AC-18: M-Pesa, Cash, Card, On credit are series-1 to series-4 everywhere). |
| Axis shortened (71K), tooltip in full (KES 71,000) | Unit test of `shortNumber` and `fullMoney`. |
| Text never in a series colour | Colours are only `var(--...)` tokens (unit test); chart text uses ink, ink-2 or muted. The colour-ratchet test confirms no hex code was added. |
| Tooltip: value bold first, every series at that date; hover, focus and tap | Browser check: arrow keys on a focused chart show "KES 55,838 Revenue, 46 sales, KES 50,637 Previous period". |
| Chart and Table toggle; table total equals chart total | Unit test on the payments chart: the table's total row equals the sum of the parts. |
| Text summary is the chart's accessible name (AC-16) | Unit test: the figure's name reads "Daily revenue (KES), last 30 days, peak Sat 10 Oct at KES 67,813". |
| Draw-in 300ms; none with reduced motion | Browser check with reduced motion switched on: nothing animates. |
| Columns below 7 days, line from 7 | Unit test of `drawsColumns` and a look at both on the sample page. |
| Both themes, and a phone | Screenshots in light and dark; at 390px there is no sideways scrolling (a card with a long header now wraps). |

## Decisions and anything unclear

- **Value labels.** The Spec says label only the peak and the latest value. On the sales chart, when today's "so far" column is drawn its own label is the latest value, so the separate "latest" label is left out to avoid two labels touching.
- **Top products.** The top bar carries its value; the other bars are read from the axis, the tooltip and the table, in line with "no number on every point".
- **Gridlines on the horizontal bar chart.** The Spec says horizontal gridlines only, so the Top products chart has none; its axis at the bottom carries the scale.
- **The chart scanner.** The test that stops stray words in components was told that Recharts settings such as `dataKey` and `layout` are not words. The sample page and its data are exempt, like the other demo pages.

## Not done here

The charts are not on the Home page yet; that is P2-5, after the Home data call (P2-1) is in place.
