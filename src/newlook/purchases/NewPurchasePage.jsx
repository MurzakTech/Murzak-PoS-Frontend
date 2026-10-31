import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Checkbox from '../components/Checkbox';
import { ConfirmDialog } from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import Segmented from '../components/Segmented';
import Select from '../components/Select';
import Table from '../components/Table';
import { formatMoney } from '../components/format';
import { useToast } from '../components/Toast';
import { FormPage, MoreOptions } from '../forms';
import FT from '../forms/strings.forms';
import fill from '../labels/fill';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { listWarehouses } from '../../store/warehouseSlice';
import { addPurchaseNote, createDirectBill, getProductToBuy, saveOrder } from '../../api/purchasesListApi';
import './purchases.css';
import PurchaseProductPicker from './PurchaseProductPicker';
import { invalidateQuery, usePaymentModes, useSuppliers } from './usePurchasesData';
import {
  addProductLine,
  billRequest,
  checkPurchase,
  decimalOnly,
  defaultMode,
  FIELD_IDS,
  freshForm,
  isDirectBill,
  isDirty,
  isMpesa,
  isoDay,
  lineAmount,
  lineFrom,
  linesTotal,
  MORE_FIELDS,
  newRequestId,
  openAddress,
  orderRequest,
  PRODUCT_NEW_PATH,
  PURCHASES_PATH,
  summaryOf,
} from './purchasesModel';
import T from './strings.purchases';
import { oldScreen } from '../redirects/engine';
import { sellingLocations } from '../till/sellingLocations';

const F = T.form;
const MAX_SEGMENTS = 4;
const LINE_KEY = 'key';

/** Where the keyboard goes for a problem: the field named, or a line's field */
const idFor = (key) => {
  if (key.startsWith('qty:')) return `np-qty-${key.slice(4)}`;
  if (key.startsWith('cost:')) return `np-cost-${key.slice(5)}`;
  return FIELD_IDS[key] || FIELD_IDS.supplier;
};

/** The problem to take the keyboard to: the form top to bottom, then the lines, then the bill options */
const firstProblem = (found) => {
  const top = ['supplier', 'date', 'items'].find((k) => found[k]);
  if (top) return top;
  const line = Object.keys(found).find((k) => k.startsWith('qty:') || k.startsWith('cost:'));
  if (line) return line;
  return ['dueDate', 'paidAmount', 'paidHow', 'paidCode'].find((k) => found[k]) || 'supplier';
};

const LegacyNewPurchase = React.lazy(() => import('../../pages/Purchases/NewPurchase'));

/**
 * The New purchase form (ticket P4-5, acceptance check AC-26): supplier, date, the items (product, quantity, cost each)
 * and, under More options, notes, the store when the shop keeps stock in more than one place, and "I already have the
 * bill" (bill number and dates, and whether it is already paid). Without a held bill it saves as a purchase order that is
 * sent to the supplier (the stock goes up later, in Receive goods); with one it saves a bill and the stock goes up at once.
 * An address with ?item=<product code> starts with that product on the list (the Reorder links use it).
 */
const NewPurchaseForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { warehouses } = useAppSelector((s) => s.warehouse);
  const user = useAppSelector((s) => s.auth.user);
  const company = user && user.company;
  const suppliers = useSuppliers();
  const modesState = usePaymentModes();
  const modes = modesState.status === 'ready' ? modesState.data : [];
  const startItem = new URLSearchParams(location.search).get('item') || '';

  const today = useMemo(() => isoDay(new Date()), []);
  const [values, setValues] = useState(() => freshForm(today));
  const [lines, setLines] = useState([]);
  const [baseline] = useState(() => freshForm(today));
  const [baselineLines, setBaselineLines] = useState([]);
  const [problems, setProblems] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [focusId, setFocusId] = useState(FIELD_IDS.supplier);
  const [itemNotice, setItemNotice] = useState('');
  const requestId = useRef(newRequestId('buy'));
  const sending = useRef(false);

  useEffect(() => {
    if (company) dispatch(listWarehouses({ company, limit: 1000 }));
  }, [dispatch, company]);

  // ?item=<product code>: start with that product, quantity 1 and the cost the shop has on record
  useEffect(() => {
    if (!startItem) return undefined;
    let cancelled = false;
    getProductToBuy(startItem)
      .then((product) => {
        if (cancelled) return;
        if (!product) {
          setItemNotice(F.itemFailed);
          return;
        }
        const start = [lineFrom(product)];
        setLines(start);
        setBaselineLines(start);
        setFocusId(FIELD_IDS.supplier);
      })
      .catch(() => {
        if (!cancelled) setItemNotice(F.itemFailed);
      });
    return () => {
      cancelled = true;
    };
  }, [startItem]);

  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(focusId);
    if (el && el.focus) el.focus();
    setFocusId(null);
  }, [focusId]);

  const dirty = isDirty(values, lines, baseline, baselineLines);

  const set = (key) => (value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setProblems((prev) => {
      if (!prev[key] && !prev.general) return prev;
      const next = { ...prev };
      delete next[key];
      delete next.general;
      return next;
    });
  };
  const clearProblem = (key) =>
    setProblems((prev) => {
      if (!prev[key] && !prev.items) return prev;
      const next = { ...prev };
      delete next[key];
      delete next.items;
      return next;
    });

  const changeLine = (key, patch, problemKey) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    setSaved(false);
    clearProblem(problemKey);
  };
  const removeLine = (line) => {
    setLines((prev) => prev.filter((l) => l.key !== line.key));
    setSaved(false);
    toast.info(fill(F.removed, { name: line.name }));
  };
  const addProduct = (product) => {
    const result = addProductLine(lines, product);
    setLines(result.lines);
    setSaved(false);
    clearProblem('items');
    if (result.merged) toast.info(fill(F.alreadyAdded, { name: product.item_name }));
  };

  const show = (found) => {
    setProblems(found);
    if (MORE_FIELDS.some((key) => found[key])) setForceOpen(true);
    setFocusId(idFor(firstProblem(found)));
  };

  const submit = async () => {
    const found = checkPurchase(values, lines, { modes });
    if (Object.keys(found).length) {
      show(found);
      return;
    }
    if (sending.current) return;
    sending.current = true;
    setProblems({});
    setSaving(true);
    const supplierName = (suppliers.status === 'ready' && (suppliers.data.find((s) => s.id === values.supplier) || {}).name) || values.supplier;
    try {
      if (isDirectBill(values)) {
        const result = await createDirectBill(billRequest(values, lines, requestId.current));
        toast.success(fill(F.savedBill, { number: result.invoice_number }));
        invalidateQuery('purchases');
        invalidateQuery('stock');
        invalidateQuery('products');
        navigate(openAddress(result.invoice));
      } else {
        const result = await saveOrder(orderRequest(values, lines, requestId.current));
        if (values.notes.trim()) {
          try {
            await addPurchaseNote({ id: result.order, doctype: 'Purchase Order', note: values.notes.trim() });
          } catch (noteError) {
            toast.error(F.noteFailed);
          }
        }
        toast.success(fill(result.waitingForApproval ? F.savedApproval : F.savedOrder, { number: result.order, supplier: supplierName }));
        invalidateQuery('purchases');
        invalidateQuery('stock');
        invalidateQuery('products');
        navigate(openAddress(result.order));
      }
    } catch (error) {
      sending.current = false;
      setSaving(false);
      show({ general: fill(F.saveFailed, { reason: error.message }) });
    }
  };

  const errors = useMemo(() => summaryOf(problems, lines), [problems, lines]);
  const total = linesTotal(lines);
  const supplierChoices = suppliers.status === 'ready' && Array.isArray(suppliers.data) ? suppliers.data.map((s) => ({ value: s.id, label: s.name })) : [];
  const storeChoices = sellingLocations(warehouses).map((w) => ({ value: w.name, label: w.warehouse_name || w.name }));
  const modeChoices = modes.map((m) => ({ value: m.name, label: m.name }));
  const cancel = () => (dirty ? setAskCancel(true) : navigate(PURCHASES_PATH));

  const lineColumns = [
    { key: 'name', header: F.columns.product, render: (l) => l.name },
    {
      key: 'qty',
      header: F.columns.quantity,
      render: (l) => (
        <div className="nl-receive-qty">
          <Field
            id={`np-qty-${l.key}`}
            label={fill(F.quantityLabel, { name: l.name })}
            inputMode="decimal"
            value={l.qty}
            error={problems[`qty:${l.key}`]}
            autoComplete="off"
            onChange={(v) => changeLine(l.key, { qty: decimalOnly(v) }, `qty:${l.key}`)}
          />
        </div>
      ),
    },
    {
      key: 'cost',
      header: F.columns.cost,
      render: (l) => (
        <div className="nl-receive-qty">
          <Field
            id={`np-cost-${l.key}`}
            label={fill(F.costLabel, { name: l.name })}
            inputMode="decimal"
            value={l.cost}
            error={problems[`cost:${l.key}`]}
            autoComplete="off"
            onChange={(v) => changeLine(l.key, { cost: decimalOnly(v) }, `cost:${l.key}`)}
          />
        </div>
      ),
    },
    { key: 'amount', header: F.columns.amount, money: true, nowrap: true, render: (l) => formatMoney(lineAmount(l)) },
    { key: 'remove', header: F.columns.remove, render: (l) => <Button variant="ghost" size="small" icon="x" aria-label={fill(F.remove, { name: l.name })} onClick={() => removeLine(l)} /> },
  ];

  return (
    <>
      <FormPage
        title={F.title}
        subtitle={F.subtitle}
        dirty={dirty}
        saved={saved}
        saving={saving}
        errors={errors}
        onSave={submit}
        onCancel={cancel}
        saveLabel={values.haveBill ? F.saveBill : F.saveOrder}
      >
        {suppliers.status === 'error' ? (
          <p className="nl-error" role="alert">
            <Icon name="alert" />
            <span>{F.suppliersFailed}</span>{' '}
            <Button variant="ghost" size="small" onClick={suppliers.reload}>
              {T.panel.retry}
            </Button>
          </p>
        ) : null}
        <Select
          id={FIELD_IDS.supplier}
          label={F.supplier}
          placeholder={F.supplierPlaceholder}
          helper={suppliers.status === 'ready' && supplierChoices.length === 0 ? undefined : F.supplierHelper}
          options={supplierChoices}
          value={values.supplier}
          error={problems.supplier}
          onChange={set('supplier')}
        />
        {suppliers.status === 'ready' && supplierChoices.length === 0 ? (
          <p className="nl-helper">
            {F.noSuppliers} <a href={T.links.suppliers}>{F.addSupplier}</a>
          </p>
        ) : null}
        <Field id={FIELD_IDS.date} kind="date" label={F.date} helper={F.dateHelper} value={values.date} error={problems.date} onChange={set('date')} />

        <section className="nl-newpurchase__items" aria-labelledby="np-items-title">
          <h2 id="np-items-title" className="nl-newpurchase__title">
            {F.itemsTitle}
          </h2>
          <p className="nl-helper">{F.itemsHelp}</p>
          {itemNotice ? (
            <p className="nl-receive-note" role="status">
              {itemNotice}
            </p>
          ) : null}
          <div id={FIELD_IDS.items} tabIndex={-1}>
            {lines.length > 0 ? <Table caption={F.itemsCaption} columns={lineColumns} rows={lines} rowKey={LINE_KEY} /> : <p className="nl-helper">{F.noItems}</p>}
          </div>
          {problems.items ? (
            <p className="nl-error">
              <Icon name="alert" />
              <span>{problems.items}</span>
            </p>
          ) : null}
          <PurchaseProductPicker onAdd={addProduct} />
          <p className="nl-helper">
            <Link className="nl-purchases-link" to={PRODUCT_NEW_PATH}>{F.newProduct}</Link>
          </p>
          <p className="nl-newpurchase__total" role="status">
            <span>{F.total}</span> <strong>{formatMoney(total)}</strong>
          </p>
        </section>

        <MoreOptions key={forceOpen ? 'open' : 'closed'} defaultOpen={forceOpen}>
          <Field id="np-notes" label={F.notes} helper={F.notesHelper} value={values.notes} onChange={(v) => set('notes')(v.slice(0, 500))} autoComplete="off" />
          {storeChoices.length >= 2 ? (
            <Select
              id="np-store"
              label={F.moreStore}
              helper={F.moreStoreHelper}
              options={[{ value: '', label: F.storeDefault }, ...storeChoices]}
              value={values.warehouse}
              onChange={set('warehouse')}
            />
          ) : null}
          <Checkbox id="np-have-bill" label={F.haveBill} checked={values.haveBill} onChange={set('haveBill')} />
          <p className="nl-helper">{F.haveBillHelper}</p>
          <p className="nl-helper">
            {F.earlierScreen} <Link to={oldScreen(T.links.earlierNew)}>{F.earlierScreenLink}</Link>
          </p>
          {values.haveBill ? (
            <div className="nl-newpurchase__bill">
              <Field id={FIELD_IDS.billNo} label={F.billNo} helper={F.billNoHelper} value={values.billNo} onChange={(v) => set('billNo')(v.slice(0, 60))} autoComplete="off" />
              <Field id={FIELD_IDS.billDate} kind="date" label={F.billDate} value={values.billDate} onChange={set('billDate')} />
              <Field id={FIELD_IDS.dueDate} kind="date" label={F.dueDate} helper={F.dueHelper} value={values.dueDate} error={problems.dueDate} onChange={set('dueDate')} />
              <Checkbox
                id="np-paid"
                label={F.paid}
                checked={values.paid}
                onChange={(on) => {
                  setValues((prev) => ({
                    ...prev,
                    paid: on,
                    paidAmount: on && !prev.paidAmount ? String(total || '') : prev.paidAmount,
                    paidHow: on && !prev.paidHow ? defaultMode(modes) : prev.paidHow,
                  }));
                  setSaved(false);
                }}
              />
              {values.paid ? (
                <>
                  <Field
                    id={FIELD_IDS.paidAmount}
                    label={F.paidAmount}
                    inputMode="decimal"
                    value={values.paidAmount}
                    error={problems.paidAmount}
                    autoComplete="off"
                    onChange={(v) => set('paidAmount')(decimalOnly(v))}
                  />
                  {modes.length > 0 ? (
                    modes.length <= MAX_SEGMENTS ? (
                      <div className="nl-purchases-form__method" id={FIELD_IDS.paidHow} tabIndex={-1}>
                        <span className="nl-label" aria-hidden="true">
                          {F.paidHow}
                        </span>
                        <Segmented label={F.paidHow} options={modeChoices} value={values.paidHow} onChange={set('paidHow')} />
                        {problems.paidHow ? (
                          <p className="nl-error">
                            <Icon name="alert" />
                            <span>{problems.paidHow}</span>
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <Select id={FIELD_IDS.paidHow} label={F.paidHow} options={modeChoices} value={values.paidHow} error={problems.paidHow} onChange={set('paidHow')} />
                    )
                  ) : null}
                  {isMpesa(modes, values.paidHow) ? (
                    <Field id={FIELD_IDS.paidCode} label={F.paidCode} value={values.paidCode} error={problems.paidCode} autoComplete="off" onChange={set('paidCode')} />
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </MoreOptions>
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

const NewPurchasePage = () => {
  const location = useLocation();
  const isLegacy = new URLSearchParams(location.search).get('legacy') === '1';

  if (isLegacy) {
    return (
      <React.Suspense fallback={<div className="nl-form-loading" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>{T.loadingEarlier}</div>}>
        <LegacyNewPurchase />
      </React.Suspense>
    );
  }

  return <NewPurchaseForm />;
};

export default NewPurchasePage;
