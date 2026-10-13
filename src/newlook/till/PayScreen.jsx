import React, { useEffect, useRef, useState } from 'react';
import { Button, Checkbox, Chip, Dialog, Field, Icon, Segmented, Select, formatMoney } from '../components';
import fill from '../labels/fill';
import GatewayPayment from '../../pages/Sales/pos/GatewayPayment';
import NumberPad from './NumberPad';
import T from './strings.pay';
import { bufferAmount, changeState, checkCode, cleanCode, cleanDecimal, formatBuffer, groupChoices, isManual, isMpesaMode, linesNeedingCode, manualGateway, modeForChoice, modeName, mpesaCodeState, nextBuffer, quickCash, round2, choiceOf } from './payModel';
import './pay.css';

const MODE_WORDS = { credit: T.creditName, mpesa: T.mpesaName };
const CHANGE_ICON = { idle: 'info', short: 'alert', give: 'arrowUp', exact: 'check' };
const noteValue = (n) => Number(n).toLocaleString('en-US');
const codeId = (index) => `nlp-code-${index}`;

/** A short message with an icon and words (colour is never the only signal). tone is good, warn or bad. */
const Notice = ({ tone, icon, role, children, action }) => (
  <div className={`nlp-notice is-${tone}`} role={role}>
    <Icon name={icon} />
    <span className="nlp-notice__body">{children}</span>
    {action}
  </div>
);

