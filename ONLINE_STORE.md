# Online store: the pages shoppers see and the screens that run it

The backend (Murzak-PoS-Backend, `docs/ONLINE_STORE.md`) provides the online store, the website (WooCommerce) connection,
delivery fees and online orders. This repository has the screens for it.

## What a shopper sees (no sign-in)

| Address | Page |
|---|---|
| `/shop/<name>` | The shop's front page: search, categories, products, basket |
| `/shop/<name>/checkout` | Name, phone, delivery or pickup, the delivery fee, how to pay, place the order |
| `/track/<code>` | Where the order is. Opened from the link the shopper is given; updates by itself |

`<name>` is the web address name the owner chose. On a shop's own site the full link is
`https://<shop>.pos.murzaktech.tech/shop/<name>`.

Code: `src/newlook/storefront/`. It talks to the backend only through `src/api/storefrontApi.js`, which has its own plain
client with **no staff sign-in token**, so a business owner who is signed in on the same phone is treated as a shopper there,
and a refusal never sends anyone to the login page. `src/utils/publicPaths.js` also lists `/shop/` and `/track/` as public
for the app's standard "not signed in" handling.

- The basket is kept on the phone, per shop (`cart.js`). Only the product and quantity are ever sent; the **server prices the
  order**, including the delivery fee, and its total is the one that counts.
- English and Swahili (`strings.storefront.js`). The first visit follows the phone's language; the choice is remembered.
  The Swahili is a draft: a Kenyan Swahili speaker should read it.
- How an order was paid is remembered on the phone (`orderMemory.js`) so the order page offers "Send M-Pesa prompt" only for
  an M-Pesa order.

## What the owner and staff see (signed in): Settings, E-Commerce

`/ecommerce` has four tabs (the old "Digital Catalog & WhatsApp" tab only showed a link to a page that did not exist, and is
now the real store settings):

| Tab (`?tab=`) | Does |
|---|---|
| `orders` | Online orders: confirm, ready, delivered, cancel, mark paid, make a draft invoice |
| `digital_store` | My online store: address name, delivery and pickup, delivery fees (free, one fee, by area, by distance), payment, share link |
| `woocommerce` | The website connection, now with the address and secret to paste into WooCommerce so website orders arrive |
| `products` | Online products, with a "shown online" tick on each |

A new online order shows a message wherever the person is in the app (`OnlineOrderAlert`, mounted in `App.js`).

## Before relying on it

- **Server headers.** `deploy/nginx/security-headers.conf` now allows location for the site's own pages
  (`geolocation=(self)`). Without it the "Use my location" button (distance delivery fees) does nothing on a live site. Reload
  nginx on the shop servers after this is deployed.
- **Backend.** The pages need the backend with online selling deployed (and its migration run). "Shown online" needs the
  backend change that lets the product list include hidden products.
- **Test one real order of each kind on staging:** a pickup order, a delivery order in an area, and an M-Pesa order, and check
  each appears under Online orders. The automated tests replace the server, so they cannot prove this.

## Known gaps

- Staff screens are English only (the shop pages are English and Swahili).
- Distance fees are estimates (straight line times a road factor), not road distances.
- Product pictures are shown only when they are public files; others fall back to the illustration.

## The storefront as its own site (paid add-on)

A business can also have its storefront as its own small site, on its own address
`https://<shop>.cloud.murzaktech.tech`. It is the same shop pages, built on their own:

- **Build:** `REACT_APP_STOREFRONT_ONLY=true npm run build` produces only the online store (no till, no staff screens,
  no sign-in). The entry point (`src/index.js`) picks the build; `src/storefrontMain.js` is the storefront's.
- **Image:** `deploy/storefront/Dockerfile` makes one container image for every shop. The shop is chosen when the
  container starts: `SHOP_SLUG` (its name) and `ERP_HOST` (its own ERP site, `<shop>.erp.murzaktech.tech`).
- **Publishing:** `.github/workflows/storefront-image.yml` pushes `ghcr.io/murzaktech/murzak-storefront` on every
  change to the storefront on `main`. The website's provisioning (`starter-storefront`) pulls it. The package must be
  readable by the server (make it public, or give Coolify a registry login).
- **Safety:** the container's nginx passes on only the storefront's own calls (`storefront_api` and order tracking) and
  answers 404 to every other `/api` path. Cookies are never forwarded. The page and its calls share one address, so the
  ERP site needs no CORS setting.
- **Try it locally:** `docker build -f deploy/storefront/Dockerfile -t murzak-storefront .` then
  `docker run -p 8080:8080 -e SHOP_SLUG=<shop> -e ERP_HOST=<shop>.erp.murzaktech.tech murzak-storefront` and open
  `http://localhost:8080`.

The ERP site's nginx guard must let these storefront calls through without a login (see
`deploy/vps/nginx/00-murzak-pos-guard-map.conf` in the website repository).
