import React from 'react';
import SetupHealthCard from '../settings/SetupHealthCard';
import StepFrame from './StepFrame';
import { isPassed } from './setupModel';
import T from './strings.setup';

const C = T.check;
const STEP = 'check';

/**
 * Step 9, the final check: Setup health, the very card of Settings, Business (background jobs, store, till, cash, M-Pesa, eTIMS and
 * the rest, each fine, worth a look or needing a fix, with where to fix it). It only reads. Finish ends set-up whatever it says,
 * because nothing here has to be fixed before the shop can start.
 *
 *   load   injectable for tests; it goes to the Setup health card
 */
const CheckStep = ({ ctx, load }) => (
  <StepFrame ctx={ctx} stepKey={STEP} heading={C.title} help={C.help} saved={isPassed(ctx.state, STEP)} saveLabel={ctx.nextLabel(STEP)}>
    <SetupHealthCard {...(load ? { load } : {})} />
  </StepFrame>
);

export default CheckStep;
