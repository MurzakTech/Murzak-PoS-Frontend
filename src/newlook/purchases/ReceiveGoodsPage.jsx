import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Checkbox from '../components/Checkbox';
import { ConfirmDialog } from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import Select from '../components/Select';
import Table from '../components/Table';
import { formatMoney } from '../components/format';
import { FormPage } from '../forms';
import FT from '../forms/strings.forms';
import { PageHeader } from '../shell';
import fill from '../labels/fill';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { listWarehouses } from '../../store/warehouseSlice';
import { createPurchaseReturn, getPurchase, receiveGoods } from '../../api/purchasesListApi';
import { invalidateQuery } from './usePurchasesData';
import './purchases.css';
import PurchaseStatus from './PurchaseStatus';
import { usePurchasesList, useSuppliers } from './usePurchasesData';
import {
  dateCell,
  duplicateCodes,
  isoDay,
  leftAfter,
  NEW_PATH,
  newRequestId,
  openAddress,
  parseQty,
  parseSpoilt,
  PURCHASES_PATH,
  qtyText,
  receiveAddress,
  receiveItems,
  receiveLines,
  receiveProblems,
  reviewFieldProblems,
  reviewLines,
  returnRemarks,
  reviewTotal,
  SPOILT_PREFIX,
  SPOILT_REASONS,
  spoiltItems,
  spoiltTotal,
  stockLine,
} from './purchasesModel';
import T from './strings.purchases';
import { oldScreen } from '../redirects/engine';
import { sellingLocations } from '../till/sellingLocations';

const R = T.receive;

/** What goes into stock from a line: what arrived less what is spoilt (never below nothing while the typing is unfinished) */
const goodOf = (l) => Math.max(0, (parseQty(l.qty) || 0) - (parseSpoilt(l.spoilt) || 0));
const STEPS = ['choose', 'items', 'review'];
const MAX_ORDERS = 100;
const ITEM_KEY = 'item_code';
const NOTE_MAX = 140;
const REASON_CHOICES = SPOILT_REASONS.map((r) => ({ value: r, label: r }));

/** The three steps, with the one you are on marked in words and with aria-current */
const Steps = ({ step }) => (
  <ol className="nl-receive-steps" aria-label={R.stepsLabel}>
    {STEPS.map((key, i) => (
      <li
        key={key}
        className={['nl-receive-steps__item', step === key && 'is-current', STEPS.indexOf(step) > i && 'is-done'].filter(Boolean).join(' ')}
        aria-current={step === key ? 'step' : undefined}
      >
        <span className="nl-receive-steps__number">{STEPS.indexOf(step) > i ? <Icon name="check" /> : i + 1}</span>
        <span>{R.steps[key]}</span>
      </li>
    ))}
  </ol>
);

/**
 * Receive goods (ticket P4-5, acceptance check AC-29): the guided step. Choose the order, tick what arrived and enter the
 * quantity received, check and confirm. Confirming makes ONE server call that creates the goods received note, raises the
 * stock and creates the supplier bill together, or changes nothing. Built on the Form page pattern (errors beside the field
 * and in the summary, a question before leaving with typed changes).
 *
 * Over-receipt is not allowed: a quantity can be anything above 0 up to what is still to arrive on that line. An order
 * partly delivered stays open for the rest.
 */
const ReceiveGoodsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { warehouses } = useAppSelector((s) => s.warehouse);
  const user = useAppSelector((s) => s.auth.user);
  const company = user && user.company;
  const startOrder = new URLSearchParams(location.search).get('order') || '';

  const [step, setStep] = useState(startOrder ? 'loading' : 'choose');
  const [chosen, setChosen] = useState(startOrder);
  const [supplier, setSupplier] = useState('');
  const [purchase, setPurchase] = useState(null);
  const [lines, setLines] = useState([]);
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(isoDay(new Date()));
  const [dueDate, setDueDate] = useState('');
  const [store, setStore] = useState('');
  const [problems, setProblems] = useState({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const [loadFailure, setLoadFailure] = useState('');
  const [touched, setTouched] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [result, setResult] = useState(null);
  const [makeReturn, setMakeReturn] = useState(true);
  const [returnNote, setReturnNote] = useState('');
  const [returnState, setReturnState] = useState(null); // null, or { status: 'busy' | 'done' | 'failed', number, amount, reason }
  const requestId = useRef(newRequestId('recv'));
  const sending = useRef(false);
  const heading = useRef(null);

  const suppliers = useSuppliers();
  const orders = usePurchasesList({ tab: 'orders', openOnly: true, supplier, pageSize: MAX_ORDERS, period: '30d' }, step === 'choose');

  useEffect(() => {
    if (company) dispatch(listWarehouses({ company, limit: 1000 }));
  }, [dispatch, company]);

  const loadOrder = async (id) => {
    setStep('loading');
    setLoadFailure('');
    try {
      const data = await getPurchase(id, 'Purchase Order');
      if (!data.can || !data.can.receive_goods) {
        setLoadFailure(R.orderNotReceivable);
        setStep('choose');
        return;
      }
      setPurchase(data);
      setLines(receiveLines(data));
      setProblems({});
      setFailure('');
      setStep('items');
    } catch (error) {
      setLoadFailure(fill(R.orderFailed, { reason: error.message }));
      setStep('choose');
    }
  };

  // Arrived from the panel with an order already chosen: go straight to the items
  useEffect(() => {
    if (startOrder) loadOrder(startOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The keyboard goes to the step's heading when the step changes
  useEffect(() => {
    if (heading.current && step !== 'loading') heading.current.focus();
  }, [step, result]);

  const startOver = (order) => {
    requestId.current = newRequestId('recv');
    sending.current = false;
    setResult(null);
    setPurchase(null);
    setLines([]);
    setBillNo('');
    setBillDate(isoDay(new Date()));
    setDueDate('');
    setStore('');
    setMakeReturn(true);
    setReturnNote('');
    setReturnState(null);
    setFailure('');
    setProblems({});
    setTouched(false);
    setChosen(order || '');
    navigate(receiveAddress(order), { replace: true });
    if (order) loadOrder(order);
    else setStep('choose');
  };

  const changeLine = (code, patch) => {
    setTouched(true);
    setFailure('');
    setLines((prev) => prev.map((l) => (l.item_code === code ? { ...l, ...patch } : l)));
    setProblems((prev) => {
      if (!prev[code] && !prev.general) return prev;
      const next = { ...prev };
      delete next[code];
      delete next[`${SPOILT_PREFIX}${code}`];
      delete next.general;
      return next;
    });
  };
  const tickAll = (on) => {
    setTouched(true);
    setLines((prev) => prev.map((l) => (l.toArrive > 0 ? { ...l, ticked: on, qty: on && !parseQty(l.qty) ? qtyText(l.toArrive) : l.qty } : l)));
    setProblems({});
  };

  const show = (found) => {
    setProblems(found);
    const first = Object.keys(found).find((k) => k !== 'general') || (found.general ? 'general' : '');
    const id = first === 'general' ? 'rc-items' : first.startsWith(SPOILT_PREFIX) ? `rc-spoilt-${first.slice(SPOILT_PREFIX.length)}` : `rc-qty-${first}`;
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el && el.focus) el.focus();
    }, 0);
  };

  const summaryErrors = useMemo(() => {
    const list = [];
    if (problems.general) list.push({ id: 'rc-items', message: problems.general });
    lines.forEach((l) => {
      if (problems[l.item_code]) list.push({ id: `rc-qty-${l.item_code}`, message: problems[l.item_code] });
      if (problems[`${SPOILT_PREFIX}${l.item_code}`]) list.push({ id: `rc-spoilt-${l.item_code}`, message: problems[`${SPOILT_PREFIX}${l.item_code}`] });
    });
    if (problems.dueDate) list.push({ id: 'rc-due-date', message: problems.dueDate });
    if (failure) list.push({ id: 'rc-bill-no', message: failure });
    return list;
  }, [problems, lines, failure]);

  // ---------- Steps ----------
  const goNext = () => {
    if (step === 'choose') {
      if (!chosen) {
        setProblems({ choose: R.noOrderChosen });
        return;
      }
      setProblems({});
      loadOrder(chosen);
      return;
    }
    if (step === 'items') {
      const found = receiveProblems(lines);
      if (Object.keys(found).length) {
        show(found);
        return;
      }
      setProblems({});
      setTouched(true);
      setStep('review');
      return;
    }
    confirm();
  };

  const confirm = async () => {
    const found = { ...receiveProblems(lines), ...reviewFieldProblems({ billDate, dueDate }) };
    if (Object.keys(found).length) {
      setProblems(found);
      if (Object.keys(receiveProblems(lines)).length) setStep('items');
      return;
    }
    if (sending.current) return;
    sending.current = true;
    setSaving(true);
    setFailure('');
    try {
      const data = await receiveGoods({
        order: purchase.id,
        items: receiveItems(lines),
        billNo: billNo.trim() || undefined,
        billDate: billDate || undefined,
        dueDate: dueDate || undefined,
        warehouse: store || undefined,
        requestId: requestId.current,
      });
      invalidateQuery('purchases');
      invalidateQuery('stock');
      setResult(data);
      // The goods and the bill are saved; the spoilt part goes back on its own return note, never twice for a repeated delivery
      if (makeReturn && !data.repeat && spoiltItems(lines).length) makeReturnNote(data);
    } catch (error) {
      setFailure(fill(R.failed, { reason: error.message }));
      sending.current = false;
    }
    setSaving(false);
  };

  const makeReturnNote = async (data) => {
    const items = spoiltItems(lines);
    const amount = spoiltTotal(lines);
    setReturnState({ status: 'busy' });
    try {
      const made = await createPurchaseReturn({
        returnAgainst: data.invoice,
        items: items.map(({ item_code, item_name, qty, rate }) => ({ item_code, item_name, qty, rate })),
        remarks: returnRemarks(items, returnNote),
        company,
      });
      const number = (made && (made.return_number || made.return_invoice || made.name || made.return)) || '';
      setReturnState({ status: 'done', number, id: (made && (made.return_invoice || made.name || made.return)) || '', amount });
    } catch (error) {
      setReturnState({ status: 'failed', reason: error.message || '' });
    }
  };

  const back = () => {
    setProblems({});
    setFailure('');
    setStep(step === 'review' ? 'items' : 'choose');
  };

  // ---------- The finished page ----------
  if (result) {
    const names = {};
    lines.forEach((l) => {
      names[l.item_code] = l.name;
    });
    return (
      <div className="nl-receive">
        <PageHeader title={R.title} subtitle={R.subtitle} />
        <section className="nl-receive-done" role="status" aria-live="polite">
          <h2 className="nl-receive-done__title" tabIndex={-1} ref={heading}>
            <Icon name="check" />
            <span>{R.successTitle}</span>
          </h2>
          <p>{fill(R.successText, { supplier: purchase.supplier.name })}</p>
          {result.repeat ? <p className="nl-receive-note">{R.successRepeat}</p> : null}
          {(result.stock || []).length ? (
            <>
              <h3 className="nl-label">{R.stockTitle}</h3>
              <ul className="nl-receive-done__stock">
                {result.stock.map((s) => (
                  <li key={s.item_code}>{stockLine(s, names)}</li>
                ))}
              </ul>
              {result.stock_ok === false ? (
                <p className="nl-error" role="alert">
                  <Icon name="alert" />
                  <span>{R.stockCheck}</span>
                </p>
              ) : null}
            </>
          ) : null}
          {returnState && returnState.status === 'busy' ? (
            <p className="nl-receive-note" role="status">
              {R.returnRetrying}
            </p>
          ) : null}
          {returnState && returnState.status === 'done' ? (
            <p role="status">
              <strong>{R.returnDoneTitle}. </strong>
              {fill(R.returnDone, { amount: formatMoney(returnState.amount), supplier: purchase.supplier.name })}
            </p>
          ) : null}
          {returnState && returnState.status === 'failed' ? (
            <div className="nl-error" role="alert">
              <Icon name="alert" />
              <span>
                <strong>{R.returnFailedTitle}. </strong>
                {fill(R.returnFailed, { reason: returnState.reason })}
              </span>
            </div>
          ) : null}
          {result.order && result.order.open ? <p className="nl-receive-note">{R.stillOpen}</p> : null}
          <ul className="nl-receive-done__links">
            <li>
              <Link to={openAddress(result.invoice)}>{fill(R.openBill, { number: result.invoice_number })}</Link>
            </li>
            <li>
              <Link to={openAddress(result.receipt)}>{fill(R.openReceipt, { number: result.receipt_number })}</Link>
            </li>
            {returnState && returnState.status === 'done' && returnState.id ? (
              <li>
                <Link to={openAddress(returnState.id)}>{fill(R.returnOpen, { number: returnState.number || returnState.id })}</Link>
              </li>
            ) : null}
            <li>
              <Link to={openAddress(purchase.id)}>{R.openOrder}</Link>
            </li>
          </ul>
          <div className="nl-receive-done__actions">
            {returnState && returnState.status === 'failed' ? <Button onClick={() => makeReturnNote(result)}>{R.returnRetry}</Button> : null}
            {result.order && result.order.open ? <Button onClick={() => startOver(purchase.id)}>{R.receiveRest}</Button> : null}
            <Button variant="secondary" onClick={() => startOver('')}>
              {R.receiveAnother}
            </Button>
            <Button variant="ghost" onClick={() => navigate(PURCHASES_PATH)}>
              {R.backToList}
            </Button>
          </div>
        </section>
      </div>
    );
  }

  // ---------- Step 1: choose the order ----------
  const supplierChoices = suppliers.status === 'ready' ? suppliers.data.map((s) => ({ value: s.id, label: s.name })) : [];
  const orderRows = orders.status === 'ready' ? orders.data.rows : [];
  const orderColumns = [
    { key: 'number', header: R.orderColumns.order, nowrap: true, render: (r) => <strong>{r.number}</strong> },
    { key: 'supplier', header: R.orderColumns.supplier },
    { key: 'date', header: R.orderColumns.date, nowrap: true, render: (r) => dateCell(r.date) },
    { key: 'total', header: R.orderColumns.total, money: true, nowrap: true },
    { key: 'progress', header: R.orderColumns.progress, render: (r) => (r.part_received ? T.partReceived : R.progressNone) },
  ];

  const chooseStep = (
    <>
      <h2 className="nl-receive__heading" tabIndex={-1} ref={heading}>
        {R.chooseOrder}
      </h2>
      <p className="nl-helper">{R.chooseHint}</p>
      {loadFailure ? (
        <p className="nl-error" role="alert">
          <Icon name="alert" />
          <span>{loadFailure}</span>
        </p>
      ) : null}
      {supplierChoices.length > 0 ? (
        <Select
          label={R.supplier}
          options={[{ value: '', label: R.allSuppliers }, ...supplierChoices]}
          value={supplier}
          onChange={(v) => {
            setSupplier(v);
            setChosen('');
          }}
        />
      ) : null}
      <div id="rc-orders" tabIndex={-1}>
        <Table
          caption={R.ordersCaption}
          columns={orderColumns}
          rows={orderRows}
          loading={orders.status === 'loading'}
          error={orders.status === 'error'}
          onRetry={orders.reload}
          selectedKey={chosen || undefined}
          onRowOpen={(row) => {
            setChosen(row.id);
            setProblems({});
            setTouched(true);
          }}
          empty={
            supplier
              ? { icon: 'search', title: R.noOrdersFiltered, description: '' }
              : { title: R.noOrdersTitle, description: R.noOrdersText, action: { label: R.noOrdersAction, icon: 'plus', onClick: () => navigate(NEW_PATH) } }
          }
        />
      </div>
      {orders.status === 'ready' && orders.data.total > MAX_ORDERS ? <p className="nl-helper">{fill(R.tooMany, { count: MAX_ORDERS })}</p> : null}
      {problems.choose ? (
        <p className="nl-error" role="alert">
          <Icon name="alert" />
          <span>{problems.choose}</span>
        </p>
      ) : null}
    </>
  );

  // ---------- Step 2: tick what arrived ----------
  const dupes = duplicateCodes(lines);
  const lineColumns = [
    {
      key: 'arrived',
      header: R.columns.arrived,
      render: (l) => (
        <div className="nl-receive-product">
          <Checkbox label={l.name} checked={l.ticked} disabled={l.toArrive <= 0} onChange={(on) => changeLine(l.item_code, { ticked: on, qty: on && !parseQty(l.qty) ? qtyText(l.toArrive) : l.qty })} />
          <span className="nl-receive-note">{[l.item_code, l.unit].filter(Boolean).join(' · ')}</span>
        </div>
      ),
    },
    { key: 'ordered', header: R.columns.ordered, align: 'right', render: (l) => qtyText(l.ordered) },
    { key: 'received', header: R.columns.received, align: 'right', render: (l) => qtyText(l.received) },
    { key: 'toArrive', header: R.columns.toArrive, align: 'right', render: (l) => (l.toArrive > 0 ? qtyText(l.toArrive) : R.nothingLeft) },
    { key: 'rate', header: R.columns.cost, money: true, nowrap: true },
    {
      key: 'qty',
      header: R.columns.quantity,
      render: (l) =>
        l.toArrive > 0 ? (
          <div className="nl-receive-qty">
            <Field
              id={`rc-qty-${l.item_code}`}
              label={fill(R.quantityLabel, { name: l.name })}
              inputMode="decimal"
              value={l.qty}
              disabled={!l.ticked}
              error={problems[l.item_code]}
              autoComplete="off"
              onChange={(v) => changeLine(l.item_code, { qty: v.replace(/[^\d.]/g, '') })}
            />
          </div>
        ) : null,
    },
    {
      key: 'spoilt',
      header: R.columns.spoilt,
      render: (l) =>
        l.toArrive > 0 ? (
          <div className="nl-receive-qty">
            <Field
              id={`rc-spoilt-${l.item_code}`}
              label={fill(R.spoiltLabel, { name: l.name })}
              inputMode="decimal"
              value={l.spoilt}
              placeholder="0"
              disabled={!l.ticked}
              error={problems[`${SPOILT_PREFIX}${l.item_code}`]}
              autoComplete="off"
              onChange={(v) => changeLine(l.item_code, { spoilt: v.replace(/[^\d.]/g, '') })}
            />
            {l.ticked && (parseSpoilt(l.spoilt) || 0) > 0 ? <Select label={fill(R.reasonLabel, { name: l.name })} options={REASON_CHOICES} value={l.reason} onChange={(v) => changeLine(l.item_code, { reason: v })} /> : null}
          </div>
        ) : null,
    },
    { key: 'good', header: R.columns.good, align: 'right', render: (l) => (l.ticked && l.toArrive > 0 ? qtyText(goodOf(l)) : '') },
    { key: 'value', header: R.columns.value, money: true, nowrap: true, render: (l) => (l.ticked && l.toArrive > 0 ? formatMoney(Math.round((parseQty(l.qty) || 0) * l.rate * 100) / 100) : '') },
  ];
  const itemsStep = purchase ? (
    <>
      <h2 className="nl-receive__heading" tabIndex={-1} ref={heading}>
        {R.itemsTitle}
      </h2>
      <p className="nl-receive__chosen">{fill(R.chosen, { number: purchase.number, supplier: purchase.supplier.name, date: dateCell(purchase.date) })}</p>
      <dl className="nl-receive-facts nl-receive-facts--row" aria-label={R.orderFactsLabel}>
        <div>
          <dt className="nl-label">{R.orderFacts.supplier}</dt>
          <dd>{purchase.supplier.name}</dd>
        </div>
        <div>
          <dt className="nl-label">{R.orderFacts.status}</dt>
          <dd>
            <PurchaseStatus status={purchase.status} />
          </dd>
        </div>
        <div>
          <dt className="nl-label">{R.orderFacts.ordered}</dt>
          <dd>{formatMoney(purchase.totals && purchase.totals.total)}</dd>
        </div>
        <div>
          <dt className="nl-label">{R.orderFacts.open}</dt>
          <dd>{fill(R.linesCount, { count: lines.filter((l) => l.toArrive > 0).length })}</dd>
        </div>
      </dl>
      <p className="nl-helper">{R.itemsHelp}</p>
      {dupes.length > 0 ? (
        <p className="nl-receive-note">
          {fill(R.duplicateNote, { name: (lines.find((l) => l.item_code === dupes[0]) || {}).name })} <a href={oldScreen(T.links.receiveByHand)}>{R.duplicateLink}</a>
        </p>
      ) : null}
      <div className="nl-receive__tools">
        <Button variant="ghost" size="small" onClick={() => tickAll(true)}>
          {R.tickAll}
        </Button>
        <Button variant="ghost" size="small" onClick={() => tickAll(false)}>
          {R.untickAll}
        </Button>
      </div>
      <div id="rc-items" tabIndex={-1}>
        <Table caption={R.itemsCaption} columns={lineColumns} rows={lines} rowKey={ITEM_KEY} />
      </div>
      {problems.general ? (
        <p className="nl-error">
          <Icon name="alert" />
          <span>{problems.general}</span>
        </p>
      ) : null}
      <p className="nl-receive-total">
        <span>{R.itemsTotals.received}</span> <strong>{formatMoney(reviewTotal(lines))}</strong>
      </p>
      {spoiltTotal(lines) > 0 ? (
        <>
          <p className="nl-receive-total">
            <span>{R.itemsTotals.spoilt}</span> <strong>{formatMoney(spoiltTotal(lines))}</strong>
          </p>
          <p className="nl-receive-total">
            <span>{R.itemsTotals.good}</span> <strong>{formatMoney(Math.round((reviewTotal(lines) - spoiltTotal(lines)) * 100) / 100)}</strong>
          </p>
        </>
      ) : null}
    </>
  ) : null;

  // ---------- Step 3: check and confirm ----------
  const review = purchase ? reviewLines(lines) : [];
  const left = purchase ? leftAfter(lines) : '';
  const storeChoices = sellingLocations(warehouses).map((w) => ({ value: w.name, label: w.warehouse_name || w.name }));
  const spoilt = purchase ? spoiltItems(lines) : [];
  const reviewColumns = [
    { key: 'name', header: R.reviewColumns.item },
    { key: 'qty', header: R.reviewColumns.quantity, align: 'right', render: (l) => qtyText(l.qty) },
    ...(spoilt.length ? [{ key: 'spoilt', header: R.reviewColumns.spoilt, align: 'right', render: (l) => (l.spoilt > 0 ? qtyText(l.spoilt) : '') }, { key: 'good', header: R.reviewColumns.good, align: 'right', render: (l) => qtyText(l.good) }] : []),
    { key: 'rate', header: R.reviewColumns.cost, money: true },
    { key: 'amount', header: R.reviewColumns.amount, money: true },
  ];
  const reviewStep = purchase ? (
    <>
      <h2 className="nl-receive__heading" tabIndex={-1} ref={heading}>
        {R.reviewTitle}
      </h2>
      <p className="nl-helper">{R.reviewIntro}</p>
      <dl className="nl-receive-facts">
        <div>
          <dt className="nl-label">{R.reviewSupplier}</dt>
          <dd>{purchase.supplier.name}</dd>
        </div>
        <div>
          <dt className="nl-label">{R.reviewOrder}</dt>
          <dd>
            {purchase.number} <PurchaseStatus status={purchase.status} />
          </dd>
        </div>
      </dl>
      <Table caption={R.reviewCaption} columns={reviewColumns} rows={review} rowKey={ITEM_KEY} />
      <p className="nl-receive-total">
        <span>{R.reviewTotal}</span> <strong>{formatMoney(reviewTotal(lines))}</strong>
      </p>
      {spoilt.length ? (
        <section className="nl-receive-spoilt" aria-label={R.spoiltTitle}>
          <h3 className="nl-label">{R.spoiltTitle}</h3>
          <p className="nl-helper">{fill(R.spoiltIntro, { supplier: purchase.supplier.name })}</p>
          <ul className="nl-receive-done__stock">
            {spoilt.map((i) => (
              <li key={i.item_code}>{fill(R.returnSpoiltLine, { name: i.item_name, qty: qtyText(i.qty), reason: i.reason })}</li>
            ))}
          </ul>
          <p className="nl-receive-total">
            <span>{R.spoiltValue}</span> <strong>{formatMoney(spoiltTotal(lines))}</strong>
          </p>
          <p className="nl-receive-total">
            <span>{R.netValue}</span> <strong>{formatMoney(Math.round((reviewTotal(lines) - spoiltTotal(lines)) * 100) / 100)}</strong>
          </p>
          <Checkbox label={R.makeReturn} checked={makeReturn} onChange={setMakeReturn} />
          {makeReturn ? (
            <Field id="rc-return-note" label={R.returnNote} helper={R.returnNoteHelper} value={returnNote} onChange={(v) => setReturnNote(v.slice(0, NOTE_MAX))} autoComplete="off" />
          ) : (
            <p className="nl-receive-note">{R.returnSkippedNote}</p>
          )}
        </section>
      ) : null}
      <p className="nl-helper">{R.reviewTaxNote}</p>
      <p className="nl-receive-note">{left ? fill(R.leftNote, { items: left }) : R.leftNone}</p>
      <Field id="rc-bill-no" label={R.billNo} helper={R.billNoHelper} value={billNo} onChange={(v) => setBillNo(v.slice(0, 60))} autoComplete="off" />
      <Field id="rc-bill-date" kind="date" label={R.billDate} helper={R.billDateHelper} value={billDate} onChange={setBillDate} />
      <Field id="rc-due-date" kind="date" label={R.dueDate} helper={R.dueHelper} value={dueDate} error={problems.dueDate} onChange={setDueDate} />
      {storeChoices.length >= 2 ? <Select label={R.store} options={[{ value: '', label: R.storeAsOrdered }, ...storeChoices]} value={store} onChange={setStore} /> : null}
    </>
  ) : null;

  const bodies = { choose: chooseStep, items: itemsStep, review: reviewStep };
  const current = step === 'loading' ? 'items' : step;

  return (
    <>
      <FormPage
        title={R.title}
        subtitle={R.subtitle}
        dirty={touched && !saving}
        saving={saving}
        errors={summaryErrors}
        onSave={goNext}
        onCancel={() => (touched ? setAskCancel(true) : navigate(PURCHASES_PATH))}
        saveLabel={step === 'review' ? R.confirm : R.next}
      >
        <Steps step={current} />
        {step === 'loading' ? (
          <p className="nl-helper" role="status">
            {R.loadingOrder}
          </p>
        ) : (
          <>
            {step !== 'choose' ? (
              <div>
                <Button variant="ghost" size="small" icon="chevronLeft" onClick={back}>
                  {R.back}
                </Button>
              </div>
            ) : null}
            {bodies[step]}
            {step === 'choose' && orders.status === 'error' ? <p className="nl-visually-hidden">{fill(R.ordersFailed, { reason: orders.error })}</p> : null}
          </>
        )}
      </FormPage>
      <ConfirmDialog
        open={askCancel}
        title={FT.leave.title}
        message={FT.leave.message}
        confirmLabel={FT.leave.leave}
        cancelLabel={FT.leave.stay}
        destructive
        onConfirm={() => navigate(PURCHASES_PATH)}
        onCancel={() => setAskCancel(false)}
      />
    </>
  );
};

export default ReceiveGoodsPage;
