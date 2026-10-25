# Online Store Audit: Industries, Missing Features and Access Control

Audit date: 2026-10-25. Scope: this frontend repository (`Murzak-PoS-Frontend`). The backend (`Murzak-PoS-Backend`) was not available in this session, so anything that depends on it is marked "confirm with backend".

## 1. In plain words

The online store that exists today is a **single, generic shop** that suits a shop selling counted goods that are delivered or collected: a retail shop, a boutique, a pharmacy counter (without the regulated parts), a general store. Every one of the 15 industries gets the same storefront. Nothing in the storefront changes by industry, so a restaurant, a salon, a hotel and a grocer all see the same "Add to basket" shop.

The owner-side setup is good (address name, delivery fees, M-Pesa, order alerts). The gaps that most block a "frictionless" move online are these:

1. **No access control for the online store.** Only full-access roles (Administrator, System Manager, Business Owner) can open it. A Sales Manager or an "online orders clerk" cannot be given it, and there is no menu item for it.
2. **It is not a module.** It does not appear or disappear depending on whether the business has an online store.
3. **No quick path from the POS.** Putting products online is a separate tick on a separate page, and the product form has no online fields at all (no description, no extra photos).
4. **WhatsApp is only a "chat with us" link and a "confirm on WhatsApp" button.** There is no catalogue sharing, no order message to the owner and no WhatsApp ordering flow.
5. **The shop ignores the industry:** whole numbers only (no 1.5 kg), no sizes or colours, no services or bookings, no menu options, no prescription handling.

## 2. What exists today (verified in code)

| Area | What works | Where |
|---|---|---|
| Shopper pages | Catalogue with search and categories, basket, checkout, order tracking page that refreshes itself | `src/newlook/storefront/` |
| Languages | English and Swahili (Swahili is a draft) | `strings.storefront.js` |
| Delivery | Free, one fee, by area, by distance (straight line estimate), free above an amount, minimum order | `CheckoutPage.jsx`, `OnlineStoreTab.jsx` |
| Payment | Cash on delivery or pickup, M-Pesa prompt (resend from tracking page) | `CheckoutPage.jsx`, `TrackPage.jsx` |
| Owner screens | Online orders (confirm, ready, delivered, cancel, mark paid, draft invoice), store settings, WooCommerce link, "shown online" tick per product | `src/newlook/ecommerce/` |
| Alerts | Toast for a new online order anywhere in the app | `OnlineOrderAlert.jsx` |
| Safety | Server prices the order; the basket sends only product and quantity; shopper calls use a client with no staff token | `storefrontApi.js`, `cart.js` |

## 3. Access control (RBAC) findings

| # | Finding | Evidence | Impact |
|---|---|---|---|
| R1 | `/ecommerce` and `/settings/ecommerce` are in **no route group** in the role table. Only `FULL_ACCESS_ROLES` (Administrator, System Manager, Business Owner) pass. | `src/config/roleAccessConfig.js` (no `ecommerce` entry; `FULL_ACCESS_ROLES` at the end of the file) | A Sales Manager or Stock Manager cannot run online orders. The owner has to do every fulfilment step or share an owner login. |
| R2 | There is **no menu item** for the store. It is reachable only from Settings, a Products overflow menu, and the command palette. | `navigation.js`, `BusinessSection.jsx:123`, `ProductsPage.jsx:231`, `CommandPalette.jsx:30` | Staff do not find it; owners forget it exists. |
| R3 | **One page, four tabs, one permission.** Orders, store settings, WooCommerce keys and product visibility all open together. | `EcommercePage.jsx` | A person who should only fulfil orders would also see (or edit) payment and WooCommerce secrets. Secrets should be owner-only. |
| R4 | The new-order alert is shown to **every signed-in person**, including cashiers. | `OnlineOrderAlert.jsx` (mounted in `App.js`) | Low risk (order number and channel only), but it should follow the same permission as the orders screen. |
| R5 | The shop is **not a module**. It is on or off inside its own settings, but the rest of the app does not know. | No reference in `navigation.js` | Businesses that do not sell online still see dead links to it; businesses that do have no first-class place for it. |
| R6 | The server must enforce each action. This repository only decides what to draw. | `roleAccessConfig.js` header comment | Confirm with backend that `online_store_api`, `online_orders` and `ecommerce_api` check a role on every call, including `get_order_webhook` (returns a secret). |

