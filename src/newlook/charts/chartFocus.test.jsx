/* eslint-disable testing-library/no-node-access, testing-library/no-container --
   The checks are about attributes the chart library puts on svg groups, which no role query can reach. */
/**
 * Keyboard stops of a chart (Accessibility rules, Focus and Charts): only the chart itself is a Tab stop and it carries the
 * one-sentence summary as its name; the layers the library draws inside it are not stops.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import ChartFrame from './ChartFrame';

const Fake = ({ extra }) => (
  <svg className="recharts-surface" role="application" tabIndex={0} width="100" height="50">
    <g id="layer-1" />
    <g id="layer-2">
      <g id="inner" />
    </g>
    {extra ? <g id="late" /> : null}
  </svg>
);

const inFigure = (ui) => render(<figure aria-label="Daily sales, last 7 days, peak Mon at KES 100">{ui}</figure>);

describe('ChartFrame', () => {
  it('takes every group out of the Tab order and leaves the chart svg as the one stop', () => {
    const { container } = inFigure(<ChartFrame width={100} height={50}>{() => <Fake />}</ChartFrame>);
    container.querySelectorAll('svg g').forEach((g) => expect(g).toHaveAttribute('tabindex', '-1'));
    expect(container.querySelector('svg')).toHaveAttribute('tabindex', '0');
  });

  it('does the same for groups that are drawn later', async () => {
    const { container, rerender } = inFigure(<ChartFrame width={100} height={50}>{() => <Fake />}</ChartFrame>);
    rerender(
      <figure aria-label="Daily sales, last 7 days, peak Mon at KES 100">
        <ChartFrame width={100} height={50}>{() => <Fake extra />}</ChartFrame>
      </figure>
    );
    await waitFor(() => expect(container.querySelector('#late')).toHaveAttribute('tabindex', '-1'));
  });

  it('names the chart svg with the summary of its figure, so the Tab stop is read aloud with the finding', () => {
    const { container } = inFigure(<ChartFrame width={100} height={50}>{() => <Fake />}</ChartFrame>);
    expect(container.querySelector('svg')).toHaveAttribute('aria-label', 'Daily sales, last 7 days, peak Mon at KES 100');
  });
});
