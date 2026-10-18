import React from 'react';
import Icon from '../components/Icon';
import { statusView } from './purchasesModel';

/**
 * The status of a purchase as an icon and a word (colour is never the only signal): Draft, Ordered, Received, Billed, Paid,
 * Returned or Cancelled. It uses the same look as the shared status label, which only knows the sale words.
 */
const PurchaseStatus = ({ status }) => {
  const view = statusView(status);
  return (
    <span className={`nl-status nl-status--${view.tone}`} data-status={status}>
      <Icon name={view.icon} />
      <span>{view.words}</span>
    </span>
  );
};

export default PurchaseStatus;
