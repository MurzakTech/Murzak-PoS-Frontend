import React from 'react';
import { StatusLabel } from '../components/Chip';
import { dueUrgency, dueWords } from './suppliersModel';

/**
 * The word and icon for a bill that is late or due within 3 days: a red alert and "3 days late", or a clock and "Due in 2 days".
 * Colour is never the only signal. Renders nothing for a bill that is not due soon.
 *
 *   due   the server's { date, amount, invoice, state, days } (state: overdue, soon or later)
 */
const DueStatus = ({ due }) => {
  const urgency = dueUrgency(due);
  if (!urgency) return null;
  return <StatusLabel status={urgency === 'overdue' ? 'overdue' : 'unpaid'}>{dueWords(due)}</StatusLabel>;
};

export default DueStatus;
