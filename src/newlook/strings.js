/**
 * Every visible word of the New look shell and shared components, in one file (ticket P1-10).
 *
 * Change a label here and it changes everywhere. A label with a changing part is ONE string with {placeholders},
 * filled in with labels/fill.js, so a translator can reorder it. The words are the Spec's own names (Language and
 * formats); where an old name still reaches a screen from data, labels/renameMap.js turns it into its display
 * name. A test (labels/labelsInOnePlace.test.js) fails if a word is written inside a component instead of here,
 * or if an old term from the rename map appears anywhere in the shell or the shared components.
 *
 *   shell        the app shell: top bar, menu, search, help, access words, and the placeholder and old-address pages
 *   components   the shared components: tables, filters, dialogs, toasts, status words and the rest
 */

// ---------- The app shell and the other New look screens ----------
const shell = {
  shell: {
    skipLink: 'Skip to the page',
    siteName: 'Murzak POS',
    hintPage: 'Page',
    hintAction: 'Action',
  },

  help: {
    title: 'Help and shortcuts',
    description: 'These keys work on every page.',
    done: 'Done',
    shortcuts: [
      { keys: 'Ctrl K or /', what: 'Search pages and actions' },
      { keys: 'Tab', what: 'Move to the next control' },
      { keys: 'Shift Tab', what: 'Move to the previous control' },
      { keys: 'Enter or Space', what: 'Press the chosen button' },
      { keys: 'Esc', what: 'Close a dialog, menu or the side menu' },
    ],
  },

  topBar: {
    openMenu: 'Open menu',
    logoLabel: '{site}, go to Home',
    search: 'Search',
    searchShortcut: 'Ctrl K',
    storeMenu: 'Store: {name}. Change store',
    tillOpen: 'Till open',
    tillSince: 'since {time}',
    goToTill: 'Go to till',
    openTill: 'Open till',
    new: 'New',
    switchToLight: 'Switch to the light theme',
    switchToDark: 'Switch to the dark theme',
    help: 'Help and shortcuts',
    fallbackInitial: 'U',
    fallbackWho: 'your account',
    accountMenu: 'Account menu for {who}',
    signedIn: 'Signed in as {who}',
    signedInRole: 'Signed in as {who}, {role}',
  },

  nav: {
    mainMenu: 'Main menu',
    menu: 'Menu',
    expand: 'Expand menu',
    collapse: 'Collapse menu',
    soon: 'Soon',
    comingSoon: '(coming soon)',
    comingSoonItem: '{label} (coming soon)',
    home: 'Home',
    settings: 'Settings',
    groups: {
      sell: 'Sell',
      stock: 'Stock',
      buy: 'Buy',
      money: 'Money',
    },
    items: {
      sales: 'Sales',
      customers: 'Customers',
      products: 'Products',
      stockLevels: 'Stock levels',
      purchases: 'Purchases',
      suppliers: 'Suppliers',
      expenses: 'Expenses',
      reports: 'Reports',
    },
  },

  newMenu: {
    keywords: 'new add create {name}',
    items: {
      sale: { label: 'Sale', action: 'New sale' },
      product: { label: 'Product', action: 'Add product' },
      customer: { label: 'Customer', action: 'Add customer' },
      expense: { label: 'Expense', action: 'Add expense' },
      purchase: { label: 'Purchase', action: 'New purchase' },
    },
  },

  search: {
    title: 'Search',
    fieldLabel: 'Search',
    placeholder: 'Pages and actions',
    recent: 'Recent searches',
    results: 'Results',
    nothingMatches: 'Nothing matches “{query}”',
    nothingMatchesHelp: 'Try a page name such as Sales or Products, or an action such as add product.',
    emptyHelp: 'Type a page or an action, such as Sales or add product.',
  },

  pageHeader: {
    documentTitle: '{title} | {site}',
    tabsLabel: '{title} views',
  },

  access: {
    owner: 'Owner',
    manager: 'Manager',
    cashier: 'Cashier',
  },

  newLookShell: {
    sampleMainShop: 'Main shop',
    sampleBranch: 'Westlands branch',
    tillPanelNotice: 'The Till open panel is built with the till (ticket P3-6).',
    signOut: 'Sign out',
    emptyTitle: 'New look',
    emptySubtitle: 'The New look is on for this shop. No redesigned screens are ready yet; the rest of the app is unchanged.',
    backToCurrent: 'Back to the current screens',
    seeComponents: 'See the components',
  },

  placeholder: {
    fallbackTitle: 'This page',
    subtitle: 'This page is being rebuilt in the New look.',
    emptyTitle: 'Not built yet',
    emptyDescription: 'It will open here in the New look. Until then, the current screen does the same job.',
    openCurrent: 'Open the current screen',
  },

  redirectsPage: {
    title: 'Old addresses',
    subtitle: '{count} old addresses and the new pages they lead to.',
    previewTitle: 'Preview the redirects',
    previewSubtitle: 'Only on this device. Off, every old address keeps opening the current screen until its new page is built',
    off: 'Off',
    on: 'On',
    show: 'Show',
    all: 'All',
    status: {
      sure: 'Clear in the Spec',
      unclear: 'Needs a look',
      keep: 'Outside the redesign',
    },
    tableCaption: 'Old addresses and their new pages',
    columnOld: 'Old address',
    columnNew: 'New page',
    columnStatus: 'Status',
    columnNote: 'Note',
    columnTry: 'Try it',
    staysAsItIs: 'Stays as it is',
    tryIt: 'Try it',
  },
};

