import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { formatMoney } from '../components/format';
import fill from '../labels/fill';
import { productImageUrl } from '../../utils/productArt';
import { DEFAULT_ACCENT, DEFAULT_STYLE } from '../brand/brandModel';
import { addressLines, lineQuantity, pageRule, phoneText, plainAmount, rollLength, totalRows } from './receiptModel';
import './receipt.css';
import T from './strings.receipt';

const LABELS = { subtotal: T.subtotal, offers: T.offers, discount: T.discount, tax: T.tax, total: T.total };

/**
 * The sale receipt (ticket P7-3): one component for the till's receipt, the Sales page and a reprint.
 *
 *   receipt    the receipt as one object (see receiptModel.js: fromSale, fromTill)
 *   brand      the shop's brand { logo, accent, tagline, footer, social, website } (style is chosen below)
 *   business   the shop { companyName, taxId, address, phone } for the header; any part may be missing
 *   style      'thermal80', 'thermal58' or 'a4'
 *   pageSize   false leaves the browser's paper size alone (the preview on Settings does this)
 *
 * It is always drawn on white paper (the screen's dark theme does not reach it), the thermal styles in black only, and the A4 style
 * with the shop's accent on its rules and its total. Under a thermal width the item name sits over a "2 packets x 180" line; on A4 the
 * quantity and price have their own columns.
 */
