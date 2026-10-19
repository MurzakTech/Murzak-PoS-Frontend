/**
 * Units by industry in the product form (ticket P7-2): the shop's industry units come first, the usual ones are added for an owner or
 * manager, a cashier only reads, and "Add or change units" checks a unit before sending it and shows it at once.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../components/Toast';
import { NewLookContext } from '../NewLookProvider';
import UnitPicker from './UnitPicker';
import useShopUnits from './useShopUnits';
import { addCustomUnit, ensureIndustryUnits, getIndustryUnits, setUnitsIndustry } from '../../api/unitsApi';
import { clearShopUnitWords, quantityText } from './unitWords';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: {} }));
jest.mock('../../api/unitsApi');

const UOMS = [{ name: 'Nos' }, { name: 'Kg' }, { name: 'Box' }, { name: 'Tablet' }, { name: 'Strip' }];
const unit = (name, singular, plural, exists = true) => ({ name, singular, plural, whole: true, note: '', exists });
const pharmacy = (extra = {}) => ({
  company: 'Shop A',
  industry: 'pharmacy',
  industries: ['pharmacy', 'retail', 'hardware'],
  units: [unit('Nos', 'piece', 'pieces'), unit('Tablet', 'tablet', 'tablets'), unit('Strip', 'strip', 'strips'), unit('Capsule', 'capsule', 'capsules', false)],
  missing: 1,
  custom: [],
  created: [],
  added: '',
  canManage: true,
  ...extra,
});

const Harness = ({ units = { status: 'ready', data: UOMS, reload: jest.fn() }, value = 'Nos', onChange = jest.fn() }) => {
  const shop = useShopUnits();
  return <UnitPicker id="u" label="Unit" helper="How you count it" value={value} onChange={onChange} units={units} shop={shop} />;
};

const renderPicker = (props) =>
  render(
    <NewLookContext.Provider value={{ enabled: true, status: 'ready', company: 'Shop A', setEnabled: async () => true }}>
      <ToastProvider>
        <Harness {...props} />
      </ToastProvider>
    </NewLookContext.Provider>
  );

const optionsOf = () => screen.getAllByRole('option').map((o) => o.textContent);

beforeEach(() => {
  jest.resetAllMocks();
  clearShopUnitWords();
});

describe('the unit choice', () => {
  test('the industry units come first, then the common ones, and a unit the site lacks is not offered', async () => {
    getIndustryUnits.mockResolvedValue(pharmacy({ canManage: false, missing: 0 }));
    renderPicker();
    await waitFor(() => expect(getIndustryUnits).toHaveBeenCalled());
    await waitFor(() => expect(quantityText(2, 'Strip')).toBe('2 strips'));
    userEvent.click(screen.getByRole('combobox', { name: /Unit/ }));
    expect(optionsOf()).toEqual(['Pieces', 'Tablets', 'Strips', 'Kilograms', 'Boxes']);
  });

  test('an owner or manager gets the missing usual units added, once', async () => {
    getIndustryUnits.mockResolvedValue(pharmacy());
    ensureIndustryUnits.mockResolvedValue(pharmacy({ missing: 0, created: ['Capsule'], units: pharmacy().units.map((u) => ({ ...u, exists: true })) }));
    renderPicker({ units: { status: 'ready', data: [...UOMS, { name: 'Capsule' }], reload: jest.fn() } });
    await waitFor(() => expect(ensureIndustryUnits).toHaveBeenCalledTimes(1));
    userEvent.click(await screen.findByRole('combobox', { name: /Unit/ }));
    await waitFor(() => expect(optionsOf().slice(0, 4)).toEqual(['Pieces', 'Tablets', 'Strips', 'Capsules']));
  });

  test('a cashier only reads: nothing is added and there is no way to add a unit', async () => {
    getIndustryUnits.mockResolvedValue(pharmacy({ canManage: false }));
    renderPicker();
    await waitFor(() => expect(getIndustryUnits).toHaveBeenCalled());
    await screen.findByRole('combobox', { name: /Unit/ });
    expect(ensureIndustryUnits).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Add or change units' })).toBeNull();
  });

  test('if the shop units cannot be loaded the ordinary list still works', async () => {
    getIndustryUnits.mockRejectedValue(new Error('offline'));
    renderPicker();
    userEvent.click(await screen.findByRole('combobox', { name: /Unit/ }));
    expect(optionsOf()).toEqual(['Pieces', 'Kilograms', 'Boxes', 'Strips', 'Tablets']);
  });

  test('nothing is asked while the New look is off', async () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>
    );
    await screen.findByRole('combobox', { name: /Unit/ });
    expect(getIndustryUnits).not.toHaveBeenCalled();
  });
});

describe('Add or change units', () => {
  const open = async () => {
    getIndustryUnits.mockResolvedValue(pharmacy({ missing: 0 }));
    const reload = jest.fn();
    renderPicker({ units: { status: 'ready', data: UOMS, reload } });
    userEvent.click(await screen.findByRole('button', { name: 'Add or change units' }));
    return { dialog: await screen.findByRole('dialog', { name: 'Your units' }), reload };
  };

  test('checks the name before sending anything', async () => {
    const { dialog } = await open();
    userEvent.click(within(dialog).getByRole('button', { name: 'Add unit' }));
    expect(await within(dialog).findByText('Please type the unit name.')).toBeVisible();
    expect(within(dialog).getByText('Please type the word for many.')).toBeVisible();
    userEvent.type(within(dialog).getByLabelText('Unit name'), 'kg');
    userEvent.type(within(dialog).getByLabelText('Word for many'), 'kgs');
    userEvent.click(within(dialog).getByRole('button', { name: 'Add unit' }));
    expect(await within(dialog).findByText('There is already a unit called kg.')).toBeVisible();
    expect(addCustomUnit).not.toHaveBeenCalled();
  });

  test('a good unit is sent, the list is refreshed and its words are known', async () => {
    const { dialog, reload } = await open();
    addCustomUnit.mockResolvedValue(pharmacy({ missing: 0, custom: [{ name: 'Jerrycan', plural: 'jerrycans' }], added: 'Jerrycan' }));
    userEvent.type(within(dialog).getByLabelText('Unit name'), 'jerrycan');
    userEvent.type(within(dialog).getByLabelText('Word for many'), 'jerrycans');
    userEvent.click(within(dialog).getByRole('button', { name: 'Add unit' }));
    await waitFor(() => expect(addCustomUnit).toHaveBeenCalledWith({ name: 'jerrycan', plural: 'jerrycans', allowParts: false, company: 'Shop A' }));
    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(quantityText(3, 'Jerrycan')).toBe('3 jerrycans');
    expect(quantityText(1, 'Jerrycan')).toBe('1 jerrycan');
    expect(within(dialog).getByLabelText('Unit name')).toHaveValue('');
  });

  test("the server's refusal shows in the dialog", async () => {
    const { dialog } = await open();
    addCustomUnit.mockRejectedValue(new Error('Only an owner or a manager can change units.'));
    userEvent.type(within(dialog).getByLabelText('Unit name'), 'Drum');
    userEvent.type(within(dialog).getByLabelText('Word for many'), 'drums');
    userEvent.click(within(dialog).getByRole('button', { name: 'Add unit' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Only an owner or a manager can change units.');
  });

  test('changing the kind of shop is sent and the list is drawn again', async () => {
    const { dialog } = await open();
    setUnitsIndustry.mockResolvedValue(pharmacy({ industry: 'hardware', missing: 0 }));
    userEvent.click(within(dialog).getByRole('combobox', { name: /Kind of shop/ }));
    userEvent.click(await screen.findByRole('option', { name: 'Hardware' }));
    await waitFor(() => expect(setUnitsIndustry).toHaveBeenCalledWith('hardware', 'Shop A'));
  });

  test('Escape closes it', async () => {
    const { dialog } = await open();
    userEvent.keyboard('{Escape}');
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  });
});
