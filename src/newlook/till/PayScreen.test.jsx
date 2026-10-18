/* eslint-disable testing-library/no-node-access, testing-library/no-container --
   Two checks need structure no role query can express: that an icon sits beside the Change words, and that the
   stylesheet gives the pad keys the till height. */
/**
 * Pay screen (P3-2, P3-3). AC-19: five choices, Cash and M-Pesa first, quick cash up to 2,000, pad and Change on screen.
 * AC-20: an M-Pesa payment needs a confirmation code, saved on the payment; a blank code blocks Complete sale and says why.
 * A small parent stands in for the till: it keeps the same state and rules as NewSale (a changed method or amount
 * clears the gateway; canComplete needs the cash given to cover the total).
 */
import React, { useState } from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PayScreen from './PayScreen';

jest.mock('../../pages/Sales/pos/GatewayPayment', () => (props) => (
  <div data-testid="gateway">
    <span>{`gateway for ${props.mode} value ${props.value ? props.value.reference || 'confirmed' : 'none'}`}</span>
    <button type="button" onClick={() => props.onChange({ confirmed: true, reference: 'GW12345678', label: 'M-Pesa', transactionId: 'tx1', amount: props.amount })}>
      confirm at gateway
    </button>
  </div>
));

const ALL_MODES = ['Cash', 'Mpesa', 'Credit Card', 'Credit', 'Bank Draft'];

const Till = ({ total = 350, modes = ALL_MODES, startMode = 'Cash', startSplit = false, startPayments, canCompleteOverride, spies = {}, ...extra }) => {
  const [mode, setMode] = useState(startMode);
  const [split, setSplit] = useState(startSplit);
  const [given, setGiven] = useState(0);
  const [credit, setCredit] = useState(0);
  const [payments, setPayments] = useState(startPayments || [{ mode: startMode, amount: total }]);
  const setPayment = (rows) => setPayments(rows);

  const splitTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const base = split ? Math.abs(splitTotal - total) < 0.01 : mode === 'Cash' ? given >= total : mode === 'Credit' ? credit > 0 : true;
  const canComplete = canCompleteOverride !== undefined ? canCompleteOverride : base;

  const props = {
    currency: 'KES',
    total,
    paymentModes: modes,
    paymentMode: mode,
    onPaymentModeChange: (m) => {
      spies.onPaymentModeChange && spies.onPaymentModeChange(m);
      setMode(m);
      setPayments([{ mode: m, amount: total }]);
    },
    splitPayments: split,
    setSplitPayments: (v) => {
      spies.setSplitPayments && spies.setSplitPayments(v);
      setSplit(v);
    },
    payments,
    onUpdatePayment: (i, field, value) => setPayment(payments.map((p, k) => (k === i ? { ...p, [field]: field === 'amount' ? Math.max(0, Number(value) || 0) : value, gateway: undefined } : p))),
    onAddPayment: () => setPayment([...payments, { mode: 'Cash', amount: 0 }]),
    onRemovePayment: (i) => setPayment(payments.length > 1 ? payments.filter((_, k) => k !== i) : payments),
    splitTotal,
    splitValid: Math.abs(splitTotal - total) < 0.01,
    splitCreditValid: true,
    amountGiven: given,
    setAmountGiven: (v) => {
      spies.setAmountGiven && spies.setAmountGiven(v);
      setGiven(v);
    },
    creditAmount: credit,
    setCreditAmount: setCredit,
    creditInfo: null,
    hasCustomer: false,
    customerName: '',
    loyaltySlot: null,
    canComplete,
    onComplete: spies.onComplete || jest.fn(),
    isCreating: false,
    onBack: spies.onBack || jest.fn(),
    onChooseCustomer: spies.onChooseCustomer,
    paymentOptions: {},
    onSetGateway: (i, g) => {
      spies.onSetGateway && spies.onSetGateway(i, g);
      setPayments((prev) => prev.map((p, k) => (k === i ? { ...p, gateway: g || undefined } : p)));
    },
    company: 'Demo Shop',
    saleReference: 'SALE-1',
    customerPhone: '0712345678',
    ...extra,
  };
  return <PayScreen {...props} />;
};

