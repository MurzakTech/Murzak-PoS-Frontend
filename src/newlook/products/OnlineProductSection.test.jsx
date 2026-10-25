import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../components/Toast';
import { getProductOnline, saveProductOnline } from '../../api/onlineStoreApi';
import { uploadProductImage } from '../../api/uploadImage';
import OnlineProductSection from './OnlineProductSection';

jest.mock('../../api/onlineStoreApi', () => ({
  MAX_ONLINE_PHOTOS: 6,
  MAX_ONLINE_DESCRIPTION: 1000,
  getProductOnline: jest.fn(),
  saveProductOnline: jest.fn(),
}));
jest.mock('../../api/uploadImage', () => ({ uploadProductImage: jest.fn() }));

const show = () =>
  render(
    <ToastProvider>
      <OnlineProductSection code="RICE" name="Rice" company="Duka Ltd" />
    </ToastProvider>
  );

beforeEach(() => {
  jest.resetAllMocks();
  getProductOnline.mockResolvedValue({ description: 'Pishori', images: ['/files/a.jpg'], showOnline: true });
  saveProductOnline.mockResolvedValue({});
});

describe('a product\'s online details', () => {
  test('shows what the product has now', async () => {
    show();
    expect(await screen.findByLabelText('Description')).toHaveValue('Pishori');
    expect(screen.getByRole('img', { name: 'Photo 1 of Rice' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Show this product in the online store' })).toBeChecked();
    expect(getProductOnline).toHaveBeenCalledWith('RICE', 'Duka Ltd');
  });

  test('saves the description, the photos and whether it is shown', async () => {
    show();
    const text = await screen.findByLabelText('Description');
    userEvent.clear(text);
    userEvent.type(text, 'Long grain');
    userEvent.click(screen.getByRole('checkbox', { name: 'Show this product in the online store' }));
    userEvent.click(screen.getByRole('button', { name: 'Remove photo 1' }));
    userEvent.click(screen.getByRole('button', { name: 'Save online details' }));
    await waitFor(() =>
      expect(saveProductOnline).toHaveBeenCalledWith({ itemCode: 'RICE', description: 'Long grain', images: [], showOnline: false, company: 'Duka Ltd' })
    );
    expect(await screen.findByText('Online details saved')).toBeInTheDocument();
  });

  test('adds a photo to the end of the row', async () => {
    uploadProductImage.mockResolvedValue('/files/b.jpg');
    show();
    await screen.findByLabelText('Description');
    const file = new File(['x'], 'b.jpg', { type: 'image/jpeg' });
    userEvent.upload(screen.getByLabelText('Add a photo', { selector: 'input' }), file);
    expect(await screen.findByRole('img', { name: 'Photo 2 of Rice' })).toBeInTheDocument();
    expect(uploadProductImage).toHaveBeenCalledWith(file);
  });

  test('no more photos can be added after six', async () => {
    getProductOnline.mockResolvedValue({ description: '', images: ['/1', '/2', '/3', '/4', '/5', '/6'], showOnline: true });
    show();
    await screen.findByLabelText('Description');
    expect(screen.queryByLabelText('Add a photo', { selector: 'input' })).not.toBeInTheDocument();
  });

  test('says so when the details cannot be loaded, and offers another try', async () => {
    getProductOnline.mockRejectedValueOnce(new Error('offline'));
    show();
    expect(await screen.findByText('The online details could not be loaded.')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByLabelText('Description')).toBeInTheDocument();
  });
});
