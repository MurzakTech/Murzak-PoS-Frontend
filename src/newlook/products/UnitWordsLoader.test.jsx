import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { NewLookContext } from '../NewLookProvider';
import UnitWordsLoader from './UnitWordsLoader';
import { getIndustryUnits } from '../../api/unitsApi';
import { clearShopUnitWords, quantityText, setShopUnitWords } from './unitWords';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: {} }));
jest.mock('../../api/unitsApi');

const answer = { units: [{ name: 'Tablet', singular: 'tablet', plural: 'tablets' }], custom: [{ name: 'Jerrycan', plural: 'jerrycans' }] };
const renderLoader = (enabled, company = 'Shop A') =>
  render(
    <NewLookContext.Provider value={{ enabled, status: 'ready', company, setEnabled: async () => enabled }}>
      <UnitWordsLoader />
    </NewLookContext.Provider>
  );

beforeEach(() => {
  jest.resetAllMocks();
  clearShopUnitWords();
});

test('with the New look on, the shop words reach every screen that shows units', async () => {
  getIndustryUnits.mockResolvedValue(answer);
  renderLoader(true);
  await waitFor(() => expect(quantityText(3, 'Jerrycan')).toBe('3 jerrycans'));
  expect(getIndustryUnits).toHaveBeenCalledWith({ company: 'Shop A' });
});

test('with the New look off nothing is asked', () => {
  renderLoader(false);
  expect(getIndustryUnits).not.toHaveBeenCalled();
});

test('words saved for another shop are dropped', async () => {
  setShopUnitWords([{ name: 'Drum', singular: 'drum', plural: 'drums' }], 'Shop B');
  getIndustryUnits.mockRejectedValue(new Error('offline'));
  renderLoader(true, 'Shop A');
  await waitFor(() => expect(getIndustryUnits).toHaveBeenCalled());
  expect(quantityText(2, 'Drum')).toBe('2 Drum');
});

test('words saved for this shop stay when the server cannot be reached', async () => {
  setShopUnitWords([{ name: 'Drum', singular: 'drum', plural: 'drums' }], 'Shop A');
  getIndustryUnits.mockRejectedValue(new Error('offline'));
  renderLoader(true, 'Shop A');
  await waitFor(() => expect(getIndustryUnits).toHaveBeenCalled());
  expect(quantityText(2, 'Drum')).toBe('2 drums');
});