### Recommended permission model

Treat "Online store" as a module with its own capabilities, in the same style as the existing capability list (`manage_products:create` and so on):

| Capability | Actions | Typical roles |
|---|---|---|
| `online_orders` | view, fulfil (confirm, ready, delivered), cancel, mark paid, make invoice | Owner, Manager, Sales Manager, a new "Online Orders Clerk" |
| `online_catalogue` | view, show or hide products, edit online descriptions and photos | Owner, Manager, Item Manager |
| `online_store_settings` | edit address, delivery, payment, WhatsApp, open or close the store | Owner, Manager |
| `online_integrations` | WooCommerce keys, webhook secret, payment gateway links | Owner only |

Module behaviour: the sidebar item "Online store" (with an unread-orders badge) appears only when the business has switched the module on **and** the person holds at least `online_orders:view`. Each tab appears only if its capability is held. Direct address entry is refused with the standard access-denied page.

## 4. The "frictionless" gaps, by journey

### 4.1 Going online from the POS (today: too many steps)

| Gap | Today | Proposed |
|---|---|---|
| Product form has no online fields | Fields are name, price, cost, stock, warning, category, unit, barcode only (`NewProductPage.jsx`) | Add "Sell online" switch, online description, extra photos, optional online price |
| Visibility is a separate screen | Tick per product on the Online products tab | Bulk action in Products ("Put online / Take offline") and a switch on the product panel |
| First-time setup | Owner must find Settings, then E-Commerce, pick a slug, fill the delivery fields, then separately tick products | A 4-step "Go online" wizard: name and link, what to sell (pick categories), delivery and pickup, payment, then share |
| Sharing the link | Share link exists in the store tab | Add QR code (the `qrcode.react` library is already installed), "Copy link", and a printable shelf poster |
| Stock location | Owner must choose "Take stock from" | Default to the till's selling location (`sellingLocations.js` already exists) |
| Same stock, two channels | Backend dependent | Confirm with backend that online and till sales draw the same stock and an unpaid online order reserves stock |
| Online order to POS | Only "make draft invoice" | "Open in till" to collect payment on pickup, print a picking slip, and mark the till sale as channel "Online" for reports |

### 4.2 WhatsApp Business (today: a link only)

What exists: a `wa.me` link in the shop header, a "confirm on WhatsApp" link after ordering, and customer reminders sent by hand from the customer panel.

| Gap | Why it matters |
|---|---|
| No "Share my catalogue on WhatsApp" button that composes a message (name, link, top products) | The most common Kenyan route to market is a forwarded WhatsApp message |
| No pre-filled order message to the owner containing the order number, items and total | The owner currently learns of the order only inside the POS |
| No per-product share ("Send this item") from the till or Products page | Sellers reply to customers one item at a time |
| No quote or invoice sent to a customer's WhatsApp from the order screen | Receipts can be sent on WhatsApp (`ReceiptPanel.jsx`); online orders cannot |
| No status notification to the shopper by WhatsApp (confirmed, ready, delivered) | The shopper must keep the tracking page open |
| No WhatsApp Business catalogue or Cloud API link | Needs Meta business verification; plan as phase 3, with a link-based flow first |
| Customer WhatsApp number is not asked for at checkout separately from the phone | Reasonable to reuse the phone, but confirm the number is WhatsApp-enabled |

### 4.3 The shopper's experience (applies to every industry)

| Gap | Detail |
|---|---|
| Whole-number quantities only | `cart.js` rounds down to whole numbers with a maximum of 99. A grocer cannot sell 0.5 kg of tomatoes, a fuel or liquids seller cannot sell litres. |
| No product detail page | Cards show one picture, name and price. No description, gallery, size guide or reviews. |
| No variants | No size, colour, flavour or pack size. A fashion shop must list every variant as a separate product. |
| No product options or add-ons | No "no onions", extra toppings or cooking notes (restaurants). |
| Payment choices are only cash and M-Pesa | No card or bank option even though the repo has payment gateways (`PAYMENT_GATEWAYS.md`). |
| No shop identity | No logo, banner or brand colour on the shop. No page title or share preview (Open Graph tags), so a shared link looks bare on WhatsApp. |
| No customer accounts or repeat order | Orders are remembered on the phone only. No "order again". |
| No discounts, coupons or loyalty at checkout | The POS has loyalty and discounts; the shop ignores them. |
| No opening hours or "closed now" message | A shop can only be fully open or fully closed. |
| No scheduled delivery or pickup time | Needed for bakeries, restaurants and pharmacies. |
| Staff screens are English only | Noted already in `ONLINE_STORE.md`. |
| Swahili is a draft | Needs review by a Kenyan Swahili speaker. |