const complete = () => screen.getByRole('button', { name: /complete sale|processing/i });
const choiceNames = () => within(screen.getByRole('radiogroup', { name: /how is the customer paying/i })).getAllByRole('radio').map((r) => r.textContent);

describe('the five choices (AC-19)', () => {
  test('are Cash, M-Pesa, Card, On credit and Other, with Cash and M-Pesa first', () => {
    render(<Till modes={['Credit', 'Bank Draft', 'Credit Card', 'Mpesa', 'Cash']} />);
    expect(choiceNames()).toEqual(['Cash', 'M-Pesa', 'Card', 'On credit', 'Other']);
  });

  test('shows only the choices Settings switched on', () => {
    render(<Till modes={['Cash', 'Mpesa']} />);
    expect(choiceNames()).toEqual(['Cash', 'M-Pesa']);
  });

  test('choosing a choice gives the real mode name', async () => {
    const onPaymentModeChange = jest.fn();
    render(<Till spies={{ onPaymentModeChange }} />);
    await userEvent.click(screen.getByRole('radio', { name: 'M-Pesa' }));
    expect(onPaymentModeChange).toHaveBeenLastCalledWith('Mpesa');
    await userEvent.click(screen.getByRole('radio', { name: 'Card' }));
    expect(onPaymentModeChange).toHaveBeenLastCalledWith('Credit Card');
    await userEvent.click(screen.getByRole('radio', { name: 'On credit' }));
    expect(onPaymentModeChange).toHaveBeenLastCalledWith('Credit');
  });

  test('Other with several modes asks which one and passes the real name', async () => {
    const onPaymentModeChange = jest.fn();
    render(<Till modes={['Cash', 'Bank Draft', 'Cheque']} startMode="Bank Draft" spies={{ onPaymentModeChange }} />);
    expect(screen.getByRole('radio', { name: 'Other' })).toBeChecked();
    const which = screen.getByRole('combobox', { name: /which method/i });
    expect(which).toHaveTextContent('Bank Draft');
    await userEvent.click(which);
    await userEvent.click(screen.getByRole('option', { name: 'Cheque' }));
    expect(onPaymentModeChange).toHaveBeenLastCalledWith('Cheque');
  });

  test('a choice with one mode asks nothing more', () => {
    render(<Till modes={['Cash', 'Bank Draft']} startMode="Bank Draft" />);
    expect(screen.queryByRole('combobox', { name: /which method/i })).not.toBeInTheDocument();
  });

  test('shows the amount due as KES with a thousands comma', () => {
    render(<Till total={2350} />);
    expect(screen.getByText('KES 2,350')).toBeInTheDocument();
    expect(screen.getByText(/amount due/i)).toBeInTheDocument();
  });

  test('shows the loyalty slot', () => {
    render(<Till loyaltySlot={<p>Loyalty points here</p>} />);
    expect(screen.getByText('Loyalty points here')).toBeInTheDocument();
  });
});

