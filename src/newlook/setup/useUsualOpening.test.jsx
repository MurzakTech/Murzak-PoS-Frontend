/**
 * Ticket P5-4, step 3: the usual opening cash is a suggestion the Open till dialog fills in, only behind the New look switch, only
 * into an amount that is still empty, and never changing what the dialog does when the switch is off. The real dialog
 * (pages/Sales/pos/OpenTill) is used with the same form set-up the till page uses.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFieldArray, useForm } from 'react-hook-form';
import OpenTill from '../../pages/Sales/pos/OpenTill';
import useUsualOpening from './useUsualOpening';

jest.mock('../../components/Common/BrandLogo', () => () => <span>logo</span>);

// The same form as the till page: one Cash row with an opening amount of 0 once the form is reset
const Harness = ({ enabled = true, sessionOpen = false, load }) => {
  const { control, reset, getValues, setValue } = useForm({ defaultValues: { pos_profile: 'Main', company: 'Shop A', user: 'a@x.test', balance_details: [] } });
  const { fields } = useFieldArray({ control, name: 'balance_details' });
  React.useEffect(() => {
    reset({ pos_profile: 'Main', company: 'Shop A', user: 'a@x.test', balance_details: [{ mode_of_payment: 'Cash', opening_amount: 0 }] });
  }, [reset]);
  useUsualOpening({ enabled, company: 'Shop A', sessionOpen, rows: fields.length, getValue: getValues, setValue, load });
  return <OpenTill control={control} fields={fields} errors={{}} paymentModes={['Cash']} onAdd={() => {}} onRemove={() => {}} onSubmit={(e) => e.preventDefault()} loading={false} apiLoading={false} cashierName="Amina" storeName="Duka" currency="KES" onExit={() => {}} openError="" />;
};

const amount = () => screen.getByLabelText('Opening amount');

test('fills in the usual opening cash, and the person can change it', async () => {
  const load = jest.fn().mockResolvedValue({ openingCash: 5000 });
  render(<Harness load={load} />);
  await waitFor(() => expect(amount()).toHaveValue(5000));
  userEvent.clear(amount());
  userEvent.type(amount(), '4200');
  expect(amount()).toHaveValue(4200);
  expect(load).toHaveBeenCalledWith('Shop A');
});

test('without a usual amount the dialog opens as it always did', async () => {
  const load = jest.fn().mockResolvedValue({ openingCash: 0 });
  render(<Harness load={load} />);
  await waitFor(() => expect(load).toHaveBeenCalled());
  expect(amount()).toHaveValue(0);
});

test('with the New look off nothing is asked and nothing is filled in', async () => {
  const load = jest.fn().mockResolvedValue({ openingCash: 5000 });
  render(<Harness enabled={false} load={load} />);
  await screen.findByLabelText('Opening amount');
  expect(load).not.toHaveBeenCalled();
  expect(amount()).toHaveValue(0);
});

test('if the server cannot be asked the dialog opens empty', async () => {
  const load = jest.fn().mockRejectedValue(new Error('offline'));
  render(<Harness load={load} />);
  await waitFor(() => expect(load).toHaveBeenCalled());
  expect(amount()).toHaveValue(0);
});

test('an amount already typed is not replaced', async () => {
  let resolve;
  const load = jest.fn(() => new Promise((r) => { resolve = r; }));
  render(<Harness load={load} />);
  userEvent.clear(await screen.findByLabelText('Opening amount'));
  userEvent.type(amount(), '1500');
  resolve({ openingCash: 5000 });
  await waitFor(() => expect(load).toHaveBeenCalled());
  await new Promise((r) => setTimeout(r, 20));
  expect(amount()).toHaveValue(1500);
});
