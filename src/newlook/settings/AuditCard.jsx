import React, { useCallback, useEffect, useRef, useState } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import Field from '../components/Field';
import Table from '../components/Table';
import { listAuditEvents } from '../../api/auditApi';
import { saveTextFile } from '../../utils/saveTextFile';
import fill from '../labels/fill';
import { auditCsv, defaultRange, whenLabel } from './teamModel';
import useSettingsUser from './useSettingsUser';
import T from './strings.settings';

const A = T.team.audit;
const PAGE_SIZE = 50;
const ROW_KEY = 'id';

/**
 * Settings, Team and security, Audit trail (ticket P5-3): who did what, and when, as a read-only list for a range of dates
 * (the last seven days to begin with), 50 at a time with Show more, and Export CSV of the rows shown. It reads the call the
 * current Audit trail screen reads. The server decides who may see it (owners, accounts managers and auditors); anyone else
 * is told in words.
 *
 *   load   injectable for tests; it defaults to the server call
 *   save   gives the person the file; injectable for tests
 *   now    today, for the first range (tests)
 */
const AuditCard = ({ load = listAuditEvents, save = saveTextFile, now }) => {
  const { company } = useSettingsUser();
  const [range, setRange] = useState(() => defaultRange(now));
  const [state, setState] = useState({ status: 'loading', events: [], more: false, message: '' });
  const [more, setMore] = useState(false);
  const request = useRef(0);

  const fetchPage = useCallback(
    (append, offset) => {
      // A date that is still being typed is not asked for
      if (!range.from || !range.to) return Promise.resolve();
      const id = (request.current += 1);
      if (append) setMore(true);
      else setState((s) => ({ ...s, status: 'loading' }));
      return load({ company, from_date: range.from, to_date: range.to, limit_start: offset, limit_page_length: PAGE_SIZE })
        .then((result) => {
          if (id !== request.current) return;
          setState((s) => ({ status: 'ready', events: append ? [...s.events, ...result.events] : result.events, more: result.hasMore, message: '' }));
        })
        .catch((e) => {
          if (id !== request.current) return;
          setState((s) => ({ status: 'error', events: append ? s.events : [], more: false, message: e.message }));
        })
        .finally(() => id === request.current && setMore(false));
    },
    [company, load, range.from, range.to]
  );
  useEffect(() => {
    fetchPage(false, 0);
  }, [fetchPage]);

  const wrong = (value) => (value ? undefined : A.dateWrong);
  const csvHeader = [A.csv.when, A.csv.person, A.csv.email, A.csv.action, A.csv.area, A.csv.documentType, A.csv.document, A.csv.details];
  const exportRows = () => save(`\uFEFF${auditCsv(state.events, csvHeader)}`, fill(A.exportName, { from: range.from || 'start', to: range.to || 'today' }));

  const columns = [
    { key: 'timestamp', header: A.when, nowrap: true, render: (e) => whenLabel(e.timestamp) },
    { key: 'user_name', header: A.who, render: (e) => e.user_name || e.user },
    { key: 'action', header: A.action },
    { key: 'docname', header: A.document, hideOnPhone: true, render: (e) => (e.docname ? `${e.doctype} ${e.docname}` : e.module) },
    { key: 'summary', header: A.details, hideOnPhone: true },
  ];

  return (
    <div className="nl-settings-card" data-card="audit-trail">
      <Card title={A.title} subtitle={A.subtitle}>
        <div className="nl-settings-audit-filters">
          <Field id="audit-from" label={A.from} kind="date" value={range.from} onChange={(from) => setRange((r) => ({ ...r, from }))} error={wrong(range.from)} />
          <Field id="audit-to" label={A.to} kind="date" value={range.to} onChange={(to) => setRange((r) => ({ ...r, to }))} error={wrong(range.to)} />
        </div>
        <Table
          caption={A.caption}
          columns={columns}
          rows={state.events}
          rowKey={ROW_KEY}
          loading={state.status === 'loading'}
          error={state.status === 'error' && state.events.length === 0}
          onRetry={() => fetchPage(false, 0)}
          empty={{ icon: 'inbox', title: A.empty, description: A.emptyText }}
        />
        <div className="nl-settings-audit-foot">
          {state.more ? (
            <Button variant="secondary" loading={more} onClick={() => fetchPage(true, state.events.length)}>
              {A.showMore}
            </Button>
          ) : null}
          <Button variant="secondary" disabled={state.events.length === 0} onClick={exportRows}>
            {A.export}
          </Button>
          <p className="nl-settings-hint">{A.exportNote}</p>
        </div>
        {state.status === 'error' && state.events.length > 0 ? (
          <p className="nl-settings-error" role="alert">
            {state.message}
          </p>
        ) : null}
      </Card>
    </div>
  );
};

export default AuditCard;
