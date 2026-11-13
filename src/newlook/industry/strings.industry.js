/**
 * Every visible word of the industry profiles (pharmacy, restaurant and bar) and their pages: the general shop's words,
 * the dispensing register, the waiter cash-up and the kind of shop of each store. A word with a changing part is one
 * string with {placeholders}, filled in with labels/fill.js. No word is written inside a component.
 */
const industry = {
  // The till's words in a general shop, which is the till as it was before profiles. A store's profile replaces them.
  generalWords: {
    sale: 'Sale',
    sales: 'Sales',
    customer: 'Customer',
    product: 'Product',
    products: 'Products',
    held_sale: 'Held sale',
    held_sales: 'Held sales',
    charge: 'Charge',
    notes: 'Notes',
    cashier: 'Cashier',
    shift_report: 'Shift report',
    write_off: 'Stock adjustment',
  },
  generalLabel: 'General shop',

  register: {
    title: 'Dispensing register',
    subtitle: 'Every prescription-only medicine sold, for inspections',
    from: 'From',
    to: 'To',
    show: 'Show',
    download: 'Download (CSV)',
    loading: 'Loading the register…',
    errorTitle: 'The register could not be loaded',
    retry: 'Try again',
    emptyTitle: 'No prescription sales in this period',
    emptyText: 'Sales of medicines marked "Prescription only" appear here, with the patient and the prescriber.',
    summary: '{sales} sales, {lines} medicines dispensed',
    missing: '{count} sold offline without the prescription details: complete them on the sale.',
    truncated: 'Only the first 5,000 sales are listed. Choose a shorter period.',
    privacy: 'This list names patients. Keep it private and share it only with an inspector who asks for it.',
    tableLabel: 'Prescription sales',
    columns: {
      date: 'Date',
      medicine: 'Medicine',
      qty: 'Qty',
      batch: 'Batch',
      patient: 'Patient',
      prescriber: 'Prescriber',
      reference: 'Rx ref',
      dispensedBy: 'Dispensed by',
      sale: 'Sale',
    },
    statusMissing: 'Details missing',
    returned: 'Return',
    csvColumns: ['Date', 'Time', 'Sale', 'Medicine', 'Code', 'Quantity', 'Unit', 'Batch', 'Patient', 'Prescriber', 'Prescription ref', 'Dispensed by', 'Record'],
    fileName: 'dispensing-register-{from}-to-{to}.csv',
  },

  cashup: {
    title: 'Waiter cash-up',
    subtitle: 'What each waiter took today, and the cash to hand over',
    date: 'Day',
    show: 'Show',
    loading: 'Adding up the day…',
    errorTitle: 'The cash-up could not be loaded',
    retry: 'Try again',
    emptyTitle: 'No sales on this day',
    emptyText: 'Bills credited to a waiter, or rung up by them, appear here.',
    tableLabel: 'Takings by waiter',
    columns: {
      waiter: 'Waiter',
      bills: 'Bills',
      sales: 'Sales',
      cash: 'Cash to hand over',
      byMode: 'By payment',
      voids: 'Voids',
    },
    total: 'Total',
    voidsValue: '{count} ({amount})',
    noVoids: 'None',
    howCash: 'Cash to hand over is the cash taken less the change given back. Voids are items removed after the kitchen had them, each approved by a manager.',
  },

  reports: {
    label: 'Reports for your kind of shop',
    register: { title: 'Dispensing register', text: 'Every prescription-only medicine sold, with the patient and prescriber' },
    cashup: { title: 'Waiter cash-up', text: "Each waiter's takings, the cash to hand over and their voids" },
  },

  outlets: {
    title: 'Kind of shop, by store',
    text: 'Each store can be its own kind of shop. A pharmacy counter asks for prescriptions; a restaurant or bar asks a manager before a sent item is removed. A store left on "Same as the business" follows the business.',
    followBusiness: 'Same as the business ({label})',
    saved: '{store} saved.',
    loading: 'Loading the stores…',
    error: 'The stores could not be loaded.',
    ownerOnly: 'Only the owner can change this.',
  },
};

export default industry;
