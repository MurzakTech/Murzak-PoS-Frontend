# Held Sales: Server API

## In plain words

A restaurant or bar keeps bills open: a table that orders in rounds, a tab that stays open all evening. The till's front end is ready to store these open bills on the server, so that every till and every waiter's phone sees the same ones. It will do so automatically as soon as the three calls below exist. Until they do, the till keeps working exactly as before, storing held bills in the browser on one device.

This file is the contract for those three calls, and a reference implementation for the Frappe app (`techsavanna_pos`). The front end is already built and tested against this contract (see `src/api/heldSalesApi.js` and `src/hooks/useHeldSales.js`).

## Why separate calls and not draft invoices

The server can already save a sale as a draft invoice, but that is a poor fit for an open bill. This was checked against the server code (`techsavanna_pos/api/sales_api.py` in `Murzak-PoS-Backend`):

- **A draft invoice cannot be removed.** `cancel_pos_invoice` refuses anything that is not submitted ("Only submitted POS Invoices (docstatus 1) can be cancelled"), and there is no call that deletes a draft invoice. A discarded tab would stay behind as a draft forever.
- There is nowhere to put the table or tab name.
- A draft can be checked against stock when saved, which would block holding an item that is running low.
- Drafts risk appearing in sales history, shift totals and reports as if they were sales.

A held bill is not an invoice. It is a note of what is on the table, until it is paid. So it gets its own small record.

## The three calls

All are `POST`, require a signed-in user, and are called as `techsavanna_pos.api.held_sales_api.<name>`. Replies follow the same pattern as the sales API: `{ "message": { "success": true, "data": { ... } } }`. On a refusal, return `{ "message": { "success": false, "message": "reason in plain words" } }`.

### `list_held_sales`

The open bills for a business, optionally for one store.

Request:
```json
{ "company": "Shop A Ltd", "warehouse": "Main Store - SA" }
```
`warehouse` is optional. When given, return bills held for that store, and bills held with no store.

Reply `data`:
```json
{
  "held_sales": [
    {
      "id": "h_lq3k2x9a",
      "label": "Table 4",
      "customer": "Walk-in Customer",
      "item_count": 3,
      "total": 1500.0,
      "warehouse": "Main Store - SA",
      "held_at": "2026-10-10T10:00:00.000Z",
      "held_by": "amina@shop.co",
      "held_by_name": "Amina",
      "modified": "2026-10-10 10:00:01.123456",
      "payload": { "cart": [ ... ], "customer": "...", "customerId": null,
                   "selectedCustomerObj": null, "customerPriceList": "Standard Selling",
                   "manualDiscountType": "percentage", "manualDiscountValue": 0 }
    }
  ]
}
```
`payload` is an object (a JSON string is also accepted). The till treats it as opaque, so the server should store it as given and return it unchanged.

### `save_held_sale`

Adds a bill, or replaces the one with the same `id`. Saving the same bill twice must be harmless, because the till retries after a dropped connection.

Request:
```json
{
  "company": "Shop A Ltd",
  "warehouse": "Main Store - SA",
  "id": "h_lq3k2x9a",
  "label": "Table 4",
  "held_at": "2026-10-10T10:00:00.000Z",
  "customer": "Walk-in Customer",
  "item_count": 3,
  "total": 1500.0,
  "payload": { "cart": [ ... ] }
}
```
Reply `data`: `{ "id": "h_lq3k2x9a", "held_by": "amina@shop.co", "held_by_name": "Amina", "modified": "..." }`

### `delete_held_sale`

Removes a bill. **This is also how a till brings a bill back**: the till deletes it first and only continues if the server says it was there. That is what stops two tills from taking the same tab.

Request: `{ "company": "Shop A Ltd", "id": "h_lq3k2x9a" }`

Reply `data`: `{ "id": "h_lq3k2x9a", "deleted": true }`

`deleted` must be `false`, not an error, when the bill is already gone (another till brought it back, or it was discarded). The delete must be atomic: when two tills delete the same bill at the same moment, exactly one must receive `true`.

## Rules

