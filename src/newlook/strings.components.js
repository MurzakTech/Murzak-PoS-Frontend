// Labels of the shared components (tables, filters, dialogs, toasts and the rest). Pure data. See strings.js.
// A label with a changing part is one string with {placeholders}, filled in with labels/fill.js.
const components = {
  // Chip.jsx
  chip: {
    statuses: {
      paid: 'Paid',
      unpaid: 'Unpaid',
      overdue: 'Overdue',
      partReturned: 'Part returned',
    },
  },
  badge: {
    overflow: '{max}+',
    countWithLabel: '{count} {label}',
  },

  // DetailPanel.jsx
  detailPanel: {
    previous: 'Previous item',
    next: 'Next item',
    close: 'Close details',
    loading: 'Loading the details',
    details: 'Details',
    noValue: '–',
  },

  // Dialog.jsx
  dialog: {
    close: 'Close',
  },
  confirmDialog: {
    confirm: 'Confirm',
    cancel: 'Cancel',
  },

  // Drawer.jsx
  drawer: {
    close: 'Close menu',
  },

  // Field.jsx
  field: {
    datePlaceholder: 'dd/mm/yyyy',
  },

  // FilterRow.jsx
  filterRow: {
    navigation: 'Filter the list',
    period: 'Period',
    periods: {
      today: 'Today',
      sevenDays: '7 days',
      thirtyDays: '30 days',
      custom: 'Custom',
    },
    from: 'From',
    to: 'To',
    rangeError: 'The end date is before the start date',
    search: 'Search',
    searchPlaceholder: 'Search',
    clearFilters: 'Clear filters',
  },

  // Pagination.jsx
  pagination: {
    navigation: 'Pagination',
    rowsPerPage: 'Rows per page',
    page: 'Page {current} of {pages}',
    previous: 'Previous',
    next: 'Next',
  },

  // Select.jsx
  select: {
    placeholder: 'Choose',
  },

  // Skeleton.jsx
  skeleton: {
    loading: 'Loading',
  },

  // SummaryRow.jsx
  summaryRow: {
    label: 'Summary',
    noValue: '–',
  },

  // Switch.jsx
  switch: {
    saved: 'Saved',
    failed: 'That did not save. Try again.',
  },

  // Table.jsx
  table: {
    loading: 'Loading the list',
    errorTitle: 'We could not load this list',
    errorDescription: 'Check your connection and try again. Nothing was changed.',
    retry: 'Try again',
    emptyTitle: 'Nothing here yet',
    emptyDescription: 'There is nothing to show.',
    captionWithHint: '{caption}. Press Enter on a row to open its details.',
  },

  // Tabs.jsx
  tabs: {
    countLabel: 'items',
  },

  // Toast.jsx
  toast: {
    close: 'Close message',
  },

  // format.js and Field.jsx (the money prefix)
  format: {
    currency: 'KES',
    money: '{sign}{currency} {amount}',
    count: '{count} {noun}',
    pluralEnding: 's',
    showing: 'Showing {shown} of {total}',
  },
};

export default components;
