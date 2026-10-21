import axiosInstance from './axiosInstance';
import {
  listAppointments,
  createAppointment,
  updateAppointmentStatus,
  getAppointmentDetails,
  prepareAppointmentForTill,
} from './appointmentsApi';

jest.mock('./axiosInstance', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('appointmentsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('listAppointments queries list_appointments endpoint with params', async () => {
    const mockAppointments = [
      { name: 'APT-001', customer_name: 'John Doe', staff: 'Barber Mike', status: 'Scheduled' },
    ];
    axiosInstance.get.mockResolvedValueOnce({
      data: { success: true, data: mockAppointments },
    });

    const result = await listAppointments({ company: 'Salon A', date: '2026-10-21', staff: 'Mike' });
    expect(axiosInstance.get).toHaveBeenCalledWith(
      'murzak_pos.api.appointment_api.list_appointments',
      { params: { company: 'Salon A', date: '2026-10-21', staff: 'Mike' } }
    );
    expect(result).toEqual(mockAppointments);
  });

  test('createAppointment posts appointment payload to create_appointment', async () => {
    const payload = {
      company: 'Salon A',
      customer_name: 'Jane Smith',
      customer_phone: '0712345678',
      staff: 'Sarah',
      appointment_date: '2026-10-21',
      appointment_time: '14:00',
      duration_minutes: 45,
      service_items: ['HAIRCUT-01', 'BLOWDRY-02'],
    };

    axiosInstance.post.mockResolvedValueOnce({
      data: { success: true, data: { name: 'APT-002', ...payload } },
    });

    const result = await createAppointment(payload);
    expect(axiosInstance.post).toHaveBeenCalledWith(
      'murzak_pos.api.appointment_api.create_appointment',
      payload
    );
    expect(result.name).toBe('APT-002');
  });

  test('updateAppointmentStatus posts status change', async () => {
    axiosInstance.post.mockResolvedValueOnce({
      data: { success: true, data: { name: 'APT-001', status: 'Completed' } },
    });

    const result = await updateAppointmentStatus({ appointment_id: 'APT-001', status: 'Completed' });
    expect(axiosInstance.post).toHaveBeenCalledWith(
      'murzak_pos.api.appointment_api.update_status',
      { appointment_id: 'APT-001', status: 'Completed' }
    );
    expect(result.status).toBe('Completed');
  });

  test('prepareAppointmentForTill fetches pre-populated cart details', async () => {
    const tillData = {
      customer: 'CUST-001',
      customer_name: 'John Doe',
      items: [
        { item_code: 'HAIRCUT-01', item_name: 'Executive Haircut', rate: 1000, qty: 1, staff: 'Barber Mike' },
      ],
    };

    axiosInstance.get.mockResolvedValueOnce({
      data: { success: true, data: tillData },
    });

    const result = await prepareAppointmentForTill('APT-001');
    expect(axiosInstance.get).toHaveBeenCalledWith(
      'murzak_pos.api.appointment_api.prepare_for_till',
      { params: { appointment_id: 'APT-001' } }
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].staff).toBe('Barber Mike');
  });
});
