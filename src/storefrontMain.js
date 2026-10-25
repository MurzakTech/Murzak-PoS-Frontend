import React from 'react';
import ReactDOM from 'react-dom/client';
import './fonts.css';
import './index.css';
// The storefront pages use the shared building blocks one by one, so the styles the whole app gets through the shell
// are loaded here instead (colours, spacing, buttons, cards, dialogs).
import './newlook/tokens.css';
import './newlook/components/components.css';
import './newlook/components/data-components.css';
import './newlook/components/overlay-components.css';
import StandaloneShop from './newlook/storefront/standalone/StandaloneShop';
import { readShopName } from './newlook/storefront/standalone/shopConfig';

/**
 * The storefront-only app (see index.js). It reads which shop it serves, then shows that shop's online store.
 * No service worker: a shopper's page should always be the current one, and there is no till to keep working offline.
 */
readShopName().then((slug) => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <StandaloneShop slug={slug} />
    </React.StrictMode>
  );
});
