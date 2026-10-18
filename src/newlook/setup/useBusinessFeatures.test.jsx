/**
 * Ticket P5-4: what the shop turned on by answering "What do you sell?" is read once, kept on this device, and only asked for
 * while the New look is on.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import useBusinessFeatures, { rememberBusinessFeatures } from './useBusinessFeatures';
import { getBusinessFeatures, NO_FEATURES } from '../../api/setupApi';
import { useNewLook } from '../NewLookProvider';

jest.mock('../../api/setupApi', () => ({ ...jest.requireActual('../../api/setupApi'), getBusinessFeatures: jest.fn() }));
jest.mock('../NewLookProvider', () => ({ useNewLook: jest.fn() }));

const Probe = () => {
  const b = useBusinessFeatures();
  return (
    <p data-testid="probe">
      {b.status} {b.kind || 'none'} expiry={String(b.features.expiry)} barcodes={String(b.features.barcodesFirst)} cash={b.openingCash}
    </p>
  );
};

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  useNewLook.mockReturnValue({ enabled: true, company: 'Shop A' });
});

test('with the New look off nothing is asked and every feature is off', () => {
  useNewLook.mockReturnValue({ enabled: false, company: 'Shop A' });
  render(<Probe />);
  expect(screen.getByTestId('probe')).toHaveTextContent('off none expiry=false barcodes=false');
  expect(getBusinessFeatures).not.toHaveBeenCalled();
});

test('reads the server\'s answer and keeps it for the next start', async () => {
  getBusinessFeatures.mockResolvedValue({ company: 'Shop A', kind: 'pharmacy', features: { ...NO_FEATURES, expiry: true }, openingCash: 2000 });
  render(<Probe />);
  expect(screen.getByTestId('probe')).toHaveTextContent('loading none');
  await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('ready pharmacy expiry=true barcodes=false cash=2000'));
  expect(JSON.parse(localStorage.getItem('murzak_new_look:business-features:Shop A')).kind).toBe('pharmacy');
});

test('draws what it knew last time at once, then the fresh answer replaces it', async () => {
  rememberBusinessFeatures('Shop A', { kind: 'retail', features: { ...NO_FEATURES, barcodesFirst: true }, openingCash: 0 });
  getBusinessFeatures.mockResolvedValue({ company: 'Shop A', kind: 'services', features: { ...NO_FEATURES, servicesFirst: true }, openingCash: 0 });
  render(<Probe />);
  expect(screen.getByTestId('probe')).toHaveTextContent('stale retail expiry=false barcodes=true');
  await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('ready services'));
});

test('if the server cannot be asked it keeps what it knew and says so', async () => {
  rememberBusinessFeatures('Shop A', { kind: 'pharmacy', features: { ...NO_FEATURES, expiry: true }, openingCash: 0 });
  getBusinessFeatures.mockRejectedValue(new Error('offline'));
  render(<Probe />);
  await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('error pharmacy expiry=true'));
});

test('a shop that never answered has every feature off', async () => {
  getBusinessFeatures.mockResolvedValue({ company: 'Shop A', kind: null, features: NO_FEATURES, openingCash: 0 });
  render(<Probe />);
  await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('ready none expiry=false barcodes=false'));
});

test('a saved answer that is damaged is ignored', () => {
  localStorage.setItem('murzak_new_look:business-features:Shop A', '{not json');
  getBusinessFeatures.mockReturnValue(new Promise(() => {}));
  render(<Probe />);
  expect(screen.getByTestId('probe')).toHaveTextContent('loading none');
});
