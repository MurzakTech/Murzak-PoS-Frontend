import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import Icon from '../components/Icon';
import Segmented from '../components/Segmented';
import Select from '../components/Select';
import Table from '../components/Table';
import fill from '../labels/fill';
import { submitCount } from '../../api/stockLevelsApi';
import { CountDifference } from './Labels';
import { countPayload, countTotals, countedInvalid, countedLines, countedValue, formatQty, netWords, qtyWithUnit } from './stockModel';
import { useCountSheet } from './useStockData';
import T from './strings.stock';

const C = T.count;
const STEPS = ['choose', 'count', 'review'];

const Steps = ({ step }) => (
  <ol className="nl-count-steps" aria-label={C.stepsLabel}>
    {STEPS.map((key, i) => (
      <li key={key} className={i + 1 === step ? 'is-current' : i + 1 < step ? 'is-done' : undefined} aria-current={i + 1 === step ? 'step' : undefined}>
        <span className="nl-count-steps__number">{i + 1 < step ? <Icon name="check" /> : i + 1}</span>
        <span>{C.steps[key]}</span>
      </li>
    ))}
  </ol>
);

/**
 * Count stock, a guided count in three steps (tickets P4-4 and AC-27). Step 1 chooses what to count: the whole store or one
 * category. Step 2 is a table of what the system expects and a box to type what was counted, with the difference in words
 * and an icon (Short, Over or Matches) and a total. Step 3 shows what differs and, on Confirm, saves the count once through
 * the server. Nothing changes until Confirm.
 *
 *   stores      [{ value, label }] the selling locations; the store is asked for only when there are two or more
 *   categories  the category names, for "One category"
 *   itemCode    count only this product (from a row's menu)
 *   rootPath    where "Back to stock levels" goes
 */
