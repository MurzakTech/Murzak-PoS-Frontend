import React, { useState } from 'react';
import Field from '../components/Field';
import { formatMoney } from '../components/format';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import { saveOpeningCash } from '../../api/setupApi';
import StepFrame from './StepFrame';
import { cashCheck, isPassed } from './setupModel';
import T from './strings.setup';

const C = T.cash;
const STEP = 'cash';
const FIELD_ID = 'setup-opening-cash';

const digitsOf = (amount) => (Number(amount) > 0 ? String(Math.round(Number(amount))) : '');

/**
 * Step 3, the usual opening cash. It is kept for the business as a suggestion: the New look Open till dialog fills it in, and the
 * person opening the till can change it. Empty means no suggestion. No accounting entry is made.
 */
const CashStep = ({ ctx }) => {
  const toast = useToast();
  const [digits, setDigits] = useState(digitsOf(ctx.state.openingCash));
  const [problem, setProblem] = useState('');
  const dirty = digits !== digitsOf(ctx.state.openingCash);

  const save = async () => {
    const { amount, problem: found } = cashCheck(digits);
    if (found) {
      setProblem(C[found]);
      return;
    }
    const result = await saveOpeningCash(amount > 0 ? amount : '', ctx.company);
    toast.success(amount > 0 ? fill(C.saved, { amount: formatMoney(amount) }) : C.savedNone);
    await ctx.complete(STEP, { progress: result, patch: { openingCash: result.openingCash } });
  };

  return (
    <StepFrame ctx={ctx} stepKey={STEP} heading={C.title} help={C.help} dirty={dirty} saved={isPassed(ctx.state, STEP)} errors={problem ? [{ id: FIELD_ID, message: problem }] : []} onSave={save}>
      <Field
        id={FIELD_ID}
        kind="money"
        label={C.amount}
        helper={C.helper}
        value={digits}
        error={problem}
        inputMode="numeric"
        onChange={(v) => {
          setDigits(v);
          setProblem('');
        }}
      />
    </StepFrame>
  );
};

export default CashStep;
