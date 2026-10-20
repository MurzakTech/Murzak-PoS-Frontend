import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import StepFrame from './StepFrame';
import { StepLink } from './ShopStep';
import { isPassed } from './setupModel';
import T from './strings.setup';

const S = T.staff;
const STEP = 'staff';

/**
 * Step 6, your team: a link to Settings, Team (or the current Staff screen until Team is live), and a short list of what else can be
 * set up later. The last step: its button reads Finish and ends set-up.
 */
const StaffStep = ({ ctx }) => {
  const inApp = String(ctx.links.team).startsWith('/') && !String(ctx.links.team).includes('legacy=1');
  return (
    <StepFrame ctx={ctx} stepKey={STEP} heading={S.title} help={S.help} saved={isPassed(ctx.state, STEP)} saveLabel={ctx.nextLabel(STEP)}>
      <div className="nl-setup-option">
        <p className="nl-setup-option__text">{S.text}</p>
        {inApp ? (
          <Button as={Link} to={ctx.links.team} variant="secondary">
            {S.action}
          </Button>
        ) : (
          <Button as="a" href={ctx.links.team} variant="secondary">
            {S.action}
          </Button>
        )}
      </div>
      <div className="nl-setup-heading">
        <h3 className="nl-setup-heading__title">{S.laterTitle}</h3>
        <ul className="nl-setup-links">
          <li>
            <StepLink to={ctx.links.business}>{S.later.business}</StepLink>
          </li>
          <li>
            <StepLink to={ctx.links.till}>{S.later.till}</StepLink>
          </li>
          <li>
            <StepLink to={ctx.links.tax}>{S.later.tax}</StepLink>
          </li>
        </ul>
      </div>
    </StepFrame>
  );
};

export default StaffStep;
