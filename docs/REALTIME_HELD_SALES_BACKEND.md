# Live "held" message: what the backend needs to add

## In plain words

When a waiter holds a bill on one till, the other tills of the business only find out at their next 20 second check. This file describes one more live message, `kind: "held"`, that the server sends when a held bill is saved or removed. It follows exactly the same pattern as the payment and kitchen messages in `REALTIME_EVENTS.md`: the message only says "refresh", and the till then asks `list_held_sales` for the facts.

The frontend is already built for it (`src/hooks/useHeldSales.js`). Until the backend sends the message, nothing breaks: the held sales list is simply checked every 20 seconds, as today.

## The message

Same event name as the others, `murzak_pos_event`, with a small body:

```json
{ "kind": "held", "doctype": "POS Held Sale", "action": "saved", "held_id": "h_lq3k2x9a",
  "warehouse": "Main Store - SA", "company": "Wind Power LLC" }
```

- `action` is `"saved"` (a bill was held, or changed, for example renamed) or `"removed"` (a till brought it back to pay, or threw it away).
- `warehouse` may be `null` for a bill held with no store.
- Never in the message: the label, the customer, the items, the total, who held it, or the bill's payload. The till reads those from `list_held_sales`.

## Who receives it

Every enabled user of that business (`users_of_company`), the same as kitchen messages. The till that made the change also gets it; that is harmless, it just reads the list once more.

## Where to send it

Held bills are written by two calls in `murzak_pos/api/held_sales_api.py`, so the message is sent from there:

1. **`save_held_sale`**: after the bill is saved, just before it returns.
2. **`delete_held_sale`**: only when `deleted` is true. **A document hook such as `on_trash` will not work here**, because the call removes the row with a single SQL `DELETE` (this is deliberate, so that only one of two tills can win a bill), and a raw SQL delete never fires document events. The message has to be sent by the call itself.

The daily `purge_old_held_sales` job needs no message.

## The code

In `murzak_pos/api/realtime_events.py`, next to `payment_message` and `kitchen_message`:

```python
def held_message(company, held_id, warehouse, action) -> dict:
	"""What a screen is told about a held bill. Only which bill changed, never what is on it."""
	return {
		"kind": "held",
		"doctype": "POS Held Sale",
		"action": action,
		"held_id": held_id,
		"warehouse": warehouse or None,
		"company": company,
	}


def notify_held_sale(company, held_id, warehouse, action) -> None:
	"""Tell the business's tills that a held bill was saved or removed."""
	try:
		send(held_message(company, held_id, warehouse, action), users_of_company(company))
	except Exception:
		# A message that cannot be sent must never undo or block a held bill
		frappe.log_error("Realtime held sale message", frappe.get_traceback())
```

In `murzak_pos/api/held_sales_api.py`:

```python
from murzak_pos.api.realtime_events import notify_held_sale

# save_held_sale: after the last doc.save(...), before the final return
	notify_held_sale(company, doc.held_id, doc.warehouse, "saved")

# delete_held_sale: read the store first, then send only if this request removed the bill
	warehouse = frappe.db.get_value("POS Held Sale", {"company": company, "held_id": held_id}, "warehouse")
	frappe.db.sql("DELETE FROM `tabPOS Held Sale` WHERE company=%s AND held_id=%s", (company, held_id))
	deleted = frappe.db.sql("SELECT ROW_COUNT()")[0][0] > 0
	if deleted:
		notify_held_sale(company, held_id, warehouse, "removed")
```

`send` already publishes with `after_commit=True`, so the message goes out only once the change is saved, and a till that reacts at once finds the new state.

## Tests to add (no database needed, like `test_realtime_events.py`)

- `held_message(...)` has exactly the keys `kind, doctype, action, held_id, warehouse, company` and nothing else.
- `notify_held_sale` sends to `users_of_company(company)` and to no one else.
- `notify_held_sale` swallows and logs a failure to send, and does not raise.
- `delete_held_sale` sends `"removed"` when a row was deleted, and sends nothing when the bill was already gone.
- `save_held_sale` sends `"saved"` once per successful save, and nothing when the request is refused.

## Checking it on staging

1. Sign in on two tills of the same business, both on the held sales list.
2. Hold a bill on the first. The second shows it within a second or two, with no 20 second wait.
3. Bring the bill back on the second. The first drops it at once.
4. Stop the socket server and hold another bill. It must still save, and the second till shows it at its next regular check.
