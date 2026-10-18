/**
 * Every visible word of the first-time set-up (ticket P5-4): the wizard at /new-look/setup and the "Set up now" banner on Home.
 * Plain words for a shop owner; money is KES; no old terms (see labels/renameMap.js).
 */
const setup = {
  title: 'Set up your shop',
  subtitle: 'Step {number} of {total}. It takes a few minutes, and you can skip any step.',
  steps: {
    business: 'What you sell',
    shop: 'Shop name',
    cash: 'Opening cash',
    payments: 'Payment methods',
    products: 'First products',
    staff: 'Your team',
  },
  stepState: { current: 'You are here', done: 'Done', skipped: 'Skipped', todo: 'Not done yet' },
  listLabel: 'Set-up steps',

  actions: {
    back: 'Back',
    skipStep: 'Skip this step',
    skipSetup: 'Skip for now',
    next: 'Save and continue',
    nextPlain: 'Continue',
    finish: 'Finish',
  },
  skipSetupHelp: 'You can finish set-up later. Nothing you saved is lost.',
  saveFailed: 'That could not be saved. Please try again.',
  loadFailed: { title: 'We could not open set-up', text: 'Check your connection and try again.', retry: 'Try again' },
  loading: 'Opening set-up',
  ownerOnly: { title: 'Only the owner can set up the shop', text: 'Ask the business owner to open set-up. You can carry on with your work.', home: 'Back to Home' },
  finished: 'Set-up is finished. You can change any of it later in Settings.',
  finishedAgain: 'You finished set-up before. You can change any step here.',
  skippedDone: 'Set-up skipped for now. Nothing you saved is lost.',

  business: {
    title: 'What do you sell?',
    help: 'We ask this once. It turns on the features that suit your shop. Nothing is taken away.',
    group: 'What you sell',
    required: 'Choose what you sell, or skip this step.',
    fromSignup: 'Chosen for you from what you told us when you signed up. Change it if it is not right.',
    already: 'You told us this already. Change it only if it was a mistake.',
    turnsOn: 'Turns on:',
    options: {
      pharmacy: {
        label: 'Pharmacy',
        text: 'Medicines and health products.',
        features: 'Expiry dates and the Expiry tab, and prescription-only products.',
      },
      retail: {
        label: 'Retail',
        text: 'Goods you count and sell, such as groceries, clothes or electronics.',
        features: 'Barcodes and units come first when you add a product.',
      },
      services: {
        label: 'Services',
        text: 'Work you charge for, such as a salon, repairs or hire.',
        features: 'Services are listed first.',
      },
      other: {
        label: 'Other',
        text: 'Anything else.',
        features: 'Nothing extra is turned on.',
      },
    },
    saved: 'Saved. {kind} features are on.',
    savedOther: 'Saved. No extra features are turned on.',
  },

  shop: {
    title: 'Your shop',
    help: 'This is how your shop appears on receipts and reports.',
    name: 'Shop name',
    nameHelper: 'The name was set when your account was made. It cannot be changed here.',
    taxId: 'Tax ID (optional)',
    taxIdHelper: 'Your KRA PIN. It prints on tax invoices. You can add it later.',
    taxIdPlaceholder: 'For example A123456789B',
    taxIdBad: 'Check the tax ID. It is letters and numbers only, like A123456789B.',
    loading: 'Loading your shop details',
    loadFailed: 'We could not load your shop details. You can skip this step and add the tax ID later in Settings.',
    retry: 'Try again',
    saved: 'Tax ID saved.',
    moreLink: 'Address, phone, email and currency',
    moreText: 'Other business details are in Settings.',
  },

  cash: {
    title: 'Usual opening cash',
    help: 'How much cash you usually start the till with. The till suggests it when you open it, and you can change it each time.',
    amount: 'Opening cash',
    helper: 'Leave this empty if it is different every day.',
    bad: 'Enter an amount of zero or more.',
    saved: 'Saved. The till will suggest {amount}.',
    savedNone: 'Saved. The till will not suggest an amount.',
    tooBig: 'That amount is too large. Check it.',
  },

  payments: {
    title: 'How do customers pay?',
    help: 'Switch on the ways your till takes money. Each switch saves by itself.',
    moreLink: 'M-Pesa keys, bank accounts and other payment settings',
    moreText: 'Payment keys and bank accounts are set up in Settings.',
  },

  products: {
    title: 'Add your first products',
    help: 'Choose the way that suits you. You can add more at any time.',
    add: { title: 'Add a product yourself', text: 'Best if you only sell a few things. A name and a price are enough.', action: 'Add a product' },
    starter: { title: 'Start with ready-made products', text: 'We load a ready-made list for your kind of shop. Edit or remove anything afterwards.', action: 'See starter products' },
    file: { title: 'Add many from a file', text: 'Already have your list in Excel or CSV? Add hundreds at once.', action: 'Add from a file' },
    stock: { title: 'Enter what you have in stock', text: 'Tell us how much of each product you have today.', action: 'Add opening stock' },
    opensNote: 'Set-up waits for you. Open it again from Home to carry on.',
  },

  staff: {
    title: 'Add your team',
    help: 'Give cashiers and managers their own sign-in, so each sale shows who made it.',
    action: 'Add your team',
    text: 'You can do this any time in Settings, under Team.',
    laterTitle: 'More you can set up later',
    later: {
      business: 'Business details: address, phone, email',
      till: 'Till settings: discounts and prices at the till',
      tax: 'Tax and eTIMS',
    },
  },

  banner: {
    title: 'Set up your shop',
    text: 'Tell us what you sell and we turn on the right features. It takes a few minutes and every step can be skipped.',
    continueTitle: 'Finish setting up your shop',
    continueText: 'You have started. Carry on where you stopped.',
    setUp: 'Set up now',
    continue: 'Carry on',
    notNow: 'Not now',
    notNowHelp: 'We will ask again in 7 days.',
    label: 'Shop set-up',
  },
};

export default setup;
