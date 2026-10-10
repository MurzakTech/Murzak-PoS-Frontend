# Kitchen and Bar Tickets: Scope

## Status

**K1 (notes and printed tickets) and K2 (tickets on the server, station screens, ready tray) are built and tested on the front end.** K2 needs the server calls described in `KITCHEN_TICKETS_SERVER_API.md` before station screens can be switched on; until then the till prints exactly as in K1. K3 is not started. The rest of this document is the scope as agreed; the sections below say how K1 and K2 work in practice.

### K1: how to set it up and use it

**Setting it up (once per till, by the owner or manager):**

1. On the till screen, open the three dots menu at the top right and press **Kitchen tickets**.
2. Switch on **Send orders to the kitchen and bar from this till**.
3. Press **Set up from my categories**. Categories that sound like food go to the Kitchen, and drinks to the Bar. Check the result, and correct it by choosing categories for each station. A category can go to one station only.
4. Choose what happens to items whose category has no station. The safe choice is **Do not send them**: they are listed each time, so none is forgotten.
5. Edit the quick notes if you like (for example "No onions", "Well done", "Extra", "Takeaway"), and choose whether tickets print straight away.
6. Press **Save**. Until you switch it on, the till looks and works exactly as before.

**Using it (waiters and cashiers):**

1. Add the items to the bill as usual. To give the kitchen a note, press the small note icon on the item, tap a quick note or type one, and press **Save note**. Notes appear on the kitchen ticket, never on the customer's receipt.
2. Press **Send to kitchen**. The till shows what each station will get. Type the table or tab name and press **Send**. The tickets print, one page per station.
3. When the table orders again, add the new items and press **Send to kitchen** again. **Only the new items go out**, as "Round 2" with the same table name. Items already sent show a green "2 sent" label.
4. If you reduce or remove an item that was already sent, the next ticket carries it in a box marked **CANCELLED, DO NOT MAKE**.
5. If you change the note on something already sent, the next ticket says **CHANGE** and shows the new note.
6. Charging a bill that still has items the kitchen was never told about asks first: **Send now**, **Charge anyway** or **Go back**.
7. Clearing a bill the kitchen already has offers **Clear and print cancellation**, so they stop making it.
8. The tickets can be printed again from the "Sent to the kitchen" window by pressing **Print again**. Once you press **Done**, that window is gone.
9. Held bills (tabs) keep their kitchen history. A tab brought back from the held list still knows what was already sent, and the held list marks it **Sent to kitchen**.

### K2: station screens (needs the server calls)

**Decisions taken** (your answers to the nine questions): table service and counter service both work; two stations, with more allowed; each client chooses its own printers (printing stays through the browser, per device); station screens are a **switch**, so a place without a tablet loses nothing; waiters can use phones and tills; the customer's name is never on a ticket; anyone may remove a sent item but a cancellation always goes to the station and is recorded; the quick notes are editable; tickets are in English, with free-text notes so Swahili works.

**Switching it on (manager, once):**

1. Three dots menu, **Kitchen tickets**, switch on **Also show tickets on station screens**, **Save**. This is shared by every till of the business, because it is kept on the server. If the server has no kitchen calls yet, the switch is greyed out and explains why.
2. On the kitchen's tablet, sign in and open **Open the station screen on this device** (or go to `/kitchen`). Choose the station (Kitchen or Bar). The tablet remembers its station; the small arrows icon changes it.
3. Do the same on the bar's tablet.

**Waiters:**

1. **Send to kitchen** now asks **Table service** or **Counter order**. A table order carries the table name. A counter order is called out by its ticket number, which prints large; a name is optional, and customer names are not wanted on tickets.
2. The ticket gets its number from the server, so tills and phones never clash. The bill is marked as sent only once the server has the tickets. If it could not be reached, the till says so and offers **Try again** (never doubles the order), **Print only** (the screens will not show it, so hand the paper over) or **Cancel** (nothing is marked as sent).
3. When the kitchen or bar presses **Ready**, the till shows a green **Ready (n)** button and a message. Open it and press **Served** when the order has gone to the table or the number has been called.
4. Clearing a bill the kitchen already has, with **Clear and print cancellation**, sends the cancellation first and clears the bill once the stations have it.

**Cooks and bartenders:** each card shows the table or counter number, the time, the waiter, the items and notes, and how long it has waited (green, then amber after 8 minutes, red after 15). **Start**, **Ready**, **Served**. Cancelled items appear on the card in a box marked CANCELLED, DO NOT MAKE, and the **Cancellations** tab keeps a record of the last 24 hours. The bell turns on a sound for new orders; full screen suits a wall-mounted tablet.