## 5. Industry by industry

Verdict scale: **Ready** (sells today as is), **Workable** (sells, with a workaround), **Needs work** (core need missing), **Not supported**.

| Industry | Verdict | What works | What this industry needs that is missing |
|---|---|---|---|
| **Retail** | Ready | Catalogue, basket, delivery, M-Pesa | Variants for packs; product descriptions |
| **Grocery** | Needs work | Categories, delivery by area | Decimal quantities (kg, litres); substitutions ("replace if out of stock"); delivery time slots; scale-priced items |
| **Restaurant and bar** | Needs work | Kitchen tickets exist in the POS | Menu with options and add-ons; dine-in QR menu per table; order to kitchen printer on a new online order; prep time; opening hours; tips |
| **Pharmacy** | Needs work | Generic goods | Prescription upload and approval before dispatch; prescription-only products hidden or blocked; age or controlled medicine rules; batch and expiry aware stock (backend). The POS has prescription screens (`prescription.js`) but the shop has none. |
| **Fashion** | Needs work | Pictures, categories | Size and colour variants with stock per variant; multiple pictures; size guide |
| **Electronics** | Needs work | Generic goods | Specification fields; warranty shown and tied to the order; serial or IMEI recorded at fulfilment |
| **Salon** | Not supported | Appointments screen exists on the staff side (`AppointmentsPage.jsx`, `BookAppointmentDialog.jsx`) | Public booking page: choose service, staff, date and time; deposit by M-Pesa; reminders. Services are currently treated like goods in a basket. |
| **Auto** | Not supported | Parts sell as goods | Service booking and job requests; vehicle details; parts compatibility |
| **Fuel** | Not supported | None | Not a sensible online product; order for delivery of bulk fuel would need quantity in litres and a quote |
| **Hotel** | Not supported | None | Room availability, dates, guests and booking deposit; charges are not basket items |
| **Bookstore** | Ready | Goods and categories | Author, ISBN search; pre-orders |
| **Sports** | Workable (goods) / Not supported (classes, courts) | Goods | Memberships, class and court booking with schedule |
| **Jewelry** | Needs work | Goods | Price by weight or gold rate; many photos; made-to-order |
| **Furniture** | Needs work | Goods | Many photos; deposit or layaway; delivery of large items with assembly; delivery by item size |
| **Online (e-commerce)** | Workable | Core flow | Shipping beyond local delivery (courier rates, county zones); returns requests; tracking number |

### Grouping the work by shop type

The cleanest way to avoid building 15 storefronts is to build **four storefront modes** and choose one from the industry the business signed up under (`pos_industry_code`, already used in `navigation.js` to decide the Appointments menu):

| Mode | Industries | Core difference |
|---|---|---|
| **Goods** (current) | Retail, grocery, fashion, electronics, bookstore, sports, jewelry, furniture, online, pharmacy | Add decimals, variants, descriptions, photos |
| **Menu** | Restaurant and bar | Options and add-ons, prep time, hours, table QR menu |
| **Bookings** | Salon, auto services, sports classes, spa | Service, staff, time slot, deposit; reuse `appointmentsApi.js` |
| **Stays** | Hotel | Dates, rooms, availability; likely out of scope until requested |

Pharmacy adds a **compliance layer** on top of Goods mode (prescription upload and approval).

## 6. Prioritised roadmap

### Phase 1: Make it a module with access control (small, high value, no new backend design)

1. Add a sidebar item "Online store", shown only when the module is on and the person may view orders; badge with new order count.
2. Add `online_orders`, `online_catalogue`, `online_store_settings`, `online_integrations` to the role configuration, with owner-only protection on integrations and the webhook secret (use the existing `RESTRICTED_ROUTES` mechanism for tab-level secrets).
3. Split `EcommercePage` tab visibility by capability; gate `OnlineOrderAlert` by `online_orders:view`.
4. Confirm backend enforcement for every call in `online_store_api`, `online_orders` and `ecommerce_api`.
5. Tests for each role: owner, manager, sales manager, cashier, order clerk.

