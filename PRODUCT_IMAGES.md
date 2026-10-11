# Product images: how they are handled

## In plain words

Every product on the till shows a picture. A grid of grey boxes makes a till look unfinished, and most shop owners will not photograph hundreds of items before they open. So a product's picture comes from one of two places, in this order:

1. **Its own photo**, if someone added one in the product form.
2. **An automatic illustration**, drawn to match what the product is (a carton for milk, a spray bottle for soap, a loaf for bread).

A product therefore always has a picture, and a real photo replaces the illustration the moment one is added.

## How each part works

| Part | File | What it does |
|---|---|---|
| Choosing the picture | `src/components/Common/ProductImage.jsx` | Shows the photo; if the photo is missing or fails to load (deleted, offline), quietly shows the illustration instead. Never a broken-image icon. |
| Matching a product to an illustration | `src/utils/productArt.js` | Reads the product's name and category, in English and common Swahili shop words, and picks one of 18 illustration types. The same product always gets the same shade. |
| The illustrations | `src/components/Common/ProductArt.jsx` | Small vector drawings, sharp at any size. |
| Adding a photo | `src/components/Products/ProductPhotoField.jsx` | "Add photo" button on the product form, with a preview of what the till will show. |
| Uploading | `src/api/uploadImage.js` | Shrinks the picture in the browser first (longest side 1000 pixels, usually under 200 KB), then sends it to the server. The server's reply (`/files/...`) is saved on the product. |

Photos of products live **on the server**, one per product. They are not part of this website's files.

## Two kinds of pictures: do not mix them up

| | Product photos (the till tiles) | Website photos (marketing and screens) |
|---|---|---|
| Example | A photo of one bottle of cooking oil | A cashier at a counter on the landing page |
| Stored | On the server, per business | In this repository, `src/assets/photos/` |
| Added by | The business owner, in the product form | Murzak, by adding a file |
| Guide | This page | `src/assets/photos/PHOTOS.md` |

## Recommended next step: a shared library of generic product photos

Today a new business starts with illustrations only. A small library of good, **generic** photos (a bunch of bananas, a loaf of bread, a bag of flour, a bottle of cooking oil) would make the till look finished from day one, and the owner could still replace any of them with their own.

Suggested design, when the photos are available:

1. Save about 40 generic photos in the project (`public/product-photos/`, 400 pixels wide, about 20 KB each, so roughly 800 KB in total, loaded only when a tile needs one).
2. Add one more step to the order above: own photo, then a matching library photo, then the illustration. Matching reuses the word lists already in `productArt.js`.
3. A library photo is only shown for **generic** items. Branded products ("Brookside Milk", "Panadol") keep their illustration until the owner adds their own photo, because packaging is someone else's design.

This needs the photos themselves first. The environment this was written in blocks Unsplash, Pexels, Pixabay and Wikimedia, so none could be downloaded. Photos can be taken or downloaded on any normal computer and added to the project, following the rules (licence, size, what to avoid) in `src/assets/photos/PHOTOS.md`.

## Rules worth keeping

* Never copy a product photo from another shop's website or a supermarket's online store. The photograph and the packaging are both someone's property.
* A product photo should show **one** item, centred, on a plain or light background. Tiles are wide (2 to 1) and the picture is cropped to fit, so the item should be in the middle.
* Keep uploads small. The upload step already shrinks them, so there is no need to prepare them first.
