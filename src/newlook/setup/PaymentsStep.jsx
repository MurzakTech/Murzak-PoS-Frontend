import React from 'react';
import PaymentMethodsCard from '../settings/PaymentMethodsCard';
import StepFrame from './StepFrame';
import { StepLink } from './ShopStep';
import { isPassed } from './setupModel';
import T from './strings.setup';

const W = T.payments;
const STEP = 'payments';

/**
 * Step 4, the payment methods: the very card of Settings, Till and payments (PaymentMethodsCard, with the same server calls and
 * words), so the switches here and there are one thing. Each switch saves on its own and says "Saved"; only the owner can change
 * them. Keys for M-Pesa and other gateways, and bank accounts, are never shown here: a link opens the current Settings screens.
 *
 *   load, save   injectable for tests; they go to the payment method card
 */
const PaymentsStep = ({ ctx, load, save }) => (
  <StepFrame ctx={ctx} stepKey={STEP} heading={W.title} help={W.help} saved={isPassed(ctx.state, STEP)} saveLabel={ctx.nextLabel(STEP)}>
    <PaymentMethodsCard {...(load ? { load } : {})} {...(save ? { save } : {})} />
    <p className="nl-setup-note">
      {W.moreText} <StepLink to={ctx.links.payments}>{W.moreLink}</StepLink>
    </p>
  </StepFrame>
);

export default PaymentsStep;
