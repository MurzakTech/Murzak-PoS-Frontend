# Pharmacy: Plan and Status

## In plain words

A pharmacy sells two kinds of goods: ordinary items (paracetamol, a thermometer) and medicines that may only be sold against a doctor's prescription. It also needs to know what is about to expire, and never to sell what has. This file says what the point of sale now does for pharmacies, what it still does not, and what comes next.

## What is built (phase P1: prescription-only medicines)

**Setting it up (owner or manager):**

1. Open **Products**, then edit a medicine (or create a new one).
2. Switch on **Prescription only** and save. Do this for each medicine that needs a prescription. The starter pharmacy list does **not** switch it on for you, because which medicines need a prescription is for the pharmacist to decide.

**Selling (pharmacist or cashier):**

1. Prescription-only products show a small **Rx only** label on the product tile and in the sale.
2. Selling an ordinary item works exactly as before.
3. When a sale includes a prescription-only medicine, pressing **Charge** first asks for: the **patient's name**, **who prescribed it** and, if you wish, the **prescription number**. You must also tick that you have seen a valid prescription. The **Continue to payment** button stays locked until this is done.
4. After the sale, the details are written on the invoice's remarks, for example: *Prescription-only medicines (Amoxicillin 500mg): patient Jane Wanjiru; prescriber Dr Otieno; prescription ref RX-1042; dispensed by Amina.* They can be read back from sales history and the invoice.

**What the server does:**

- It refuses a sale of a prescription-only medicine that has no patient and prescriber, even if a till tries to skip the question. The sale does not use up the customer's payment.
- A sale that was **already made offline** (the till had no connection) is never refused, because the medicine has left the shop and the sale must be recorded. It is marked "PRESCRIPTION DETAILS MISSING" in the invoice remarks so that it can be followed up.
- A server that has not yet been updated sells exactly as before.

**What it does not do yet:**

- There is no separate dispensing register or report. The record lives in each invoice's remarks, so it can be found but not yet listed or exported in one place.
- The record is not kept when a bill is put on hold; it is asked again when the bill is charged.
- It does not check the prescription itself, or limit quantities, or deal with repeat prescriptions.
- Receipts do not print the patient's details.

## Not built yet

### P2: expiry and batches at the point of sale

Pharmacies need to sell the **oldest stock first** and **never sell expired medicine**. Today:

- An **Expiry Alerts** page exists (Inventory), listing stock that has expired or will soon.
- The product form has no switches for batch or expiry tracking, and the till never asks which batch is being sold.
- ERPNext's batch tracking changes how a sale is saved in version 15 (serial and batch bundles, and site-wide Stock Settings that choose how batches are picked). If batch tracking were switched on without the till handling it, **sales could start failing**.

For that reason P2 should not be built blind. It needs one thing found out on the development site first: how that site's Stock Settings pick batches (first-expiry-first-out, or not), and whether a sale of a batch item saves without the till naming a batch. With that answer, P2 would:

1. add batch and expiry switches to the product form;
2. have the server choose the batch that expires first and refuse an expired one, saying so in plain words;
3. show "expires soon" and "expired" markers on the till.

### P3: a dispensing register

A report of every prescription-only sale (date, medicine, quantity, patient, prescriber, who dispensed), with export. Useful for inspections. It builds on the record P1 writes.

## Rules of the design

- The prescription step can only be skipped by an **offline sale**, and that sale is flagged, never silent.
- Nothing here changes how ordinary items are sold.
- The patient's details are kept only on the invoice, in plain text. Treat them as personal data: show them only to people who may see sales history.
