# Payment Methods API (POS / Sales)

Expose available modes of payment and how to pass multiple payments (including credit) when creating sales/POS invoices.

## List Payment Methods
Method: `savanna_pos.savanna_pos.apis.sales_api.list_payment_methods`

Arguments:
- `company` (optional): filter accounts to a company
- `only_enabled` (default: true): limit to enabled modes

Response:
```json
{
  "success": true,
  "data": [
    {
      "name": "Cash",
      "type": "Cash",
      "enabled": 1,
      "accounts": [
        { "company": "My Company", "default_account": "Cash - MC", "currency": "USD" }
      ]
    }
  ]
}
```

Notes:
- Modes come from the standard `Mode of Payment` doctype.
- Accounts come from `Mode of Payment Account` children; filtered by `company` when provided.

React example:
```js
frappe.call("savanna_pos.savanna_pos.apis.sales_api.list_payment_methods", {
  company: "My Company"
}).then(r => {
  const methods = r.message?.data || [];
  // populate payment selector
});
```

## Get Receivable Account (for Credit)
Method: `savanna_pos.savanna_pos.apis.sales_api.get_receivable_account`

Args:
- `customer` (required)
- `company` (required)

Returns the customer-specific Party Account for the company if set; otherwise the company `default_receivable_account`.

React example:
```js
const { message } = await frappe.call(
  "savanna_pos.savanna_pos.apis.sales_api.get_receivable_account",
  { customer: "CUST-0001", company: "My Company" }
);
const receivable = message?.data?.account; // use in credit payment row
```

## Creating Sales/POS Invoices with Multiple Payments

Endpoints already accept a `payments` array:
- `create_sales_invoice`
- `create_pos_invoice`
- `update_sales_invoice`
- `update_pos_invoice`

Example payload (POS with split payments and partial credit):
```json
{
  "customer": "CUST-0001",
  "company": "My Company",
  "is_pos": true,
  "items": [
    { "item_code": "ITEM-001", "qty": 2, "rate": 50, "warehouse": "Main - MC" }
  ],
  "payments": [
    { "mode_of_payment": "Cash", "amount": 50, "base_amount": 50, "account": "Cash - MC" },
    { "mode_of_payment": "Card", "amount": 30, "base_amount": 30, "account": "Bank - MC" }
  ]
}
```

Handling credit/outstanding:
- If you want part (or all) on credit, either:
  - Use a “Credit” Mode of Payment mapped to a receivable account, **or**
  - Omit `payments` (or make payments sum less than grand total); ERPNext will keep an outstanding balance.
- For POS, ensure the POS Profile allows partial payments if you expect splits.

Adding new payment methods:
- Create a new `Mode of Payment` record (UI or API), add its `Mode of Payment Account` row for the company/account.
- It will then appear in `list_payment_methods` and can be used in `payments` payloads.

## Sample Sale: Cash + Credit Split

Assume grand total = 200. Pay 80 in cash and leave 120 on credit.

```json
{
  "customer": "CUST-0001",
  "company": "My Company",
  "is_pos": true,
  "items": [
    { "item_code": "ITEM-001", "qty": 4, "rate": 50, "warehouse": "Main - MC" }
  ],
  "payments": [
    {
      "mode_of_payment": "Cash",
      "amount": 80,
      "base_amount": 80,
      "account": "Cash - MC"
    },
    {
      "mode_of_payment": "Credit",
      "amount": 120,
      "base_amount": 120,
      "account": "Debtors - MC"  // receivable account mapped in Mode of Payment Account
    }
  ]
}
```

- The outstanding after submission is 0 because the credit portion is posted to receivables via the “Credit” mode.  
- Alternatively, omit the credit payment row; ERPNext will create an outstanding of 120 (customer owes), and you can settle later via Payment Entry.  
- Ensure the POS Profile allows partial payments for POS flows.

Tip: To pick the right receivable account for credit, call `get_receivable_account(customer, company)` and use that account in the “Credit” payment row, or map it in the Mode of Payment Account for “Credit”.

## React: Posting a Sale with Split Cash + Credit

```js
const payments = [];
payments.push({
  mode_of_payment: "Cash",
  amount: 80,
  base_amount: 80,
  account: "Cash - MC",
});

// Fetch receivable for credit portion
const recvResp = await frappe.call(
  "savanna_pos.savanna_pos.apis.sales_api.get_receivable_account",
  { customer: "CUST-0001", company: "My Company" }
);
payments.push({
  mode_of_payment: "Credit",
  amount: 120,
  base_amount: 120,
  account: recvResp.message?.data?.account,
});

await frappe.call("savanna_pos.savanna_pos.apis.sales_api.create_pos_invoice", {
  customer: "CUST-0001",
  company: "My Company",
  is_pos: true,
  items: [
    { item_code: "ITEM-001", qty: 4, rate: 50, warehouse: "Main - MC" }
  ],
  payments,
});
```