const Receipt = ({ receipt, brand = {}, business = {}, style = DEFAULT_STYLE, pageSize = true }) => {
  // A till roll is as long as the receipt: measure it, so the printed page is exactly that long (a picture that loads late measures again)
  const paper = useRef(null);
  const [length, setLength] = useState(0);
  const measure = useCallback(() => {
    if (paper.current) setLength(rollLength(paper.current.getBoundingClientRect().height, style));
  }, [style]);
  useLayoutEffect(() => {
    if (pageSize && style !== 'a4') measure();
  }, [pageSize, style, measure, receipt, brand, business]);

  const shop = business.companyName || business.name || '';
  const logo = brand.logo ? productImageUrl({ image: brand.logo }) : null;
  const address = addressLines(business);
  const phone = phoneText(business);
  const title = receipt.isReturn ? T.titleReturn : receipt.offline ? T.titleOffline : T.title;
  const rows = totalRows(receipt.totals);
  const totals = receipt.totals || {};
  const payments = receipt.payments || [];
  const contact = [brand.social, brand.website].filter(Boolean);

  return (
    <>
      {pageSize ? <style>{pageRule(style, length)}</style> : null}
      <article ref={paper} className={`nl-rcpt nl-rcpt--${style}`} data-style={style} data-swatch={brand.accent || DEFAULT_ACCENT} aria-label={title}>
        <header className="nl-rcpt__head">
          {logo ? <img className="nl-rcpt__logo" onLoad={measure} src={logo} alt={fill(T.logoAlt, { name: shop })} /> : null}
          <div className="nl-rcpt__shop">
            {shop ? <p className="nl-rcpt__name">{shop}</p> : null}
            {brand.tagline ? <p className="nl-rcpt__tagline">{brand.tagline}</p> : null}
            {address.map((line) => (
              <p key={line} className="nl-rcpt__line">
                {line}
              </p>
            ))}
            {phone ? <p className="nl-rcpt__line">{`${T.phone}: ${phone}`}</p> : null}
            {business.taxId ? <p className="nl-rcpt__line">{`${T.taxId}: ${business.taxId}`}</p> : null}
          </div>
        </header>

        <h2 className="nl-rcpt__title nl-rcpt__accent">{title}</h2>

        <div className="nl-rcpt__number">
          <p className="nl-rcpt__no">
            <span className="nl-rcpt__no-label">{T.receiptNo}</span> {receipt.number}
          </p>
          {receipt.reference ? (
            <p className="nl-rcpt__ref">
              <span className="nl-rcpt__ref-label">{T.reference}</span> <span>{receipt.reference}</span>
            </p>
          ) : null}
        </div>

        <dl className="nl-rcpt__facts">
          {receipt.when ? (
            <div>
              <dt>{T.date}</dt>
              <dd>{receipt.when}</dd>
            </div>
          ) : null}
          {receipt.cashier ? (
            <div>
              <dt>{T.servedBy}</dt>
              <dd>{receipt.cashier}</dd>
            </div>
          ) : null}
          <div>
            <dt>{T.customer}</dt>
            <dd>{receipt.customer || T.walkIn}</dd>
          </div>
        </dl>

        <table className="nl-rcpt__items">
          <caption className="nl-visually-hidden">{T.itemsLabel}</caption>
          <thead>
            <tr>
              <th scope="col" className="nl-rcpt__col-item">
                {T.item}
              </th>
              <th scope="col" className="nl-rcpt__col-qty is-a4only">
                {T.qty}
              </th>
              <th scope="col" className="nl-rcpt__col-num is-a4only">
                {T.price}
              </th>
              <th scope="col" className="nl-rcpt__col-num">
                {T.amount}
              </th>
            </tr>
          </thead>
          <tbody>
            {(receipt.lines || []).map((line, i) => {
              const quantity = lineQuantity(line);
              const price = line.rate === null || line.rate === undefined ? '' : plainAmount(line.rate);
              return (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={`${line.name}-${i}`}>
                  <td className="nl-rcpt__col-item">
                    <span className="nl-rcpt__item-name">{line.name}</span>
                    <span className="nl-rcpt__sub">{price ? fill(T.qtyLine, { qty: quantity, price }) : quantity}</span>
                    {line.offer > 0 ? <span className="nl-rcpt__offer">{`${T.offer}: -${plainAmount(line.offer)}`}</span> : null}
                  </td>
                  <td className="nl-rcpt__col-qty is-a4only">{quantity}</td>
                  <td className="nl-rcpt__col-num is-a4only">{price}</td>
                  <td className="nl-rcpt__col-num">{plainAmount(line.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <dl className="nl-rcpt__totals" aria-label={T.totalsLabel}>
          {rows.map((row) => (
            <div key={row.key} className={['nl-rcpt__total', row.strong && 'is-strong'].filter(Boolean).join(' ')}>
              <dt className={row.strong ? 'nl-rcpt__accent' : undefined}>{LABELS[row.key]}</dt>
              <dd className={row.strong ? 'nl-rcpt__accent' : undefined}>{formatMoney(row.value)}</dd>
            </div>
          ))}
        </dl>

        {payments.length || totals.change > 0 || totals.outstanding > 0 ? (
          <dl className="nl-rcpt__pay" aria-label={T.paymentsLabel}>
            {payments.map((p, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={`${p.label}-${i}`} className="nl-rcpt__total">
                <dt>{p.reference ? `${p.label} (${fill(T.paymentCode, { reference: p.reference })})` : p.label}</dt>
                <dd>{formatMoney(p.amount)}</dd>
              </div>
            ))}
            {totals.cashGiven > 0 ? (
              <div className="nl-rcpt__total">
                <dt>{T.cashGiven}</dt>
                <dd>{formatMoney(totals.cashGiven)}</dd>
              </div>
            ) : null}
            {totals.change > 0 ? (
              <div className="nl-rcpt__total is-strong">
                <dt>{T.change}</dt>
                <dd>{formatMoney(totals.change)}</dd>
              </div>
            ) : null}
            {totals.outstanding > 0 ? (
              <div className="nl-rcpt__total is-strong">
                <dt>{T.stillOwed}</dt>
                <dd>{formatMoney(totals.outstanding)}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <footer className="nl-rcpt__foot">
          {brand.footer ? <p className="nl-rcpt__footer-message">{brand.footer}</p> : null}
          <p className="nl-rcpt__thanks">{T.thanks}</p>
          {contact.length ? <p className="nl-rcpt__contact">{contact.join('   ')}</p> : null}
        </footer>
      </article>
    </>
  );
};

export default Receipt;