describe('cash: quick cash, pad and Change (AC-19)', () => {
  test('quick cash includes 2,000 for a small total and for a big one', () => {
    const { unmount } = render(<Till total={350} />);
    const group = screen.getByRole('group', { name: /quick cash/i });
    expect(within(group).getByRole('button', { name: /customer gives KES 2,000/i })).toHaveTextContent('2,000');
    expect(within(group).getByRole('button', { name: /exact amount, KES 350/i })).toHaveTextContent('Exact');
    unmount();
    render(<Till total={2350} />);
    expect(within(screen.getByRole('group', { name: /quick cash/i })).getByRole('button', { name: /KES 2,000/i })).toBeInTheDocument();
  });

  test('a quick note sets what the customer gave', async () => {
    const setAmountGiven = jest.fn();
    render(<Till total={350} spies={{ setAmountGiven }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Customer gives KES 500' }));
    expect(setAmountGiven).toHaveBeenLastCalledWith(500);
    expect(screen.getByRole('button', { name: 'Customer gives KES 500' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('Exact gives the total', async () => {
    const setAmountGiven = jest.fn();
    render(<Till total={1284.5} spies={{ setAmountGiven }} />);
    await userEvent.click(screen.getByRole('button', { name: /exact amount/i }));
    expect(setAmountGiven).toHaveBeenLastCalledWith(1284.5);
  });

  test('the number pad and the Change line are on screen together', () => {
    render(<Till />);
    const pad = screen.getByRole('group', { name: 'Number pad' });
    ['7', '8', '9', '4', '5', '6', '1', '2', '3', '00', '0'].forEach((k) => expect(within(pad).getByRole('button', { name: k })).toBeInTheDocument());
    expect(within(pad).getByRole('button', { name: 'Decimal point' })).toBeInTheDocument();
    expect(within(pad).getByRole('button', { name: 'Backspace' })).toBeInTheDocument();
    expect(within(pad).getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    expect(screen.getByText('Change')).toBeInTheDocument();
  });

  test('the pad types the amount, Backspace takes a digit off and Clear empties it', async () => {
    const setAmountGiven = jest.fn();
    render(<Till total={350} spies={{ setAmountGiven }} />);
    const pad = screen.getByRole('group', { name: 'Number pad' });
    await userEvent.click(within(pad).getByRole('button', { name: '5' }));
    await userEvent.click(within(pad).getByRole('button', { name: '00' }));
    expect(setAmountGiven).toHaveBeenLastCalledWith(500);
    expect(screen.getByRole('status', { name: /customer gives/i })).toHaveTextContent('500');
    await userEvent.click(within(pad).getByRole('button', { name: 'Backspace' }));
    expect(setAmountGiven).toHaveBeenLastCalledWith(50);
    await userEvent.click(within(pad).getByRole('button', { name: 'Clear' }));
    expect(setAmountGiven).toHaveBeenLastCalledWith(0);
  });

  test('Change says Give change with an icon and the amount to hand back', async () => {
    render(<Till total={350} />);
    await userEvent.click(screen.getByRole('button', { name: 'Customer gives KES 1,000' }));
    const word = screen.getByText('Give change');
    expect(word.querySelector('[data-icon]')).not.toBeNull();
    expect(screen.getByText('KES 650')).toBeInTheDocument();
  });

  test('Change says Short with an icon and what is still to pay', async () => {
    render(<Till total={350} />);
    const pad = screen.getByRole('group', { name: 'Number pad' });
    await userEvent.click(within(pad).getByRole('button', { name: '2' }));
    await userEvent.click(within(pad).getByRole('button', { name: '00' }));
    const word = screen.getByText('Short');
    expect(word.querySelector('[data-icon="alert"]')).not.toBeNull();
    expect(screen.getByText('KES 150')).toBeInTheDocument();
  });

  test('Change says Exact with an icon when the amount matches', async () => {
    render(<Till total={350} />);
    await userEvent.click(screen.getByRole('button', { name: /exact amount/i }));
    const word = screen.getByText('Exact', { selector: '.nlp-change__word' });
    expect(word.querySelector('[data-icon="check"]')).not.toBeNull();
    expect(screen.getByText('No change')).toBeInTheDocument();
  });

  test('the pad keys are at least 44px, from the token, and the screen lays out in two columns from 560px', () => {
    const css = fs.readFileSync(path.join(__dirname, 'pay.css'), 'utf8');
    expect(css).toMatch(/\.nlp \.nlp-key \{[^}]*min-height:\s*calc\(var\(--control-height-till\)/);
    expect(css).toMatch(/@container \(min-width: 560px\)/);
    expect(css).toMatch(/\.nlp-due__amount \{[^}]*font-size:\s*var\(--hero-size\)/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\((?!\s*var)/);
  });
});

describe('Customer gives display', () => {
  test('shows the amount the till already holds when nothing was typed here', () => {
    render(<Till total={350} amountGiven={1000} />);
    expect(screen.getByRole('status', { name: /customer gives/i })).toHaveTextContent('1,000');
  });
});

describe('Complete sale and the keyboard', () => {
  test('is off until canComplete, then runs onComplete', async () => {
    const onComplete = jest.fn();
    render(<Till total={350} spies={{ onComplete }} />);
    expect(complete()).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /customer gives KES 500/i }));
    expect(complete()).toBeEnabled();
    await userEvent.click(complete());
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('says Processing and cannot be pressed again while the sale is being made', async () => {
    const onComplete = jest.fn();
    render(<Till isCreating canCompleteOverride={false} spies={{ onComplete }} />);
    const button = screen.getByRole('button', { name: 'Processing...' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onComplete).not.toHaveBeenCalled();
  });

  test('digits and Backspace on the keyboard type the amount', () => {
    const setAmountGiven = jest.fn();
    render(<Till total={350} spies={{ setAmountGiven }} />);
    fireEvent.keyDown(window, { key: '4' });
    fireEvent.keyDown(window, { key: '0' });
    fireEvent.keyDown(window, { key: '0' });
    expect(setAmountGiven).toHaveBeenLastCalledWith(400);
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(setAmountGiven).toHaveBeenLastCalledWith(40);
  });

  test('Enter completes when it is allowed, and does nothing when it is not', async () => {
    const onComplete = jest.fn();
    render(<Till total={350} spies={{ onComplete }} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: '5' });
    fireEvent.keyDown(window, { key: '0' });
    fireEvent.keyDown(window, { key: '0' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('Enter on a pad key completes the sale and does not press that key again', async () => {
    const onComplete = jest.fn();
    const setAmountGiven = jest.fn();
    render(<Till total={350} spies={{ onComplete, setAmountGiven }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Customer gives KES 500' }));
    setAmountGiven.mockClear();
    const key = within(screen.getByRole('group', { name: 'Number pad' })).getByRole('button', { name: '5' });
    key.focus();
    fireEvent.keyDown(key, { key: 'Enter' });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(setAmountGiven).not.toHaveBeenCalled();
  });

  test('typing in a box does not type on the pad', async () => {
    const setAmountGiven = jest.fn();
    render(<Till startMode="Credit" modes={ALL_MODES} hasCustomer customerName="Amina" spies={{ setAmountGiven }} />);
    await userEvent.type(screen.getByRole('textbox', { name: /amount on credit/i }), '12');
    expect(setAmountGiven).not.toHaveBeenCalled();
  });

  test('Back to items goes back', async () => {
    const onBack = jest.fn();
    render(<Till spies={{ onBack }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Back to items' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('M-Pesa confirmation code (AC-20)', () => {
  const mpesa = (extra = {}) => render(<Till startMode="Mpesa" canCompleteOverride {...extra} />);

  test('a blank code blocks Complete sale and explains why beside the field', () => {
    mpesa();
    const field = screen.getByRole('textbox', { name: 'M-Pesa confirmation code' });
    expect(field).toHaveValue('');
    expect(field).toBeInvalid();
    expect(screen.getByRole('alert')).toHaveTextContent("Enter the confirmation code from the customer's M-Pesa message to complete the sale");
    expect(field).toHaveAccessibleDescription(/Enter the confirmation code/);
    expect(complete()).toBeDisabled();
  });

  test('the helper says where to find the code', () => {
    mpesa();
    expect(screen.getByText(/such as QGH7XJ2K9L/)).toBeInTheDocument();
  });

  test('a good code is shown in capitals, saved on the payment and unblocks Complete sale', async () => {
    const onSetGateway = jest.fn();
    mpesa({ spies: { onSetGateway } });
    const field = screen.getByRole('textbox', { name: 'M-Pesa confirmation code' });
    await userEvent.type(field, 'qgh7 xj2k9l');
    expect(field).toHaveValue('QGH7XJ2K9L');
    expect(onSetGateway).toHaveBeenLastCalledWith(0, { confirmed: true, reference: 'QGH7XJ2K9L', label: 'M-Pesa', manual: true });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(complete()).toBeEnabled();
  });

  test('a code that is too short shows the error and blocks Complete sale', async () => {
    const onSetGateway = jest.fn();
    mpesa({ spies: { onSetGateway } });
    await userEvent.type(screen.getByRole('textbox', { name: 'M-Pesa confirmation code' }), 'QGH7');
    expect(screen.getByRole('alert')).toHaveTextContent('8 to 12 letters and numbers');
    expect(complete()).toBeDisabled();
    expect(onSetGateway).not.toHaveBeenCalled();
  });

  test('a code that is too long or has symbols shows the error', async () => {
    mpesa();
    const field = screen.getByRole('textbox', { name: 'M-Pesa confirmation code' });
    await userEvent.type(field, 'QGH7XJ2K9L123');
    expect(screen.getByRole('alert')).toHaveTextContent(/too long/i);
    await userEvent.clear(field);
    await userEvent.type(field, 'QGH7-XJ2K9L');
    expect(screen.getByRole('alert')).toHaveTextContent(/only letters and numbers/i);
    expect(complete()).toBeDisabled();
  });

  test('clearing a good code takes it off the payment and blocks again', async () => {
    const onSetGateway = jest.fn();
    mpesa({ spies: { onSetGateway } });
    const field = screen.getByRole('textbox', { name: 'M-Pesa confirmation code' });
    await userEvent.type(field, 'QGH7XJ2K9L');
    expect(complete()).toBeEnabled();
    await userEvent.clear(field);
    expect(onSetGateway).toHaveBeenLastCalledWith(0, null);
    expect(complete()).toBeDisabled();
  });

  test('a code already saved on the payment shows when the screen comes back', () => {
    mpesa({ startPayments: [{ mode: 'Mpesa', amount: 350, gateway: { confirmed: true, reference: 'QGH7XJ2K9L', label: 'M-Pesa', manual: true } }] });
    expect(screen.getByRole('textbox', { name: 'M-Pesa confirmation code' })).toHaveValue('QGH7XJ2K9L');
    expect(complete()).toBeEnabled();
  });

  test('Complete sale stays off while the code is missing even if the till says it can complete, and is off when the till says no', async () => {
    const { unmount } = mpesa();
    expect(complete()).toBeDisabled();
    unmount();
    mpesa({ canCompleteOverride: false });
    await userEvent.type(screen.getByRole('textbox', { name: 'M-Pesa confirmation code' }), 'QGH7XJ2K9L');
    expect(complete()).toBeDisabled();
  });

  test('a reference the gateway confirmed fills the code and needs no typing', () => {
    mpesa({
      paymentOptions: { Mpesa: { gateway: 'mpesa' } },
      startPayments: [{ mode: 'Mpesa', amount: 350, gateway: { confirmed: true, reference: 'GW12345678', label: 'M-Pesa', transactionId: 'tx1', amount: 350 } }],
    });
    const field = screen.getByRole('textbox', { name: 'M-Pesa confirmation code' });
    expect(field).toHaveValue('GW12345678');
    expect(field).toHaveAttribute('readonly');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(complete()).toBeEnabled();
  });

  test('a configured gateway shows the request-to-phone heading and the gateway component, and keeps the typed code', async () => {
    const onSetGateway = jest.fn();
    mpesa({ paymentOptions: { Mpesa: { gateway: 'mpesa' } }, spies: { onSetGateway } });
    expect(screen.getByRole('heading', { name: "Or send a payment request to the customer's phone" })).toBeInTheDocument();
    expect(screen.getByTestId('gateway')).toHaveTextContent('value none');
    await userEvent.type(screen.getByRole('textbox', { name: 'M-Pesa confirmation code' }), 'QGH7XJ2K9L');
    expect(screen.getByTestId('gateway')).toHaveTextContent('value none');
  });

  test('when the gateway confirms, its reference replaces the typed code', async () => {
    mpesa({ paymentOptions: { Mpesa: { gateway: 'mpesa' } } });
    await userEvent.click(screen.getByRole('button', { name: 'confirm at gateway' }));
    expect(screen.getByRole('textbox', { name: 'M-Pesa confirmation code' })).toHaveValue('GW12345678');
    expect(complete()).toBeEnabled();
  });

  test('without a gateway configured there is no request heading', () => {
    mpesa();
    expect(screen.queryByRole('heading', { name: /payment request/i })).not.toBeInTheDocument();
  });
});

describe('split payments', () => {
  const rows = (extra = []) => [{ mode: 'Cash', amount: 150 }, { mode: 'Mpesa', amount: 200 }, ...extra];

  test('turning split on is a checkbox that reports the change', async () => {
    const setSplitPayments = jest.fn();
    render(<Till spies={{ setSplitPayments }} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Split between several methods' }));
    expect(setSplitPayments).toHaveBeenCalledWith(true);
  });

  test('shows a row for each method with its own method and amount', () => {
    render(<Till startSplit startPayments={rows()} />);
    const first = screen.getByRole('group', { name: 'Method 1' });
    expect(within(first).getByRole('combobox', { name: /method 1/i })).toHaveTextContent('Cash');
    expect(within(first).getByRole('textbox', { name: /amount 1/i })).toHaveValue('150');
    expect(within(screen.getByRole('group', { name: 'Method 2' })).getByRole('combobox', { name: /method 2/i })).toHaveTextContent('M-Pesa');
  });

  test('an M-Pesa row has its own code field and the other row has none', () => {
    render(<Till startSplit startPayments={rows()} />);
    expect(within(screen.getByRole('group', { name: 'Method 1' })).queryByRole('textbox', { name: /confirmation code/i })).not.toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Method 2' })).getByRole('textbox', { name: 'M-Pesa confirmation code' })).toBeInTheDocument();
  });

  test('the sale is blocked until the M-Pesa row has a code, and the code is saved on that row', async () => {
    const onSetGateway = jest.fn();
    render(<Till startSplit startPayments={rows()} spies={{ onSetGateway }} />);
    expect(complete()).toBeDisabled();
    await userEvent.type(within(screen.getByRole('group', { name: 'Method 2' })).getByRole('textbox', { name: 'M-Pesa confirmation code' }), 'QGH7XJ2K9L');
    expect(onSetGateway).toHaveBeenLastCalledWith(1, { confirmed: true, reference: 'QGH7XJ2K9L', label: 'M-Pesa', manual: true });
    expect(complete()).toBeEnabled();
  });

  test('an M-Pesa row with no amount needs no code', () => {
    render(<Till startSplit startPayments={[{ mode: 'Cash', amount: 350 }, { mode: 'Mpesa', amount: 0 }]} />);
    expect(screen.queryByRole('textbox', { name: /confirmation code/i })).not.toBeInTheDocument();
    expect(complete()).toBeEnabled();
  });

  test('two M-Pesa rows each need their own code', async () => {
    render(<Till startSplit startPayments={[{ mode: 'Mpesa', amount: 150 }, { mode: 'Mpesa', amount: 200 }]} />);
    const one = within(screen.getByRole('group', { name: 'Method 1' })).getByRole('textbox', { name: /confirmation code/i });
    const two = within(screen.getByRole('group', { name: 'Method 2' })).getByRole('textbox', { name: /confirmation code/i });
    await userEvent.type(one, 'QGH7XJ2K9L');
    expect(complete()).toBeDisabled();
    await userEvent.type(two, 'RHK8YL3M0P');
    expect(complete()).toBeEnabled();
  });

  test('removing a row keeps the other row\'s code with it', async () => {
    render(<Till startSplit startPayments={[{ mode: 'Cash', amount: 150 }, { mode: 'Mpesa', amount: 200 }]} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'M-Pesa confirmation code' }), 'QGH7XJ2K9L');
    await userEvent.click(within(screen.getByRole('group', { name: 'Method 1' })).getByRole('button', { name: 'Remove this method' }));
    expect(screen.getByRole('textbox', { name: 'M-Pesa confirmation code' })).toHaveValue('QGH7XJ2K9L');
    expect(screen.getByRole('button', { name: 'Add method' })).toHaveFocus();
  });

  test('Add method adds a row', async () => {
    render(<Till startSplit startPayments={rows()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add method' }));
    expect(screen.getByRole('group', { name: 'Method 3' })).toBeInTheDocument();
  });

  test('the last row cannot be removed', () => {
    render(<Till startSplit startPayments={[{ mode: 'Cash', amount: 350 }]} />);
    expect(screen.getByRole('button', { name: 'Remove this method' })).toBeDisabled();
  });

  test('says whether the amounts add up, with an icon and words', () => {
    const { unmount } = render(<Till startSplit startPayments={[{ mode: 'Cash', amount: 350 }]} />);
    expect(screen.getByText('The amounts add up to the total.')).toBeInTheDocument();
    unmount();
    render(<Till startSplit startPayments={[{ mode: 'Cash', amount: 100 }]} />);
    const note = screen.getByText(/must equal KES 350/);
    expect(note).toHaveTextContent('KES 100');
    expect(note).toHaveTextContent('KES 250 to go');
  });

  test('says when the credit part is not allowed', () => {
    render(<Till startSplit startPayments={[{ mode: 'Cash', amount: 350 }]} splitCreditValid={false} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/more than this customer's available credit/);
  });

  test('a gateway row offers Collect and takes the payment in a dialog', async () => {
    const onSetGateway = jest.fn();
    render(<Till startSplit startPayments={rows()} paymentOptions={{ Mpesa: { gateway: 'mpesa' } }} spies={{ onSetGateway }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Collect KES 200 by M-Pesa' }));
    const dialog = screen.getByRole('dialog', { name: 'Collect KES 200 by M-Pesa' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'confirm at gateway' }));
    expect(onSetGateway).toHaveBeenCalledWith(1, expect.objectContaining({ confirmed: true, reference: 'GW12345678' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('M-Pesa received (GW12345678)')).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Method 2' })).getByRole('textbox', { name: 'M-Pesa confirmation code' })).toHaveValue('GW12345678');
  });
});

describe('on credit and other methods', () => {
  test('credit without a customer says so and offers Choose customer', async () => {
    const onChooseCustomer = jest.fn();
    render(<Till startMode="Credit" spies={{ onChooseCustomer }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Credit sales need a registered customer.');
    await userEvent.click(screen.getByRole('button', { name: 'Choose customer' }));
    expect(onChooseCustomer).toHaveBeenCalledTimes(1);
  });

  test('credit with a customer takes an amount with cents and shows the credit position', async () => {
    const setCredit = jest.fn();
    render(
      <Till
        startMode="Credit"
        total={350}
        hasCustomer
        customerName="Amina"
        creditInfo={{ credit_limit: 5000, outstanding_amount: 1200, available_credit: 3800, is_over_limit: false }}
        setCreditAmount={setCredit}
      />
    );
    await userEvent.type(screen.getByRole('textbox', { name: /amount on credit/i }), '120.5');
    expect(setCredit).toHaveBeenLastCalledWith(120.5);
    expect(screen.getByText(/Amina: credit limit KES 5,000, owes KES 1,200, available KES 3,800/)).toBeInTheDocument();
    expect(screen.getByText('Up to KES 350')).toBeInTheDocument();
  });

  test('a customer over the limit gets a warning in words', () => {
    render(<Till startMode="Credit" hasCustomer customerName="Amina" creditInfo={{ credit_limit: 1000, outstanding_amount: 1500, available_credit: 0, is_over_limit: true }} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Over the limit, so more credit cannot be given/);
  });

  test('credit details not loaded is said plainly', () => {
    render(<Till startMode="Credit" hasCustomer customerName="Amina" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/not loaded, so credit cannot be approved/);
  });

  test('a card sale tells the cashier to take the payment on the terminal', () => {
    render(<Till startMode="Credit Card" />);
    expect(screen.getByText(/Take the KES 350 payment on your Card terminal or phone/)).toBeInTheDocument();
  });

  test('a gateway method other than M-Pesa shows the gateway component', () => {
    render(<Till startMode="Bank Draft" paymentOptions={{ 'Bank Draft': { gateway: 'bank' } }} />);
    expect(screen.getByTestId('gateway')).toHaveTextContent('gateway for Bank Draft');
  });
});
