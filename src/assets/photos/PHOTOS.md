# Photo library: what to add and where it appears

## How it works

Every photo in this folder is **self-hosted**: it is built into the website, not loaded from Unsplash, Pexels or anyone else's server. That means it cannot disappear, be blocked, or slow the page down because of a third party, and it keeps working once the site is installed on a phone or till.

To add a photo:

1. Prepare it (see "Preparing a photo" below).
2. Save it in this folder using **exactly** one of the file names in the tables below, for example `industry-pharmacy.jpg`.
3. Commit it. No code change is needed. The page that uses that name shows it from the next build.

A name with no file is harmless: the page shows its normal design instead (the illustration, the icon, or nothing). So the library can grow one picture at a time, and nothing breaks while it is incomplete.

## Already in the library

| File | Where it shows | Note |
|---|---|---|
| `counter-cashier.jpg` | Landing page, "Built around your counter" | Supplied by Murzak. A third-party logo was removed from the screen frame and card reader. |
| `counter-card-reader.jpg` | Landing page, same section | Supplied by Murzak. |

## Photos to add

Priority 1 makes the biggest visible difference. Aim to add these first.

### Priority 1: the first things a visitor and a new customer see

| File name | Shape | Where it shows | What to look for |
|---|---|---|---|
| `auth-side.jpg` | Landscape 4:3 | Sign in and Register pages, left panel (replaces the line drawing) | A shop owner or cashier smiling at a till or tablet, in a Kenyan or East African setting if you can. Warm, bright, uncluttered. |
| `empty-shelf.jpg` | Landscape 16:9 | The till, when a new business has no products yet | A tidy empty shelf, or hands arranging stock. The mood is "ready to fill". |
| `industry-restaurant.jpg` | Portrait 4:5 | Landing page, "Made for your kind of business" | A busy cafe or restaurant counter, or a waiter taking an order on a tablet. |
| `industry-grocery.jpg` | Portrait 4:5 | Same | A kiosk, mini-market or supermarket aisle with a cashier. |
| `industry-pharmacy.jpg` | Portrait 4:5 | Same | A pharmacist at a counter with shelves behind. Avoid readable medicine brand names. |
| `industry-fashion.jpg` | Portrait 4:5 | Same | A boutique rail, or a customer paying at a clothes shop. |

The "Made for your kind of business" strip on the landing page appears automatically once **three or more** industry photos exist.

### Priority 2: more industries

| File name | Shape | Industry |
|---|---|---|
| `industry-electronics.jpg` | Portrait 4:5 | Phone and electronics shop |
| `industry-salon.jpg` | Portrait 4:5 | Salon or barber |
| `industry-hardware.jpg` | Portrait 4:5 | Hardware and building supplies |
| `industry-bookstore.jpg` | Portrait 4:5 | Bookshop and stationery |

Other industries Murzak supports (auto, fuel, hotel, sports, jewelry, furniture, online) can be added by extending the `INDUSTRIES` list at the top of `src/pages/Landing.js`.

## What not to use

* **Photos with another company's logo or screen showing.** Competitor logos (for example a card terminal or till brand) on a Murzak page suggest a partnership that does not exist. Crop or retouch them out, or choose another photo.
* **Photos showing a different product's screen as if it were Murzak POS.** The landing page tells visitors its screenshots are real. Photos that include a screen should be labelled illustrative (the counter section already does this).
* **Photos of branded packaging** (a named milk, a named painkiller). The packaging design belongs to someone else. Choose generic items.
* **Photos of identifiable customers or staff** without their written permission.
* **Anything promising a feature Murzak does not have.** For example, a salon appointment calendar on screen implies bookings, which the product does not offer yet.

## Where to find photos you are allowed to use

| Source | Licence in plain words |
|---|---|
| Unsplash | Free for commercial use, no credit needed. You may not resell the photos on their own. |
| Pexels | Same. |
| Pixabay | Same. |
| Wikimedia Commons | Only pictures marked **CC0** or **Public Domain**. Anything marked "CC BY" needs a credit line. |
| Your own photographs | Best of all. Real photos of real clients' shops (with their permission) beat any stock photo. |

Keep a record of where each photo came from. Add a line to the table below when you add one, so a tender or customer asking "where did this image come from?" has an answer.

| File | Source and link | Licence | Added |
|---|---|---|---|
| `counter-cashier.jpg` | Supplied by Murzak (stock photograph) | Confirm the original licence before publishing | 2026-10 |
| `counter-card-reader.jpg` | Supplied by Murzak (stock photograph) | Confirm the original licence before publishing | 2026-10 |

## Preparing a photo

A photo straight from a camera or a stock site is 3 to 8 MB. That is far too heavy for a web page on mobile data. Before saving it here:

* **Size:** 1200 pixels on the long side is plenty. Landscape photos about 1400 wide; portrait photos about 960 wide.
* **Weight:** aim for **under 200 KB** each. Save as JPEG at about 78 percent quality.
* **Crop to the shape in the table** and keep the subject (the person, the till, the shelf) in the middle, since small screens crop the edges.
* **Brightness:** pick bright, warm photos. Very dark ones look heavy beside the page's light design.

A quick way to shrink one on any computer is the free site squoosh.app: drop the photo in, choose "MozJPEG", set quality to 78, and resize to the width above.

## Product photos are a different thing

Photos of individual products (the tiles on the till) are not stored here. They are uploaded per product in the product form and stored on the server. A product without a photo gets an automatic illustration. See `PRODUCT_IMAGES.md` in the project root.
