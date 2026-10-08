# Payment Gateways (M-Pesa, Pesapal, PayPal, Bank)

The full setup and operations guide lives in the backend repository:
`docs/PAYMENT_GATEWAYS_GUIDE.md` (MurzakTech/murzak-pos-backend). This page covers the frontend only.

## Screens

| Screen | File | Purpose |
| --- | --- | --- |
| Settings > Payment Gateways | `src/pages/Settings/PaymentGateways.js` | Each business enters its own M-Pesa, Pesapal and PayPal keys, tests them, and sees its bank methods |
| Till payment step | `src/pages/Sales/pos/PaymentPanel.jsx` | Shows the right collection step for the chosen method, also per line in split payments |
| Gateway collection | `src/pages/Sales/pos/GatewayPayment.jsx` | M-Pesa prompt or code, Pesapal/PayPal QR code, bank reference |
| API calls | `src/api/paymentGatewayApi.js` | All gateway endpoints |

## Till behaviour

* On opening, the till asks the server which methods are gateways (`get_pos_payment_options`).
  Methods without a gateway (Cash, card machine, Credit) work exactly as before.
* For a gateway method, **Complete sale** stays disabled until the payment is confirmed. Each line sends
  `gateway_transaction` and `reference_no` with the sale; the server checks them again.
* Changing a line's method or amount clears its confirmation. A single-method confirmation survives
  small cart changes (within KES 1).
* The M-Pesa code or reference prints on the receipt.

No environment variables or build changes are needed: keys live on the server per business.
