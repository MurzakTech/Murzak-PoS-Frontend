/**
 * Ticket P5-4, acceptance check AC-33: the first-time set-up wizard. Every step, skipping, resuming where it stopped, and
 * finishing. The server calls are replaced by made-up answers.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import SetupWizard from './SetupWizard';
import * as api from '../../api/setupApi';
import { getPaymentMethods } from '../../api/paymentMethodsApi';

jest.mock('../../api/setupApi', () => ({
  ...jest.requireActual('../../api/setupApi'),
  getSetupState: jest.fn(),
  saveBusinessKind: jest.fn(),
  saveSetupProgress: jest.fn(),
  saveOpeningCash: jest.fn(),
  getShopDetails: jest.fn(),
  saveTaxId: jest.fn(),
}));
jest.mock('../../api/paymentMethodsApi', () => ({ getPaymentMethods: jest.fn(), setPaymentMethod: jest.fn() }));
jest.mock('../NewLookProvider', () => ({ useNewLook: () => ({ enabled: true, status: 'ready', company: 'Shop A' }) }));

const NO = { expiry: false, prescriptionOnly: false, barcodesFirst: false, unitsFirst: false, servicesFirst: false };
const state = (over = {}) => ({
  company: 'Shop A',
  kind: null,
  features: NO,
  openingCash: 0,
  doneSteps: [],
  skippedSteps: [],
  finished: false,
  nextStep: 'business',
  needsSetup: true,
  inProgress: false,
  offer: true,
  suggestedKind: null,
  industryCode: null,
  canEdit: true,
  ...over,
});
const progress = (over = {}) => ({ doneSteps: [], skippedSteps: [], finished: false, nextStep: 'business', ...over });

const Where = () => {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
};

const show = (initial = state(), address = '/new-look/setup') => {
  api.getSetupState.mockResolvedValue(initial);
  return render(
    <MemoryRouter initialEntries={[address]}>
      <ToastProvider>
        <Routes>
          <Route path="/new-look/setup" element={<SetupWizard />} />
          <Route path="/new-look" element={<p>Home page</p>} />
          <Route path="/new-look/products/new" element={<p>New product page</p>} />
        </Routes>
        <Where />
      </ToastProvider>
    </MemoryRouter>
  );
};

const heading = (name) => screen.findByRole('heading', { level: 2, name });

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  getPaymentMethods.mockResolvedValue({ methods: [{ key: 'cash', label: 'Cash', enabled: true, available: true, modes: ['Cash'], needs_code: false }], other: [] });
  api.saveSetupProgress.mockImplementation(async (step, opts = {}) => progress(step === 'finish' ? { finished: true } : opts.skipped ? { skippedSteps: [step], nextStep: 'business' } : { doneSteps: [step], nextStep: 'business' }));
});

describe('step 1, What do you sell', () => {
  test('is the first step for a new store, with four choices that say what they turn on', async () => {
    show();
    await heading('What do you sell?');
    ['Pharmacy', 'Retail', 'Services', 'Other'].forEach((name) => expect(screen.getByRole('radio', { name: new RegExp(name) })).toBeInTheDocument());
    expect(screen.getByText(/Expiry dates and the Expiry tab/)).toBeInTheDocument();
    expect(screen.getByText(/Barcodes and units come first/)).toBeInTheDocument();
    expect(screen.getByText(/Services are listed first/)).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 6/)).toBeInTheDocument();
    expect(screen.getByText('Not saved yet')).toBeInTheDocument();
  });

  test('no choice yet is a problem in words, not a guess', async () => {
    show();
    await heading('What do you sell?');
    userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect(await screen.findAllByText('Choose what you sell, or skip this step.')).not.toHaveLength(0);
    expect(api.saveBusinessKind).not.toHaveBeenCalled();
  });

  test('choosing Pharmacy saves it, remembers the features for the next screen, and goes on to the shop name', async () => {
    api.saveBusinessKind.mockResolvedValue({ company: 'Shop A', kind: 'pharmacy', features: { ...NO, expiry: true, prescriptionOnly: true }, openingCash: 0, ...progress({ doneSteps: ['business'], nextStep: 'shop' }) });
    api.getShopDetails.mockResolvedValue({ name: 'Shop A', title: 'Shop A', taxId: '' });
    show();
    await heading('What do you sell?');
    userEvent.click(screen.getByRole('radio', { name: /Pharmacy/ }));
    userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    await heading('Your shop');
    expect(api.saveBusinessKind).toHaveBeenCalledWith('pharmacy', 'Shop A');
    expect(JSON.parse(localStorage.getItem('murzak_new_look:business-features:Shop A')).features.expiry).toBe(true);
    expect(screen.getByTestId('where')).toHaveTextContent('/new-look/setup?step=shop');
  });

  test('a kind chosen at sign-up is offered as the starting choice', async () => {
    show(state({ suggestedKind: 'retail' }));
    await heading('What do you sell?');
    expect(screen.getByRole('radio', { name: /Retail/ })).toBeChecked();
    expect(screen.getByText(/Chosen for you from what you told us/)).toBeInTheDocument();
  });

  test('a failed save is shown in words and the step stays', async () => {
    api.saveBusinessKind.mockRejectedValue(new Error('Only a business owner or System Manager can do this.'));
    show();
    await heading('What do you sell?');
    userEvent.click(screen.getByRole('radio', { name: /Other/ }));
    userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect(await screen.findByText('Only a business owner or System Manager can do this.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'What do you sell?' })).toBeInTheDocument();
  });
});

describe('asked once, and continuing where it stopped', () => {
  test('a shop that already answered is not asked again: set-up opens at the first step not passed', async () => {
    show(state({ kind: 'retail', doneSteps: ['business', 'shop'], nextStep: 'cash' }));
    await heading('Usual opening cash');
    expect(screen.queryByRole('heading', { name: 'What do you sell?' })).not.toBeInTheDocument();
    expect(screen.getByText(/Step 3 of 6/)).toBeInTheDocument();
  });

  test('a refresh in the middle opens the same step (the server remembers what was passed)', async () => {
    const { unmount } = show(state({ kind: 'retail', doneSteps: ['business'], skippedSteps: ['shop'], nextStep: 'cash' }));
    await heading('Usual opening cash');
    unmount();
    show(state({ kind: 'retail', doneSteps: ['business'], skippedSteps: ['shop'], nextStep: 'cash' }));
    await heading('Usual opening cash');
  });

  test('the list of steps says which are done and which were skipped, in words', async () => {
    show(state({ kind: 'retail', doneSteps: ['business'], skippedSteps: ['shop'], nextStep: 'cash' }));
    await heading('Usual opening cash');
    const list = screen.getByRole('list', { name: 'Set-up steps' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(6);
    expect(items[0]).toHaveTextContent('What you sell (Done)');
    expect(items[1]).toHaveTextContent('Shop name (Skipped)');
    expect(items[2]).toHaveAttribute('aria-current', 'step');
    expect(items[3]).not.toHaveAttribute('aria-current');
  });

  test('Back returns to the step before', async () => {
    show(state({ kind: 'retail', doneSteps: ['business', 'shop'], nextStep: 'cash' }));
    api.getShopDetails.mockResolvedValue({ name: 'Shop A', title: 'Shop A', taxId: '' });
    await heading('Usual opening cash');
    userEvent.click(screen.getByRole('button', { name: 'Back' }));
    await heading('Your shop');
  });

  test('a step named in the address opens that step', async () => {
    show(state(), '/new-look/setup?step=products');
    await heading('Add your first products');
  });
});

describe('step 2, the shop name and tax ID', () => {
  beforeEach(() => api.getShopDetails.mockResolvedValue({ name: 'Shop A', title: 'Shop A', taxId: '' }));
  const open = () => show(state({ kind: 'retail', doneSteps: ['business'], nextStep: 'shop' }));

  test('shows the name (not editable) and an optional tax ID', async () => {
    open();
    await heading('Your shop');
    expect(await screen.findByLabelText('Shop name')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Tax ID (optional)')).toBeInTheDocument();
  });

  test('a tax ID typed in is saved through the company call, then on to the next step', async () => {
    api.saveTaxId.mockResolvedValue('A123456789B');
    open();
    userEvent.type(await screen.findByLabelText('Tax ID (optional)'), 'a123456789b');
    userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    await heading('Usual opening cash');
    expect(api.saveTaxId).toHaveBeenCalledWith({ company: 'Shop A', taxId: 'A123456789B' });
    expect(api.saveSetupProgress).toHaveBeenCalledWith('shop', { company: 'Shop A' });
  });

  test('with nothing typed, nothing is sent to the company call and the step is still done', async () => {
    open();
    await screen.findByLabelText('Tax ID (optional)');
    userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    await heading('Usual opening cash');
    expect(api.saveTaxId).not.toHaveBeenCalled();
  });

  test('a tax ID that cannot be right is a problem beside the field', async () => {
    open();
    userEvent.type(await screen.findByLabelText('Tax ID (optional)'), 'A1-2');
    userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect((await screen.findAllByText(/Check the tax ID/)).length).toBeGreaterThan(0);
    expect(api.saveTaxId).not.toHaveBeenCalled();
  });

  test('when the shop details cannot be loaded, the step says so and can be skipped', async () => {
    api.getShopDetails.mockRejectedValue(new Error('x'));
    open();
    expect(await screen.findByText(/could not load your shop details/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip this step' })).toBeInTheDocument();
  });
});

describe('step 3, the usual opening cash', () => {
  const open = (over = {}) => show(state({ kind: 'retail', doneSteps: ['business', 'shop'], nextStep: 'cash', ...over }));

  test('is saved as an amount and set-up goes on to the payment methods', async () => {
    api.saveOpeningCash.mockResolvedValue({ openingCash: 5000, ...progress({ doneSteps: ['business', 'shop', 'cash'] }) });
    open();
    userEvent.type(await screen.findByLabelText('Opening cash'), '5000');
    userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    await heading('How do customers pay?');
    expect(api.saveOpeningCash).toHaveBeenCalledWith(5000, 'Shop A');
  });

  test('empty means no suggestion', async () => {
    api.saveOpeningCash.mockResolvedValue({ openingCash: 0, ...progress({ doneSteps: ['cash'] }) });
    open();
    await screen.findByLabelText('Opening cash');
    userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    await heading('How do customers pay?');
    expect(api.saveOpeningCash).toHaveBeenCalledWith('', 'Shop A');
  });

  test('starts from the amount already kept', async () => {
    open({ openingCash: 3000 });
    expect(await screen.findByLabelText('Opening cash')).toHaveValue('3000');
  });
});

describe('step 4, the payment methods', () => {
  test('shows the same switches as Settings and Continue moves on', async () => {
    show(state({ kind: 'retail', doneSteps: ['business', 'shop', 'cash'], nextStep: 'payments' }));
    await heading('How do customers pay?');
    expect(await screen.findByRole('switch', { name: 'Cash' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /M-Pesa keys, bank accounts/ })).toHaveAttribute('href', '/settings/payment-gateways?legacy=1');
    userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await heading('Add your first products');
    expect(api.saveSetupProgress).toHaveBeenCalledWith('payments', { company: 'Shop A' });
  });
});

describe('step 5, the first products', () => {
  const open = (over = {}) => show(state({ kind: 'pharmacy', doneSteps: ['business', 'shop', 'cash', 'payments'], nextStep: 'products', ...over }));

  test('links to New product and to the current starter products screen of the kind', async () => {
    open();
    await heading('Add your first products');
    expect(screen.getByRole('link', { name: 'Add a product' })).toHaveAttribute('href', '/new-look/products/new');
    expect(screen.getByRole('link', { name: 'See starter products' })).toHaveAttribute('href', '/industry/PHARMACY/products?legacy=1');
    expect(screen.getByRole('link', { name: 'Add from a file' })).toHaveAttribute('href', '/products/bulk-import?legacy=1');
    expect(screen.getByRole('link', { name: 'Add opening stock' })).toHaveAttribute('href', '/products/bulk-stock-import?legacy=1');
  });

  test('uses the industry chosen at sign-up when there is one', async () => {
    open({ industryCode: 'GROCERY' });
    await heading('Add your first products');
    expect(screen.getByRole('link', { name: 'See starter products' })).toHaveAttribute('href', '/industry/GROCERY/products?legacy=1');
  });

  test('a shop that sells "Other" has no starter list to offer', async () => {
    open({ kind: 'other' });
    await heading('Add your first products');
    expect(screen.queryByRole('link', { name: 'See starter products' })).not.toBeInTheDocument();
  });

  test('Add a product opens the New product page', async () => {
    open();
    await heading('Add your first products');
    userEvent.click(screen.getByRole('link', { name: 'Add a product' }));
    expect(await screen.findByText('New product page')).toBeInTheDocument();
  });
});

describe('step 6, your team, and finishing', () => {
  const open = () => show(state({ kind: 'retail', doneSteps: ['business', 'shop', 'cash', 'payments', 'products'], nextStep: 'staff' }));

  test('links to the current Staff screen until Settings, Team is live', async () => {
    open();
    await heading('Add your team');
    expect(screen.getByRole('link', { name: 'Add your team' })).toHaveAttribute('href', '/staff?legacy=1');
    expect(screen.getByRole('link', { name: 'Tax and eTIMS' })).toHaveAttribute('href', '/settings/etims?legacy=1');
  });

  test('Finish marks the step and the whole set-up done, and returns to Home', async () => {
    open();
    await heading('Add your team');
    userEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(api.saveSetupProgress.mock.calls.map((c) => c[0])).toEqual(['staff', 'finish']);
  });
});

describe('skipping', () => {
  test('Skip this step records the step as skipped and moves on', async () => {
    show();
    await heading('What do you sell?');
    api.getShopDetails.mockResolvedValue({ name: 'Shop A', title: 'Shop A', taxId: '' });
    userEvent.click(screen.getByRole('button', { name: 'Skip this step' }));
    await heading('Your shop');
    expect(api.saveSetupProgress).toHaveBeenCalledWith('business', { skipped: true, company: 'Shop A' });
    expect(api.saveBusinessKind).not.toHaveBeenCalled();
  });

  test('every step can be skipped', async () => {
    show(state({ kind: 'retail', doneSteps: ['business', 'shop', 'cash', 'payments', 'products'], nextStep: 'staff' }));
    await heading('Add your team');
    expect(screen.getByRole('button', { name: 'Skip this step' })).toBeInTheDocument();
  });

  test('skipping the last step ends set-up', async () => {
    show(state({ kind: 'retail', doneSteps: ['business', 'shop', 'cash', 'payments', 'products'], nextStep: 'staff' }));
    await heading('Add your team');
    userEvent.click(screen.getByRole('button', { name: 'Skip this step' }));
    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(api.saveSetupProgress.mock.calls.map((c) => c[0])).toEqual(['staff', 'finish']);
  });

  test('Skip for now marks set-up done and returns to Home, from any step', async () => {
    show();
    await heading('What do you sell?');
    userEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(api.saveSetupProgress).toHaveBeenCalledWith('finish', { company: 'Shop A' });
  });

  test('Cancel leaves without marking anything', async () => {
    show();
    await heading('What do you sell?');
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(api.saveSetupProgress).not.toHaveBeenCalled();
  });

  test('a set-up that was finished can be opened again and says so', async () => {
    api.getShopDetails.mockResolvedValue({ name: 'Shop A', title: 'Shop A', taxId: '' });
    show(state({ finished: true, offer: false, kind: 'retail', doneSteps: ['business'], nextStep: 'shop' }));
    expect(await screen.findByText(/You finished set-up before/)).toBeInTheDocument();
  });
});

describe('who can use it, and when it cannot load', () => {
  test('only the owner can set up the shop', async () => {
    show(state({ canEdit: false }));
    expect(await screen.findByRole('heading', { name: 'Only the owner can set up the shop' })).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  test('a failed load says so and offers to try again', async () => {
    api.getSetupState.mockRejectedValueOnce(new Error('x')).mockResolvedValue(state());
    render(
      <MemoryRouter initialEntries={['/new-look/setup']}>
        <ToastProvider>
          <SetupWizard />
        </ToastProvider>
      </MemoryRouter>
    );
    expect(await screen.findByRole('heading', { name: 'We could not open set-up' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await heading('What do you sell?');
  });
});
