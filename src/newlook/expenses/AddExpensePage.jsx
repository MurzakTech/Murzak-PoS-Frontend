import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Checkbox from '../components/Checkbox';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import Icon from '../components/Icon';
import Select from '../components/Select';
import { SkeletonText } from '../components/Skeleton';
import { formatMoney } from '../components/format';
import { useToast } from '../components/Toast';
import { FormPage, MoreOptions } from '../forms';
import { PageHeader } from '../shell';
import fill from '../labels/fill';
import { createExpense } from '../../api/expensesApi';
import { useAppSelector } from '../../store/hooks';
import './expenses.css';
import ExpensesGate from './ExpensesGate';
import { invalidateQuery, useExpenseOptions } from './useExpensesData';
import {
  categoryChoices,
  checkExpense,
  defaultPaidFrom,
  expenseRequest,
  FIELD_IDS,
  firstProblem,
  freshForm,
  isCash,
  isDirty,
  LIST_PATH,
  MAX_NOTE,
  MAX_RECEIPT_BYTES,
  megabytes,
  MORE_FIELDS,
  newRequestId,
  paidFromChoices,
  readAsDataUrl,
  reasonWords,
  RECEIPT_INPUT,
  receiptProblem,
  serverProblem,
  summaryOf,
} from './expensesModel';
import T from './strings.expenses';

const F = T.form;