// ---------- The shared components ----------
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

// ---------- The chart kit ----------
const charts = {
  toggle: { label: 'View', chart: 'Chart', table: 'Table' },
  metrics: { revenue: 'Revenue', profit: 'Profit', count: 'Sales count' },
  metricSwitch: 'Show',
  previousPeriod: 'Previous period',
  thisPeriod: 'This period',
  soFar: 'so far',
  today: 'Today',
  noSale: 'No sales',
  state: {
    loading: 'Loading the chart',
    emptyTitle: 'No sales to show yet',
    emptyText: 'Sales appear here as soon as you make one.',
    errorTitle: 'We could not load this chart',
    errorText: 'Check your connection and try again. Nothing was changed.',
    retry: 'Try again',
  },
  sales: {
    titleRevenue: 'Daily revenue (KES)',
    titleProfit: 'Daily profit (KES)',
    titleCount: 'Daily sales (number of sales)',
    summary: '{title}, {range}, peak {peakDate} at {peakValue}',
    summaryOneDay: '{title}, {date}: {value}',
    peakLabel: '{date}, {value}',
    latestLabel: '{value}',
    tableDate: 'Date',
    tablePrevious: 'Previous period',
    tableSalesCount: 'Number of sales',
    tooltipCount: '{count} sales',
    tooltipOneSale: '1 sale',
    soFarTooltip: '{date} (so far)',
    emptySummary: '{title}, {range}: no sales',
  },
  payments: {
    title: 'How customers paid (KES)',
    summary: 'How customers paid, {range}: {parts}',
    part: '{name} {amount} ({percent}%)',
    tableMethod: 'Payment method',
    tableAmount: 'Amount (KES)',
    tableShare: 'Share',
    other: 'Other',
    totalLabel: 'Total',
    emptySummary: 'How customers paid, {range}: no payments',
  },
  topProducts: {
    title: 'Top products by revenue (KES)',
    summary: 'Top products by revenue, {range}: {first} first at {value}',
    tableProduct: 'Product',
    tableRevenue: 'Revenue (KES)',
    seeAll: 'See all products',
    emptySummary: 'Top products by revenue, {range}: no sales',
  },
  hours: {
    title: 'Busiest hours (average sales per hour)',
    summary: 'Busiest hours, {range}: the peak is {hour}, with {value} sales on average',
    tableHour: 'Hour',
    tableAverage: 'Average sales',
    tip: 'Consider a second cashier from {from} to {to}',
    am: '{hour}am',
    pm: '{hour}pm',
    emptySummary: 'Busiest hours, {range}: no sales',
  },
  sparkline: { label: 'Trend over the period' },
  monthProgress: { label: 'Day {day} of {days}', short: 'Month progress' },
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

const S = { shell, components, charts };

export default S;
