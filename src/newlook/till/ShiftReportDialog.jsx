import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Icon from '../components/Icon';
import { LoadingGate, Skeleton } from '../components/Skeleton';
import { getShiftReport } from '../../api/shiftApi';
import { cashDifference, cashRows, creditLine, methodRows, movementLines, reportIntro, reportName, returnsLine, salesRows, timeLines } from './reportModel';
import { sessionName } from './shiftModel';
import T from './strings.cash';
import './till.css';

const R = T.report;
const PRINT_CLASS = 'nl-printing-shift';
const REPORT_MIN_HEIGHT = 'calc(var(--space-8) * 4)';

/** The report's figures, the same rows on screen and on paper */
const ReportBody = ({ report }) => {
  const sales = salesRows(report);
  const returns = returnsLine(report);
  const credit = creditLine(report);
  const methods = methodRows(report);
  const drawer = cashRows(report);
  const difference = cashDifference(report);
  const moves = movementLines(report);
  const counted = report.by_method.some((row) => row.counted !== null);
  return (
    <div className="nl-shiftreport">
      <div className="nl-shift__session">
        <p className="nl-shift__strong">{report.cashier_name || report.cashier}</p>
        {timeLines(report).map((line) => (
          <p key={line} className="nl-shift__muted">
            {line}
          </p>
        ))}
      </div>

      <section>
        <h3 className="nl-shift__small-heading">{R.salesName}</h3>
        <table className="nl-shift__table">
          <caption className="nl-visually-hidden">{R.salesName}</caption>
          <tbody>
            {sales.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.name}</th>
                <td>{row.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {returns ? <p className="nl-shift__muted">{returns}</p> : null}
        {credit ? <p className="nl-shift__muted">{credit}</p> : null}
      </section>

      {methods.length ? (
        <section>
          <h3 className="nl-shift__small-heading">{R.methodsName}</h3>
          <table className="nl-shift__table nl-shiftreport__methods">
            <caption className="nl-visually-hidden">{R.methodsName}</caption>
            <thead>
              <tr>
                <th scope="col">{R.methodMethod}</th>
                <th scope="col">{R.methodSales}</th>
                <th scope="col">{R.methodExpected}</th>
                {counted ? <th scope="col">{R.methodCounted}</th> : null}
                {counted ? <th scope="col">{R.methodDifference}</th> : null}
              </tr>
            </thead>
            <tbody>
              {methods.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.name}</th>
                  <td>{row.sales}</td>
                  <td>{row.expected}</td>
                  {counted ? <td>{row.counted}</td> : null}
                  {counted ? <td>{row.difference}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {drawer.length ? (
        <section>
          <h3 className="nl-shift__small-heading">{R.cashName}</h3>
          <table className="nl-shift__table">
            <caption className="nl-visually-hidden">{R.cashName}</caption>
            <tbody>
              {drawer.map((row) => (
                <tr key={row.key} className={row.strong ? 'nl-shift__difference' : undefined}>
                  <th scope="row">{row.name}</th>
                  <td>{row.amount}</td>
                </tr>
              ))}
              {difference ? (
                <tr className="nl-shift__difference">
                  <th scope="row">{R.cashDifference}</th>
                  <td>
                    <span role="status" className={`nl-shift__word is-${difference.tone}`} data-word={difference.word}>
                      <Icon name={difference.icon} />
                      <span>{difference.text}</span>
                    </span>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ) : null}

      <section>
        <h3 className="nl-shift__small-heading">{R.movementsName}</h3>
        {moves.length ? (
          <ul className="nl-shift__list">
            {moves.map((line) => (
              <li key={line.key}>{line.text}</li>
            ))}
          </ul>
        ) : (
          <p className="nl-shift__muted">{R.movementsNone}</p>
        )}
      </section>
    </div>
  );
};

/** What the printer gets: the report only. It exists only while printing. */
const PrintBlock = ({ report }) =>
  createPortal(
    <div className="nl-shift-print">
      <h2>{reportName(report)}</h2>
      <ReportBody report={report} />
    </div>,
    document.body
  );

/**
 * The shift report (shift management, part 2): the X report while the shift is open (the figures so far; nothing is
 * closed or changed by looking), the Z report once it is closed (with what was counted and the difference). It can be
 * printed.
 *
 *   open, onClose   showing, and what Escape and Done do
 *   session         the session record or just its name
 *   load            the server call, replaceable in tests
 */
const ShiftReportDialog = ({ open, ...rest }) => (open ? <ShiftReport {...rest} /> : null);

const ShiftReport = ({ onClose, session, load = getShiftReport }) => {
  const name = sessionName(session);
  const [view, setView] = useState({ status: 'loading', report: null, error: '' });
  const [printing, setPrinting] = useState(false);
  const ticket = useRef(0);

  const fetchReport = useCallback(async () => {
    const mine = ++ticket.current;
    setView({ status: 'loading', report: null, error: '' });
    try {
      const report = await load(name);
      if (mine === ticket.current) setView({ status: 'ready', report, error: '' });
    } catch (error) {
      if (mine === ticket.current) setView({ status: 'error', report: null, error: error && error.message ? error.message : R.loadFailed });
    }
  }, [load, name]);

  useEffect(() => {
    fetchReport();
    const current = ticket;
    return () => {
      current.current += 1; // an answer that arrives after the dialog closed is ignored
    };
  }, [fetchReport]);

  // Printing: the print block is drawn first, then the browser's print window opens a moment later, then the block goes away
  useEffect(() => {
    if (!printing) return undefined;
    document.body.classList.add(PRINT_CLASS);
    const timer = setTimeout(() => {
      try {
        window.print();
      } finally {
        document.body.classList.remove(PRINT_CLASS);
        setPrinting(false);
      }
    }, 50);
    return () => {
      clearTimeout(timer);
      document.body.classList.remove(PRINT_CLASS);
    };
  }, [printing]);

  const report = view.report;
  const footer = (
    <>
      {report ? (
        <Button variant="secondary" size="till" icon="receipt" onClick={() => setPrinting(true)} disabled={printing}>
          {printing ? R.printing : R.print}
        </Button>
      ) : null}
      <Button size="till" onClick={onClose}>
        {R.close}
      </Button>
    </>
  );

  const skeleton = (
    <div className="nl-till-panel__skeleton">
      <Skeleton width="60%" height="var(--space-4)" />
      <Skeleton height="var(--control-height-till)" />
      <Skeleton height="var(--control-height-till)" />
    </div>
  );

  return (
    <Dialog open onClose={onClose} title={report ? reportName(report) : R.name} description={report ? reportIntro(report) : undefined} footer={footer} className="nl-shift nl-shift--report">
      {view.status === 'error' ? (
        <div role="alert" className="nl-shift__alert">
          <Icon name="alert" />
          <span>{view.error}</span>
          <Button variant="ghost" size="small" onClick={fetchReport}>
            {R.tryAgain}
          </Button>
        </div>
      ) : (
        <LoadingGate loading={view.status === 'loading'} skeleton={skeleton} minHeight={REPORT_MIN_HEIGHT} label={R.loading}>
          {report ? <ReportBody report={report} /> : null}
        </LoadingGate>
      )}
      {printing && report ? <PrintBlock report={report} /> : null}
    </Dialog>
  );
};

export default ShiftReportDialog;
