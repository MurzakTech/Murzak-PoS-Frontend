/**
 * The words of the till pieces written by the lead (kept cart, leave dialog, stock note). Other till pieces keep
 * their words in their own strings.<area>.js files.
 */
const till = {
  leave: {
    title: 'Leave the till?',
    message: 'The sale in progress has items in it. You can put it on hold and come back to it, or clear it.',
    messageCount: 'The sale in progress has {count} items in it. You can put it on hold and come back to it, or clear it.',
    messageOne: 'The sale in progress has 1 item in it. You can put it on hold and come back to it, or clear it.',
    hold: 'Hold sale and leave',
    clear: 'Leave and clear',
    stay: 'Stay',
    holding: 'Holding the sale',
    holdFailed: 'The sale could not be put on hold, so it is still here. Finish it or try again.',
    holdLabel: 'Held at {time}',
  },
  stock: {
    only: 'Only {qty} left',
    none: 'None left in stock',
  },
};

export default till;
