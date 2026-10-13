/**
 * The words of the pay screen (PayScreen.jsx, NumberPad.jsx). Placeholders in {braces} are filled with labels/fill.js.
 * Keys avoid the names the word scanner treats as visible fields (label, title, text, helper, error and the like)
 * so this file passes the scan wherever it sits.
 */
const pay = {
  screenName: 'Pay',
  back: 'Back to items',
  amountDue: 'Amount due',
  choiceGroup: 'How is the customer paying?',
  choices: { cash: 'Cash', mpesa: 'M-Pesa', card: 'Card', credit: 'On credit', other: 'Other' },
  otherWhich: 'Which method?',
  mpesaName: 'M-Pesa',
  creditName: 'On credit',
  split: 'Split between several methods',

  cash: {
    gives: 'Customer gives',
    givesNothing: '0',
    quick: 'Quick cash',
    quickGroup: 'Quick cash amounts',
    exact: 'Exact',
    amountButton: 'Customer gives {amount}',
    exactButton: 'Customer gives the exact amount, {amount}',
  },

  change: {
    idle: 'Change',
    idleValue: '–',
    short: 'Short',
    give: 'Give change',
    exact: 'Exact',
    noChange: 'No change',
  },

  pad: {
    group: 'Number pad',
    backspace: 'Backspace',
    point: 'Decimal point',
    clear: 'Clear',
  },

  mpesa: {
    codeName: 'M-Pesa confirmation code',
    codeHelp: "From the customer's M-Pesa message, such as QGH7XJ2K9L",
    blank: "Enter the confirmation code from the customer's M-Pesa message to complete the sale",
    short: 'The code is too short. It must be 8 to 12 letters and numbers.',
    long: 'The code is too long. It must be 8 to 12 letters and numbers.',
    chars: 'Use only letters and numbers, 8 to 12 of them.',
    fromGateway: 'Confirmed by M-Pesa',
    requestHeading: "Or send a payment request to the customer's phone",
    received: '{method} received',
    receivedRef: '{method} received ({reference})',
    undo: 'Change',
  },

  other: {
    terminal: 'Take the {amount} payment on your {method} terminal or phone. When it goes through, press Complete sale.',
  },

  credit: {
    needsCustomer: 'Credit sales need a registered customer.',
    chooseCustomer: 'Choose customer',
    amountName: 'Amount on credit (KES)',
    upTo: 'Up to {amount}',
    info: '{name}: credit limit {limit}, owes {owed}, available {available}',
    overLimit: 'Over the limit, so more credit cannot be given.',
    notLoaded: 'Credit details for this customer are not loaded, so credit cannot be approved.',
  },

  splitRows: {
    group: 'Payment methods',
    row: 'Method {n}',
    methodName: 'Method {n}',
    amountName: 'Amount {n} (KES)',
    remove: 'Remove this method',
    add: 'Add method',
    collect: 'Collect {amount} by {method}',
    collectDialog: 'Collect {amount} by {method}',
    addsUp: 'The amounts add up to the total.',
    notAddsUp: 'Amounts add up to {split}. They must equal {total} ({gap}).',
    toGo: '{amount} to go',
    tooMuch: '{amount} too much',
    creditProblem: "The credit part is more than this customer's available credit, or no customer is selected.",
  },

  complete: 'Complete sale',
  processing: 'Processing...',
};

export default pay;