Notes:
- For Sales Invoice (non-POS), call `create_sales_invoice` with the same payments shape.
- Ensure the POS Profile allows partial payments if you expect splits in POS mode.


## POS Invoice Endpoint (create_pos_invoice)

- Endpoint: `POST /api/method/savanna_pos.savanna_pos.apis.sales_api.create_pos_invoice`
- Purpose: Create POS Invoices that support multiple payment methods, cash/card splits, and partial credit (outstanding balance).

### Request fields
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `customer` | string | Yes | Customer name |
| `items` | array or JSON string | Yes | Each item: `item_code`, `qty`, optional `rate`, `warehouse`, `discount_percentage`, `discount_amount` |
| `company` | string | No | Defaults to the user's default company |
| `pos_profile` | string | No | Auto-created/fetched when omitted |
| `posting_date` | string | No | `YYYY-MM-DD`, defaults to today |
| `warehouse` | string | No | Applied to items without their own warehouse |
| `update_stock` | boolean | No | Default `true` |
| `payments` | array or JSON string | No | Multiple payments supported (see below) |
| `apply_discount_on` | string | No | Usually `Net Total` or `Grand Total` |
| `additional_discount_percentage` | number | No | Percentage discount |
| `discount_amount` | number | No | Flat discount |
| `do_not_submit` | boolean | No | If `true`, saves as draft |

Payment object shape:
- `mode_of_payment` (required)
- `amount` (required)
- `base_amount` (optional; defaults to `amount`)
- `account` (optional)
- `use_receivable_account` (optional boolean): when `true`, the backend maps this row to the customer’s receivable account (Party Account or company Default Receivable).

Backend behaviour:
- Resolves missing `account` values from the Mode of Payment Account for the given company.
- If `use_receivable_account` is true, the account is forced to the customer’s receivable account.
- Sets the invoice `debit_to` to the customer receivable (Party Account, else company default).
- If paid amount is less than the total, the outstanding balance is kept on the invoice. The POS Profile is automatically toggled to allow partial payments when needed.

Sample request (cash + card + credit outstanding):
```json
{
  "customer": "CUST-0001",
  "company": "My Company",
  "items": [
    { "item_code": "ITEM-001", "qty": 2, "rate": 120, "warehouse": "Main - MC" }
  ],
  "payments": [
    { "mode_of_payment": "Cash", "amount": 100 },
    { "mode_of_payment": "Card", "amount": 50 },
    { "mode_of_payment": "Credit", "amount": 0, "use_receivable_account": true }
  ]
}
```

Sample response:
```json
{
  "success": true,
  "message": "POS Invoice created successfully",
  "data": {
    "name": "POS-0001",
    "customer": "CUST-0001",
    "company": "My Company",
    "posting_date": "2025-12-15",
    "grand_total": 240,
    "rounded_total": 240,
    "outstanding_amount": 90,
    "docstatus": 1
  }
}
```

### React usage example
```js
// 1) Load payment methods and receivable account
const [{ message: mopResp }, { message: recvResp }] = await Promise.all([
  frappe.call("savanna_pos.savanna_pos.apis.sales_api.list_payment_methods", {
    company: "My Company",
  }),
  frappe.call("savanna_pos.savanna_pos.apis.sales_api.get_receivable_account", {
    customer: "CUST-0001",
    company: "My Company",
  }),
]);

const receivable = recvResp?.data?.account;

// 2) Build payments
const payments = [
  { mode_of_payment: "Cash", amount: 100 },          // account auto-resolved
  { mode_of_payment: "Card", amount: 50 },           // account auto-resolved
  { mode_of_payment: "Credit", amount: 0, use_receivable_account: true } // leaves balance on receivable
];

// 3) Create the POS Invoice
await frappe.call("savanna_pos.savanna_pos.apis.sales_api.create_pos_invoice", {
  customer: "CUST-0001",
  company: "My Company",
  items: [{ item_code: "ITEM-001", qty: 2, rate: 120 }],
  payments,
});
```

Key notes for the frontend:
- Always send `mode_of_payment` and `amount` per payment row. Accounts are optional; the backend resolves them.
- Set `use_receivable_account` on a payment row when you want the backend to attach the correct receivable account for credit.
- If the sum of payments is below the total, the invoice will carry the outstanding balance; partial payments are allowed automatically on the POS Profile when needed.