### Phase 2: Frictionless from the POS and WhatsApp

1. "Go online" wizard and a default stock location.
2. Online fields on the product form; bulk "put online" in Products; product panel switch.
3. QR code and printable poster; "Share catalogue on WhatsApp"; per-product "Send on WhatsApp" from Products and the till.
4. Pre-filled WhatsApp order message to the owner; WhatsApp status message button on each order (opens WhatsApp with a ready message; the owner presses send, the same safe pattern used in `CustomerPanel.jsx`).
5. "Open in till" and "Print picking slip" on an online order; mark channel on reports.
6. Shop identity: logo, banner and share preview tags.

### Phase 3: Make the shop fit the industry

1. Decimal quantities and units on the shop (grocery, liquids).
2. Product detail page, multiple photos, variants (fashion, electronics, furniture, jewelry).
3. Menu mode (options, add-ons, hours, table QR).
4. Bookings mode, reusing the appointments screens.
5. Pharmacy prescription upload and approval.
6. Opening hours, scheduled delivery or pickup, card payments via the existing gateways.

### Phase 4: Growth

Customer accounts and "order again", coupons and loyalty at checkout, WhatsApp Business Cloud API (needs Meta verification), courier rates for national shipping, abandoned-basket reminders.

## 7. Items to confirm with the backend team

1. Does every method in `online_store_api`, `online_orders` and `ecommerce_api` check the caller's role, and which roles?
2. Can a role other than the owner be allowed `get_order_webhook`? (It returns a secret.)
3. Is stock reserved when an unpaid online order is placed, and released on cancellation?
4. Does the storefront product API return `description`, extra images and variant data, or must it be extended?
5. Can quantities be decimal in `checkout` and `quote_delivery`?
6. Can the online store mark a sale as channel "Online" so reports can split it?

## 8. WordPress and WooCommerce as the shop engine

Direction from the owner: the shop is based on WordPress and WooCommerce, owners should be able to **prefer** it, and owners should be able to **build and iterate** on the shop's looks, features and plugins themselves.

### 8.1 What exists today

WooCommerce is treated as a website the owner **already has somewhere else**. The POS can:

| Capability | Where |
|---|---|
| Store the website address and WooCommerce keys, test the connection | `EcommercePage.jsx`, `ecommerceApi.js` (`testWooCommerceConnection`) |
| Push the catalogue and stock to the website (`sync_woocommerce_catalog`), with "auto sync stock" and "auto sync products" switches | `EcommercePage.jsx` |
| Receive website orders through a webhook address and secret that the owner pastes into WooCommerce | `WebhookCard.jsx`, `getOrderWebhook` |
| Show website orders next to built-in store orders, labelled by channel | `OnlineOrdersTab.jsx` |
| Hide or show each product on the website | Online products tab |

What does **not** exist: any way to choose WooCommerce as the main shop, any control over the WordPress site itself, and any link between the two shops (the built-in store at `/shop/<name>` and WooCommerce run side by side with separate settings).

### 8.2 Gaps against the new direction

| # | Gap | Why it matters |
|---|---|---|
| W1 | **No store preference.** The Online store page opens on the WooCommerce tab by default, but nothing records which shop is the owner's main one. | The owner cannot say "my shop is WooCommerce". The share link, QR code, WhatsApp messages and the menu item cannot know which address to give customers. |
| W2 | **Two parallel shops with two sets of settings.** Delivery areas, payment, WhatsApp number and opening state are set in the built-in store and again in WooCommerce. | Duplicate work and the two can disagree. |
| W3 | **No site setup or health view.** Nothing tells the owner whether the site is reachable, whether the keys still work, the WordPress and WooCommerce versions, or when the last sync failed. | Owners find out a sync broke when a customer complains. |
| W4 | **No way to reach WordPress from the POS.** There is no "Open my shop editor" button. | The owner has to remember a separate login and address. |
| W5 | **No look and feel control.** No theme choice, logo, colours or page (home, about, contact) management from the POS. | The owner asked to build and iterate on looks. |
| W6 | **No plugin management.** No list of installed plugins, no recommended ones, no install, activate or update. | The owner asked to iterate on features and plugins. |
| W7 | **Sync depth is unknown from this repository.** The screens only show counts and a message. Whether descriptions, extra photos, categories, variants, prices per price list and decimal units reach WooCommerce is a backend matter. | This decides whether WooCommerce is a good fit for fashion, grocery and electronics (see section 5). |
| W8 | **Order status goes one way.** Website orders arrive in the POS; confirming, "ready" or "delivered" in the POS is not confirmed to flow back to WooCommerce, so the customer's WooCommerce emails may not match. | Customers get wrong status messages. |
| W9 | **Stock is sent, not reserved.** An unpaid website order may not hold stock in the POS. | Overselling between the till and the website. |
| W10 | **Access control is the same as section 3, and sharper here.** Site keys, the webhook secret and any WordPress login are owner-only secrets. | Plugin install is the highest-risk action in the whole module. |

