import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PrescriptionDialog from './PrescriptionDialog';

const open = (props = {}) => {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  render(<PrescriptionDialog open items={['Amoxicillin', 'Diazepam']} onConfirm={onConfirm} onClose={onClose} {...props} />);
  return { onConfirm, onClose };
};
const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('PrescriptionDialog', () => {
  it('names the prescription-only medicines on the sale', () => {
    open();
    expect(screen.getByText('Amoxicillin, Diazepam')).toBeInTheDocument();
  });

  it('cannot continue until the patient, the prescriber and the confirmation are given', () => {
    open();
    const go = screen.getByRole('button', { name: 'Continue to payment' });
    expect(go).toBeDisabled();
    type("Patient's name", 'Jane Wanjiru');
    expect(go).toBeDisabled();
    type('Prescribed by', 'Dr Otieno');
    expect(go).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /I have seen a valid prescription/ }));
    expect(go).toBeEnabled();
  });

  it('gives back a tidy record, and the prescription number is optional', () => {
    const { onConfirm } = open();
    type("Patient's name", '  Jane   Wanjiru ');
    type('Prescribed by', 'Dr Otieno');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to payment' }));
    expect(onConfirm).toHaveBeenCalledWith({ patient: 'Jane Wanjiru', prescriber: 'Dr Otieno', reference: '' });
  });

  it('starts from what was entered before, but always asks again for the confirmation', () => {
    open({ initial: { patient: 'Jane', prescriber: 'Dr O', reference: 'RX-9' } });
    expect(screen.getByLabelText("Patient's name")).toHaveValue('Jane');
    expect(screen.getByLabelText('Prescription number (optional)')).toHaveValue('RX-9');
    expect(screen.getByRole('button', { name: 'Continue to payment' })).toBeDisabled();
  });

  it('renders clinical safety allergy warning if provided', () => {
    open({
      clinicalSafety: {
        safe: false,
        warnings: [{ message: 'Patient has severe allergy to Penicillin!' }],
      },
    });
    expect(screen.getByText('Clinical Safety Warning:')).toBeInTheDocument();
    expect(screen.getByText(/Patient has severe allergy to Penicillin!/)).toBeInTheDocument();
  });

  it('can be cancelled', () => {
    const { onClose } = open();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
