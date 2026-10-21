import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClinicalPrescriptionModal from './ClinicalPrescriptionModal';
import * as healthApi from '../../../api/pharmacyHealthApi';

jest.mock('../../../api/pharmacyHealthApi', () => ({
  searchPatients: jest.fn(),
  getPatientPrescriptions: jest.fn(),
  getBatchesFEFO: jest.fn(),
  validatePrescriptionSafety: jest.fn(),
  recordDispense: jest.fn(),
}));

const mockPatient = {
  name: 'PAT-0001',
  patient_name: 'David Omondi',
  mobile: '0711223344',
  blood_group: 'O+',
  allergies: ['Penicillin'],
};

const mockPrescriptions = [
  {
    encounter_id: 'ENC-2026-001',
    prescriber: 'Dr Jane Otieno',
    encounter_date: '2026-10-21',
    medications: [
      {
        item_code: 'AMOX-500',
        drug_name: 'Amoxicillin 500mg',
        quantity: 20,
        dosage: '1 tab TID',
        period: '5 days',
        rate: 50,
      },
    ],
  },
];

const mockBatches = [
  {
    batch_no: 'B2026-A1',
    expiry_date: '2026-11-30',
    stock_qty: 150,
    is_expiring_soon: false,
  },
];

describe('ClinicalPrescriptionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    healthApi.searchPatients.mockResolvedValue([mockPatient]);
    healthApi.getPatientPrescriptions.mockResolvedValue(mockPrescriptions);
    healthApi.getBatchesFEFO.mockResolvedValue(mockBatches);
    healthApi.validatePrescriptionSafety.mockReturnValue({
      safe: false,
      warnings: [
        {
          drug: 'Amoxicillin 500mg',
          allergen: 'Penicillin',
          severity: 'critical',
          message: 'Patient has recorded allergy to Penicillin. Prescribed Amoxicillin 500mg is a penicillin derivative!',
        },
      ],
    });
  });

  test('searches patients, displays clinical allergy profile and active prescriptions', async () => {
    const onClose = jest.fn();
    const onLoadToCart = jest.fn();

    render(
      <ClinicalPrescriptionModal
        open={true}
        onClose={onClose}
        onLoadPrescriptionToCart={onLoadToCart}
        defaultWarehouse="Main Store"
      />
    );

    expect(screen.getByText('Frappe Health Clinical Prescriptions')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search patient by name/);
    fireEvent.change(searchInput, { target: { value: 'David' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText(/David Omondi/)).toBeInTheDocument();
      expect(screen.getByText('1 Allergies')).toBeInTheDocument();
    });

    // Click patient to view prescriptions
    fireEvent.click(screen.getByText(/David Omondi/));

    await waitFor(() => {
      expect(screen.getByText('Active Prescription (ENC-2026-001)')).toBeInTheDocument();
      expect(screen.getByText('Amoxicillin 500mg')).toBeInTheDocument();
      expect(screen.getByText('Dr Jane Otieno')).toBeInTheDocument();
    });

    // Clinical Safety allergy alert must be visible!
    expect(screen.getByText(/Clinical Safety Alert: Allergy Conflict Detected/)).toBeInTheDocument();
    expect(screen.getByText(/penicillin derivative/)).toBeInTheDocument();

    // FEFO Batch recommendation must be displayed!
    await waitFor(() => {
      expect(screen.getByText(/B2026-A1 \(Exp: 2026-11-30\)/)).toBeInTheDocument();
    });

    // Click "Load Prescribed Medicines to Till"
    const loadBtn = screen.getByRole('button', { name: 'Load Prescribed Medicines to Till' });
    fireEvent.click(loadBtn);

    expect(onLoadToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        patient_id: 'PAT-0001',
        patient_name: 'David Omondi',
        doctor: 'Dr Jane Otieno',
        reference: 'ENC-2026-001',
        items: expect.arrayContaining([
          expect.objectContaining({
            item_code: 'AMOX-500',
            item_name: 'Amoxicillin 500mg',
            qty: 20,
            batch_no: 'B2026-A1',
            expiry_date: '2026-11-30',
            prescription_only: true,
          }),
        ]),
      })
    );
    expect(onClose).toHaveBeenCalled();
  });
});
