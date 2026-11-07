import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import EtimsSettingsCard from '../settings/EtimsSettingsCard';
import StepFrame from './StepFrame';
import { isPassed } from './setupModel';
import T from './strings.setup';

const E = T.etims;
const STEP = 'etims';

/**
 * Step 6, tax and eTIMS: says what eTIMS is, and shows the very card of Settings, Tax (the device serial number, send to KRA and test
 * mode) when the business has eTIMS settings. Without them the card says support creates them once KRA has certified the system.
 * A shop that is not registered skips this step.
 *
 *   load, save   injectable for tests; they go to the eTIMS card
 */
const EtimsStep = ({ ctx, load, save }) => (
  <StepFrame ctx={ctx} stepKey={STEP} heading={E.title} help={E.help} saved={isPassed(ctx.state, STEP)} saveLabel={ctx.nextLabel(STEP)}>
    <p className="nl-setup-note">{E.pinNote}</p>
    <p className="nl-setup-note">{E.supportNote}</p>
    <EtimsSettingsCard {...(load ? { load } : {})} {...(save ? { save } : {})} />
    <p className="nl-setup-note">
      <Button as={Link} to={ctx.links.tax} variant="ghost" size="small">
        {E.moreLink}
      </Button>
    </p>
  </StepFrame>
);

export default EtimsStep;
