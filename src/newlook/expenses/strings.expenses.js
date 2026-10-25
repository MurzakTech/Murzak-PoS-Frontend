/**
 * Every visible word of the Expenses page, the expense panel and the Add expense form (ticket P5-1). A word with a changing part is
 * one string with {placeholders}, filled in with labels/fill.js. No word is written inside a component.
 */
const expenses = {
  title: 'Expenses',
  subtitle: 'What your shop spends to keep running, and where the money came from',
  addExpense: 'Add expense',
  export: 'Export CSV',
  exportName: 'expenses-{period}-{date}.csv',
  exportDone: 'Saved {rows} as a spreadsheet file',
  noValue: '-',

  noAccess: {
    title: 'Expenses are for owners and managers',
    text: 'Your sign-in does not include expenses. Ask the owner of the shop if you need to add one.',
    home: 'Back to Home',
  },

  summary: { label: 'Expenses summary', total: 'Running costs', count: 'Expenses', top: 'Biggest cost' },

  filters: {
    search: 'Search expenses',
    searchPlaceholder: 'Category, note or number',
    category: 'Category',
    allCategories: 'All categories',
    open: 'Filters',
    close: 'Hide filters',
    openCount: 'Filters ({count} on)',
  },

  list: {
    caption: 'Expenses, newest first',
    cardsLabel: 'Expenses',
  },

  columns: { date: 'Date', category: 'Category', note: 'Note', paidFrom: 'Paid from', amount: 'Amount' },

  receiptChip: 'Receipt photo',
  enteredElsewhere: 'Entered another way',

  // Where a row that was not added on this page comes from, by the kind of record behind it
  sources: {
    'Journal Entry': 'Journal entry',
    'Purchase Invoice': 'Supplier bill',
    'Payment Entry': 'Payment',
    'Expense Claim': 'Expense claim',
    'Stock Entry': 'Stock movement',
    Asset: 'Asset',
    other: 'Other entry',
  },
  addedHere: 'Added on this page',
  paidFromOther: 'Another account',

  empty: {
    noMatchTitle: 'No expenses match',
    noMatchText: 'Try a different word, or clear the filters.',
    clear: 'Clear filters',
    allTitle: 'No expenses in this period',
    allText: 'Add what you spend on rent, power, airtime and the like. It comes off your profit on Home.',
  },

  csv: { date: 'Date', category: 'Category', note: 'Note', paidFrom: 'Paid from', amount: 'Amount', addedBy: 'Added by', source: 'Source' },
  periods: { today: 'today', week: 'this-week', '7d': 'last-7-days', '30d': 'last-30-days', month: 'this-month', custom: 'custom' },

  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

  panel: {
    position: '{current} of {total}',
    amount: 'Amount',
    date: 'Date',
    paidFrom: 'Paid from',
    note: 'Note',
    noNote: 'No note',
    addedBy: 'Added by',
    source: 'Where it came from',
    receipt: 'Receipt photo',
    receiptAlt: 'Photo of the receipt for {category}',
    receiptLoading: 'Loading the photo',
    receiptFailed: 'The photo could not be loaded.',
    receiptRetry: 'Try again',
    receiptNone: 'No photo was added to this expense.',
    receiptOther: 'Receipt photos can be added only when an expense is added on this page.',
    refund: 'This is money back, so it lowers your running costs.',
    detailsReference: 'Record number',
    openBill: 'Open this bill',
  },

  form: {
    newTitle: 'Add expense',
    newSubtitle: 'Money your shop spent. It comes off your profit.',
    backToList: 'Back to expenses',
    amount: 'Amount',
    amountHelp: 'In shillings, no cents.',
    category: 'Category',
    categoryPlaceholder: 'Choose a category',
    categoryHelp: 'Only the expense accounts your books already have are offered.',
    paidFrom: 'Paid from',
    paidFromHelp: 'Where the money came out of.',
    paidFromNotSet: '{label} (not set up)',
    date: 'Date',
    dateHelp: 'Today or an earlier day.',
    note: 'Note',
    noteHelp: 'Optional, up to {max} characters. {left} left.',
    receipt: 'Receipt photo',
    receiptHelp: 'Optional. A picture of the receipt, up to {size} MB.',
    receiptChoose: 'Choose photo',
    receiptChange: 'Choose another photo',
    receiptRemove: 'Remove photo',
    receiptPreview: 'Photo of the receipt you chose',
    receiptName: '{name} ({size} MB)',
    receiptReading: 'Reading the photo',
    receiptBadType: 'Choose a picture (JPG, PNG, GIF or WebP).',
    receiptTooBig: 'This photo is {size} MB. Choose one of {max} MB or less.',
    receiptUnreadable: 'The photo could not be read. Please choose it again.',
    save: 'Save expense',
    saved: 'Expense of {amount} saved',
    savedAdd: 'Expense of {amount} saved. You can add the next one.',
    fromTill: 'Take it from the till drawer',
    fromTillHelp: 'If you have a till open, this cash comes out of its drawer, so the end of shift count agrees. Untick it if it was paid from the safe.',
    savedFromTill: 'Taken from the till. The drawer should now hold {amount}.',
    failed: 'The expense was not saved. Please try again.',
    optionsFailed: 'The choices could not be loaded.',
    retry: 'Try again',
    noCategories: 'Your books have no expense accounts to choose from yet. Ask your accountant to add one, then come back.',
    noPaidFrom: 'No way of paying is set up yet, so an expense cannot be saved. Ask your accountant to link an account to Cash, M-Pesa or Bank.',
    reasons: {
      no_mode: 'This shop does not have {label} set up.',
      no_account: '{label} has no account linked to it yet. Ask your accountant to link one.',
      account_unusable: 'The account linked to {label} cannot be used right now.',
      other: '{label} cannot be used right now.',
    },
    problems: {
      amount: 'Enter the amount',
      amountNumber: 'The amount must be a whole number of shillings',
      amountZero: 'The amount must be more than 0',
      category: 'Choose a category',
      paidFrom: 'Choose what the money was paid from',
      date: 'Enter the date, for example 16/10/2026',
      dateFuture: 'The date cannot be in the future',
      noteLong: 'The note can be at most {max} characters',
    },
  },
};

export default expenses;
