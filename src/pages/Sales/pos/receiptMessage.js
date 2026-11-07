/** The short message sent to a customer with their receipt: who it is from, the receipt number and what they paid. */
export const receiptMessage = ({ shop, number, total }) =>
  `Thank you for shopping at ${shop || 'our shop'}. Receipt ${number || ''}: ${total || ''} paid. We hope to see you again.`.replace(/\s+/g, ' ').trim();
