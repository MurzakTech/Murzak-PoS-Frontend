/**
 * Handing the till over (shift management, part 4): the dialog, its API calls and the panel button. All server calls
 * are replaced by jest functions; the data is made up.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HandoverDialog from './HandoverDialog';
import TillPanel from './TillPanel';
import axiosInstance from '../../api/axiosInstance';
import { handOverTill, listHandoverPeople, previewHandover } from '../../api/shiftApi';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const session = { name: 'POS-OPE-7', cashier_name: 'Wanjiru', opened_at: '08:15', pos_profile: 'Main till' };
const people = [
  { user: 'brian@shop.test', name: 'Brian' },
  { user: 'amina@shop.test', name: 'Amina' },
];
const tillState = { state: 'open', session, expected: [{ mode: 'Cash', key: 'cash', opening: 0, sales: 1000, paid_in: 0, refunds: 0, paid_out: 0, expected: 1000, counts_cash: true }] };
const closeReply = (over = {}) => ({
  closed: false,
  lines: [{ mode: 'Cash', key: 'cash', expected: 1000, counted: 990, difference: -10 }],
  total_expected: 1000,
  total_counted: 990,
  difference: -10,
  word: 'short',
  outcome: null,
  handoverTo: { user: 'brian@shop.test', name: 'Brian' },
  nextShift: null,
  float: null,
  ...over,
});

const setup = (over = {}) => {
  const props = {
    loadPeople: jest.fn().mockResolvedValue(people),
    loadState: jest.fn().mockResolvedValue(tillState),
    preview: jest.fn().mockResolvedValue(closeReply()),
    handOver: jest.fn().mockResolvedValue(closeReply({ closed: true, outcome: 'closed', nextShift: { name: 'POS-OPE-8', user: 'brian@shop.test', person: 'Brian', float: 990 } })),
    onClose: jest.fn(),
    onHandedOver: jest.fn(),
    ...over,
  };
  render(<HandoverDialog open session={session} {...props} />);
  return props;
};

const choose = async (personName = 'Brian') => {
  await userEvent.click(await screen.findByRole('combobox', { name: /Who is taking over/ }));
  await userEvent.click(await screen.findByRole('option', { name: personName }));
};

describe('hand over the till', () => {
  test('See the difference stays off until a person is chosen and cash is counted', async () => {
    setup();
    const button = await screen.findByRole('button', { name: 'See the difference' });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Cash you counted/), '990');
    expect(button).toBeDisabled();
    await choose();
    expect(button).toBeEnabled();
  });

  test('the preview sends the person and the count, and changes nothing', async () => {
    const props = setup();
    await choose();
    await userEvent.type(screen.getByLabelText(/Cash you counted/), '990');
    await userEvent.type(screen.getByLabelText(/Note/), ' lunch ');
    await userEvent.click(screen.getByRole('button', { name: 'See the difference' }));
    expect(await screen.findByText('Taking over: Brian')).toBeInTheDocument();
    expect(props.preview).toHaveBeenCalledWith({ session: 'POS-OPE-7', toUser: 'brian@shop.test', counted: [{ mode: 'Cash', amount: 990 }], note: 'lunch' });
    expect(props.handOver).not.toHaveBeenCalled();
    expect(screen.getByText('Brian starts with KES 990 in the drawer.')).toBeInTheDocument();
  });

  test('Hand over closes once, tells the till, and says what the next shift starts with', async () => {
    const props = setup();
    await choose();
    await userEvent.type(screen.getByLabelText(/Cash you counted/), '990');
    await userEvent.click(screen.getByRole('button', { name: 'See the difference' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Hand over' }));
    expect(await screen.findByText('Till handed over to Brian. They start with KES 990.')).toBeInTheDocument();
    expect(props.handOver).toHaveBeenCalledTimes(1);
    expect(props.onHandedOver).toHaveBeenCalledTimes(1);
  });

  test('a shift that is still closing says so and offers no float', async () => {
    setup({ handOver: jest.fn().mockResolvedValue(closeReply({ closed: true, outcome: 'closing' })) });
    await choose();
    await userEvent.type(screen.getByLabelText(/Cash you counted/), '990');
    await userEvent.click(screen.getByRole('button', { name: 'See the difference' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Hand over' }));
    expect(await screen.findByText('Your shift is still closing. Brian can open their shift in a minute.')).toBeInTheDocument();
  });

  test('closed but the next shift could not start: the float to use is shown', async () => {
    setup({ handOver: jest.fn().mockResolvedValue(closeReply({ closed: true, outcome: 'closed', float: 990 })) });
    await choose();
    await userEvent.type(screen.getByLabelText(/Cash you counted/), '990');
    await userEvent.click(screen.getByRole('button', { name: 'See the difference' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Hand over' }));
    expect(await screen.findByText('Your shift is closed, but Brian could not be started. Open their shift with a float of KES 990.')).toBeInTheDocument();
  });

  test('a refusal from the server is shown and the entries are kept', async () => {
    const props = setup({ preview: jest.fn().mockRejectedValue(new Error('That person does not work for this business.')) });
    await choose();
    await userEvent.type(screen.getByLabelText(/Cash you counted/), '990');
    await userEvent.click(screen.getByRole('button', { name: 'See the difference' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That person does not work for this business.');
    expect(screen.getByLabelText(/Cash you counted/)).toHaveValue('990');
    expect(props.handOver).not.toHaveBeenCalled();
  });

  test('a team that cannot be loaded can be tried again', async () => {
    const loadPeople = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(people);
    setup({ loadPeople });
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(loadPeople).toHaveBeenCalledTimes(2));
    await choose();
  });

  test('with nobody else in the business it says so', async () => {
    setup({ loadPeople: jest.fn().mockResolvedValue([]) });
    expect(await screen.findByText(/No one else from this business can take the till yet/)).toBeInTheDocument();
  });

  test('Keep the till closes the dialog without a call', async () => {
    const props = setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Keep the till' }));
    expect(props.onClose).toHaveBeenCalled();
    expect(props.preview).not.toHaveBeenCalled();
  });
});

describe('the till panel', () => {
  test('shows Hand over the till only when the parent gives it', async () => {
    const load = jest.fn().mockResolvedValue(tillState);
    const onHandOver = jest.fn();
    const { rerender } = render(<TillPanel open onClose={() => {}} session={session} load={load} onCloseTill={() => {}} />);
    await screen.findByRole('button', { name: 'Count and close till' });
    expect(screen.queryByRole('button', { name: 'Hand over the till' })).not.toBeInTheDocument();
    rerender(<TillPanel open onClose={() => {}} session={session} load={load} onCloseTill={() => {}} onHandOver={onHandOver} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Hand over the till' }));
    expect(onHandOver).toHaveBeenCalled();
  });
});

describe('the handover calls', () => {
  beforeEach(() => {
    axiosInstance.get.mockReset();
    axiosInstance.post.mockReset();
  });

  test('listHandoverPeople reads the colleagues', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: true, data: { people: [{ user: 'a@x.test', name: 'A' }, { user: 'b@x.test' }] } } } });
    expect(await listHandoverPeople('POS-OPE-7')).toEqual([{ user: 'a@x.test', name: 'A' }, { user: 'b@x.test', name: 'b@x.test' }]);
    expect(axiosInstance.get.mock.calls[0][0]).toBe('murzak_pos.api.handover_api.list_handover_people');
  });

  test('previewHandover and handOverTill differ only in confirm, and send the person and note', async () => {
    axiosInstance.post.mockResolvedValue({
      data: { message: { success: true, message: 'Till handed over to Brian.', data: { closed: true, outcome: 'closed', lines: [], total_expected: 1000, total_counted: 990, difference: -10, word: 'short', handover_to: { user: 'b', name: 'Brian' }, next_shift: { name: 'N', user: 'b', person: 'Brian', float: '990' } } } },
    });
    const args = { session: 'POS-OPE-7', toUser: 'b', counted: [{ mode: 'Cash', amount: 990 }], note: '' };
    await previewHandover(args);
    const out = await handOverTill(args);
    expect(axiosInstance.post.mock.calls[0][1]).toMatchObject({ to_user: 'b', confirm: false, counted: [{ mode: 'Cash', amount: 990 }] });
    expect(axiosInstance.post.mock.calls[1][1]).toMatchObject({ confirm: true });
    expect(axiosInstance.post.mock.calls[1][1].note).toBeUndefined();
    expect(out.nextShift).toMatchObject({ person: 'Brian', float: 990 });
  });

  test('a refusal comes back as an Error with the server words', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'That person was not found.', error_type: 'no_such_person' } } });
    await expect(handOverTill({ session: 'S', toUser: 'x', counted: [] })).rejects.toThrow('That person was not found.');
  });
});
