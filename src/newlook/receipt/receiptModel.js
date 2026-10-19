import { quantityText } from '../products/unitWords';
import { shortReceiptNumber } from '../till/receiptNumber';
import { formatPhone } from '../labels/renameMap';

/**
 * The receipt as one plain object (ticket P7-3), whatever it came from. The till's sale just made, a sale opened from the Sales page and
 * a reprint all become the same shape, and one component (Receipt.jsx) draws it, so the three can never drift apart.
 *
 *   number     '#0045' (the short number, as the Sales list writes it)
 *   reference  the full reference for the books ('ACC-PSINV-2026-00045'); empty when there is none (an offline sale)
 *   when       'dd Mon yyyy, hh:mm'
 *   cashier, customer
 *   lines      [{ name, qty, unitWord, rate, amount, offer }]  offer is the money taken off this line by an offer (0 for none)
 *   totals     { subtotal, discount, offers, tax, total, paid, change, outstanding }
 *   payments   [{ label, amount, reference }]
 *   isReturn, offline
 *
 * Nothing here invents data: a tax line appears only when the sale has tax, an eTIMS or QR line is not drawn at all because the sale
 * answers carry no such data today, and a missing value is simply left out.
 */

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const two = (n) => String(n).padStart(2, '0');

/** '21 Oct 2026, 14:32' from a Date */
export const whenFromDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return `${two(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${two(date.getHours())}:${two(date.getMinutes())}`;
};

/** '21 Oct 2026, 14:32' from the Sales page's date ('21 Oct 2026') and time ('14:32') texts, whichever of them there is */
export const whenFromTexts = (date, time) => [date, time].filter(Boolean).join(', ');

/** A receipt from the Sales page's sale (the answer of sales_list_api.get_sale) */
export const fromSale = (sale) => {
  const totals = sale.totals || {};
  return {
    number: sale.receipt || '',
    reference: sale.reference || sale.id || '',
    when: whenFromTexts(sale.date, sale.time),
    cashier: sale.cashier || '',
    customer: (sale.customer && sale.customer.name) || '',
    isReturn: Boolean(sale.is_return),
    offline: false,
    lines: (sale.lines || []).map((line) => ({
      name: line.item_name || line.item_code || '',
      qty: num(line.qty),
      unitWord: '',
      rate: line.rate === undefined || line.rate === null ? null : num(line.rate),
      amount: num(line.amount),
      offer: 0,
    })),
    totals: {
      subtotal: num(totals.subtotal),
      discount: num(totals.discount),
      offers: 0,
      tax: num(totals.tax),
      total: num(totals.total),
      paid: num(totals.paid),
      change: num(totals.change),
      outstanding: num(totals.outstanding),
      cashGiven: 0,
    },
    payments: (sale.payments || []).map((p) => ({ label: p.label || p.mode || '', amount: num(p.amount), reference: p.reference || '' })),
  };
};

/**
 * A receipt from the till's sale just made. `invoice` is what the server answered (name, grand_total, customer, offline, doctype),
 * `saleData` is what the till kept (items, payments, paymentMode, amountGiven, grandTotal, customer, timestamp).
 */
export const fromTill = ({ invoice, saleData, cashierName, doctype }) => {
  const items = saleData.items || [];
  const itemsTotal = items.reduce((sum, i) => sum + num(i.rate) * num(i.qty), 0);
  const offers = items.reduce((sum, i) => sum + num(i.discount_amount), 0);
  const grand = num(invoice.grand_total || saleData.grandTotal);
  const tax = num(invoice.total_taxes_and_charges);
  const round = (n) => Math.round(n * 100) / 100;
  const otherDiscount = Math.max(0, round(itemsTotal - offers - grand + tax));
  const isCash = saleData.paymentMode === 'Cash' && num(saleData.amountGiven) > 0;
  const change = isCash ? Math.max(0, round(num(saleData.amountGiven) - num(saleData.grandTotal))) : 0;
  const payments = (saleData.payments || []).map((p) => ({
    label: p.mode_of_payment || p.mode || '',
    amount: num(p.amount),
    reference: p.reference_no || '',
  }));
  const offline = Boolean(invoice.offline);
  return {
    number: offline ? invoice.name || '' : shortReceiptNumber(doctype, invoice.name),
    reference: offline ? '' : invoice.name || '',
    when: whenFromDate(saleData.timestamp),
    cashier: cashierName || '',
    customer: invoice.customer || saleData.customer || '',
    isReturn: false,
    offline,
    lines: items.map((item) => ({
      name: item.item_name || item.item_code || '',
      qty: num(item.qty),
      unitWord: item.uom || '',
      unitStored: true,
      rate: num(item.rate),
      amount: num(item.subtotal !== undefined && item.subtotal !== null ? item.subtotal : num(item.rate) * num(item.qty)),
      offer: num(item.discount_amount),
    })),
    totals: {
      subtotal: round(itemsTotal),
      discount: otherDiscount > 0.01 ? otherDiscount : 0,
      offers: round(offers),
      tax,
      total: round(grand),
      paid: isCash ? num(saleData.amountGiven) : round(grand),
      change,
      outstanding: 0,
      cashGiven: isCash ? num(saleData.amountGiven) : 0,
    },
    payments,
  };
};

