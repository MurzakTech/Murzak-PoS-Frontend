import React, { useEffect, useId, useRef } from 'react';
import Button from './Button';
import { LoadingGate, SkeletonText } from './Skeleton';

/**
 * The detail panel (Part 1, Components and Page patterns): the right-hand card (4 of 12 columns) that opens when
 * a table row is chosen, or a full page below 1100px. The list stays where it was, so closing the panel puts
 * the person back at the same row.
 *
 *   title      the short id, such as "Sale 0033" (a system reference such as ACC-PSINV-2026-00005 goes under Details)
 *   status     a StatusLabel shown beside the title
 *   onClose, onPrevious, onNext   Close (Escape does the same), and the row before and after; leave a handler out when there is none
 *   position   for example "3 of 20", read aloud with the arrows
 *   primary    { label, onClick, icon? } the one main action
 *   secondary  up to three more actions { label, onClick, icon?, variant? }
 *   details    [{ label, value }] shown in a "Details" fold-out, closed at first
 *   loading    grey shapes where the facts will be
 *
 * Opening the panel moves the keyboard focus to its title; closing it returns the focus to where it was.
 * Put DetailFacts and the line items in as children.
 */
export const MAX_SECONDARY_ACTIONS = 3;

const DetailPanel = ({ title, status, subtitle, onClose, onPrevious, onNext, position, primary, secondary = [], details = [], loading = false, children, className = '' }) => {
  const heading = useRef(null);
  const headingId = `nl-detail-title-${useId()}`;
  const origin = useRef(null);

  useEffect(() => {
    origin.current = document.activeElement;
    if (heading.current) heading.current.focus();
    return () => {
      const back = origin.current;
      if (back && back.isConnected && back.focus) back.focus();
    };
  }, []);

  const onKeyDown = (event) => {
    if (event.key === 'Escape' && onClose) {
      event.stopPropagation();
      onClose();
    }
  };

  return (
    <section className={`nl-detail ${className}`.trim()} role="region" aria-labelledby={headingId} onKeyDown={onKeyDown}>
      <div className="nl-detail__header">
        <div className="nl-detail__heading">
          <h2 id={headingId} ref={heading} tabIndex={-1} className="nl-detail__title">
            {title}
          </h2>
          {status ? <div className="nl-detail__status">{status}</div> : null}
          {subtitle ? <p className="nl-detail__subtitle">{subtitle}</p> : null}
        </div>
        <div className="nl-detail__nav">
          {onPrevious || onNext ? (
            <>
              <Button variant="ghost" size="small" icon="chevronLeft" aria-label="Previous item" disabled={!onPrevious} onClick={onPrevious} />
              <Button variant="ghost" size="small" icon="chevronRight" aria-label="Next item" disabled={!onNext} onClick={onNext} />
            </>
          ) : null}
          {onClose ? <Button variant="ghost" size="small" icon="x" aria-label="Close details" onClick={onClose} /> : null}
        </div>
      </div>
      {position ? <p className="nl-detail__position">{position}</p> : null}

      <div className="nl-detail__body">
        <LoadingGate loading={loading} skeleton={<SkeletonText lines={5} />} minHeight="calc(var(--space-8) * 4)" label="Loading the details">
          {children}
          {details.length ? (
            <details className="nl-detail__fold">
              <summary>Details</summary>
              <DetailFacts facts={details} />
            </details>
          ) : null}
        </LoadingGate>
      </div>

      {primary || secondary.length ? (
        <div className="nl-detail__actions">
          {primary ? (
            <Button icon={primary.icon} onClick={primary.onClick}>
              {primary.label}
            </Button>
          ) : null}
          {secondary.slice(0, MAX_SECONDARY_ACTIONS).map((action) => (
            <Button key={action.label} variant={action.variant || 'secondary'} icon={action.icon} onClick={action.onClick}>
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </section>
  );
};

/** Key facts as label and value pairs, for example Customer, Cashier, Date. */
export const DetailFacts = ({ facts }) => (
  <dl className="nl-facts">
    {facts.map((fact) => (
      <div className="nl-facts__row" key={fact.label}>
        <dt className="nl-label">{fact.label}</dt>
        <dd>{fact.value === undefined || fact.value === null || fact.value === '' ? '–' : fact.value}</dd>
      </div>
    ))}
  </dl>
);

/**
 * List and detail side by side (the "list page" pattern): the list takes 8 of 12 columns and the panel 4 once
 * a row is open. Below 1100px an open panel replaces the list, and the page returns to the same scroll
 * position when it is closed.
 */
export const ListWithDetail = ({ list, detail, className = '' }) => {
  const open = Boolean(detail);
  const saved = useRef(null);

  useEffect(() => {
    const narrow = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 1099px)').matches;
    if (!narrow) return;
    if (open) {
      if (saved.current === null) saved.current = window.scrollY;
      window.scrollTo(0, 0);
    } else if (saved.current !== null) {
      window.scrollTo(0, saved.current);
      saved.current = null;
    }
  }, [open]);

  return (
    <div className={['nl-split', open && 'has-detail', className].filter(Boolean).join(' ')}>
      <div className="nl-split__list">{list}</div>
      {open ? <div className="nl-split__detail">{detail}</div> : null}
    </div>
  );
};

export default DetailPanel;
