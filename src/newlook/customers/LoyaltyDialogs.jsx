import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import { formatMoney } from '../components/format';
import Select from '../components/Select';
import Table from '../components/Table';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import S from '../strings';
import { assignLoyaltyProgram, getPointsHistory, listLoyaltyPrograms, redeemPoints } from '../../api/customersListApi';
import { dayNumbers } from './customersModel';
import { useFetched } from './useCustomersData';
import T from './strings.customers';

const L = T.loyalty;

/** Choose the loyalty programme a customer earns points on (the current assign call; programmes themselves are set up in Settings) */
export const AssignDialog = ({ open, customer, company, onClose, onDone }) => {
  const toast = useToast();
  const [programs, setPrograms] = useState(null);
  const [chosen, setChosen] = useState('');
  const [problem, setProblem] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    setChosen('');
    setProblem('');
    setPrograms(null);
    listLoyaltyPrograms(company)
      .then((list) => live && setPrograms(list))
      .catch((e) => {
        if (live) {
          setPrograms([]);
          toast.error(e.message);
        }
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, company]);

  const save = async () => {
    if (!chosen) {
      setProblem(L.assignNeed);
      return;
    }
    setSaving(true);
    try {
      await assignLoyaltyProgram({ customer: customer.id, program: chosen, company });
      const title = (programs.find((p) => p.name === chosen) || {}).title || chosen;
      toast.success(fill(L.assignDone, { name: customer.name, programme: title }));
      onDone();
    } catch (e) {
      toast.error(e.message || L.failed);
    } finally {
      setSaving(false);
    }
  };

  const options = (programs || []).map((p) => ({ value: p.name, label: fill(p.active ? L.assignActive : L.assignInactive, { title: p.title }) }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={saving}
      title={L.assignTitle}
      description={fill(L.assignDescription, { name: customer.name })}
      footer={
        <>
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            {L.cancel}
          </Button>
          <Button loading={saving} disabled={programs !== null && programs.length === 0} onClick={save}>
            {L.assignSave}
          </Button>
        </>
      }
    >
      {programs !== null && programs.length === 0 ? (
        <p>{L.assignNone}</p>
      ) : (
        <Select label={L.assignLabel} placeholder={L.assignPlaceholder} options={options} value={chosen} error={problem} onChange={(v) => { setChosen(v); setProblem(''); }} />
      )}
    </Dialog>
  );
};

/** Use up some of the customer's points (the current redeem call) */
export const RedeemDialog = ({ open, customer, company, points, onClose, onDone }) => {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [problem, setProblem] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount('');
      setReference('');
      setProblem('');
    }
  }, [open]);

  const save = async () => {
    const n = Number(amount);
    if (!amount || !Number.isInteger(n) || n <= 0) {
      setProblem(L.redeemNeed);
      return;
    }
    if (n > points) {
      setProblem(fill(L.redeemTooMany, { points: points.toLocaleString('en-US') }));
      return;
    }
    setProblem('');
    setSaving(true);
    try {
      const done = await redeemPoints({ customer: customer.id, points: n, reference: reference.trim(), company });
      toast.success(fill(L.redeemDone, { points: done.redeemed.toLocaleString('en-US'), remaining: done.remaining.toLocaleString('en-US') }));
      onDone();
    } catch (e) {
      toast.error(e.message || L.failed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={saving}
      title={L.redeemTitle}
      description={fill(L.redeemDescription, { name: customer.name, points: Number(points).toLocaleString('en-US') })}
      footer={
        <>
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            {L.cancel}
          </Button>
          <Button loading={saving} onClick={save}>
            {L.redeemSave}
          </Button>
        </>
      }
    >
      <div className="nl-customer-panel__stack">
        <Field label={L.redeemLabel} inputMode="numeric" data-autofocus="" error={problem} value={amount} onChange={(v) => setAmount(v.replace(/\D/g, ''))} />
        <Field label={L.redeemReference} helper={L.redeemReferenceHelp} value={reference} onChange={setReference} />
      </div>
    </Dialog>
  );
};

const KINDS = () => [
  { value: '', label: L.historyAll },
  { value: 'earn', label: L.historyEarn },
  { value: 'redeem', label: L.historyRedeem },
];

/** The points the customer earned and used (the current history call), with From, To and the kind of movement */
export const HistoryDialog = ({ open, customer, company, onClose }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [kind, setKind] = useState('');
  const history = useFetched(`${customer.id}|${company}|${from}|${to}|${kind}`, () => getPointsHistory({ customer: customer.id, company, from, to, type: kind }), open);
  const rows = history.status === 'ready' ? history.data.rows.map((r, i) => ({ ...r, id: `${r.name || i}` })) : [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={L.historyTitle}
      description={fill(L.historyDescription, { name: customer.name })}
      footer={<Button onClick={onClose}>{L.close}</Button>}
    >
      <div className="nl-customer-panel__stack">
        <div className="nl-customer-panel__dates">
          <Field kind="date" label={L.historyFrom} value={from} onChange={setFrom} />
          <Field kind="date" label={L.historyTo} value={to} error={from && to && to < from ? S.components.filterRow.rangeError : undefined} onChange={setTo} />
        </div>
        <Select label={L.historyKind} options={KINDS()} value={kind} onChange={setKind} />
        <Table
          caption={fill(L.historyCaption, { name: customer.name })}
          columns={[
            { key: 'date', header: L.historyColumns.date, nowrap: true, render: (r) => dayNumbers(r.date) },
            { key: 'kind', header: L.historyColumns.kind, render: (r) => L.historyKinds[r.transaction_type] || r.transaction_type },
            { key: 'points', header: L.historyColumns.points, align: 'right', render: (r) => Number(r.points_earned).toLocaleString('en-US') },
            { key: 'purchase', header: L.historyColumns.purchase, money: true, nowrap: true, render: (r) => (Number(r.purchase_amount) ? formatMoney(r.purchase_amount) : T.noValue) },
            { key: 'reference', header: L.historyColumns.reference, render: (r) => r.reference_document || T.noValue },
          ]}
          rows={rows}
          loading={history.status === 'loading'}
          error={history.status === 'error'}
          onRetry={history.reload}
          skeletonRows={3}
          empty={{ icon: 'inbox', title: L.historyEmpty }}
        />
      </div>
    </Dialog>
  );
};
