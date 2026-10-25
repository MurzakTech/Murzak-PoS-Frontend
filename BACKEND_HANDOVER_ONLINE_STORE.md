# Backend Handover: Online Store

For the team that owns `Murzak-PoS-Backend`. Written from the frontend repository on 2026-10-25. Everything here is what the frontend **already calls or sends**, or **will need next**. Nothing in this file has been checked against the backend code, because the backend was not available when it was written. Where this note guesses, it says so.

Companion documents in the frontend repository: `ONLINE_STORE.md` (what the screens do), `ONLINE_STORE_AUDIT.md` (why, and the roadmap).

## 1. In plain words

The frontend now has a complete set of online store screens: a shopper's shop, the owner's setup, orders, product details, sharing, and "Open in till". Several of them depend on backend behaviour that does not exist yet, or that nobody has confirmed. Until it does, those screens show an error message or quietly do less.

**Nothing breaks if you do nothing:** the frontend tolerates a missing call (the card says it "could not be loaded") and ignores fields it does not recognise. **But two items carry a real risk of wrong data**: a till sale for an online order may take stock twice (section 4.5), and access rules are only drawn in the browser (section 5).

## 2. Summary: what is needed, in order

| # | Item | Needed for | Priority | Section |
|---|---|---|---|---|
| 1 | Enforce access on every online store call, by the four permissions | Safety. The frontend only hides screens | **First** | 5 |
| 2 | `online_order` on a till sale: link, release the hold, no double stock, mark paid safely twice | Open in till | **First** (stock risk) | 4.5 |
| 3 | `get_product_online` and `save_product_online` | Description and extra photos | High | 4.1 |
| 4 | `images` in the shopper's product rows | Product details window on the shop | High | 4.2 |
| 5 | `logo` in the store settings | Shop logo | Medium | 4.3 |
| 6 | `share_page(slug)` and a web server rule | Shop link preview in WhatsApp | Medium | 4.4 |
| 7 | Store preference: Quick shop or Full shop (WooCommerce) | Choosing the main shop | Medium | 6.1 |
| 8 | A business-level "online store module is on" flag | Menu item only for businesses that sell online | Low | 5.3 |
| 9 | WooCommerce sync depth, status write-back, stock reservation | A good Full shop | Planned | 6.2 |
| 10 | Provisioning a WordPress site per shop, single sign-on, plugin and theme control | The owner builds and iterates on the shop | Planned, needs a decision | 6.3 |

## 3. Calls the frontend already relies on

These are called today by code in `src/api/`. Please confirm each exists and behaves as the frontend expects.

| Module | Method | Used by | File |
|---|---|---|---|
| `murzak_pos.api.online_store_api` | `get_online_store(company)` | Owner's store settings | `onlineStoreApi.js` |
| | `check_store_slug(slug, company)` | Web address name check while typing | |
| | `save_online_store(settings, company)` | Save settings, open the store | |
| | `set_items_online(item_codes, show, company)` | Show or hide products (also "Show all", bulk) | |
| `murzak_pos.api.online_orders` | `list_online_orders(company, status, channel, page, page_size)` | Online orders list | |
| | `get_online_order(order, company)` | Order details, Open in till | |
| | `set_online_order_status(order, status, company)` | Confirm, ready, delivered, cancel | |
| | `mark_online_order_paid(order, company)` | Mark paid (also called by the till) | |
| | `create_invoice_for_online_order(order, company)` | Draft invoice | |
| | `track_online_order(token)` | Shopper's order page (no sign-in) | `storefrontApi.js` |
| `murzak_pos.api.storefront_api` | `get_store(slug)` | Shop front page (no sign-in) | |
| | `list_products(slug, search, category, page, page_size)` | Shop products | |
| | `quote_delivery(slug, lines, delivery_area, latitude, longitude)` | Delivery fee | |
| | `checkout(...)` | Place an order | |
| | `pay_for_order(token)` | M-Pesa prompt again | |
| `murzak_pos.api.ecommerce_api` | `get_ecommerce_settings`, `save_ecommerce_settings`, `test_woocommerce_connection`, `sync_woocommerce_catalog`, `get_ecommerce_products`, `get_order_webhook`, `regenerate_order_webhook` | Website (WooCommerce) tab and "Online products" tab | `ecommerceApi.js` |

Two things to check on the existing calls:

