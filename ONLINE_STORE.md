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

## Getting online and sharing (owner and staff)

- **Get your store ready** checklist at the top of My online store: name and address saved, delivery or pickup, payment, products
  chosen, store open. It disappears when all five are done.
- **Share your store:** copy the link, a **QR code**, **Print a poster** (shop name, "Scan to shop online", QR, link) and **Share on
  WhatsApp** (a ready message with the shop name and link).
- **Online products:** a **Share on WhatsApp** button per product (name, price, link) while the store is open.
- **Order details:** **Message the customer on WhatsApp** (ready-made words for Confirmed, Ready for pickup or delivery,
  Delivered, Cancelled, sent to the order's phone number) and **Print packing slip** (tick boxes for each item).
- The app sends nothing itself: every message opens WhatsApp with the words ready, and the owner presses send. Code:
  `src/newlook/ecommerce/shareModel.js`.

## Shop logo and link previews

- **Logo:** My online store (and the guided setup, step 1) has **Add a logo**. It is shrunk and uploaded like a product photo and
  saved with the store settings as `logo`. The shop shows it in its header on every shop page.
- **Name in the tab and share tags:** while a shop page is open the browser tab shows the shop's name, and the page carries the
  name, line and logo as `description` and `og:` tags (`storefront/shopMeta.js`). They are put back when the shopper leaves.
- **Preview in WhatsApp:** WhatsApp and similar apps do **not** run the page, so the tags above never reach them. They need the
  server to send the tags. This needs two things that are NOT built or tested yet:
  1. The backend call `storefront_api.share_page(slug)` returning a small HTML page with `og:title` (shop name), `og:description`
     (line), `og:image` (the logo as a full web address) and `og:url`; 404 for a shop that is not open.
  2. The web server rule in `deploy/nginx/shop-share-preview.conf`, which sends those apps that page and everyone else the app.
  Test with `curl -A "WhatsApp/2.23" https://<shop>/shop/<name>`, then share a real link in a chat (previews are cached by the
  app; add `?v=2` to see a change).
- The backend settings must also accept and return `logo` (a file address) in `save_online_store`, `get_online_store` and the
  shopper's `get_store`.

## Go online: the guided setup

The checklist at the top of My online store has **Start guided setup** (or **Continue guided setup** when some steps are done). It
opens at the first step that still needs something and asks one thing at a time:

1. **Your store:** store name, web address name (checked while typing), WhatsApp number.
2. **Orders:** delivery, pickup or both; the pickup address; free delivery or one fee (fees by area or distance are kept if
   already set, and changed on the settings page).
3. **Payment:** cash, and M-Pesa when it is set up.
4. **Products:** how many are shown; **Show all my products** shows every product in one go; or choose them one by one.
5. **Open:** **Open my store** saves everything and turns the store on, then shows the link, a QR code, Copy and Share on WhatsApp.

Nothing is saved until the last step. A step cannot be left with something missing, and the message says what. A shop with only
one place to sell from has it chosen automatically. Code: `GoOnlineWizard.jsx`, rules in `wizardModel.js`.

## Product details for the online store (description and extra photos)

- **Edit product** now has an **Online store** card (for people holding the catalogue permission): show or hide the product, a
  description (up to 1000 letters) and up to 6 extra photos. It saves on its own button, apart from the product's own form.
  Code: `src/newlook/products/OnlineProductSection.jsx`.
- **Online products tab:** **Show all listed** and **Hide all listed** act on the products currently in the list (a search narrows
  it), 100 at a time. **Sync Products** (to the website) is now owner only.
- **On the shop:** a product with a description or extra photos shows a **Details** link that opens a window with the photos
  (tap a small one to see it big), the price and the description, and Add.

### What the backend must provide (agreed: it can handle description and extra photos)

| Call | Does | Fields |
|---|---|---|
| `online_store_api.get_product_online(item_code, company)` | Read | reply `data`: `description` (text), `images` (list of file addresses, in order), `show_online` (1 or 0) |
| `online_store_api.save_product_online(item_code, description, images, show_online, company)` | Save | `description` up to 1000 letters; `images` up to 6 addresses of files already uploaded with the standard file upload (`/files/...`); `show_online` 1 or 0 |
| `storefront_api.list_products` (shoppers) | Rows gain | `images` (list of file addresses). `description` and `image` were already sent |

**To check with the backend before relying on this.** Frappe can hold these (the Item's own description and image fields, plus a
child table or attachments for the extra photos), but how the backend will do it has not been decided or tested. Decide and
confirm: where each field is stored, that `list_products` for shoppers returns `images` without exposing private files, that
photos uploaded as public files are the ones listed, and a limit on file sizes. Until then the product details card will show
"could not be loaded".

The names are in one place, `src/api/onlineStoreApi.js` (`getProductOnline`, `saveProductOnline`); change them there if the backend
chooses different names. The main product photo stays on the product itself (`image`); `images` are the extras. The same
catalogue permission must be checked on the server.

## Who can do what (the online store is a module)

The menu item **Online store** (under Sell) shows only to a person whose role holds some part of the module. Each tab needs its
own permission (`onlineStoreAccess` in `src/config/roleAccessConfig.js`):

| Tab | Permission | Roles that hold it (the owner roles hold all four) |
|---|---|---|
| Online orders | `orders` | Sales Manager, Online Orders Clerk |
| My online store | `settings` | Sales Manager |
| Online products | `catalogue` | Sales Manager, Item Manager |
| My website (WooCommerce) | `integrations` | Owner roles only |

- A person who asks for a tab they may not see is shown the first one they may. The website tab's keys are not even requested for
  anyone but an owner.
- The new-order alert is shown only to people holding `orders`.
- **Online Orders Clerk** is a new role name. It must be created in the system (Settings, Team, Roles) before it can be given to
  anyone.
- This only decides what is drawn. The backend must check the same rules on every call (see ONLINE_STORE_AUDIT.md, section 7).

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