/** A money box that keeps decimals: the shared Field in text mode, with the typed text kept until it is a different number. */
const AmountField = ({ name, helper, value, onChange, id }) => {
  const [text, setText] = useState(Number(value) ? String(value) : '');
  useEffect(() => {
    if ((parseFloat(text) || 0) !== (Number(value) || 0)) setText(Number(value) ? String(value) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Field
      id={id}
      label={name}
      helper={helper}
      value={text}
      inputMode="decimal"
      autoComplete="off"
      onChange={(typed) => {
        const clean = cleanDecimal(typed);
        setText(clean);
        onChange(clean);
      }}
    />
  );
};

/**
 * The pay screen of the New look (tickets P3-2 and P3-3). It takes exactly the props of the old PaymentPanel
 * (src/pages/Sales/pos/PaymentPanel.jsx) and keeps all it can do: cash with change and short, split payments with the
 * sum and credit checks, credit sales for a registered customer, the loyalty slot, gateway collection, Back to items
 * and Complete sale.
 *
 * Five choices (Cash, M-Pesa, Card, On credit, Other) are made from the Mode of Payment names in paymentModes, which
 * Settings has already filtered. M-Pesa needs a confirmation code (8 to 12 letters and numbers); it is saved on the
 * payment with onSetGateway(index, { confirmed: true, reference: code, label, manual: true }), and Complete sale stays
 * off until every M-Pesa amount above zero has a good code, on top of canComplete.
 */
const PayScreen = ({
  currency,
  total,
  paymentModes = [],
  paymentMode,
  onPaymentModeChange,
  splitPayments,
  setSplitPayments,
  payments = [],
  onUpdatePayment,
  onAddPayment,
  onRemovePayment,
  splitTotal,
  splitValid,
  splitCreditValid,
  amountGiven,
  setAmountGiven,
  creditAmount,
  setCreditAmount,
  creditInfo,
  hasCustomer,
  customerName,
  loyaltySlot,
  canComplete,
  onComplete,
  isCreating,
  onBack,
  onChooseCustomer,
  paymentOptions = {},
  onSetGateway,
  company,
  saleReference,
  customerPhone,
}) => {
  const [buffer, setBuffer] = useState('');
  const [codes, setCodes] = useState({}); // what was typed in each payment line's M-Pesa code field
  const [collectRow, setCollectRow] = useState(null); // the split row being collected in the dialog
  const addButton = useRef(null);

  const groups = groupChoices(paymentModes);
  const choice = choiceOf(paymentMode);
  const activeGroup = groups.find((g) => g.key === choice) || groups[0];
  const isCash = choice === 'cash' && !splitPayments;
  const given = changeState(total, amountGiven);

  // The payment lines the screen is working on: the split rows, or one line for the whole total
  const lines = splitPayments ? payments : [{ mode: paymentMode, amount: total, gateway: payments[0] && payments[0].gateway }];
  // What is in each code field: what was typed, or the code already saved on the payment
  const typedCodes = {};
  lines.forEach((l, i) => {
    typedCodes[i] = codes[i] !== undefined ? codes[i] : isManual(l.gateway) ? l.gateway.reference : '';
  });
  const missingCodes = linesNeedingCode(lines, typedCodes);
  const allowed = Boolean(canComplete) && missingCodes.length === 0;

  // Keep the Customer gives display in step when the parent resets the amount (after a sale)
  useEffect(() => {
    if (!amountGiven && buffer !== '') setBuffer('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountGiven]);

  const commit = (next) => {
    setBuffer(next);
    setAmountGiven(bufferAmount(next));
  };
  const onKey = (k) => commit(nextBuffer(buffer, k));

  // Save a good M-Pesa code on its payment, and take it off again when the code stops being good. A payment the gateway
  // confirmed is left alone.
  const signature = JSON.stringify([lines.map((l) => [l.mode, Number(l.amount) > 0, l.gateway && l.gateway.confirmed, l.gateway && l.gateway.manual, l.gateway && l.gateway.reference]), typedCodes]);
  useEffect(() => {
    if (!onSetGateway) return;
    lines.forEach((line, i) => {
      if (!isMpesaMode(line.mode)) return;
      const gateway = line.gateway;
      if (gateway && gateway.confirmed && !gateway.manual) return;
      const result = checkCode(typedCodes[i]);
      if (result.valid && Number(line.amount) > 0) {
        if (!gateway || !gateway.confirmed || gateway.reference !== result.code) onSetGateway(i, manualGateway(result.code, T.mpesaName));
      } else if (gateway && gateway.manual) {
        onSetGateway(i, null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // A physical keyboard works too: digits, Backspace, and Enter to complete when that is allowed
  useEffect(() => {
    if (!isCash) return undefined;
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      const tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && (t.isContentEditable || (t.getAttribute && t.getAttribute('role') === 'combobox')))) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      if (/^[0-9.]$/.test(e.key)) {
        onKey(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        onKey('back');
      } else if (e.key === 'Enter') {
        // Enter on a pad or quick-cash key completes the sale instead of pressing that key again; on any other control it keeps its own meaning
        const onCashKey = Boolean(t && t.closest && t.closest('.nlp-cash'));
        if ((tag === 'BUTTON' || tag === 'A') && !onCashKey) return;
        if (allowed && !isCreating) {
          e.preventDefault();
          onComplete();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const chooseGroup = (key) => {
    const group = groups.find((g) => g.key === key);
    if (group) onPaymentModeChange(modeForChoice(group, paymentMode));
  };

  const setCode = (index, typed) => setCodes((prev) => ({ ...prev, [index]: cleanCode(typed) }));

  const removeRow = (index) => {
    setCodes((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        const n = Number(k);
        if (n < index) next[n] = prev[k];
        else if (n > index) next[n - 1] = prev[k];
      });
      return next;
    });
    onRemovePayment(index);
    if (addButton.current) addButton.current.focus();
  };

  const gatewayProps = { currency, company, customerPhone, customerName: hasCustomer ? customerName : '' };

  /** The M-Pesa confirmation code field of one payment line */
  const codeField = (index, line) => {
    const state = mpesaCodeState(line.gateway, typedCodes[index]);
    if (state.fromGateway) {
      return <Field id={codeId(index)} label={T.mpesa.codeName} value={state.code} readOnly helper={T.mpesa.fromGateway} onChange={() => {}} />;
    }
    const message = state.problem ? T.mpesa[state.problem] : null;
    return (
      <Field
        id={codeId(index)}
        label={T.mpesa.codeName}
        helper={T.mpesa.codeHelp}
        error={message ? <span role="alert">{message}</span> : undefined}
        value={typedCodes[index] || ''}
        autoComplete="off"
        spellCheck={false}
        onChange={(typed) => setCode(index, typed)}
      />
    );
  };

  const singleOption = paymentOptions[paymentMode];
  const showTerminalNote = !splitPayments && ['card', 'other'].includes(choice) && !singleOption;
  const creditBad = creditInfo && (creditInfo.is_over_limit || creditInfo.available_credit < creditAmount);

  const quick = quickCash(total);
  const gapWords = (() => {
    const gap = round2(total - splitTotal);
    return gap > 0 ? fill(T.splitRows.toGo, { amount: formatMoney(gap) }) : fill(T.splitRows.tooMuch, { amount: formatMoney(-gap) });
  })();

  return (
    <div className="nlp">
      <div className="nlp__scroll">
        <div className="nlp__top">
          <Button variant="ghost" size="till" icon="chevronLeft" onClick={onBack}>
            {T.back}
          </Button>
          <Checkbox label={T.split} checked={Boolean(splitPayments)} onChange={(on) => setSplitPayments(on)} />
        </div>

        <div className={['nlp__grid', isCash && 'has-pad'].filter(Boolean).join(' ')}>
          <div className="nlp__main">
            <div className="nlp-due">
              <span className="nlp-label">{T.amountDue}</span>
              <span className="nlp-due__amount">{formatMoney(total)}</span>
            </div>

            {loyaltySlot}

            {!splitPayments && groups.length > 0 ? (
              <div className="nlp-choices">
                <Segmented label={T.choiceGroup} value={activeGroup.key} onChange={chooseGroup} options={groups.map((g) => ({ value: g.key, label: T.choices[g.key] }))} />
                {activeGroup.modes.length > 1 ? (
                  <Select
                    label={T.otherWhich}
                    value={activeGroup.modes.includes(paymentMode) ? paymentMode : activeGroup.modes[0]}
                    onChange={onPaymentModeChange}
                    options={activeGroup.modes.map((m) => ({ value: m, label: modeName(m, activeGroup.modes, MODE_WORDS) }))}
                  />
                ) : null}
              </div>
            ) : null}

            {/* Cash */}
            {isCash ? (
              <div className="nlp-cash">
                <div>
                  <span className="nlp-label" id="nlp-gives-label">
                    {T.cash.gives}
                  </span>
                  <div className="nlp-given" role="status" aria-labelledby="nlp-gives-label">
                    <span className="nlp-given__currency">{currency || 'KES'}</span>
                    <span className={buffer === '' ? 'nlp-given__value is-empty' : 'nlp-given__value'}>{buffer === '' ? T.cash.givesNothing : formatBuffer(buffer)}</span>
                  </div>
                </div>
                <div className="nlp-quick" role="group" aria-label={T.cash.quickGroup}>
                  {quick.map((q) => (
                    <Button
                      key={`${q.kind}-${q.value}`}
                      variant="secondary"
                      size="till"
                      className={amountGiven === q.value ? 'nlp-quick__button is-on' : 'nlp-quick__button'}
                      aria-pressed={amountGiven === q.value}
                      aria-label={q.kind === 'exact' ? fill(T.cash.exactButton, { amount: formatMoney(q.value) }) : fill(T.cash.amountButton, { amount: formatMoney(q.value) })}
                      onClick={() => commit(String(q.value))}
                    >
                      {q.kind === 'exact' ? T.cash.exact : noteValue(q.value)}
                    </Button>
                  ))}
                </div>
                <div className={`nlp-change is-${given.state}`} role="status">
                  <span className="nlp-change__word">
                    <Icon name={CHANGE_ICON[given.state]} />
                    {given.state === 'idle' ? T.change.idle : given.state === 'short' ? T.change.short : given.state === 'give' ? T.change.give : T.change.exact}
                  </span>
                  <span className="nlp-change__value">
                    {given.state === 'idle' ? T.change.idleValue : given.state === 'short' ? formatMoney(given.short) : given.state === 'give' ? formatMoney(given.change) : T.change.noChange}
                  </span>
                </div>
              </div>
            ) : null}

            {/* M-Pesa, one payment */}
            {!splitPayments && choice === 'mpesa' ? (
              <div className="nlp-stack">
                {codeField(0, lines[0])}
                {singleOption ? (
                  <>
                    <h3 className="nlp-subhead">{T.mpesa.requestHeading}</h3>
                    <GatewayPayment
                      key={paymentMode}
                      kind={singleOption.gateway}
                      option={singleOption}
                      mode={paymentMode}
                      amount={total}
                      value={isManual(lines[0].gateway) ? undefined : lines[0].gateway}
                      onChange={(v) => onSetGateway(0, v)}
                      saleReference={`${saleReference}-0`}
                      {...gatewayProps}
                    />
                  </>
                ) : null}
              </div>
            ) : null}

            {/* Pesapal, PayPal, bank and other gateway methods: collected through the gateway */}
            {!splitPayments && choice !== 'mpesa' && choice !== 'credit' && singleOption ? (
              <div className="nlp-stack">
                <GatewayPayment
                  key={paymentMode}
                  kind={singleOption.gateway}
                  option={singleOption}
                  mode={paymentMode}
                  amount={total}
                  value={payments[0] && payments[0].gateway}
                  onChange={(v) => onSetGateway(0, v)}
                  saleReference={`${saleReference}-0`}
                  {...gatewayProps}
                />
              </div>
            ) : null}

            {showTerminalNote ? (
              <Notice tone="good" icon="info">
                {fill(T.other.terminal, { amount: formatMoney(total), method: modeName(paymentMode, paymentModes, MODE_WORDS) })}
              </Notice>
            ) : null}

            {/* On credit */}
            {!splitPayments && choice === 'credit' ? (
              <div className="nlp-stack">
                {!hasCustomer ? (
                  <Notice
                    tone="warn"
                    icon="alert"
                    role="alert"
                    action={
                      onChooseCustomer ? (
                        <Button variant="secondary" size="till" onClick={onChooseCustomer}>
                          {T.credit.chooseCustomer}
                        </Button>
                      ) : null
                    }
                  >
                    {T.credit.needsCustomer}
                  </Notice>
                ) : (
                  <>
                    <AmountField name={T.credit.amountName} helper={fill(T.credit.upTo, { amount: formatMoney(total) })} value={creditAmount} onChange={(v) => setCreditAmount(Math.max(0, parseFloat(v) || 0))} />
                    {creditInfo ? (
                      <Notice tone={creditBad ? 'bad' : 'good'} icon={creditBad ? 'alert' : 'check'} role={creditBad ? 'alert' : 'status'}>
                        {fill(T.credit.info, {
                          name: customerName,
                          limit: formatMoney(creditInfo.credit_limit),
                          owed: formatMoney(creditInfo.outstanding_amount),
                          available: formatMoney(creditInfo.available_credit),
                        })}
                        {creditInfo.is_over_limit ? `. ${T.credit.overLimit}` : ''}
                      </Notice>
                    ) : (
                      <Notice tone="warn" icon="alert" role="alert">
                        {T.credit.notLoaded}
                      </Notice>
                    )}
                  </>
                )}
              </div>
            ) : null}

            {/* Split payments */}
            {splitPayments ? (
              <div className="nlp-stack" role="group" aria-label={T.splitRows.group}>
                {payments.map((p, idx) => {
                  const n = idx + 1;
                  const option = paymentOptions[p.mode];
                  const live = Number(p.amount) > 0;
                  const collected = p.gateway && p.gateway.confirmed && !p.gateway.manual;
                  return (
                    <div key={`payment-${idx}`} className="nlp-row" role="group" aria-label={fill(T.splitRows.row, { n })}>
                      <Select
                        label={fill(T.splitRows.methodName, { n })}
                        value={p.mode}
                        onChange={(m) => onUpdatePayment(idx, 'mode', m)}
                        options={paymentModes.map((m) => ({ value: m, label: modeName(m, paymentModes, MODE_WORDS) }))}
                      />
                      <AmountField name={fill(T.splitRows.amountName, { n })} value={p.amount} onChange={(v) => onUpdatePayment(idx, 'amount', v)} />
                      <Button variant="danger" size="till" icon="x" aria-label={T.splitRows.remove} disabled={payments.length <= 1} onClick={() => removeRow(idx)} />
                      {isMpesaMode(p.mode) && live ? <div className="nlp-row__wide">{codeField(idx, p)}</div> : null}
                      {option && live ? (
                        <div className="nlp-row__wide">
                          {collected ? (
                            <span className="nlp-received">
                              <Chip icon="check">{p.gateway.reference ? fill(T.mpesa.receivedRef, { method: p.gateway.label, reference: p.gateway.reference }) : fill(T.mpesa.received, { method: p.gateway.label })}</Chip>
                              {p.gateway.transactionId ? null : (
                                <Button variant="ghost" size="small" onClick={() => onSetGateway(idx, null)}>
                                  {T.mpesa.undo}
                                </Button>
                              )}
                            </span>
                          ) : (
                            <Button variant="secondary" size="till" onClick={() => setCollectRow(idx)}>
                              {fill(T.splitRows.collect, { amount: formatMoney(p.amount), method: modeName(p.mode, paymentModes, MODE_WORDS) })}
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                <Dialog
                  open={collectRow !== null && Boolean(payments[collectRow])}
                  onClose={() => setCollectRow(null)}
                  title={collectRow !== null && payments[collectRow] ? fill(T.splitRows.collectDialog, { amount: formatMoney(payments[collectRow].amount), method: modeName(payments[collectRow].mode, paymentModes, MODE_WORDS) }) : ''}
                >
                  {collectRow !== null && payments[collectRow] ? (
                    <GatewayPayment
                      kind={paymentOptions[payments[collectRow].mode] && paymentOptions[payments[collectRow].mode].gateway}
                      option={paymentOptions[payments[collectRow].mode]}
                      mode={payments[collectRow].mode}
                      amount={Number(payments[collectRow].amount)}
                      value={isManual(payments[collectRow].gateway) ? undefined : payments[collectRow].gateway}
                      saleReference={`${saleReference}-${collectRow}`}
                      onChange={(v) => {
                        onSetGateway(collectRow, v);
                        if (v && v.confirmed) setCollectRow(null);
                      }}
                      {...gatewayProps}
                    />
                  ) : null}
                </Dialog>

                <div>
                  <Button ref={addButton} variant="secondary" size="till" icon="plus" onClick={onAddPayment}>
                    {T.splitRows.add}
                  </Button>
                </div>
                {splitValid ? (
                  <Notice tone="good" icon="check" role="status">
                    {T.splitRows.addsUp}
                  </Notice>
                ) : (
                  <Notice tone="warn" icon="alert" role="status">
                    {fill(T.splitRows.notAddsUp, { split: formatMoney(splitTotal), total: formatMoney(total), gap: gapWords })}
                  </Notice>
                )}
                {!splitCreditValid ? (
                  <Notice tone="bad" icon="alert" role="alert">
                    {T.splitRows.creditProblem}
                  </Notice>
                ) : null}
              </div>
            ) : null}
          </div>

          {isCash ? (
            <div className="nlp__side nlp-cash">
              <NumberPad onKey={onKey} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="nlp__footer">
        <Button className="nlp-complete" variant="primary" size="till" icon="check" loading={Boolean(isCreating)} disabled={!allowed && !isCreating} onClick={onComplete}>
          {isCreating ? T.processing : T.complete}
        </Button>
      </div>
    </div>
  );
};

export default PayScreen;
