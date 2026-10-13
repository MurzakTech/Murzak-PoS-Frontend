// Labels of the app shell, the menu, search, help and the other New look screens. Pure data. See strings.js.
// A label with a changing part is one string with {placeholders}; fill it with labels/fill.js.
export default {
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
