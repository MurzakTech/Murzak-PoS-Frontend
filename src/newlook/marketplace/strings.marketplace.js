/**
 * Every visible word of the Marketplace: what an owner can buy for their shop from inside the POS. A word with a
 * changing part is one string with {placeholders}, filled in with labels/fill.js. No word is written inside a component.
 *
 * Each product's words are here by its id; a product that is not listed here still shows, with the name the website gives it.
 */
const marketplace = {
  // The way in, from Settings, Business
  link: {
    title: 'Marketplace',
    subtitle: 'Buy an online storefront, a website and more for your shop',
    text: 'See what you can add to your shop and buy it',
  },

  title: 'Marketplace',
  subtitle: 'Add online selling and more to your shop. Set-up starts as soon as your payment is confirmed.',
  loadFailed: 'The marketplace could not be loaded.',
  retry: 'Try again',
  empty: 'Nothing is on offer right now',
  emptyHelp: 'Please check again later.',

  howTitle: 'How buying works',
  steps: [
    'Press Buy on what you want.',
    'Sign in to your Murzak account on the Murzak website and pay with M-Pesa or PayPal.',
    'As soon as the payment is confirmed, we start setting it up. You will see it in your Murzak account.',
  ],

  buy: 'Buy',
  buyNamed: 'Buy {name}',
  opensNewTab: 'Opens the Murzak website in a new tab.',
  perMonth: '{price} a month',
  setupOnce: 'plus {price} once',

  groups: {
    online: { title: 'Sell online', help: 'Reach customers who are not standing at your till.' },
    protect: { title: 'Keep your business safe', help: 'Protection for the things you rely on.' },
  },

  products: {
    'starter-storefront': {
      description: 'Your own online shop on its own web address. Shows the products and prices from this POS, takes orders with M-Pesa or cash, and works on any phone.',
    },
    'starter-woocommerce': {
      description: 'A WordPress website with an online shop (WooCommerce) already installed and ready to connect to this POS. Your shop address and keys are sent to your Murzak account.',
    },
    'starter-wordpress': {
      description: 'A ready-to-use WordPress website on its own web address, installed for you.',
    },
    'addon-backup-plus': {
      description: 'Backups every hour and kept for 30 days, so a mistake can be undone.',
    },
  },
};

export default marketplace;
