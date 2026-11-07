import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import StepFrame from './StepFrame';
import { isPassed } from './setupModel';
import T from './strings.setup';

const B = T.brand;
const STEP = 'brand';

/**
 * Step 3, the logo and the receipt: the logo, colour and receipt wording are set under Settings, Brand and receipts, with the
 * receipt shown as it changes. This step explains it and links there; it waits at this step until you come back. A shop name alone
 * is enough to start, so it can be skipped.
 */
const BrandStep = ({ ctx }) => (
  <StepFrame ctx={ctx} stepKey={STEP} heading={B.title} help={B.help} saved={isPassed(ctx.state, STEP)} saveLabel={ctx.nextLabel(STEP)}>
    <ul className="nl-setup-options">
      <li className="nl-setup-option">
        <div className="nl-setup-option__text">
          <p className="nl-setup-option__title">{B.option.title}</p>
          <p className="nl-setup-option__help">{B.option.text}</p>
        </div>
        <Button as={Link} to={ctx.links.brand} variant="primary">
          {B.option.action}
        </Button>
      </li>
    </ul>
    <p className="nl-setup-note">{B.opensNote}</p>
  </StepFrame>
);

export default BrandStep;
