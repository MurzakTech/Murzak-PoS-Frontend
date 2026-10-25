---
name: human-not-ai
description: How to make interface work feel handcrafted, warm and human-centred instead of generic or machine-generated. Use when writing any visible UI, copy, empty state, error message, illustration, animation or layout, and when reviewing a screen that looks templated, over-decorated or "AI-made".
---

# Human, not generated

The goal: a shopkeeper in Nairobi, Kisumu or Eldoret opens this on a busy Saturday and thinks "someone who understands my shop made this". Generated UI has tells. Avoid them.

## The tells to avoid

**Visual**
- Purple-to-blue gradients on buttons, headers and text; glowing blobs; glassmorphism everywhere; neon shadows. (The brand gradient token exists for one hero moment, not for decoration.)
- Every element in a rounded card with a shadow, icon-in-a-circle, and a pastel tint.
- Identical three-up feature grids with an icon, a bold title and one grey sentence.
- Emoji as icons or bullets; decorative sparkles; stock "3D people" art.
- Centre-aligning everything; uniform spacing with no grouping; everything the same weight.
- Too many colours at once, or colour used where hierarchy should do the work.
- Fake charts and placeholder numbers (12,345, "John Doe"). Use real shapes of data: KES amounts with irregular digits, Kenyan names, real product names (Unga Jogoo, Brookside milk, Pembe flour), real M-Pesa codes style.

**Copy**
- "Unlock the power of", "seamless", "effortless", "revolutionise", "elevate", "supercharge", "leverage", "Welcome to the future of".
- Exclamation marks, cheerful filler ("Oops!", "Whoops!"), and robotic ("An error occurred. Please try again later.").
- Title Case On Every Heading; vague buttons ("Submit", "OK", "Proceed", "Confirm").
- Em dashes in prose. Use commas, colons or new sentences.
- Explaining the interface to the user instead of helping them do the job.

**Interaction**
- Bouncy, springy or looping animation; entrance animations on every card; skeleton shimmer that never resolves.
- Modals for things that could be inline; confirmations for everything; "Are you sure?" with no consequence stated.
- Hiding the common action behind a menu to look minimal.

## What human-made looks like

1. **A point of view.** Pick a few decisions and commit: calm, confident, plenty of room, one strong brand colour, numbers treated as the heroes. The existing system already makes these choices; extend them, do not dilute them.
2. **Restraint with a few crafted moments.** Quiet everywhere, then one considered detail: a well-drawn empty-state illustration in the product's stroke language, a satisfying "sale complete" confirmation, a sensible default. Pick moments that matter to the shopkeeper.
3. **Specificity.** Real shop vocabulary and flows. "Till", "float", "stock count", "M-Pesa code", "on credit", "short by KES 200". Use the strings and rename map; ask what the owner calls it.
4. **Plain, warm, direct words.** Write like a competent colleague talking across the counter. Short sentences. Say what happened, why it matters, what to do next.
5. **Imperfect, human rhythm.** Not every card needs the same height or an icon. Let important things be larger and quiet things be smaller. Vary density by importance.
6. **Evidence of care in the small things:** consistent number formatting, the cursor already in the first field, the right keyboard on mobile (`inputMode="numeric"` for amounts, `type="tel"` for phone numbers), remembered filters, sensible tab order, no layout jump when data loads, the thing you just added visibly highlighted.

## Copy patterns

| Situation | Not this | This |
|---|---|---|
| Empty list | "No data available." | "No customers yet. Add your first customer to track what they owe." + button "Add customer" |
| Error | "An error occurred." | "We could not save the sale because the connection dropped. It is kept on this device and will send when you are back online." |
| Destructive | "Are you sure?" | "Delete Unga Jogoo 2kg? It has 14 in stock. Past sales keep their record." with "Delete product" and "Keep it" |
| Success | "Success! Operation completed." | "Sale saved. KES 1,250 by M-Pesa." |
| Validation | "Invalid input." | "Enter the M-Pesa code, 10 characters, like QGH7X2K9LM." |
| Button | "Submit" | "Save sale", "Take payment", "Receive goods" (verb plus object) |

Rules: sentence case; verbs on buttons; say the consequence; never blame the user; give the next step; no exclamation marks; no jargon (say "stock", not "inventory SKU"; "Owing", not "accounts receivable") unless the user's role uses it.

## Language

English and Swahili are both first-class. Write copy that translates cleanly: whole sentences with `{placeholders}`, no sentences built by joining fragments, space for text that runs 30% longer, no idioms. Dates, times and money go through the shared formatters.

## Imagery and illustration

Prefer the shop's own logo and product photos. When drawing, use `EmptyArt.jsx` conventions: the same 1.8px rounded stroke, `currentColor` and tokens, few shapes, an everyday subject (a basket, a receipt, a shelf). Avoid generic abstract blobs and people stock art.

## Before you finish

Read the screen aloud as if to a new cashier. Delete every word that does not help. Look for two things that are "decorative" and remove one. Check at 375px and in dark mode. If a stranger could not tell this was a Kenyan point-of-sale product, add specificity.
