# Kitchen Tickets and Station Screens: Server API

## In plain words

Station screens let a kitchen or a bar see orders on a tablet or monitor instead of (or as well as) on paper. A waiter presses "Send to kitchen" at a till or on a phone; the order appears on the screen of the right station; the cook presses Start, then Ready; the waiter's till shows "Ready" and the waiter takes it to the table.

For that to work, the tickets have to live on the server, where every device can see them. This file is the contract for the five calls the front end needs, plus a reference implementation for the Frappe app (`techsavanna_pos`). The front end is already built and tested against this contract (`src/api/kitchenApi.js`, `src/hooks/useKitchenSettings.js`, `src/hooks/useKitchenTickets.js`, `src/hooks/useStationBoard.js`, `src/pages/Kitchen`).

Until the calls exist, nothing breaks. The "Also show tickets on station screens" switch is greyed out with an explanation, and kitchen tickets keep printing exactly as before.

## What the front end does with them

| Situation | What happens |
|---|---|
| The server has none of these calls (HTTP 404, or Frappe's "failed to get method" / "no attribute" error) | Station screens are unavailable. The till prints tickets with its own numbers, as before. The station page says it is not available yet. |
| Station screens are switched off for the business | The till never calls `send_tickets`, `list_tickets` or `set_ticket_status`. |
| Station screens are on and a send succeeds | The server's number is printed on the ticket, and the bill is marked as sent. |
| Station screens are on and a send fails (timeout, 5xx, refusal) | Nothing is marked as sent. The waiter sees "The stations did not get it" with **Try again**, **Print only** and **Cancel**. Try again sends the same ticket ids, so it is never doubled. Print only prints with the till's own numbers and puts nothing on the screens. |
| The connection drops on a station screen | The screen keeps showing the last tickets it had, shows a warning, and keeps trying. |

## The five calls

All are `POST`, require a signed-in user, and are called as `techsavanna_pos.api.kitchen_api.<name>`. Replies follow the same pattern as the sales API: `{ "message": { "success": true, "data": { ... } } }`. On a refusal, return `{ "message": { "success": false, "message": "reason in plain words" } }`.

### `get_kitchen_settings`

The settings every till of the business shares.

Request: `{ "company": "Shop A Ltd" }`

Reply `data`: `{ "settings": { ... } }`, or `{ "settings": null }` when none were saved yet.
```json
{
  "settings": {
    "enabled": true,
    "screens": true,
    "stations": [
      { "id": "kitchen", "name": "Kitchen", "groups": ["Food"] },
      { "id": "bar", "name": "Bar", "groups": ["Beer", "Soda"] }
    ],
    "defaultStation": "",
    "quickNotes": ["No onions", "Well done", "Extra", "Takeaway"]
  }
}
```
The till treats the object as opaque apart from these five keys. Store it as given and return it unchanged. Things that belong to one device (whether to print straight away, the till's own ticket counter) are never sent.

### `save_kitchen_settings`

Request: `{ "company": "Shop A Ltd", "settings": { ... } }`. Reply `data`: `{}`.

Only managers may save (suggested roles: System Manager, Accounts Manager, Sales Manager). Everyone else gets a refusal with a plain message; the till then keeps the change on that device only and tells the person so.

### `send_tickets`

Hands tickets to their stations. One send from the till can hold several tickets, one per station.

Request:
```json
{
  "company": "Shop A Ltd",
  "warehouse": "Main Store - SA",
  "tickets": [
    {
      "client_id": "k_m3x9_ab12cd-1",
      "station": "Kitchen",
      "label": "Table 4",
      "order_type": "table",
      "round": 2,
      "created_at": "2026-10-10T16:42:00.000Z",
      "lines": {
        "adds":    [ { "item_code": "FOOD-1", "item_name": "Pilau", "qty": 2, "note": "no pilipili" } ],
        "changes": [ { "item_code": "FOOD-2", "item_name": "Burger", "note": "well done", "previousNote": "" } ],
        "voids":   [ { "item_code": "FOOD-3", "item_name": "Chips", "qty": 1, "note": "" } ]
      }
    }
  ]
}
```
There is deliberately **no number** in the request. The server numbers tickets.

Reply `data`: `{ "tickets": [ <ticket>, ... ] }` where each ticket is:
```json
{
  "id": "a1b2c3",
  "client_id": "k_m3x9_ab12cd-1",
  "station": "Kitchen",
  "number": 14,
  "round": 2,
  "label": "Table 4",
  "order_type": "table",
  "sent_by": "amina@shop.co",
  "sent_by_name": "Amina",
  "created_at": "2026-10-10T16:42:00.000Z",
  "status": "New",
  "status_by": "",
  "status_by_name": "",
  "status_at": "",
  "lines": { "adds": [ ... ], "changes": [ ... ], "voids": [ ... ] }
}
```
**Every ticket sent must come back**, matched by `client_id`. If one is missing, the till treats the whole send as failed and offers to try again.

Rules for this call:

1. **Idempotent.** A `client_id` that already exists (for this company) must return the existing ticket with its original number, and must not create a second one. The till retries after a dropped connection, and the reply may have been lost after the tickets were saved.
2. **One number per send.** All tickets created by one call share one number, so "Order 14" means the same order on the Kitchen and the Bar screens. If some of the tickets in a retried call already exist, the missing ones take the number of the existing ones.
3. **Numbers restart at 1 each day**, per company and per store (using the site's date).
4. **Numbering must be atomic**, so that two tills sending at the same moment never get the same number. See the reference code.
5. **Limits.** At most 20 tickets per call, at most 100 lines per ticket, `label` trimmed to 40 characters, `order_type` either `table` or `counter`.
6. **No side effects.** A ticket never touches stock, accounts, invoices or reports.
7. `sent_by` comes from the signed-in session, never from the request.
8. The customer's name is never part of a ticket. The `label` is only a table or tab name (or an optional name for a counter order).

### `list_tickets`

Tickets for a station screen, or for a till that wants to know what is ready.

Request (everything except `company` is optional):
```json
{ "company": "Shop A Ltd", "warehouse": "Main Store - SA", "station": "Kitchen",
  "statuses": ["New", "Preparing", "Ready"], "since": "2026-10-09T16:42:00.000Z" }
```
`statuses` limits the result to those statuses. `since` returns tickets created at or after that time. `station` is matched by name. When `warehouse` is given, return tickets for that store and tickets with no store.

Reply `data`: either a list of tickets (same shape as above) or `{ "tickets": [ ... ] }`. Oldest first. Suggested cap: 500 tickets.

The station screen asks every 5 seconds for open tickets (New, Preparing, Ready). A till with station screens on asks every 10 seconds for Ready ones. The Cancellations tab asks every 30 seconds for the last 24 hours and keeps only the tickets that have `voids`.

### `set_ticket_status`

Request: `{ "company": "Shop A Ltd", "id": "a1b2c3", "status": "Ready" }`

`status` is one of `New`, `Preparing`, `Ready`, `Served`. Reply `data`: the updated ticket. Record who changed it and when (`status_by`, `status_at`). Allow any of the four statuses, so a mistaken tap can be corrected. A ticket from another company is "not found".

## Rules

1. **Access.** The user must belong to the company in the request. Reuse the same check your other endpoints use. Never return another company's tickets or settings.
2. **A record, not just a queue.** Tickets are kept after they are served. Cancellations in particular are an audit trail: in a bar, quietly removing sent items is a classic way to hide drinks that were served. Suggested: a daily job removes tickets older than 90 days. The station screen shows the last 24 hours.
3. **Missing calls.** A server without these calls makes the till fall back to printing. No other failure does: a timeout or a 5xx makes the till show the retry choices.

## Reference implementation (an untested sketch, matched to your server code)

This has not been run. It follows the pattern of `HELD_SALES_SERVER_API.md`: the company check is `resolve_company` from `api/payment_gateway_common.py`, and tables are created by `bench migrate` when this is merged to `main`. A Frappe developer should review it, in particular the numbering.

**1. Two tables.** Create two DocType folders under `techsavanna_pos/techsavanna_pos/doctype/`, each with an empty `__init__.py`, a `.py` file holding an empty `Document` class, and a `.json` definition (module "Techsavanna POS", not submittable).

`kitchen_ticket/` (naming: hash):

| Field | Type | Notes |
|---|---|---|
| `client_id` | Data | required; unique; indexed |
| `company` | Link to Company | required; indexed |
| `warehouse` | Link to Warehouse | optional |
| `station` | Data | the station's name |
| `ticket_date` | Date | the day the number belongs to |
| `number` | Int | |
| `round` | Int | |
| `label` | Data (40) | table or tab name |
| `order_type` | Select | `table`, `counter` |
| `status` | Select | `New`, `Preparing`, `Ready`, `Served`; default `New` |
| `status_by` | Link to User | |
| `status_at` | Datetime | |
| `created_at` | Datetime | the till's time of sending |
| `lines` | Long Text | `{adds, changes, voids}` as JSON, stored and returned unchanged |

The record's `owner` is who sent it. Also add an index on (`company`, `warehouse`, `station`, `status`).

`pos_kitchen_settings/` (naming: by field `company`, so there is one row per business): fields `company` (Link to Company, required, unique) and `settings` (Long Text, JSON).

**2. The calls**, in `techsavanna_pos/api/kitchen_api.py`:
```python
"""
Kitchen and bar tickets: orders sent from a till to the stations, and what the stations do with them.
A ticket never touches stock, accounts or reports.
"""

from __future__ import annotations

import json

import frappe
from frappe import _

from techsavanna_pos.api.payment_gateway_common import resolve_company

STATUSES = ("New", "Preparing", "Ready", "Served")
ORDER_TYPES = ("table", "counter")
MANAGER_ROLES = {"System Manager", "Accounts Manager", "Sales Manager"}
MAX_TICKETS, MAX_LINES, MAX_LIST, KEEP_DAYS = 20, 100, 500, 90


def _person(user):
    return (frappe.db.get_value("User", user, "full_name") or user) if user else ""


def _as_obj(value, default):
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except ValueError:
            return default
    return value if value is not None else default


def _ticket(d):
    return {
        "id": d.name, "client_id": d.client_id, "station": d.station, "number": d.number,
        "round": d.round, "label": d.label or "", "order_type": d.order_type,
        "sent_by": d.owner, "sent_by_name": _person(d.owner),
        "created_at": d.created_at, "status": d.status,
        "status_by": d.status_by or "", "status_by_name": _person(d.status_by),
        "status_at": d.status_at or "", "lines": json.loads(d.lines or "{}"),
    }


@frappe.whitelist(methods=["POST"])
def get_kitchen_settings(company=None):
    company = resolve_company(company)
    raw = frappe.db.get_value("POS Kitchen Settings", {"company": company}, "settings")
    return {"success": True, "data": {"settings": json.loads(raw) if raw else None}}


@frappe.whitelist(methods=["POST"])
def save_kitchen_settings(settings, company=None):
    company = resolve_company(company)
    if not MANAGER_ROLES & set(frappe.get_roles()):
        return {"success": False, "message": _("Only a manager can change the kitchen settings.")}
    settings = _as_obj(settings, None)
    if not isinstance(settings, dict) or len(settings.get("stations") or []) > 12 \
            or len(settings.get("quickNotes") or []) > 12:
        return {"success": False, "message": _("These kitchen settings are not valid.")}
    keep = {k: settings.get(k) for k in ("enabled", "screens", "stations", "defaultStation", "quickNotes")}
    name = frappe.db.get_value("POS Kitchen Settings", {"company": company})
    doc = frappe.get_doc("POS Kitchen Settings", name) if name else frappe.new_doc("POS Kitchen Settings")
    doc.company, doc.settings = company, json.dumps(keep)
    doc.save(ignore_permissions=True)  # access was checked by resolve_company above
    return {"success": True, "data": {}}


def _next_number(company, warehouse, day):
    # Locks the day's rows so that two tills sending at the same moment take turns
    row = frappe.db.sql(
        """SELECT COALESCE(MAX(number), 0) FROM `tabKitchen Ticket`
           WHERE company=%s AND IFNULL(warehouse, '')=%s AND ticket_date=%s FOR UPDATE""",
        (company, warehouse or "", day),
    )
    return int(row[0][0]) + 1


@frappe.whitelist(methods=["POST"])
def send_tickets(tickets, company=None, warehouse=None):
    company = resolve_company(company)
    tickets = _as_obj(tickets, [])
    if not tickets or len(tickets) > MAX_TICKETS:
        return {"success": False, "message": _("Nothing to send, or too many tickets at once.")}
    for t in tickets:
        lines = _as_obj(t.get("lines"), {})
        if not t.get("client_id") or not t.get("station") \
                or sum(len(lines.get(k) or []) for k in ("adds", "changes", "voids")) > MAX_LINES:
            return {"success": False, "message": _("A ticket is incomplete or too large.")}

    ids = [str(t["client_id"]) for t in tickets]
    found = {d.client_id: d for d in frappe.get_all(
        "Kitchen Ticket", filters={"company": company, "client_id": ["in", ids]}, fields=["*"])}
    fresh = [t for t in tickets if str(t["client_id"]) not in found]

    if fresh:
        day = frappe.utils.today()
        # A retry that finds some tickets already saved keeps their number; a new send takes the next one
        number = next(iter(found.values())).number if found else _next_number(company, warehouse, day)
        for t in fresh:
            order_type = t.get("order_type") if t.get("order_type") in ORDER_TYPES else "table"
            doc = frappe.get_doc({
                "doctype": "Kitchen Ticket", "client_id": str(t["client_id"]), "company": company,
                "warehouse": warehouse or None, "station": str(t["station"])[:40],
                "ticket_date": day, "number": number, "round": max(int(t.get("round") or 1), 1),
                "label": (t.get("label") or "")[:40], "order_type": order_type, "status": "New",
                "created_at": t.get("created_at") or frappe.utils.now(),
                "lines": json.dumps(_as_obj(t.get("lines"), {})),
            })
            doc.insert(ignore_permissions=True)  # access was checked by resolve_company above
            found[doc.client_id] = doc
        frappe.db.commit()

    return {"success": True, "data": {"tickets": [_ticket(found[i]) for i in ids]}}


@frappe.whitelist(methods=["POST"])
def list_tickets(company=None, warehouse=None, station=None, statuses=None, since=None):
    company = resolve_company(company)
    filters = {"company": company}
    if station:
        filters["station"] = station
    statuses = _as_obj(statuses, None)
    if statuses:
        filters["status"] = ["in", [s for s in statuses if s in STATUSES]]
    if since:
        filters["created_at"] = [">=", frappe.utils.get_datetime(since)]
    rows = frappe.get_all("Kitchen Ticket", filters=filters, fields=["*"],
                          order_by="created_at asc", limit_page_length=MAX_LIST)
    if warehouse:  # tickets for this store, and tickets sent with no store
        rows = [r for r in rows if not r.warehouse or r.warehouse == warehouse]
    return {"success": True, "data": {"tickets": [_ticket(frappe._dict(r)) for r in rows]}}


@frappe.whitelist(methods=["POST"])
def set_ticket_status(id, status, company=None):
    company = resolve_company(company)
    if status not in STATUSES:
        return {"success": False, "message": _("That is not a ticket status.")}
    if not frappe.db.exists("Kitchen Ticket", {"name": str(id), "company": company}):
        return {"success": False, "message": _("This ticket was not found.")}
    doc = frappe.get_doc("Kitchen Ticket", str(id))
    doc.status, doc.status_by, doc.status_at = status, frappe.session.user, frappe.utils.now()
    doc.save(ignore_permissions=True)
    return {"success": True, "data": _ticket(doc)}


def purge_old_tickets():
    """Daily job: remove tickets older than KEEP_DAYS days. Until then they are the record, cancellations included."""
    cutoff = frappe.utils.add_days(frappe.utils.now_datetime(), -KEEP_DAYS)
    frappe.db.sql("DELETE FROM `tabKitchen Ticket` WHERE created_at < %s", (cutoff,))
```

Two things a reviewer should look at closely. First, the numbering: `SELECT ... FOR UPDATE` over a `MAX` is a common way to serialise numbering in MariaDB under Frappe's default isolation, but a unique index on (`company`, `warehouse`, `station`, `ticket_date`, `number`), added in a small patch, is a good safety net; with a retry on a duplicate-key error. Second, `frappe.db.commit()` inside a whitelisted call: Frappe commits at the end of a request anyway, so it may be unnecessary, and is shown only to make the intent plain (the numbers must be visible to the next request at once).

**3. The daily clean-up.** In `techsavanna_pos/hooks.py`, the `scheduler_events` block (already needed for held sales) gets a second entry:
```python
scheduler_events = {
    "daily": [
        "techsavanna_pos.api.held_sales_api.purge_old_held_sales",
        "techsavanna_pos.api.kitchen_api.purge_old_tickets",
    ],
}
```

**4. Tests**, in the style of `api/test_pos_shift_close.py` (plain `unittest` with `patch`, no database): a guest is refused; a user from another business is refused; a non-manager cannot save settings; sending the same `client_id` twice returns the same number and creates one record; two tickets in one send share a number; a ticket with an unknown status is refused; `list_tickets` never returns another company's tickets.

## How to check it works

With the front end running against the server, using two devices (for example a till on a laptop and a tablet for the kitchen):

1. On the till, open the three dots menu, Kitchen tickets, switch on kitchen tickets, set up the stations, switch on "Also show tickets on station screens", and Save.
2. On the tablet, sign in, open `/kitchen` (or the "Open the station screen" button in that same dialog), and choose Kitchen. The choice is remembered on that tablet.
3. On the till, add a food item and a drink, press Send to kitchen, type "Table 4", Send. The dialog says "Sent to the station screens". The Kitchen tablet shows Table 4 within about 5 seconds, with only the food.
4. On the tablet press Start, then Ready. Within about 10 seconds the till shows a green "Ready (1)" button and a message. Open it and press Served. The ticket leaves the tablet.
5. Send a **counter order** (choose "Counter order", leave the name empty). The ticket shows "Counter order" and a large number.
6. Remove a sent item, or clear a sent bill with "Clear and print cancellation". A box marked "CANCELLED, DO NOT MAKE" appears on the station, and the Cancellations tab keeps a record.
7. Turn off the tablet's network for a minute: it shows a warning and keeps the last tickets. Turn it on: the warning goes.
8. Turn off the till's network and press Send. The till says the stations did not get it and offers Try again or Print only. Nothing was marked as sent.
9. Switch "Also show tickets on station screens" off. Sending now prints only, and the server receives no calls.
10. Check that no stock, invoice or report changes when tickets are sent or served.

The front end tests that simulate all of this run with `npm test` (`src/api/kitchenApi.test.js`, `src/hooks/useKitchenSettings.test.js`, `src/hooks/useKitchenTickets.test.js`, `src/hooks/useStationBoard.test.js`, `src/pages/Kitchen/Kitchen.test.jsx`).
