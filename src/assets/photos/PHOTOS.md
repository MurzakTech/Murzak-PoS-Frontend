# Photo library: what to add and where it appears

## How it works

Every photo in this folder is **self-hosted**: it is built into the website, not loaded from Unsplash, Pexels or anyone else's server. That means it cannot disappear, be blocked, or slow the page down because of a third party, and it keeps working once the site is installed on a phone or till.

To add a photo:

1. Prepare it (see "Preparing a photo" below).
2. Save it in this folder using **exactly** one of the file names in the tables below, ending in `.webp` (or `.jpg` or `.png`). For example `industry-pharmacy.webp`. The part before the dot is what matters; the ending can be any of the three.
3. Commit it. No code change is needed. The page that uses that name shows it from the next build.

A name with no file is harmless: the page shows its normal design instead (the illustration, the icon, or nothing). So the library can grow one picture at a time, and nothing breaks while it is incomplete.

## Already in the library

| File | Where it shows | Note |
|---|---|---|
| `counter-cashier.jpg` | Landing page, "Built around your counter" | A third-party logo was removed from the screen frame and card reader. |
| `counter-card-reader.jpg` | Landing page, same section | |
| `auth-side.webp` | Sign in and Register pages, left panel | |
| `industry-restaurant.webp` | Landing page, "Made for your kind of business" | Cropped to portrait. |
| `industry-grocery.webp` | Same | Cropped to portrait; the branded snack packaging on the right of the original is cropped out. |
| `industry-salon.webp` | Same | A barber. |
| `industry-pharmacy.webp` | Same | The pharmacy chain's logo and the staff name badge were removed from the coat. |
| `industry-fashion.webp` | Same | The screen shows another company's till software, in German. |
| `industry-electronics.webp` | Same | A phone display. The "Fitness+" lettering on a panel was removed; the phones themselves are recognisable models. |
| `industry-bookstore.webp` | Same | A notebook shelf. The clearest brand lettering on the notebooks was blurred; small print on spines remains. |
| `industry-hardware.webp` | Same | Cropped to the air tools; one tool-maker label was removed. |
| `empty-shelf.webp` | The till, when a new business has no products yet | Empty bakery shelves, cropped to 16:9. |
| `cta-banner.webp` | Landing page, behind the closing "Create your account" box | A hardware maker's name was removed from the stand. Shown faintly under the colour. |

All of these were supplied by Murzak. See the source table at the end of this page.

## Photos still to add

All eight industries on the landing page strip now have a photo, and every other slot is filled. The strip lays itself out: up to four photos in one row, three across for five or six, four across for seven or eight.

More industries Murzak supports (auto, fuel, hotel, sports, jewelry, furniture, online) can be added by extending the `INDUSTRIES` list at the top of `src/pages/Landing.js` and saving a photo named `industry-<name>`.

Photos supplied but not used, and why: a Korean pharmacy shelf (full of other companies' packaging and cartoon characters), an Indonesian fruit shelf (the supermarket's name on every shelf edge, rupiah prices), a second version of the cafe scene (the first fits the audience better), and an American supermarket aisle (dollar price tags, branded boxes).

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
| `auth-side.webp` | Supplied by Murzak | Confirm the original licence before publishing | 2026-10 |
| `industry-restaurant.webp` | Supplied by Murzak | Confirm the original licence before publishing | 2026-10 |
| `industry-grocery.webp` | Supplied by Murzak | Confirm the original licence before publishing | 2026-10 |
| `industry-salon.webp` | Supplied by Murzak | Confirm the original licence before publishing | 2026-10 |
| `cta-banner.webp` | Supplied by Murzak | Confirm the original licence before publishing | 2026-10 |
| `industry-pharmacy.webp` | Supplied by Murzak | Confirm the original licence and that the person shown agreed to be used | 2026-10 |
| `industry-fashion.webp` | Supplied by Murzak | Confirm the original licence before publishing | 2026-10 |
| `industry-hardware.webp` | Supplied by Murzak | Confirm the original licence before publishing | 2026-10 |
| `empty-shelf.webp` | Supplied by Murzak | Confirm the original licence before publishing | 2026-10 |
| `industry-electronics.webp` | Supplied by Murzak | Confirm the original licence before publishing | 2026-10 |
| `industry-bookstore.webp` | Supplied by Murzak | Confirm the original licence before publishing | 2026-10 |

## Preparing a photo

A photo straight from a camera or a stock site is 3 to 8 MB. That is far too heavy for a web page on mobile data. Before saving it here:

* **Size:** 1200 pixels on the long side is plenty. Landscape photos about 1400 wide; portrait photos about 960 wide.
* **Format:** save as **WebP** at about 78 percent quality. It is roughly a third smaller than JPEG and every current browser shows it. Use JPEG only if your tool cannot save WebP. Do not use HEIC (the iPhone default), TIFF, BMP or GIF. Use SVG for logos and icons, and PNG only for screenshots with small text or pictures that need a transparent background.
* **Weight:** aim for **under 150 KB** each.
* **Crop to the shape in the table** and keep the subject (the person, the till, the shelf) in the middle, since small screens crop the edges.
* **Brightness:** pick bright, warm photos. Very dark ones look heavy beside the page's light design.

A quick way to shrink one on any computer is the free site squoosh.app: drop the photo in, choose **WebP** on the right, set quality to 78, resize to the width above, and download it.

## Product photos are a different thing

Photos of individual products (the tiles on the till) are not stored here. They are uploaded per product in the product form and stored on the server. A product without a photo gets an automatic illustration. See `PRODUCT_IMAGES.md` in the project root.
