# Machine Learning and AI Opportunities for Murzak POS

**Date:** 10 October 2026
**Purpose:** A brainstorm of how Murzak POS can use machine learning (ML: software that learns patterns from past data) and large language models (LLMs: AI that reads and writes plain language) to help shop owners make more money and lose less.

## The starting point: data we already have

Every Murzak POS shop already produces the raw material ML needs:

- **Sales lines:** what sold, when, where, at what price, with what discount and payment method (cash, M-Pesa, card, credit)
- **Stock movements:** receipts, transfers, write-offs and stock-count variances per store
- **Purchases:** supplier, cost price, lead time from order to goods received
- **Customers:** credit limits, repayments and loyalty points
- **Staff:** who rang up, voided, returned or discounted each sale

The guiding rule: **every AI feature must end in a clear action the owner can take**, such as "order 24 crates of Brookside milk by Thursday", not a chart to interpret.

## Tier 1: Quick wins (simple models, high value)

### 1. Smart reorder suggestions
Forecast each product's sales per store for the next one to four weeks, adjusted for the day of the week, month-end salary days, school terms and holidays. Combine with supplier lead times from purchase history to suggest **what to order, how much, and by when**, as a one-click draft purchase order.
*Why it sells:* stock-outs lose sales and over-stocking ties up cash. This is the feature owners will pay for first.

### 2. Shrinkage and fraud alerts
Flag unusual patterns per cashier and shift: many voids or returns, discounts above normal, sales just under approval limits, or stock-count variances that keep appearing on the same items or shift. Show a weekly "things to check" list, not accusations.
*Why it sells:* staff theft and unrecorded refunds are among the largest hidden costs in retail. This pairs directly with the role controls fixed in the security review.

### 3. Dead stock and markdown advice
Identify slow movers and items near expiry, and suggest a discount and timing that clears them before they become a total loss. The existing aging-stock reports provide the base.

### 4. Customer credit scoring
Score credit customers on repayment history and buying patterns, and suggest a safe credit limit. Warn before a sale pushes a risky customer over.

## Tier 2: Growth features (more data, more value)

### 5. Price and promotion insight
Learn how each product's sales respond to price changes and promotions, and show the likely effect of a change before the owner makes it ("raising Coca-Cola 500ml by KES 5 is likely to cost about 4% of volume but add KES 3,200 profit a month").

### 6. Basket analysis and bundles
Find products bought together (bread and milk, phone and charger) to suggest bundles, shelf placement and till prompts for cashiers ("Customers who buy this often add...").

### 7. Customer segments and retention
Group loyalty customers by habits (weekly regulars, month-end bulk buyers, lapsed customers) and suggest targeted SMS or WhatsApp offers to win back those who stopped coming.

### 8. Cash-flow forecast
Combine forecast sales, supplier payment due dates and money owed by credit customers to warn the owner of a cash shortfall weeks before it happens. This also creates a natural opening for working-capital lending partnerships.

### 9. Smarter catalogue setup
Use image recognition and language models to fill in product names, categories and units from a photo or a supplier invoice, extending the existing starter catalogues.

## Tier 3: The "business co-pilot" (the super-intelligence vision)

The long-term opportunity is an AI assistant that understands a shop's numbers as well as a good accountant and a sharp operations manager combined, and that can act, not just answer.

### 10. Ask your shop anything
Owners ask questions in plain English or Swahili, by typing, voice note or WhatsApp: "Which branch made the least profit last month and why?" The assistant answers from their own data with figures and a suggested next step.

### 11. Daily business briefing
Every morning, a short message: yesterday's takings against forecast, what to reorder today, any suspicious activity, customers whose credit is overdue, and one opportunity to act on.

### 12. Agent that does the work, with approval
The assistant drafts purchase orders, schedules stock transfers between branches, prepares eTIMS and month-end summaries, and chases overdue credit customers by SMS. **The owner approves each action**; nothing moves money or stock without a human "yes".

### 13. Network intelligence across all Murzak shops
With consent and fully anonymised, data from many shops reveals what no single shop can see: regional demand trends, fair supplier prices, and early warnings of shortages. Example: "Cooking oil prices from suppliers in Nakuru rose 12% this week; consider buying ahead." This is Murzak's long-term competitive moat, because it improves as more shops join.

## How to build it

| Phase | What | How |
|------|------|-----|
| **1. Foundations (months 0 to 3)** | Clean nightly data export per shop; reorder suggestions; shrinkage alerts | Standard forecasting and anomaly-detection libraries in Python, run nightly beside Frappe. No AI vendor needed. |
| **2. Assistant (months 3 to 6)** | "Ask your shop" and the daily briefing in the dashboard and WhatsApp | An LLM such as Anthropic's Claude, connected to safe, read-only query tools over the shop's own data. |
| **3. Actions (months 6 to 12)** | Drafted purchase orders, transfers and reminders with approval | The assistant calls the same POS APIs staff use, limited by the owner's role, and every action is logged. |
| **4. Network (12 months+)** | Anonymised cross-shop insights | Opt-in data sharing with aggregation so no single shop can be identified. |

## Guardrails

- **Kenya Data Protection Act, 2019:** register with the Office of the Data Protection Commissioner (ODPC) as a data processor, get explicit opt-in for cross-shop pooling, and never send customer phone numbers or names to an external AI service without a lawful basis.
- **Permissions:** the assistant must only see and do what the asking user's role allows. The RBAC fixes in `SECURITY_REVIEW.md` are a prerequisite, and the server must enforce them.
- **Human approval** for anything that moves money, stock or prices.
- **Show the reasoning:** every suggestion states why ("based on the last 8 weeks of sales"), so owners learn to trust it.
- **Measure value:** track the cash each feature recovers (fewer stock-outs, less shrinkage) and show it to the owner. That figure is the sales pitch for the premium tier.

## Commercial angle

- **Core plan:** POS as today.
- **Smart plan:** reorder suggestions, shrinkage alerts, dead-stock advice and the daily briefing.
- **Co-pilot plan:** the conversational assistant, approved actions and multi-branch optimisation.

For tenders and donor-funded programmes (for example SME digitisation, agricultural value chains and cooperatives), the anonymised network insights and the cash-flow forecasting are strong differentiators, as they speak directly to financial inclusion and market-information outcomes that funders measure.