const CountStockFlow = ({ stores = [], categories = [], itemCode = '', rootPath = '/' }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [scope, setScope] = useState('all');
  const [category, setCategory] = useState('');
  const [store, setStore] = useState('');
  const [tried, setTried] = useState(false);
  const [query, setQuery] = useState(null);
  const [typed, setTyped] = useState({});
  const [find, setFind] = useState('');
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const [result, setResult] = useState(null);
  const sheet = useCountSheet(query);

  const needsStore = stores.length >= 2;
  const problems = {};
  if (scope === 'category' && !category) problems.category = C.categoryRequired;
  if (needsStore && !store) problems.store = C.storeRequired;

  const start = () => {
    setTried(true);
    if (Object.keys(problems).length > 0) return;
    setTyped({});
    setFind('');
    setFailure('');
    setQuery({ scope, category: scope === 'category' ? category : undefined, store: needsStore ? store : undefined });
    setStep(2);
  };

  const allRows = useMemo(() => {
    const rows = sheet.status === 'ready' ? sheet.data.rows.map((r) => ({ ...r, id: r.item_code })) : [];
    return itemCode ? rows.filter((r) => r.item_code === itemCode) : rows;
  }, [sheet.status, sheet.data, itemCode]);
  const lines = useMemo(() => countedLines(allRows, typed), [allRows, typed]);
  const totals = countTotals(lines);
  const anyInvalid = Object.values(typed).some(countedInvalid);
  const needle = find.trim().toLowerCase();
  const shown = needle ? allRows.filter((r) => `${r.item_name} ${r.item_code}`.toLowerCase().includes(needle)) : allRows;
  const differing = lines.filter((l) => l.info.kind !== 'matches');

  const confirm = async () => {
    if (saving) return;
    setSaving(true);
    setFailure('');
    try {
      const saved = await submitCount({ counts: countPayload(lines), store: sheet.data.warehouse });
      setResult(saved);
    } catch (error) {
      setFailure(fill(C.failed, { reason: error.message }));
    }
    setSaving(false);
  };

  const again = () => {
    setStep(1);
    setQuery(null);
    setTyped({});
    setResult(null);
    setTried(false);
    setFailure('');
  };

  const sheetColumns = [
    { key: 'product', header: C.productColumn, render: (r) => <strong>{r.item_name}</strong> },
    { key: 'expected', header: C.expected, align: 'right', nowrap: true, render: (r) => qtyWithUnit(r.expected, r.unit) },
    {
      key: 'counted',
      header: C.counted,
      render: (r) => (
        <Field
          className="nl-count-field"
          label={fill(C.countedFor, { product: r.item_name })}
          value={typed[r.item_code] || ''}
          inputMode="decimal"
          autoComplete="off"
          error={countedInvalid(typed[r.item_code]) ? C.badNumber : undefined}
          onChange={(value) => setTyped((t) => ({ ...t, [r.item_code]: value }))}
        />
      ),
    },
    { key: 'difference', header: C.difference, nowrap: true, render: (r) => <CountDifference expected={r.expected} counted={countedValue(typed[r.item_code])} /> },
  ];

  const reviewColumns = [
    { key: 'product', header: C.productColumn, render: (l) => <strong>{l.row.item_name}</strong> },
    { key: 'expected', header: C.expected, align: 'right', nowrap: true, render: (l) => qtyWithUnit(l.row.expected, l.row.unit) },
    { key: 'counted', header: C.counted, align: 'right', nowrap: true, render: (l) => qtyWithUnit(l.counted, l.row.unit) },
    { key: 'difference', header: C.difference, nowrap: true, render: (l) => <CountDifference expected={l.row.expected} counted={l.counted} /> },
  ];

  const totalsText = (
    <>
      <p className="nl-count-total" role="status">
        <strong>{C.totalLabel}</strong>
        <span>{fill(C.totalLine, { counted: totals.counted, short: totals.short, over: totals.over, matches: totals.matches })}</span>
        <span>{fill(C.totalNet, { amount: netWords(totals.net) })}</span>
      </p>
    </>
  );

  if (result) {
    return (
      <Card>
        <div className="nl-count-done" role="status">
          <Icon name="check" />
          <h2 className="nl-count-done__title">{C.doneTitle}</h2>
          <p>{result.reconciliation ? C.doneText : C.doneNothing}</p>
          <p className="nl-stock-sub">{fill(C.totalLine, { counted: result.totals.lines, short: result.totals.short, over: result.totals.over, matches: result.totals.matches })}</p>
          <div className="nl-count-actions">
            <Button variant="secondary" onClick={again}>
              {C.doneAgain}
            </Button>
            <Button onClick={() => navigate(rootPath)}>{C.doneBack}</Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="nl-count">
      <Steps step={step} />
      <p className="nl-stock-sub nl-count-stepof">{fill(C.stepOf, { step, name: C.steps[STEPS[step - 1]] })}</p>

      {step === 1 ? (
        <Card title={C.title}>
          <div className="nl-stock-form">
            <p className="nl-count-intro">{C.intro}</p>
            <Segmented label={C.scope} options={[{ value: 'all', label: C.scopeAll }, { value: 'category', label: C.scopeCategory }]} value={scope} onChange={setScope} />
            {scope === 'category' ? <Select label={C.category} options={categories.map((c) => ({ value: c, label: c }))} value={category} onChange={setCategory} placeholder={C.categoryPlaceholder} error={tried ? problems.category : undefined} /> : null}
            {needsStore ? <Select label={C.store} options={stores} value={store} onChange={setStore} placeholder={C.storePlaceholder} error={tried ? problems.store : undefined} /> : null}
            {itemCode ? <p className="nl-stock-sub">{fill(C.onlyProduct, { product: itemCode })}</p> : null}
            <div className="nl-count-actions">
              <Button onClick={start}>{C.start}</Button>
            </div>
            <div className="nl-count-role">
              <Button as={Link} to={C.byRoleAddress} variant="ghost" size="small">
                {C.byRole}
              </Button>
              <p className="nl-stock-sub">{C.byRoleHint}</p>
            </div>
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card title={C.steps.count}>
          {sheet.status === 'error' ? (
            <EmptyState icon="alert" tone="error" title={C.loadFailed} description={sheet.error} action={{ label: C.retry, onClick: sheet.reload }} />
          ) : (
            <div className="nl-stock-form">
              <p className="nl-stock-sub">{C.quietNote}</p>
              {sheet.status === 'ready' && sheet.data.truncated ? <p className="nl-stock-sub">{C.truncated}</p> : null}
              {itemCode ? <p className="nl-stock-sub">{fill(C.onlyProduct, { product: allRows[0] ? allRows[0].item_name : itemCode })}</p> : null}
              <Field label={T.filters.search} icon="search" value={find} onChange={setFind} placeholder={T.filters.searchPlaceholder} />
              <Table caption={C.tableCaption} columns={sheetColumns} rows={shown}  loading={sheet.status === 'loading'} empty={{ title: T.empty.noMatchTitle, description: T.empty.noMatchText }} skeletonRows={6} />
              {sheet.status === 'ready' ? totalsText : null}
              <div className="nl-count-actions">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  {C.back}
                </Button>
                <Button disabled={sheet.status !== 'ready' || totals.counted === 0 || anyInvalid} onClick={() => setStep(3)}>
                  {C.review}
                </Button>
              </div>
              {sheet.status === 'ready' && totals.counted === 0 ? <p className="nl-stock-sub">{C.reviewNeedsOne}</p> : null}
            </div>
          )}
        </Card>
      ) : null}

      {step === 3 ? (
        <Card title={C.reviewTitle}>
          <div className="nl-stock-form">
            <p className="nl-count-intro">{C.reviewIntro}</p>
            {totalsText}
            {differing.length === 0 ? (
              <p>{C.reviewNone}</p>
            ) : (
              <Table caption={C.reviewDifferences} columns={reviewColumns} rows={differing.map((l) => ({ ...l, id: l.row.item_code }))}  />
            )}
            {totals.matches > 0 && differing.length > 0 ? <p className="nl-stock-sub">{fill(C.reviewMatches, { count: formatQty(totals.matches) })}</p> : null}
            {failure ? (
              <p className="nl-error" role="alert">
                <Icon name="alert" />
                <span>{failure}</span>
              </p>
            ) : null}
            <div className="nl-count-actions">
              <Button variant="secondary" disabled={saving} onClick={() => setStep(2)}>
                {C.back}
              </Button>
              <Button loading={saving} onClick={confirm}>
                {C.confirm}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
};

export default CountStockFlow;