/** The optional receipt photo: choose, see it, take it away. The photo is checked here (picture, 5 MB) and again by the server. */
const ReceiptPicker = ({ receipt, error, reading, onChoose, onRemove }) => {
  const input = useRef(null);
  return (
    <div className="nl-expense-receipt">
      <span className="nl-label">{F.receipt}</span>
      <p className="nl-helper">{fill(F.receiptHelp, { size: megabytes(MAX_RECEIPT_BYTES) })}</p>
      <input {...RECEIPT_INPUT} ref={input} hidden aria-label={F.receipt} onChange={onChoose} />
      <div className="nl-expense-receipt__row">
        <Button id={FIELD_IDS.receipt} variant="secondary" icon="receipt" loading={reading} onClick={() => input.current && input.current.click()} aria-describedby={error ? 'ex-receipt-error' : undefined}>
          {receipt ? F.receiptChange : F.receiptChoose}
        </Button>
        {receipt ? (
          <Button variant="ghost" icon="x" onClick={onRemove}>
            {F.receiptRemove}
          </Button>
        ) : null}
      </div>
      {reading ? (
        <p className="nl-helper" role="status">
          {F.receiptReading}
        </p>
      ) : null}
      {receipt ? (
        <figure className="nl-expense-receipt__figure">
          <img className="nl-expense-receipt__image" src={receipt.dataUrl} alt={F.receiptPreview} />
          <figcaption className="nl-helper">{fill(F.receiptName, { name: receipt.name, size: megabytes(receipt.size) })}</figcaption>
        </figure>
      ) : null}
      {error ? (
        <p id="ex-receipt-error" className="nl-error">
          <Icon name="alert" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
};

/**
 * The Add expense form (ticket P5-1, acceptance check AC-30), on the shared Form page: amount in shillings, category, paid from (Cash,
 * M-Pesa or Bank), date and note come first, and the optional receipt photo sits under More options. "Not saved yet" until a real
 * save; leaving with changes asks first; errors show beside the field and in the summary at the top.
 *
 * Saving makes one entry in the books: the money goes out of the paid-from account and into the category, so Net profit on Home falls by
 * the amount. Save and add another keeps the category, what it was paid from and the date, and clears the amount, note and photo. One
 * request id belongs to each expense, so a second tap on Save or a retry after a bad connection never records it twice.
 */
const ExpenseFormBody = ({ options, company }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const back = useRef(null);
  const requestId = useRef(newRequestId());
  const sending = useRef(false);
  // The form starts with today (the shop's date) and the first way of paying the shop can use
  const [values, setValues] = useState(() => freshForm({ today: options.today, paidFrom: defaultPaidFrom(options.paidFrom) }));
  const [start, setStart] = useState(() => freshForm({ today: options.today, paidFrom: defaultPaidFrom(options.paidFrom) }));
  const [problems, setProblems] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reading, setReading] = useState(false);
  const [focusKey, setFocusKey] = useState('');
  const [forceOpen, setForceOpen] = useState(false);
  const [fromTill, setFromTill] = useState(true); // a cash expense comes out of the open till's drawer unless this is unticked

  const { today, paidFrom } = options;

  useEffect(() => {
    if (!focusKey) return;
    const el = document.getElementById(FIELD_IDS[focusKey]);
    if (el && el.focus) el.focus();
    setFocusKey('');
  }, [focusKey]);

  const dirty = isDirty(values, start);
  const set = (key) => (value) => {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
    setProblems((p) => {
      if (!p[key] && !p.general) return p;
      const next = { ...p };
      delete next[key];
      delete next.general;
      return next;
    });
  };

  const choosePhoto = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = ''; // so the same photo can be chosen again after it was removed
    if (!file) return;
    const problem = receiptProblem(file);
    if (problem) {
      setValues((v) => ({ ...v, receipt: null }));
      setProblems((p) => ({ ...p, receipt: problem }));
      return;
    }
    setReading(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      setValues((v) => ({ ...v, receipt: { name: file.name, size: file.size, dataUrl } }));
      setSaved(false);
      setProblems((p) => {
        const next = { ...p };
        delete next.receipt;
        return next;
      });
    } catch (e) {
      setProblems((p) => ({ ...p, receipt: e.message }));
    } finally {
      setReading(false);
    }
  };
  const removePhoto = () => {
    setValues((v) => ({ ...v, receipt: null }));
    setSaved(false);
    setProblems((p) => {
      const next = { ...p };
      delete next.receipt;
      return next;
    });
  };

  const show = (found) => {
    setProblems(found);
    if (MORE_FIELDS.some((key) => found[key])) setForceOpen(true);
    setFocusKey(firstProblem(found));
  };

  const submit = async (andAdd) => {
    if (sending.current) return;
    const found = checkExpense(values, today);
    if (problems.receipt) found.receipt = problems.receipt; // a photo that was refused stays a problem until it is removed or replaced
    if (Object.keys(found).length) {
      show(found);
      return;
    }
    sending.current = true;
    setProblems({});
    setSaving(true);
    try {
      const reply = await createExpense(expenseRequest({ ...values, fromTill }, requestId.current, company));
      invalidateQuery('expenses');
      invalidateQuery();
      const savedWords = fill(andAdd ? F.savedAdd : F.saved, { amount: formatMoney(values.amount) });
      toast.success(reply && reply.till && reply.till.cashInTill !== null ? `${savedWords} ${fill(F.savedFromTill, { amount: formatMoney(reply.till.cashInTill) })}` : savedWords);
      setSaved(true);
      requestId.current = newRequestId();
      if (andAdd) {
        const fresh = freshForm({ today, category: values.category, paidFrom: values.paidFrom });
        fresh.date = values.date;
        setValues(fresh);
        setStart(fresh);
        setFocusKey('amount');
      } else {
        setStart(values);
        navigate(LIST_PATH);
      }
    } catch (e) {
      const problem = serverProblem(e);
      show(problem.field ? { [problem.field]: problem.message } : { general: problem.message });
      if (!problem.field) toast.error(problem.message);
    } finally {
      sending.current = false;
      setSaving(false);
    }
  };

  const { categories } = options;
  const unavailable = paidFrom.filter((p) => !p.available);
  const paidHelper = unavailable.length ? unavailable.map(reasonWords).join(' ') : F.paidFromHelp;
  const errorList = summaryOf(problems);
  const left = MAX_NOTE - values.note.length;

  return (
    <FormPage title={F.newTitle} subtitle={F.newSubtitle} dirty={dirty} saved={saved} saving={saving} errors={errorList} saveLabel={F.save} onSave={() => submit(false)} onSaveAndAdd={() => submit(true)} onCancel={() => back.current && back.current.click()}>
      <Link ref={back} to={LIST_PATH} className="nl-expense-form__back">
        {F.backToList}
      </Link>
      {problems.general ? (
        <p className="nl-error" role="alert">
          <Icon name="alert" />
          <span>{problems.general}</span>
        </p>
      ) : null}
      {categories.length === 0 ? (
        <p className="nl-expense-form__notice" role="status">
          {F.noCategories}
        </p>
      ) : null}
      {paidFrom.every((p) => !p.available) ? (
        <p className="nl-expense-form__notice" role="status">
          {F.noPaidFrom}
        </p>
      ) : null}
      <Field id={FIELD_IDS.amount} kind="money" label={F.amount} helper={F.amountHelp} value={values.amount} error={problems.amount} aria-required={true} onChange={set('amount')} />
      <Select id={FIELD_IDS.category} label={F.category} placeholder={F.categoryPlaceholder} helper={F.categoryHelp} options={categoryChoices(categories)} value={values.category} error={problems.category} onChange={set('category')} />
      <Select id={FIELD_IDS.paidFrom} label={F.paidFrom} helper={paidHelper} options={paidFromChoices(paidFrom)} value={values.paidFrom} error={problems.paidFrom} onChange={set('paidFrom')} />
      {isCash(values.paidFrom) ? <Checkbox label={F.fromTill} checked={fromTill} onChange={setFromTill} /> : null}
      {isCash(values.paidFrom) ? <p className="nl-helper">{F.fromTillHelp}</p> : null}
      <Field id={FIELD_IDS.date} kind="date" label={F.date} helper={F.dateHelp} value={values.date} error={problems.date} onChange={set('date')} />
      <Field id={FIELD_IDS.note} label={F.note} helper={fill(F.noteHelp, { max: MAX_NOTE, left: Math.max(left, 0) })} value={values.note} error={problems.note} autoComplete="off" onChange={set('note')} />
      <MoreOptions key={forceOpen ? 'open' : 'closed'} defaultOpen={forceOpen}>
        <ReceiptPicker receipt={values.receipt} error={problems.receipt} reading={reading} onChoose={choosePhoto} onRemove={removePhoto} />
      </MoreOptions>
    </FormPage>
  );
};

/** Waits for the choices, then draws the form with them (so the form never starts with an empty date) */
const AddExpenseForm = () => {
  const user = useAppSelector((st) => st.auth.user);
  const company = user && user.company;
  const options = useExpenseOptions(company);
  if (options.status === 'error') {
    return (
      <div className="nl-expense-form-state">
        <PageHeader title={F.newTitle} subtitle={F.newSubtitle} />
        <EmptyState icon="alert" tone="error" title={F.optionsFailed} description={options.error} action={{ label: F.retry, onClick: options.reload }} />
      </div>
    );
  }
  if (options.status !== 'ready') {
    return (
      <div className="nl-expense-form-state">
        <PageHeader title={F.newTitle} subtitle={F.newSubtitle} />
        <SkeletonText lines={5} />
      </div>
    );
  }
  return <ExpenseFormBody options={options.data} company={company} />;
};

const AddExpensePage = () => (
  <ExpensesGate>
    <AddExpenseForm />
  </ExpensesGate>
);

export default AddExpensePage;
