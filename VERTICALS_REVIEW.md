# Industry Verticals: Review and Fixes

## In plain words

The point of sale offers 15 industries. Today an industry does two things: it supplies a **starter list of 25 products** (a code, a name, a category and a unit), and it picks an icon on the first welcome screen. Nothing in the till, the product form, the receipt or the reports changes by industry. The kitchen and bar tickets are a switch any business can use, not something tied to the restaurant industry.

This file records what was found when each industry was checked against what that kind of business needs, what has been fixed, and what is still missing.

## The 15 industries

Restaurant, retail, grocery, pharmacy, fashion, electronics, salon, auto, fuel, hotel, bookstore, sports, jewelry, furniture and online. The starter lists are in `Murzak-PoS-Backend`, file `murzak_pos/products_seed_data/industry_products.json`.

## Faults found in how the starter lists were loaded

| # | Fault | Effect | Status |
|---|---|---|---|
| 1 | Every starter item was created as a stock item, including 61 services (Haircut, Room Service, Parking Fee, Gift Card, Shipping Fee, Oil Change...). | The server refuses to sell a stock item with no stock, so a new salon, hotel or online shop could not sell its services until each one was edited by hand. | **Fixed** in this change (see below). |
| 2 | The unit of each item (Kg, L, ml) was known to the server but not sent to the till, so everything was created in pieces ("Nos"). 57 items are affected, mostly grocery, retail, pharmacy and fuel. | Sugar, cheese and petrol were sold by the piece, and opening stock had to be a whole number. | **Fixed** in this change. |
| 3 | The categories in the starter lists are only "Products", "Services" and "Consumable". | Category buttons on the till are useless until the owner sorts every product. | **Not changed.** The owner still chooses categories on the starter page, from their own list. |
| 4 | The till showed "Out of stock" for anything under 1 unit. | A shelf with 0.6 kg of cheese looked sold out. | **Fixed** in this change. |
| 5 | A service that somehow had a stock figure still showed "Out of stock" or a stock count on the till. | Confusing for a salon or hotel. | **Fixed** in this change (a service never shows stock). |
| 6 | `create_seed_item` is defined twice in `product_seeding.py`; the second replaces the first. | Not a bug today, but an easy place for someone to edit the wrong copy. | **Not changed.** The first copy is dead code and could be deleted in a separate change. |

### What changed

- **The server** now sends each starter item's category, unit and a `is_service` flag along with its code and name. The old fields are unchanged, so an older till keeps working.
- **Creating the products** keeps no stock for services. What the till sends wins; a till that sends nothing (an older version) gets the same result from the starter list. Opening quantities given for a service are skipped and listed in `stock_skipped`.
- **Units:** the unit asked for is used. If the site already has it under another name (L as Litre, ml as Millilitre) that one is used; if the site does not have it at all, it is created so the product can be sold in parts.
- **The starter products page** shows a "Service" label on services and "per Kg" (or L, ml) on measured items, locks the quantity box for services, accepts quantities such as 2.5 for measured items, and still requires whole numbers for pieces. The downloadable spreadsheet has a new `unit` column, and a service's quantity is left empty. Uploading a quantity for a service is refused with a clear message.
- **The till** no longer calls a product out of stock while any is left, and never shows stock for a service.

### Order of deployment

Merge and deploy the **backend first**. Until it is deployed, the starter page behaves as before (every item in pieces, no service flag). Deploying the backend alone changes nothing visible to an older till except that services become non-stock.

## Industry by industry

| Vertical | What it has now | What that industry needs that is still missing | Verdict |
|---|---|---|---|
| **Restaurant and bar** | Held tabs, named tables, notes, kitchen and bar tickets, station screens, table and counter orders | Recipe and ingredient stock, splitting a bill between guests, tips or service charge | Best served |
| **Retail** | The generic till fits: barcodes, discounts, price lists, loyalty, returns | Little | Good |
| **Grocery** | Decimal quantities; measured units now come through from the starter list | Scale barcodes. Fresh stock needs expiry dates, which the starter list does not switch on | Partial |
| **Pharmacy** | An expiry alerts page | The product form has no expiry or batch settings. The till never asks which batch. No prescription-only or controlled-medicine flag, no dispensing record | Partial, with real gaps |
| **Fashion** | A variants page, returns | No size or colour picker at the till | Partial |
| **Electronics** | A warranties setup page | No serial number or IMEI at the sale. Warranty is not tied to the sale or receipt | Weak |
| **Salon** | Services (now sellable) | No appointments, no staff on a sale, no commission | Weak |
| **Auto** | Parts and services as items (services now sellable) | No job cards or vehicle history | Weak |
| **Fuel** | Fractional quantities; litres now come through | No pumps, meter readings or tank checks per shift | Weak |
| **Hotel** | Charge items (now sellable) | No rooms, check-in or guest bills. "Charge to room" can only be imitated with customer credit | Weak |
| **Online** | Fee items (now sellable) | No orders, shipping or fulfilment | Weak |
| **Sports** | Goods and services (now sellable) | No memberships, classes or court bookings with a schedule | Weak for services |
| **Bookstore, jewelry, furniture** | The generic till | Jewelry: no price by weight or gold rate. Furniture: no deposits or layaway, though customer credit helps | Fine as a shop, no specialised features |

## Suggested next steps

1. **Pharmacy:** expiry and batch settings on the product form, and a "prescription only" flag, building on the expiry alerts page that exists.
2. **Pick by client.** Salon staff and commission, or fuel shift reconciliation, are each a real feature rather than a fix. Start the one a client is waiting for.
