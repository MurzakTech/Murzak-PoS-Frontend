/**
 * Every visible word of the Suppliers page, the supplier panel and the supplier forms (ticket P4-6). A word with a changing part
 * is one string with {placeholders}, filled in with labels/fill.js. No word is written inside a component.
 */
const suppliers = {
  title: 'Suppliers',
  subtitle: 'The people you buy from, and what you owe them',
  addSupplier: 'Add supplier',
  export: 'Export CSV',
  exportName: 'suppliers-{view}-{date}.csv',
  exportDone: 'Saved {rows} as a spreadsheet file',
  noValue: '-',

  more: { label: 'More actions', groups: 'Supplier groups' },

  summary: { label: 'Suppliers summary', suppliers: 'Suppliers', owed: 'Owed to suppliers', dueSoon: 'Bills due soon' },

  owedFilter: { label: 'Show', all: 'All suppliers', owed: 'Owed' },

  filters: {
    search: 'Search suppliers',
    searchPlaceholder: 'Name or tax ID',
    group: 'Supplier group',
    allGroups: 'All groups',
    status: 'Status',
    activeOnly: 'Active',
    disabledOnly: 'Disabled',
    allStatuses: 'All',
    open: 'Filters',
    close: 'Hide filters',
    openCount: 'Filters ({count} on)',
  },

  types: { Company: 'Company', Individual: 'Individual' },

  list: {
    caption: 'Suppliers, in alphabetical order',
    captionOwed: 'Suppliers you owe, most owed first',
    cardsLabel: 'Suppliers',
    cardsLabelOwed: 'Suppliers you owe',
  },

  columns: { supplier: 'Supplier', group: 'Group', owed: 'Owed', nextDue: 'Next bill due', status: 'Status' },
  status: { active: 'Active', disabled: 'Disabled' },

  due: {
    today: 'Due today',
    soon: 'Due in {count} days',
    soonOne: 'Due in 1 day',
    late: '{count} days late',
    lateOne: '1 day late',
    cardLine: 'Next bill due: {date}',
  },

  empty: {
    noMatchTitle: 'No suppliers match',
    noMatchText: 'Try a different name, or clear the filters.',
    clear: 'Clear filters',
    allTitle: 'No suppliers yet',
    allText: 'Add the people you buy from, so you can see what you owe them and when each bill is due.',
    owedTitle: 'You do not owe any supplier',
    owedText: 'When you buy on credit, the supplier appears here with the amount you owe and the date it is due.',
    showAll: 'Show all suppliers',
  },

  csv: { supplier: 'Supplier', type: 'Type', group: 'Group', taxId: 'Tax ID', country: 'Country', currency: 'Currency', owed: 'Owed', nextDueDate: 'Next bill due', nextDueAmount: 'Next bill amount', dueSoon: 'Bills due soon', status: 'Status' },

  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

  panel: {
    loadingTitle: 'Supplier',
    position: '{current} of {total}',
    errorTitle: 'Could not load this supplier',
    errorText: 'Check your connection and try again.',
    retry: 'Try again',
    type: 'Type',
    taxId: 'Tax ID',
    group: 'Group',
    country: 'Country',
    currency: 'Currency',
    internal: 'Internal supplier',
    yes: 'Yes',
    owed: 'You owe',
    owesNothing: 'Nothing owed',
    nextBill: 'Next bill due',
    nextBillAmount: '{amount} on {date}',
    noNextBill: 'No bill is waiting',
    bills: 'Unpaid bills',
    billsNote: 'Showing {shown} of {total} unpaid bills, soonest due first.',
    billLine: 'Bill {number}',
    billDue: 'due {date}',
    noBills: 'No unpaid bills',
    seeAllBills: 'See all bills from this supplier',
    detailsNumber: 'Supplier number',
    disabledNote: 'This supplier is disabled, so it is not offered on new purchases.',
    edit: 'Edit',
    payBill: 'Pay bill',
    disable: 'Disable',
    enable: 'Enable',
  },

  disable: {
    title: 'Disable {name}?',
    message: 'You will not be able to pick this supplier on new purchases. Bills you already owe stay on record, and you can enable the supplier again at any time.',
    confirm: 'Disable supplier',
    cancel: 'Keep supplier',
    done: '{name} is disabled',
    undone: '{name} is enabled again',
    failed: 'The supplier could not be changed. Please try again.',
  },

  form: {
    newTitle: 'Add supplier',
    newSubtitle: 'Only the name is needed. You can add the rest later.',
    editTitle: 'Edit supplier',
    editSubtitle: 'Changing {name}',
    backToList: 'Back to suppliers',
    name: 'Supplier name',
    type: 'Type',
    typeFixed: 'The type cannot be changed once the supplier is saved.',
    taxId: 'Tax ID or PIN',
    taxIdHelp: 'The supplier KRA PIN, if you have it. It is printed on your purchase records.',
    group: 'Supplier group',
    groupNone: 'No group',
    country: 'Country',
    currency: 'Default currency',
    currencyHelp: 'Three letters, for example KES',
    internal: 'Internal supplier',
    internalHelp: 'Tick this for a supplier that is part of your own business, such as another branch.',
    internalFixed: 'This cannot be changed once the supplier is saved.',
    enabled: 'Enabled',
    enabledHelp: 'Untick to stop picking this supplier on new purchases. Bills you owe stay on record.',
    nameRequired: 'Enter the supplier name',
    currencyInvalid: 'Use the three letters of a currency, for example KES',
    duplicate: 'You already have a supplier called "{name}". Use a different name, or edit that one.',
    save: 'Save supplier',
    saved: '{name} was saved',
    savedAdd: '{name} was saved. You can add the next supplier.',
    failed: 'The supplier could not be saved. Please try again.',
    loadFailed: 'Could not load this supplier',
    loadFailedText: 'Check your connection and try again.',
    retry: 'Try again',
  },
};

export default suppliers;
