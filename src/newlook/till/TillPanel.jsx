import React, { useCallback, useEffect, useRef, useState } from 'react';
import Button from '../components/Button';
import Drawer from '../components/Drawer';
import EmptyState from '../components/EmptyState';
import { LoadingGate, Skeleton } from '../components/Skeleton';
import { formatMoney } from '../components/format';
import { getTillState } from '../../api/tillApi';
import { cashRow, openedLine, openingFloat } from './shiftModel';
import T from './strings.shift';
import C from './strings.cash';
import fill from '../labels/fill';
import './till.css';

const P = T.panel;
export const MAX_RECENT_SALES = 5;
const PANEL_MIN_HEIGHT = 'calc(var(--space-8) * 6)';

/**
 * The Till open panel (Spec: top bar, "The Till open pill opens a small panel"): who opened the till and when, the
 * opening float, the cash in the till, Recent sales (up to 5), Held sales and Count and close till. It slides in from the
 * right, is a dialog (focus is held, Escape closes, focus goes back to the pill) and loads again each time it opens.
 *
 *   open, onClose   showing, and what Escape, the Close button and a click outside do
 *   session         the session the till already knows (shown at once while the fresh figures load)
 *   heldCount       held sales as the till counts them; when missing, the server's count is used
 *   onOpenHeld      the Held sales (n) button
 *   onCloseTill     the Count and close till button (the parent opens ShiftCloseDialog)
 *   onCashInOut, onShiftReport, onHandOver   the Cash in or out, Shift report and Hand over the till buttons (shown only when the parent gives them)
 *   onOpenSale(id)  a Recent sales row
 *   load            the server call, replaceable in tests
 */
const TillPanel = ({ open, onClose, ...rest }) => (
  <Drawer open={open} onClose={onClose} label={P.name} closeLabel={P.close} className="nl-till-panel">
    <PanelBody {...rest} />
  </Drawer>
);

const PanelBody = ({ session, heldCount, onOpenHeld, onCloseTill, onOpenSale, onCashInOut, onShiftReport, onHandOver, load = getTillState }) => {
  const [view, setView] = useState({ status: 'loading', data: null });
  const ticket = useRef(0);

  const fetchState = useCallback(async () => {
    const mine = ++ticket.current;
    setView({ status: 'loading', data: null });
    try {
      const data = await load({ pos_profile: session && typeof session === 'object' ? session.pos_profile : undefined });
      if (mine === ticket.current) setView({ status: 'ready', data });
    } catch (error) {
      if (mine === ticket.current) setView({ status: 'error', data: null });
    }
  }, [load, session]);

  useEffect(() => {
    fetchState();
    const current = ticket;
    return () => {
      current.current += 1; // an answer that arrives after the panel closed is ignored
    };
    // Loads once per opening: the body is mounted only while the panel is open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const data = view.data;
  const known = (data && data.session) || (session && typeof session === 'object' ? session : null);
  const held = typeof heldCount === 'number' ? heldCount : (data && data.held_count) || 0;

  const skeleton = (
    <div className="nl-till-panel__skeleton">
      <Skeleton width="70%" height="var(--space-4)" />
      <Skeleton width="45%" height="var(--space-4)" />
      <Skeleton height="var(--control-height-till)" />
      <Skeleton height="var(--control-height-till)" />
      <Skeleton height="var(--control-height-till)" />
    </div>
  );

  if (view.status === 'error') {
    return <EmptyState tone="error" icon="alert" level={2} title={P.errorName} description={P.errorHelp} action={{ label: P.retry, onClick: fetchState }} />;
  }

  return (
    <LoadingGate loading={view.status === 'loading'} skeleton={skeleton} minHeight={PANEL_MIN_HEIGHT} label={P.loading}>
      {data && data.state === 'closed' ? (
        <EmptyState icon="till" level={2} title={P.closedName} description={P.closedHelp} />
      ) : (
        <PanelContent
          data={data}
          known={known}
          held={held}
          onOpenHeld={onOpenHeld}
          onCloseTill={onCloseTill}
          onOpenSale={onOpenSale}
          onCashInOut={onCashInOut}
          onShiftReport={onShiftReport}
          onHandOver={onHandOver}
        />
      )}
    </LoadingGate>
  );
};

const PanelContent = ({ data, known, held, onOpenHeld, onCloseTill, onOpenSale, onCashInOut, onShiftReport, onHandOver }) => {
  const cash = cashRow(data);
  const sales = ((data && data.recent_sales) || []).slice(0, MAX_RECENT_SALES);
  const who = openedLine(known);
  return (
    <div className="nl-till-panel__content">
      <section className="nl-till-panel__facts" aria-label={P.name}>
        {who ? <p className="nl-till-panel__who">{who}</p> : null}
        <dl className="nl-till-panel__list">
          <div>
            <dt>{P.openingFloat}</dt>
            <dd>{formatMoney(openingFloat(known, data))}</dd>
          </div>
          {cash ? (
            <div>
              <dt>{P.cashInTill}</dt>
              <dd>{formatMoney(cash.expected)}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section aria-labelledby="nl-till-recent">
        <h3 id="nl-till-recent" className="nl-till-panel__heading">
          {P.recentName}
        </h3>
        {sales.length === 0 ? (
          <EmptyState icon="receipt" level={4} title={P.emptyName} description={P.emptyHelp} className="nl-till-panel__empty" />
        ) : (
          <ul className="nl-till-panel__sales">
            {sales.map((sale) => (
              <li key={sale.id}>
                <Button variant="ghost" size="till" className="nl-till-sale" onClick={() => onOpenSale && onOpenSale(sale.id)}>
                  <span className="nl-till-sale__main">
                    <span className="nl-till-sale__receipt">{sale.receipt || sale.id}</span>
                    <span className="nl-till-sale__time">{sale.time}</span>
                  </span>
                  <span className="nl-till-sale__main">
                    <span className="nl-till-sale__customer">{sale.customer || P.walkIn}</span>
                    <span className="nl-till-sale__amount">{formatMoney(sale.total)}</span>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="nl-till-panel__actions">
        <Button variant="secondary" size="till" icon="clock" onClick={onOpenHeld}>
          {fill(P.heldButton, { count: held })}
        </Button>
        {onCashInOut ? (
          <Button variant="secondary" size="till" icon="wallet" onClick={onCashInOut}>
            {C.till.cashButton}
          </Button>
        ) : null}
        {onShiftReport ? (
          <Button variant="secondary" size="till" icon="receipt" onClick={onShiftReport}>
            {C.till.reportButton}
          </Button>
        ) : null}
        {onHandOver ? (
          <Button variant="secondary" size="till" icon="user" onClick={onHandOver}>
            {C.till.handoverButton}
          </Button>
        ) : null}
        <Button size="till" icon="till" onClick={onCloseTill}>
          {P.countAndClose}
        </Button>
      </section>
    </div>
  );
};

export default TillPanel;
