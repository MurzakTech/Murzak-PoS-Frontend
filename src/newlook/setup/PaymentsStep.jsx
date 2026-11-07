import React from 'react';
import MpesaCard from '../settings/MpesaCard';
import PaymentMethodsCard from '../settings/PaymentMethodsCard';
import StepFrame from './StepFrame';
import { StepLink } from './ShopStep';
import { isPassed } from './setupModel';
import T from './strings.setup';

const W = T.payments;
const STEP = 'payments';

/**
 * Step 5, the payment methods: the very card of Settings, Till and payments (PaymentMethodsCard, with the same server calls and
 * words), so the switches here and there are one thing. Each switch saves on its own and says "Saved"; only the owner can change
 * them. Below it is the M-Pesa card of Settings (masked keys, Save, Test connection). Other gateways and bank accounts are set up on
 * the current Settings screens, which a link opens.
 *
 *   load, save   injectable for tests; they go to the payment method card
 *   mpesa        { load, save, test, testWithPhone, turnOff, loadAccounts } for the M-Pesa card (tests)
 */
const PaymentsStep = ({ ctx, load, save, mpesa = {} }) => (
  <StepFrame ctx={ctx} stepKey={STEP} heading={W.title} help={W.help} saved={isPassed(ctx.state, STEP)} saveLabel={ctx.nextLabel(STEP)}>
    <PaymentMethodsCard {...(load ? { load } : {})} {...(save ? { save } : {})} />
    <MpesaCard {...mpesa} />
    <p className="nl-setup-note">
      {W.moreText} <StepLink to={ctx.links.payments}>{W.moreLink}</StepLink>
    </p>
  </StepFrame>
);

export default PaymentsStep;