### 8.3 Recommended design: one "Shop" module, two engines

Keep both engines, but make the owner choose one as **primary**. Call them plainly:

| Choice shown to owner | What it is | Best for |
|---|---|---|
| **Quick shop** | The built-in storefront (`/shop/<name>`). Nothing to install. | Starting in minutes, WhatsApp selling, a simple list of goods |
| **Full shop (WordPress and WooCommerce)** | A WordPress site with WooCommerce, kept in step with the POS | Branded sites, many photos, variants, blogs, plugins, custom design |

The preference is stored once on the business (`store_engine`: `quick` or `woocommerce`). The primary shop decides:

1. the address in the share link, QR code, receipts and WhatsApp messages,
2. which settings tab opens first,
3. what the "Online store" menu item shows in its badge and summary.

The other engine can stay switched on as a secondary channel; orders from both land in one **Online orders** list, as they do today.

Shared settings (WhatsApp number, delivery areas and fees, pickup address, payment methods, opening state) should be entered **once** in the POS and pushed to WooCommerce, instead of being typed twice (this needs a backend mapping to WooCommerce shipping zones and payment gateways; confirm feasibility).

### 8.4 Two ways to get a WordPress shop (decision needed)

| Option | How it works | Pros | Cons |
|---|---|---|---|
| **A. Bring your own site** (today) | Owner already has WordPress and WooCommerce and connects it with keys | No hosting cost or responsibility for Murzak | Setup is technical; every site is different; harder to support |
| **B. Murzak provisions the site** | The POS creates a WordPress and WooCommerce site for the shop (for example `shopname.pos.murzaktech.tech`), pre-connected, with a theme chosen for the industry | Truly frictionless; one login; industry starter themes and plugin sets; Murzak can offer it as a paid add-on | Needs hosting, backups, updates and security work on the backend and infrastructure side; more support load |

**Recommendation:** offer both. Make B the default path ("Create my shop for me") and keep A for owners who already have a site. This is a business and infrastructure decision, not a frontend one, so it needs your confirmation before design starts.

### 8.5 How owners build and iterate (looks, features, plugins)

The POS should not try to copy the WordPress editor. It should **connect the owner to it and keep guard rails around it**.

| Need | Proposed POS feature |
|---|---|
| Edit the design | "Open my shop editor" button that signs the owner into WordPress without a second login (single sign-on from the backend). The owner uses the WordPress block editor and theme customiser there. |
| Pick a look quickly | "Choose a look" gallery of 4 to 6 vetted themes grouped by industry (restaurant, fashion, pharmacy, general), applied by the backend. |
| Add features | "Add-ons" page listing a **vetted** set of plugins with plain-language descriptions (for example payments, delivery slots, product variants, bookings, SEO, shipping). Owner switches an add-on on or off. |
| Safety when changing things | A backup is taken before any change; changes can be rolled back; a "preview before publish" copy where the host supports it. |
| Keep it updated | A health panel showing WordPress, WooCommerce, theme and plugin versions with "update available" and one-click update, plus the last sync result. |
| Industry fit | On first setup, the industry the business signed up under (`pos_industry_code`) picks a starter theme and plugin set: for example bookings plugin for salon, menu and options plugin for restaurant, variants and size guide for fashion, prescription upload for pharmacy. This answers most of the per-industry gaps in section 5 without building each one in the POS. |