### What K2 does not do (yet)

- **Removing a sent item and then charging anyway.** The cancellation rides on the next send, and the till asks before charging a bill with unsent changes, but "Charge anyway" lets a cancellation go unsent. Making it mandatory is a small change if you want it.
- **The waiter's "Ready" message goes to every till**, not only the till of the waiter who sent the order. The tray lists every ready order of the store.
- **It asks the server regularly** (every 5 to 10 seconds) instead of receiving live pushes, so a ticket can take a few seconds to appear.
- **Station tablets must stay signed in**, and need internet. A tablet that loses its connection shows the last tickets with a warning.
- **Auto-printing at the station** is K3.

### What K1 does not do (yet)

Items below marked "(K2)" are solved when station screens are switched on.

- **It prints to the printer the till's browser uses.** The browser's print window may open each time. For a till that always prints to one printer, the browser can be set to print without asking (in Chrome, start it with the `--kiosk-printing` option). Code cannot choose a different printer, which is why separate kitchen and bar printers need K2 or K3.
- **Two stations on one printer print as two pages**, to be torn apart.
- **One note per product line.** Two burgers, one with no onions and one without, share a single note on the line, for example "1 no onions". Separate lines per note is a later improvement.
- **Settings and ticket numbers are kept on that device.** A second till must be set up the same way, and each till numbers its own tickets from 1 each day. (K2: stations and notes are shared through the server, and the server numbers the tickets.)
- **The kitchen cannot say "ready"**, and a ticket sent from a phone does not reach a screen. (K2)
- **Nothing reaches the server.** Notes and what was sent travel with held bills, but no ticket is stored. (K2)

## In plain words

In a restaurant or bar, taking an order is only half the job. Someone has to tell the kitchen to cook the pilau and the bar to pour the beers, and tell them again when the table orders another round. Today the till cannot do that: it records what was sold, but nothing tells the people making it. Most places fall back on paper chits, shouting, or a waiter walking back and forth.

This document scopes a "send to kitchen" feature: the waiter sends an order from the till, each item goes to the right place (food to the kitchen, drinks to the bar), and the kitchen sees or prints a ticket. It builds on the held bills (tabs and tables) already added, because a ticket belongs to a table.

## What exists today

Checked against the till code and the server code (`Murzak-PoS-Backend`):

| What | State |
|---|---|
| A note on an item ("no onions", "double") | **Does not exist.** A cart line holds only the product, quantity, price and discount. |
| Knowing which items were already sent for cooking | **Does not exist.** |
| Kitchen or bar stations | **Do not exist**, on the till or the server. |
| Printing | A receipt prints through the browser's print dialog (`window.print()`) to whichever printer the browser uses, laid out for an 80 mm till roll. Nothing in code can choose a different printer. |
| Categories to route by | **Exist.** Every product has an item group (Food, Beer, Soda...), and the till already shows them as category buttons. |
| Tables and tabs | **Exist now**: named held bills, shareable between tills once the server calls are added (`HELD_SALES_SERVER_API.md`). |
| Server support for kitchens | **None.** No ticket records, no live-update (realtime) code, no print formats beyond the one chosen on a POS profile. |
| Deployment | Merging to `main` on the backend deploys by itself, including database changes. |

## The idea

1. The waiter builds the bill for a table, taps **Send to kitchen**.
2. Only the items **added since the last send** go out. A second round for Table 4 produces a ticket with just the second round.
3. Each item goes to the **station** its category is set to: Food to the Kitchen, Beer, Soda and Spirits to the Bar. One send can produce one ticket per station.
4. The station sees or prints the ticket: table name, who sent it, the time, each item with quantity and any note.
5. Optionally the station taps "Ready", and the waiter's till shows that the table's food is ready.

A ticket as it would print:

```
KITCHEN                      #14
Table 4            19:42  Amina
-------------------------------
2 x Pilau
     no pilipili
1 x Chicken Burger
     well done, no onions
-------------------------------
Round 2
```

## The pieces

**A. Notes on items.** Tap a line in the cart, type a note or pick a quick one ("No onions", "Well done", "Extra shot", "Takeaway"). Front end only. The note is kept with the held bill and appears on the ticket, not on the customer's receipt.

**B. Remembering what was sent.** Each cart line records how many were already sent, so a send only includes what is new, and a changed quantity sends only the difference. Front end only.

**C. Stations and routing.** A settings screen to define stations (Kitchen, Bar, Pastry...) and which item groups go to which. Items in a group with no station are not sent anywhere, and the waiter is told. This needs somewhere to store it: the browser for a single till, or the server so all tills agree.