1. **`get_ecommerce_settings` returns the consumer key and secret to the browser.** Only the owner role should receive them; everyone else should get them masked or not at all. The frontend no longer asks for them unless the person is an owner, but the server must not rely on that.
2. **`get_order_webhook` returns the webhook secret.** Same rule: owner only.

## 4. New or changed behaviour

### 4.1 A product's online details (new)

The Edit product screen has an "Online store" card: show or hide, description, up to 6 extra photos. Names are defined in one place, `src/api/onlineStoreApi.js` (`getProductOnline`, `saveProductOnline`). If you choose different names, tell the frontend or change them there.

**`murzak_pos.api.online_store_api.get_product_online(item_code, company)`**

Reply:

```json
{
  "success": true,
  "data": {
    "description": "Pishori rice, 2 kg bag.",
    "images": ["/files/rice-1.jpg", "/files/rice-2.jpg"],
    "show_online": 1
  }
}
```

**`murzak_pos.api.online_store_api.save_product_online(item_code, description, images, show_online, company)`**

| Field | Rule |
|---|---|
| `description` | Text, up to 1000 letters. The frontend trims and cuts it, but the server must too |
| `images` | List of up to 6 file addresses (`/files/...`), in the order to show. The frontend uploads each file first with the standard Frappe `upload_file` call as a **public** file and sends only the address |
| `show_online` | `1` or `0` |

A refusal is `{ "success": false, "message": "..." }` with a sentence an owner can read; the frontend shows it as is.

**Decision needed: where it is stored.** Frappe can hold all three. This has not been decided or tested. Options, so the team can choose:

| Field | Possible home |
|---|---|
| Description | The Item's own `description` field (or a separate online description, if the till and receipts should keep a different one) |
| Main photo | The Item's `image` field (already used by the till, the frontend does not change it) |
| Extra photos | A child table on Item (a new row per photo, with an order), or File attachments on the Item |
| Shown online | Whatever `set_items_online` already uses |

Please confirm: photos are attached as public files, the 6 and 1000 limits are enforced, and a deleted or replaced photo does not leave an orphan file.

### 4.2 Shopper's product rows (changed)

`storefront_api.list_products` already returns `description` and `image` per product. Please add:

```json
{ "item_code": "RICE", "item_name": "Rice", "price": 150, "unit": "Kg", "in_stock": true,
  "low_stock": null, "category": "Food", "description": "Pishori rice...",
  "image": "/files/rice-main.jpg", "images": ["/files/rice-1.jpg", "/files/rice-2.jpg"] }
```