Technical note for the team: recent WordPress versions expose plugin listing, install from the WordPress.org directory, activation and deactivation through the REST API when the caller has an application password. Theme switching and theme installs are less uniform across versions and hosts. All of this must go through the **backend**, never from the browser, so site passwords are never exposed to the front end. Confirm each call in a short technical spike before promising it.

### 8.6 Access control for the WordPress side

Extend the capability table in section 3:

| Capability | Actions | Roles |
|---|---|---|
| `online_orders` | view, fulfil, cancel, mark paid, make invoice | Owner, Manager, Sales Manager, Orders Clerk |
| `online_catalogue` | show or hide products, edit online descriptions and photos, run a sync | Owner, Manager, Item Manager |
| `online_store_settings` | store preference, delivery, payment, WhatsApp, open or close | Owner, Manager |
| `online_site_design` | open the shop editor, choose a look | Owner, a designated "Shop Designer" |
| `online_integrations` | site keys, webhook secret, site password, **install, update or remove plugins**, restore backups | **Owner only** |

Every plugin or theme change should be written to the audit trail (an audit trail screen already exists at `/settings/audit-trail`), showing who changed what and when.

### 8.7 Revised roadmap

| Phase | Content |
|---|---|
| **1. Module and RBAC** | As in section 6, plus the five capabilities above and the `store_engine` preference stored on the business. |
| **2. Engine choice and connection health** | "Quick shop or Full shop" chooser; primary shop drives share link, QR and WhatsApp messages; site health panel (reachable, keys valid, versions, last sync); "Open my shop editor" button; two-way order status (W8); stock reservation (W9). |
| **3. Provisioned WordPress (option B)** | "Create my shop for me" with industry starter theme and plugin set; single sign-on; backups; update management. Needs backend and infrastructure first. |
| **4. Looks and add-ons inside the POS** | Theme gallery, vetted add-ons page, rollback, audit trail entries. |
| **5. Shared settings** | Delivery, payment and WhatsApp entered once and pushed to both engines. |
| **6. Industry depth** | Per-industry starter kits, then the Quick shop gaps in section 5 (decimals, variants, menu options, bookings, prescriptions) for owners who stay on Quick shop. |

### 8.8 Extra questions for the backend and infrastructure team

1. Does the catalogue sync send descriptions, multiple images, categories, variants and decimal units? Which fields are one-way?
2. Can order status changes made in the POS be written back to WooCommerce orders?
3. Can the backend create a WordPress and WooCommerce site per business (multisite, containers, or a managed host), and what is the monthly cost per shop?
4. Can the backend sign an owner into WordPress without a second password?
5. Which WordPress REST calls (plugins, themes) work on the target hosting, and which need server access instead?
6. Can WooCommerce shipping zones and payment methods be created from POS settings?
7. How are backups and security updates handled, and who is responsible?

## 9. Progress

**Phase 1 (module and access control): built on this branch.** Online store menu item, four permissions, per-tab gating, alert gating, a new Online Orders Clerk role, tests. Documented in `ONLINE_STORE.md`. Not yet done from Phase 1: the `store_engine` preference (needs a place to store it on the backend) and a business-level "module on" switch (the menu item currently follows the person's role only).

**Found in passing:** `/appointments` is also missing from the role table, so only owner roles can open it; the existing test `roleAccessConfig.test.js` ("each protected route resolves to itself") already fails because of it.

**Phase 2 (part): built.** Setup checklist, QR code, printable poster, catalogue and per-product WhatsApp sharing, WhatsApp message to the customer from an order, printable packing slip. **Phase 2 (product details): built.** Description and extra photos on Edit product, bulk show or hide on the Online products tab, product details window on the shop. Needs the backend calls in `ONLINE_STORE.md`. Still to do from Phase 2: a single guided "Go online" wizard, "Open in till" on an order, shop logo and share preview, and a default stock location.

## 10. Suggested first change

Phase 1 (with the `store_engine` preference from section 8) is the smallest piece that delivers what was asked for ("a module with RBAC" and "prefer WordPress and WooCommerce") and it does not depend on new backend design. It touches `src/config/roleAccessConfig.js`, `src/newlook/shell/navigation.js`, `src/newlook/ecommerce/EcommercePage.jsx` and `src/newlook/ecommerce/OnlineOrderAlert.jsx`, plus tests.