**D. Where the ticket appears.** The real design decision. The options:

| Option | How it works | Needs | Good for | Limits |
|---|---|---|---|---|
| 1. Print from the till | A kitchen-ticket layout prints through the browser, one page per station | Front end only | One printer, a till close to the kitchen, a small café | Cannot pick the kitchen printer by code: it prints to whatever the till's browser prints to. Two stations on one printer means tearing them apart. |
| 2. Station screen | A page (for example `/kitchen`) opened on a tablet or screen in the kitchen and the bar, listing live tickets with a "Ready" button | Server: tickets stored and listed | Busy places, no paper, several stations | Needs a tablet or screen at each station, and the till and station both need internet |
| 3. Auto-print at the station | The station page prints each new ticket by itself on the printer next to it | Option 2, plus the station browser set to print without asking | Kitchens that want paper | One device per printer; depends on browser settings |
| 4. Network or cloud printers | Tickets go straight to a receipt printer on the network | A local helper program or specific printer models | Larger operations | Hardware specific; not worth starting before the printers are known |

## Phases

| Phase | What it delivers | What it needs | Size |
|---|---|---|---|
| **K1: notes and printed tickets** (done) | Notes on items, send-only-what-is-new, stations set up on the device, a ticket printed per station through the browser | Front end only | Medium |
| **K2: tickets on the server, station screens** (front end done; waiting for the server calls) | Tickets stored on the server, a kitchen and a bar screen with live tickets and "Ready", "Ready" shown on the waiter's till, stations stored on the server so all tills agree | A new table and a few calls on the server (same pattern as held bills), a station page on the front end | Large |
| **K3: auto-print and hardware** | Tickets print by themselves at the station | K2, and decisions about devices and printers | Depends on hardware |

**Recommendation:** do K1 first. It works on day one with any single printer, needs nothing from the server, and makes the notes and the "what was sent" memory that K2 also needs. Start K2 once you know whether the kitchens have screens. Leave K3 until the printers are known.

## Rules the design must keep

- **Never send twice.** A double tap must not produce two tickets. Each send has its own id, and a retry after a dropped connection is harmless.
- **Never lose an order.** If the server cannot be reached, the ticket is kept on the device and sent when the connection returns, the same way held bills are. A waiter is always told whether the order reached the station.
- **Changes after sending are visible.** Removing or reducing an item that was already sent must reach the station as a clearly marked cancellation. This also protects the business: in a bar, quietly removing sent items is a classic way to hide drinks that were served.
- **Notes stay off the receipt**, unless you decide otherwise.
- **Tickets belong to a business and a store.** A kitchen only sees its own tickets, using the same business check the server already uses.
- **A ticket never changes stock or accounts.** Only the final sale does that.

## Server work for K2 (a sketch)

Roughly four calls, following the held-sales pattern, written in detail when K2 starts:

- `send_ticket`: store a ticket for a station (with its own id, so repeats are harmless).
- `list_tickets`: the tickets for a station, newest first, optionally only open ones.
- `set_ticket_status`: new, preparing, ready, served, cancelled.
- stations: list and save the stations and which item groups each serves.

The station screen would ask the server every few seconds. Frappe offers live push (realtime), but nothing in your server uses it yet, so asking regularly is simpler and safer to start with.

Because your server deploys automatically on merge, this is a normal pull request on `Murzak-PoS-Backend`.

## Questions for you

These decide the design. If you do not know, my suggested answer is in brackets.

1. **Table service, counter service, or both?** [Both, with tables first.]
2. **How many stations?** Kitchen and bar only, or more (pastry, grill, juice)? [Two, with the setting open to more.]
3. **What printers do your restaurants have?** Thermal 80 mm? USB or network? Only one, or one per station? [One thermal printer, which suits K1.]
4. **Is there a tablet or screen the kitchen and bar could use?** [Not assumed. K1 first, K2 when yes.]
5. **Do waiters take orders on phones, or at a till?** [Both. Phones need the shared held bills on the server.]
6. **Should the kitchen see the customer's name?** [No, only the table or tab name.]
7. **Who may remove an item after it was sent?** [Anyone, but it always sends a cancellation to the station and is recorded.]
8. **Quick notes:** which should be one tap? [No onions, Well done, Extra, Takeaway. Editable.]
9. **Which languages should tickets use?** [English, with Swahili notes allowed because notes are free text.]

## Not in this scope

Recipes and ingredient stock, splitting a bill between guests, tips and service charge, happy-hour pricing, and dine-in or takeaway reporting. These are listed in `HELD_SALES_PLAN.md` and are separate pieces of work.