/** The quantity of a line in words: '2 packets x 180'. A stored unit ('Nos') is turned into its plain word. */
export const lineQuantity = (line) => {
  if (line.unitStored) return quantityText(line.qty, line.unitWord) || String(line.qty);
  return line.unitWord ? `${line.qty} ${line.unitWord}` : String(line.qty);
};

/**
 * The totals block as rows [{ key, value, strong }]: Subtotal only when something is taken off or added, Offers, Discount and Tax only
 * when there is some, then TOTAL; Paid, Change and Still to pay only when they say something.
 */
export const totalRows = (totals) => {
  const t = totals || {};
  const rows = [];
  const adjusted = num(t.offers) > 0 || num(t.discount) > 0 || num(t.tax) > 0;
  if (adjusted) rows.push({ key: 'subtotal', value: t.subtotal });
  if (num(t.offers) > 0) rows.push({ key: 'offers', value: -num(t.offers) });
  if (num(t.discount) > 0) rows.push({ key: 'discount', value: -num(t.discount) });
  if (num(t.tax) > 0) rows.push({ key: 'tax', value: t.tax });
  rows.push({ key: 'total', value: t.total, strong: true });
  return rows;
};

/** The shop's address as lines for the header: street, then town and postal code. Empty parts are left out. */
export const addressLines = (business) => {
  const a = (business && business.address) || {};
  const town = [a.city, a.pincode].filter(Boolean).join(' ');
  return [a.line1, a.line2, town].map((x) => String(x || '').trim()).filter(Boolean);
};

/** The phone as the rest of the app writes it ('0712 345 678'), or '' */
export const phoneText = (business) => (business && business.phone ? formatPhone(business.phone) || business.phone : '');

/**
 * What the print dialog needs for each style: the paper width, the page margin (in mm) and, for an A4 page, the whole size.
 * A till roll has no fixed length, and browsers do not accept "auto" for it, so the length is measured from the receipt itself
 * (see Receipt.jsx) and written into the page size; until it is measured a long page is used.
 */
export const PAGE = {
  thermal80: { width: 80, margin: 3 },
  thermal58: { width: 58, margin: 2 },
  a4: { page: 'A4', margin: 12 },
};
export const ROLL_FALLBACK_MM = 297;
const PX_PER_MM = 96 / 25.4;

/** The height of a receipt on a till roll in millimetres: its height on screen, plus the page margins and a little spare, rounded up */
export const rollLength = (heightPx, style) => {
  const p = PAGE[style] || PAGE.thermal80;
  if (!(heightPx > 0)) return ROLL_FALLBACK_MM;
  return Math.ceil(heightPx / PX_PER_MM + p.margin * 2 + 4);
};

/** The @page rule of a style; lengthMm is the measured length of a roll receipt */
export const pageRule = (style, lengthMm) => {
  const p = PAGE[style] || PAGE.thermal80;
  const size = p.page ? p.page : `${p.width}mm ${lengthMm || ROLL_FALLBACK_MM}mm`;
  return `@page { size: ${size}; margin: ${p.margin}mm; }`;
};

/** An amount without the currency, for the item lines: 1200 gives '1,200', 1200.5 gives '1,200.50' (the currency is on the totals) */
export const plainAmount = (amount) => {
  if (amount === null || amount === undefined || amount === '' || Number.isNaN(Number(amount))) return '';
  const n = Number(amount);
  const hasCents = Math.round(n * 100) % 100 !== 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 });
};
