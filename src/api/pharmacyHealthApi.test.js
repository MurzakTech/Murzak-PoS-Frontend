import axiosInstance from './axiosInstance';
import {
  lookupPatient,
  getPatientPrescriptions,
  getItemBatches,
  validateClinicalSafety,
  recordDispense,
  getDispensingRegister,
} from './pharmacyHealthApi';

jest.mock('./axiosInstance', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('pharmacyHealthApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('lookupPatient queries lookup_patient with term and company', async () => {
    const mockPatient = {
      name: 'PAT-0001',
      patient_name: 'Grace Hopper',
      phone: '0712345678',
      allergies: ['Penicillin'],
      customer: 'CUST-0001',
    };
    axiosInstance.get.mockResolvedValueOnce({
      data: { success: true, data: mockPatient },
    });

    const result = await lookupPatient({ term: '0712345678', company: 'PharmaTech' });
    expect(axiosInstance.get).toHaveBeenCalledWith(
      'murzak_pos.api.pharmacy_health_api.lookup_patient',
      { params: { term: '0712345678', company: 'PharmaTech' } }
    );
    expect(result.patient_name).toBe('Grace Hopper');
    expect(result.allergies).toContain('Penicillin');
  });

  test('getPatientPrescriptions fetches pending prescription items', async () => {
    const mockPrescriptions = [
      {
        prescription_id: 'PRE-001',
        drug_code: 'AMOX-500',
        drug_name: 'Amoxicillin 500mg',
        dosage: '1 capsule 3 times a day',
        qty: 21,
        practitioner: 'Dr. Otieno',
      },
    ];
    axiosInstance.get.mockResolvedValueOnce({
      data: { success: true, data: mockPrescriptions },
    });

    const result = await getPatientPrescriptions({ patient_id: 'PAT-0001', status: 'Pending' });
    expect(axiosInstance.get).toHaveBeenCalledWith(
      'murzak_pos.api.pharmacy_health_api.get_prescriptions',
      { params: { patient_id: 'PAT-0001', status: 'Pending' } }
    );
    expect(result).toHaveLength(1);
    expect(result[0].drug_code).toBe('AMOX-500');
  });

  test('getItemBatches fetches batches sorted by FEFO', async () => {
    const mockBatches = [
      { batch_id: 'BATCH-001', expiry_date: '2026-12-31', stock_qty: 50, is_expired: false },
      { batch_id: 'BATCH-002', expiry_date: '2027-06-30', stock_qty: 100, is_expired: false },
    ];
    axiosInstance.get.mockResolvedValueOnce({
      data: { success: true, data: mockBatches },
    });

    const result = await getItemBatches({ item_code: 'AMOX-500', warehouse: 'Main Pharmacy - PT' });
    expect(axiosInstance.get).toHaveBeenCalledWith(
      'murzak_pos.api.pharmacy_health_api.get_item_batches',
      { params: { item_code: 'AMOX-500', warehouse: 'Main Pharmacy - PT' } }
    );
    expect(result).toHaveLength(2);
    expect(result[0].batch_id).toBe('BATCH-001');
  });

  test('validateClinicalSafety posts safety validation payload', async () => {
    const payload = {
      patient_id: 'PAT-0001',
      cart_items: [{ item_code: 'AMOX-500', is_prescription_only: true }],
    };
    axiosInstance.post.mockResolvedValueOnce({
      data: { success: true, data: { safe: true, warnings: [] } },
    });

    const result = await validateClinicalSafety(payload);
    expect(axiosInstance.post).toHaveBeenCalledWith(
      'murzak_pos.api.pharmacy_health_api.validate_clinical_safety',
      payload
    );
    expect(result.safe).toBe(true);
  });

  test('recordDispense posts statutory dispensing record', async () => {
    const payload = {
      company: 'PharmaTech',
      invoice_id: 'POS-INV-2026-001',
      patient_id: 'PAT-0001',
      patient_name: 'Grace Hopper',
      prescriber_name: 'Dr. Otieno',
      dispensing_pharmacist: 'Amina Pharmacist',
      items: [{ item_code: 'AMOX-500', batch: 'BATCH-001', qty: 21 }],
    };
    axiosInstance.post.mockResolvedValueOnce({
      data: { success: true, data: { status: 'Recorded', register_entry_id: 'REG-001' } },
    });

    const result = await recordDispense(payload);
    expect(axiosInstance.post).toHaveBeenCalledWith(
      'murzak_pos.api.pharmacy_health_api.record_dispense',
      payload
    );
    expect(result.register_entry_id).toBe('REG-001');
  });

  test('getDispensingRegister retrieves statutory log', async () => {
    const mockLogs = [
      { id: 'REG-001', patient: 'Grace Hopper', drug: 'Amoxicillin', prescriber: 'Dr. Otieno' },
    ];
    axiosInstance.get.mockResolvedValueOnce({
      data: { success: true, data: mockLogs },
    });

    const result = await getDispensingRegister({ company: 'PharmaTech', from_date: '2026-10-01', to_date: '2026-10-21' });
    expect(axiosInstance.get).toHaveBeenCalledWith(
      'murzak_pos.api.pharmacy_health_api.get_dispensing_register',
      { params: { company: 'PharmaTech', from_date: '2026-10-01', to_date: '2026-10-21' } }
    );
    expect(result).toHaveLength(1);
  });
});
