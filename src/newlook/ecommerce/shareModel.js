import { whatsappNumber } from '../home/homeModel';
import { formatMoney } from '../components/format';
import fill from '../labels/fill';
import S from './strings.ecommerce';

/**
 * Everything that is said about the online store on WhatsApp, and the printable poster. The app sends nothing itself:
 * each of these makes a ready message or page that the owner looks at and sends or prints.
 */

/** The link a customer opens, or '' before the store has a web address name */
export const shopLink = (slug, origin = window.location.origin) => (slug ? `${origin}/shop/${slug}` : '');

/** A WhatsApp link with the message ready. With a phone number it opens that chat; without, the owner picks who gets it. */
export const waLink = (text, mobile) => {
  const number = whatsappNumber(mobile);
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
};

export const catalogueMessage = ({ name, link }) => fill(S.share.catalogue, { name: name || S.share.ourShop, link });

export const productMessage = ({ product, link }) =>
  fill(S.share.product, { name: product.item_name, price: formatMoney(product.price), link });

/** The message to a customer about their order, in the words for where the order is. '' for a status with no message. */
export const orderMessage = ({ order, customer, status, delivery }) => {
  const key = status === 'Ready' ? (delivery === 'Pickup' ? 'readyPickup' : 'readyDelivery') : status;
  const template = S.share.order[key];
  return template ? fill(template, { name: (customer || '').split(' ')[0] || S.share.customerFallback, order }) : '';
};

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** A page to print: the shop's name, a line, the QR code (already drawn as SVG text) and the link in words. */
export const posterHtml = ({ name, tagline, link, qrSvg }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(S.share.posterTitle)}</title>
<style>
  body{font-family:system-ui,sans-serif;text-align:center;margin:0;padding:48px 24px;color:black}
  h1{font-size:44px;margin:0 0 8px}
  p{margin:0}
  .tag{font-size:22px;color:dimgray;margin-bottom:32px}
  .cta{font-size:28px;font-weight:700;margin-bottom:24px}
  svg{width:320px;height:320px}
  .link{font-size:22px;margin-top:24px;overflow-wrap:anywhere}
</style></head><body>
<h1>${escapeHtml(name)}</h1>
${tagline ? `<p class="tag">${escapeHtml(tagline)}</p>` : ''}
<p class="cta">${escapeHtml(S.share.posterCall)}</p>
${qrSvg}
<p class="link">${escapeHtml(link)}</p>
</body></html>`;

/** A page to print for packing one order. */
export const slipHtml = ({ order, customer, phone, address, delivery, lines, total }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(fill(S.share.slipTitle, { order }))}</title>
<style>
  body{font-family:system-ui,sans-serif;margin:0;padding:24px;color:black}
  h1{font-size:22px;margin:0 0 4px}
  table{border-collapse:collapse;width:100%;margin-top:16px}
  th,td{border-bottom:1px solid silver;padding:8px;text-align:left}
  td.n,th.n{text-align:right}
  .box{display:inline-block;width:14px;height:14px;border:1px solid black}
</style></head><body>
<h1>${escapeHtml(fill(S.share.slipTitle, { order }))}</h1>
<p>${escapeHtml(delivery === 'Pickup' ? S.share.slipPickup : S.share.slipDelivery)}</p>
<p><strong>${escapeHtml(customer)}</strong>${phone ? `, ${escapeHtml(phone)}` : ''}</p>
${address ? `<p>${escapeHtml(address)}</p>` : ''}
<table><thead><tr><th></th><th>${escapeHtml(S.orders.product)}</th><th class="n">${escapeHtml(S.orders.quantity)}</th></tr></thead><tbody>
${lines.map((l) => `<tr><td><span class="box"></span></td><td>${escapeHtml(l.item_name || l.item_code)}</td><td class="n">${escapeHtml(l.qty)}</td></tr>`).join('')}
</tbody></table>
<p style="margin-top:16px"><strong>${escapeHtml(S.orders.total)}: ${escapeHtml(formatMoney(total))}</strong></p>
</body></html>`;

/** Opens a page in a new window and prints it. Returns false when the browser blocked the window. */
export const printHtml = (html) => {
  const win = window.open('', '_blank', 'noopener=no,width=800,height=900');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  return true;
};

/**
 * The first steps to a working store, each done or not, from what the form and the server hold. The owner sees what is left.
 * @param form   the store form as saved (see OnlineStoreTab toForm)
 */
export const setupSteps = ({ saved, form, productCount }) => [
  { key: 'link', done: Boolean(saved.slug && form.store_name.trim()) },
  { key: 'receive', done: form.delivery_enabled || form.pickup_enabled },
  { key: 'pay', done: form.accept_cash || form.accept_mpesa },
  { key: 'products', done: productCount > 0 },
  { key: 'open', done: Boolean(saved.enabled) },
];