1. **Access.** The user must belong to the company in the request. Reuse the same check your other endpoints use. Never return another company's bills.
2. **Who held it.** `held_by` and `held_by_name` come from the signed-in session, never from the request.
3. **Ids.** `id` is chosen by the till, unique per company, and treated as text. Older bills held on a device may have a numeric id (sent as text).
4. **Limits.** Reject a bill with more than 300 lines, or a `payload` over 256 KB, with a clear message. Trim `label` to 40 characters.
5. **No side effects.** Saving or deleting a held bill must not touch stock, accounts, invoices or reports.
6. **Old bills.** Suggested: a daily job removes bills held more than 30 days ago. The till already warns after 12 hours.
7. **Missing calls.** A server without these calls (HTTP 404, or Frappe's "no attribute" error) makes the till fall back to the device. No other failure does: a timeout or a 5xx makes the till keep the bill on the device and send it later.

## Reference implementation (an untested sketch, matched to your server code)

This has not been run. It is written to fit `Murzak-PoS-Backend`: it uses the server's own company check (`resolve_company` in `api/payment_gateway_common.py`, which refuses companies the user does not belong to and rejects guests), and it follows the folder layout used by the other tables. A Frappe developer should review it, in particular the atomic delete.

**1. The table.** Create the folder `techsavanna_pos/techsavanna_pos/doctype/pos_held_sale/` with an empty `__init__.py`, a `pos_held_sale.py` containing `class POSHeldSale(Document): pass`, and a `pos_held_sale.json` that defines the DocType (module "Techsavanna POS", not submittable, naming by field `held_id`) with these fields:

| Field | Type | Notes |
|---|---|---|
| `held_id` | Data | required; the till's id; unique together with `company` |
| `company` | Link to Company | required; indexed |
| `warehouse` | Link to Warehouse | optional |
| `label` | Data (40) | table or tab name |
| `customer_name` | Data | |
| `item_count` | Int | |
| `total` | Currency | |
| `held_at` | Datetime | |
| `payload` | Long Text | the sale as JSON, stored and returned unchanged |

The record's `owner` is who held it. Merging to `main` runs `bench migrate` on the server (see `.github/workflows/deploy.yml`), which creates the table by itself.

**2. The calls**, in `techsavanna_pos/api/held_sales_api.py`:
```python
"""
Held sales: bills put on hold at a till (a table, a tab) and shared by every till of a business.
Held bills are not invoices: saving or deleting one never touches stock, accounts or reports.
"""

from __future__ import annotations

import json

import frappe
from frappe import _

from techsavanna_pos.api.payment_gateway_common import get_user_companies, resolve_company

MAX_LINES = 300
MAX_PAYLOAD = 256 * 1024
KEEP_DAYS = 30


def _person(user):
    return frappe.db.get_value("User", user, "full_name") or user


def _row(d):
    return {
        "id": d.held_id,
        "label": d.label or "",
        "customer": d.customer_name or "",
        "item_count": d.item_count or 0,
        "total": d.total or 0,
        "warehouse": d.warehouse,
        "held_at": d.held_at,
        "held_by": d.owner,
        "held_by_name": _person(d.owner),
        "modified": str(d.modified),
        "payload": json.loads(d.payload or "{}"),
    }


@frappe.whitelist(methods=["POST"])
def list_held_sales(company=None, warehouse=None):
    company = resolve_company(company)
    rows = frappe.get_all(
        "POS Held Sale",
        filters={"company": company},
        fields=["held_id", "label", "customer_name", "item_count", "total", "warehouse",
                "held_at", "owner", "modified", "payload"],
        order_by="held_at asc",
    )
    if warehouse:  # bills for this store, and bills held with no store
        rows = [r for r in rows if not r.warehouse or r.warehouse == warehouse]
    return {"success": True, "data": {"held_sales": [_row(frappe._dict(r)) for r in rows]}}


@frappe.whitelist(methods=["POST"])
def save_held_sale(id, payload, company=None, label="", warehouse=None, held_at=None,
                   customer="", item_count=0, total=0):
    company = resolve_company(company)
    if isinstance(payload, str):
        payload = json.loads(payload)
    text = json.dumps(payload)
    if len(text) > MAX_PAYLOAD or len(payload.get("cart") or []) > MAX_LINES:
        return {"success": False, "message": _("This bill is too large to hold.")}

    name = frappe.db.get_value("POS Held Sale", {"company": company, "held_id": str(id)})
    doc = frappe.get_doc("POS Held Sale", name) if name else frappe.new_doc("POS Held Sale")
    doc.update({
        "held_id": str(id), "company": company, "warehouse": warehouse or None,
        "label": (label or "")[:40], "customer_name": customer or "",
        "item_count": item_count, "total": total, "held_at": held_at, "payload": text,
    })
    doc.save(ignore_permissions=True)  # access was checked by resolve_company above
    return {"success": True, "data": {
        "id": doc.held_id, "held_by": doc.owner, "held_by_name": _person(doc.owner),
        "modified": str(doc.modified)}}


@frappe.whitelist(methods=["POST"])
def delete_held_sale(id, company=None):
    company = resolve_company(company)
    # A single statement, so that of two tills deleting at the same moment only one removes the row
    frappe.db.sql("DELETE FROM `tabPOS Held Sale` WHERE company=%s AND held_id=%s", (company, str(id)))
    deleted = frappe.db.sql("SELECT ROW_COUNT()")[0][0] > 0
    return {"success": True, "data": {"id": str(id), "deleted": bool(deleted)}}


def purge_old_held_sales():
    """Daily job: remove bills held more than KEEP_DAYS days ago, so abandoned tabs do not pile up."""
    cutoff = frappe.utils.add_days(frappe.utils.now_datetime(), -KEEP_DAYS)
    frappe.db.sql("DELETE FROM `tabPOS Held Sale` WHERE held_at < %s", (cutoff,))
```

**3. The daily clean-up.** In `techsavanna_pos/hooks.py` the `scheduler_events` block is currently commented out. Enable it with:
```python
scheduler_events = {
    "daily": ["techsavanna_pos.api.held_sales_api.purge_old_held_sales"],
}
```

**4. Tests**, in the style of `api/test_pos_shift_close.py` (plain `unittest` with `patch`, no database): a guest is refused; a user from another business is refused; a bill over 300 lines is refused; a missing `deleted` row reports `deleted: false`.

## How to check it works

1. With two browsers signed in to the same business, put a named bill on hold in one. It should appear in the other within about 20 seconds, or immediately after that browser's window is clicked.
2. Open "Held sales" on both and press "Bring back" on the same bill, one after the other. The first gets it; the second is told it was already brought back, and gets nothing.
3. Switch one browser offline (browser developer tools, Network, Offline), hold a bill, switch back online. The bill should reach the server by itself.
4. Check that no stock, invoice or report changes when bills are held, brought back or discarded.

The front end tests that simulate all of the above run with `npm test` (`src/hooks/useHeldSales.test.js` and `src/api/heldSalesApi.test.js`).
