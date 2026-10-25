/**
 * An online order on its way to the till: who it is for, what was ordered and whether it is already paid, in the shape the till
 * reads (the same hand-over the Appointments page uses). The till prices nothing itself: each line keeps the price the shopper was
 * charged online.
 */
export const OPENABLE_IN_TILL = ['New', 'Confirmed', 'Ready'];

/** Whether an order can still be taken to the till: not cancelled, not already handed over */
export const canOpenInTill = (row) => Boolean(row) && OPENABLE_IN_TILL.includes(row.status);

export const packageOrderForTill = (row, order) => ({
  source: 'online_order',
  order: row.name,
  paid: Boolean(row.paid),
  customer: order.customer || '',
  customer_name: order.customer_name || order.customer || '',
  customer_phone: order.phone || '',
  items: (order.lines || []).map((line) => ({
    item_code: line.item_code,
    item_name: line.item_name || line.item_code,
    qty: Number(line.qty) || 1,
    rate: Number(line.rate) || 0,
  })),
});
