/**
 * The Form page pattern (Spec: Page patterns; AC-26): sticky footer with Cancel, Save and add another and Save; "Not saved
 * yet" until a real save, then "Saved"; leaving with unsaved changes asks first; errors in a summary that links to each field.
 */
import React, { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, useLocation } from 'react-router-dom';
import { Field } from '../components';
import { ToastProvider } from '../components/Toast';
import { FormPage, MoreOptions } from './index';

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

const Demo = ({ onSave = jest.fn(), onSaveAndAdd, errors = [], startDirty = false, startSaved = false, saving = false }) => {
  const [name, setName] = useState('');
  const [dirty, setDirty] = useState(startDirty);
  return (
    <MemoryRouter initialEntries={['/products/new']}>
      <ToastProvider>
        <Link to="/products">Products</Link>
        <FormPage title="New product" dirty={dirty} saved={startSaved} saving={saving} errors={errors} onSave={onSave} onSaveAndAdd={onSaveAndAdd} onCancel={() => {}}>
          <Field id="name" label="Product name" value={name} onChange={(v) => { setName(v); setDirty(true); }} />
          <MoreOptions>
            <Field id="barcode" label="Barcode" value="" onChange={() => {}} />
          </MoreOptions>
        </FormPage>
        <Where />
      </ToastProvider>
    </MemoryRouter>
  );
};

test('says "Not saved yet" until a save, then "Saved"', () => {
  const { rerender } = render(<Demo />);
  expect(screen.getByText('Not saved yet')).toBeInTheDocument();
  rerender(<Demo startSaved />);
  expect(screen.getByText('Saved')).toBeInTheDocument();
  expect(screen.queryByText('Not saved yet')).not.toBeInTheDocument();
});

test('has Cancel, Save and a Save and add another button only when asked for', () => {
  const { rerender } = render(<Demo />);
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save and add another' })).not.toBeInTheDocument();
  rerender(<Demo onSaveAndAdd={() => {}} />);
  expect(screen.getByRole('button', { name: 'Save and add another' })).toBeInTheDocument();
});

test('Save saves, and pressing Enter in a field saves too', () => {
  const onSave = jest.fn();
  render(<Demo onSave={onSave} />);
  userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(onSave).toHaveBeenCalledTimes(1);
  userEvent.type(screen.getByLabelText('Product name'), 'Soap{enter}');
  expect(onSave).toHaveBeenCalledTimes(2);
});

test('while saving, Save waits and cannot be pressed twice', () => {
  const onSave = jest.fn();
  render(<Demo onSave={onSave} saving />);
  expect(screen.getByText('Saving')).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(onSave).not.toHaveBeenCalled();
});

test('More options is closed until asked for', () => {
  render(<Demo />);
  expect(screen.queryByLabelText('Barcode')).not.toBeVisible();
  userEvent.click(screen.getByRole('button', { name: 'More options' }));
  expect(screen.getByLabelText('Barcode')).toBeVisible();
});

test('errors show in a summary that links to the field', () => {
  render(<Demo errors={[{ id: 'name', message: 'Enter a name for the product' }, { id: 'barcode', message: 'That barcode is already used' }]} />);
  expect(screen.getByText('Fix 2 things before saving')).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Enter a name for the product' }));
  expect(screen.getByLabelText('Product name')).toHaveFocus();
});

describe('leaving with unsaved changes asks first', () => {
  test('a form nobody has touched lets you go straight away', () => {
    render(<Demo />);
    userEvent.click(screen.getByRole('link', { name: 'Products' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/products');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  test('a link stops and asks, Stay keeps you here with your changes, Leave goes on', () => {
    render(<Demo />);
    userEvent.type(screen.getByLabelText('Product name'), 'Soap');
    userEvent.click(screen.getByRole('link', { name: 'Products' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Leave without saving?' });
    expect(dialog).toHaveTextContent('lost');
    expect(screen.getByTestId('where')).toHaveTextContent('/products/new');
    userEvent.click(screen.getByRole('button', { name: 'Stay' }));
    expect(screen.getByLabelText('Product name')).toHaveValue('Soap');
    userEvent.click(screen.getByRole('link', { name: 'Products' }));
    userEvent.click(screen.getByRole('button', { name: 'Leave without saving' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/products');
    expect(screen.getByTestId('where')).not.toHaveTextContent('/new');
  });

  test('closing the tab shows the browser warning only while there are changes', () => {
    render(<Demo />);
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    userEvent.type(screen.getByLabelText('Product name'), 'S');
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });

  test('the Back button asks too', () => {
    render(<Demo />);
    userEvent.type(screen.getByLabelText('Product name'), 'S');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByRole('alertdialog', { name: 'Leave without saving?' })).toBeInTheDocument();
  });

  test('the first focus lands on Stay, so a stray Enter loses nothing', () => {
    render(<Demo />);
    userEvent.type(screen.getByLabelText('Product name'), 'S');
    userEvent.click(screen.getByRole('link', { name: 'Products' }));
    expect(screen.getByRole('button', { name: 'Stay' })).toHaveFocus();
  });
});