`images` is the extra photos, in order, **public files only** (never a private file's address). The shop shows a "Details" link only when a product has a description or at least one extra photo. Description is shown as plain text, so please send plain text, not HTML.

### 4.3 Shop logo (changed)

Add `logo` (a file address such as `/files/logo.png`, or empty) to:

- `save_online_store(settings)`: accept `logo`. The frontend sends it on every save, including the empty string to remove it.
- `get_online_store`: return it.
- `storefront_api.get_store(slug)`: return it, so the shop header can show it.

The frontend uploads the logo with the standard file upload as a public file, shrunk to at most 1000 pixels.

### 4.4 Link preview in WhatsApp (new, needs the web server too)

WhatsApp, Facebook, Telegram and similar apps read a link's preview from the page the **server** sends. They do not run the web app. So the shop name and logo set in the browser (`src/newlook/storefront/shopMeta.js`) never reach them.

**Backend: `murzak_pos.api.storefront_api.share_page(slug)`**, a public call that returns a small HTML page, not JSON:

```html
<!doctype html><html><head>
<meta charset="utf-8">
<title>Duka ya Amina</title>
<meta property="og:type" content="website">
<meta property="og:title" content="Duka ya Amina">
<meta property="og:description" content="Fresh every day">
<meta property="og:image" content="https://duka.pos.murzaktech.tech/files/logo.png">
<meta property="og:url" content="https://duka.pos.murzaktech.tech/shop/duka">
</head><body></body></html>
```

Rules: `og:image` must be a **full web address** (a bare `/files/...` does not work in a chat). Return 404 for a shop that is not open. Escape every value. The logo should be reasonably large and not tiny; WhatsApp ignores very small images.

**Web server:** `deploy/nginx/shop-share-preview.conf` in the frontend repository sends those apps to `share_page` and everyone else to the normal app. **It has never been run**: nginx was not available when it was written. Whoever deploys it should test with:

```
curl -A "WhatsApp/2.23" https://<shop>/shop/<name>     # should show the tags above
curl https://<shop>/shop/<name>                        # should show the normal app
```

then share a real link in a WhatsApp chat (the app caches previews; add `?v=2` to see a change).

### 4.5 A till sale for an online order (new, **read this one carefully**)

"Open in till" takes an online order to the till, where the cashier takes payment and hands over the goods. The sale is sent to the existing `create_pos_invoice` (and to `create_sales_invoice` when the server asks for it) with one extra field:

```json
{ "customer": "CUST-001", "items": [ ... ], "payments": [ ... ], "client_reference": "...", "online_order": "SO-0001" }
```

After the sale goes through, the till **also calls `mark_online_order_paid(order, company)`**, unless the order was already paid or the sale was put on credit. It does **not** change the order's status; staff mark it Delivered under Online orders.

What the backend needs to do when `online_order` is present:

| # | Requirement | Why |
|---|---|---|
| 1 | Check the order exists, belongs to the same company, and is not cancelled or already settled by another sale | Stops a sale being tied to the wrong order, or the same order being sold twice |
| 2 | **Release the stock held for the order and take it once, from the sale** | Otherwise stock is counted twice (held, then sold). **This is the main risk** |
| 3 | Link the sale and the order both ways | Reports, refunds, audit |
| 4 | Make `mark_online_order_paid` safe to call twice (a second call does nothing and does not fail) | The till calls it after the link already marked it paid |
| 5 | Stop `create_invoice_for_online_order` creating a second invoice for an order already settled by a till sale | Otherwise the customer is invoiced twice |
| 6 | Make the channel available to reports ("Online" versus "Till") | Sales by channel |
| 7 | Treat a retry with the same `client_reference` as the same sale (already the case) | The till retries lost replies |

Until the backend reads `online_order`, the field is ignored and a till sale for an online order **may take stock a second time**. Please test one real order of each kind on staging: unpaid pickup paid at the till, an already-paid M-Pesa order handed over at the till, and a sale on credit.

The unused-field behaviour is safe in Frappe (extra arguments are dropped), but nothing links.

## 5. Access control (the module with roles)

### 5.1 What the frontend assumes

The online store is a module with four permissions. The frontend decides what to draw from the person's **role names** (`src/config/roleAccessConfig.js`, `onlineStoreAccess`). The server must enforce the same rules; the frontend cannot.

| Permission | What it allows | Roles that hold it (the owner roles hold all four) |
|---|---|---|
| `orders` | View online orders; confirm, ready, delivered, cancel; mark paid; make an invoice; open in till | Sales Manager, **Online Orders Clerk** |
| `catalogue` | Show or hide products; edit a product's description and photos | Sales Manager, Item Manager |
| `settings` | The store's address, delivery, payment, WhatsApp number, logo, open or close | Sales Manager |
| `integrations` | WooCommerce keys, webhook secret, sync to the website, and later plugin and theme control | **Owner roles only** |

Owner roles: Administrator, System Manager, Business Owner.

### 5.2 What each call must check

| Call | Needs |
|---|---|
| `list_online_orders`, `get_online_order`, `set_online_order_status`, `mark_online_order_paid`, `create_invoice_for_online_order` | `orders` |
| A till sale that carries `online_order` | The normal sale permission **and** `orders` |
| `set_items_online`, `get_ecommerce_products`, `get_product_online`, `save_product_online` | `catalogue` |
| `get_online_store`, `save_online_store`, `check_store_slug` | `settings` |
| `get_ecommerce_settings`, `save_ecommerce_settings`, `test_woocommerce_connection`, `sync_woocommerce_catalog`, `get_order_webhook`, `regenerate_order_webhook` | `integrations` |
| The live "new online order" message | `orders` (the frontend only listens if the person holds it, but the message should only be sent to people who do) |
| `storefront_api.*`, `track_online_order`, `share_page` | Public. Must never expose anything private (see 5.4) |

### 5.3 New role and module flag

- **Create the role `Online Orders Clerk`** in the system. It only needs the `orders` permission and a way to reach the Online orders screen. Until it exists, no one can be given it.
- **Optional, low priority:** a flag on the business ("online store module is on") returned with the user's profile, so the Online store menu item only shows for businesses that sell online. Today it shows by role only.

### 5.4 Public calls must not leak

The shopper's calls need no sign-in. Please confirm they never return: cost prices, stock quantities beyond the "only N left" figure, other customers' details, private files, or the keys and secrets. `track_online_order` is opened from a link containing a token; the token should be long and unguessable, and the reply should show only the order's number, status, method, paid, total, date and shop name (the frontend assumes this).

## 6. WordPress and WooCommerce (the "Full shop")

The direction is that the shop is based on WordPress and WooCommerce, owners can prefer it, and owners can build and iterate on looks, features and plugins. The frontend has the connection screen only. These are the backend and infrastructure needs, from `ONLINE_STORE_AUDIT.md` section 8.

### 6.1 Store preference (needed first)

Store, per business, which shop is the main one: `store_engine` = `quick` (the built-in shop) or `woocommerce`. Return it in `get_online_store` and accept it in `save_online_store`. The main shop decides which address the share link, QR code, poster and WhatsApp messages use. Not built on the frontend yet; it needs this storage.

### 6.2 Sync, status and stock questions

1. What does `sync_woocommerce_catalog` send today: description, extra photos, categories, variants, prices per price list, decimal units?
2. Can a status change made in the POS (confirmed, ready, delivered, cancelled) be written back to the WooCommerce order, so the customer's website emails match?
3. Does a website order or an unpaid online order **hold stock** in the POS? Is the hold released on cancel?
4. Can delivery areas, fees and payment methods set in the POS be created as WooCommerce shipping zones and payment methods, so they are typed once?

### 6.3 Owning the site: needs a business decision first

| Option | Meaning |
|---|---|
| A. Bring your own site | The owner already has WordPress and WooCommerce and connects it (today) |
| B. Murzak provisions the site | The POS creates a WordPress and WooCommerce site for the shop, pre-connected |

The audit recommends offering both, with B ("Create my shop for me") as the default. B needs hosting, backups, updates and security on your side. Questions:

1. Can the backend create a site per business (multisite, containers or a managed host), and at what monthly cost per shop?
2. Can it sign an owner into WordPress without a second password (single sign-on), for an "Open my shop editor" button?
3. Which WordPress REST calls (list, install from the WordPress.org directory, activate and update plugins; switch themes) work on the target hosting, and which need server access? Theme changes are less uniform than plugin changes across versions and hosts.
4. Backups before any plugin or theme change, with rollback.
5. Who is responsible for security updates.
6. Plugin and theme changes written to the audit trail, and available only to the `integrations` permission.

All WordPress calls must go through the backend. Site passwords must never reach the browser.

## 7. Later requests (not asked for yet)

Listed so the design does not block them:

- **Decimal quantities** in `checkout`, `quote_delivery` and the shopper's basket, for kilograms and litres. Today the shop sends whole numbers only (1 to 99).
- **Variants** (size, colour) with stock per variant.
- **Bookings**: services, staff, time slots and deposits for salons and similar businesses, reusing the appointments API.
- **Prescription upload and approval** before dispatch, for pharmacies.
- **Opening hours** and scheduled delivery or pickup times.
- **Card payments** through the existing payment gateways.

## 8. Test checklist for staging

Please run these once the items above are in, and record the result next to each.

| # | Test | Expected |
|---|---|---|
| 1 | An Online Orders Clerk opens Online orders | Sees orders; cannot open store settings, products or the website keys, and the server refuses those calls |
| 2 | A Sales Manager calls `get_ecommerce_settings` | Refused or masked; no key or secret in the reply |
| 3 | An Item Manager calls `save_online_store` | Refused |
| 4 | Save a product's description and 3 photos, then open it on the shop | "Details" link appears; photos and text show |
| 5 | Save 7 photos or a 1200-letter description | Refused or cut, with a plain message |
| 6 | Save the store with a logo, open the shop | Logo in the header; empty logo removes it |
| 7 | `curl -A "WhatsApp/2.23"` the shop link | The tags in 4.4 |
| 8 | Pickup order, unpaid; Open in till; pay cash | One sale; stock down once; order paid; no second invoice offered |
| 9 | M-Pesa order already paid; Open in till; hand over | No double charge; stock down once |
| 10 | Open in till; put the sale on credit | Order not marked paid |
| 11 | Open the same order in the till twice and sell both | Second is refused |
| 12 | Cancel an online order that holds stock | Stock released |
| 13 | Call `mark_online_order_paid` twice | Second call succeeds and changes nothing |
| 14 | `track_online_order` with a wrong token | "Not found"; no information |
