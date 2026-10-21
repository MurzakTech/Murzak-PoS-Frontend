import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AppointmentsPage from './AppointmentsPage';
import { ToastProvider } from '../components/Toast';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockAppointments = [
  {
    name: 'APT-001',
    customer_name: 'John Kamau',
    customer_phone: '0712345678',
    practitioner_name: 'Barber Dennis',
    appointment_date: '2026-10-21',
    appointment_time: '10:00:00',
    status: 'Scheduled',
    custom_chair: 'Chair 1',
    services: [
      { item_code: 'HAIRCUT-01', item_name: 'Fade & Beard Trim', rate: 1000 },
    ],
  },
  {
    name: 'APT-002',
    customer_name: 'Grace Muthoni',
    customer_phone: '0722112233',
    practitioner_name: 'Barber Sarah',
    appointment_date: '2026-10-21',
    appointment_time: '11:00:00',
    status: 'In-Progress',
    custom_chair: 'Chair 2',
    services: [
      { item_code: 'HAIR-WASH', item_name: 'Wash & Style', rate: 1500 },
    ],
  },
];

const renderComponent = (props = {}) => {
  const store = configureStore({
    reducer: {
      auth: () => ({ user: { company: 'Test Barber Shop' } }),
    },
  });

  const loadMock = props.load || jest.fn().mockResolvedValue(mockAppointments);
  const saveMock = props.save || jest.fn().mockResolvedValue({ name: 'APT-NEW' });
  const updateMock = props.update || jest.fn().mockResolvedValue({ success: true });

  const view = render(
    <Provider store={store}>
      <ToastProvider>
        <AppointmentsPage
          load={loadMock}
          save={saveMock}
          update={updateMock}
          {...props}
        />
      </ToastProvider>
    </Provider>
  );

  return { ...view, loadMock, saveMock, updateMock };
};

describe('AppointmentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders appointments board and loads appointments', async () => {
    await act(async () => {
      renderComponent();
    });

    expect(screen.getByText('Appointments')).toBeInTheDocument();
    expect(screen.getByText('Book appointment')).toBeInTheDocument();
    expect(screen.getByText('Add walk-in')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('John Kamau')).toBeInTheDocument();
      expect(screen.getByText('Grace Muthoni')).toBeInTheDocument();
    });

    expect(screen.getByText('Fade & Beard Trim')).toBeInTheDocument();
    expect(screen.getByText('Wash & Style')).toBeInTheDocument();
  });

  test('filters appointments by staff member tab', async () => {
    await act(async () => {
      renderComponent();
    });

    await waitFor(() => {
      expect(screen.getByText('John Kamau')).toBeInTheDocument();
    });

    // Click on Barber Sarah tab
    const sarahTab = screen.getByRole('button', { name: 'Barber Sarah' });
    fireEvent.click(sarahTab);

    // Only Grace Muthoni should be visible
    expect(screen.getByText('Grace Muthoni')).toBeInTheDocument();
    expect(screen.queryByText('John Kamau')).not.toBeInTheDocument();
  });

  test('changes appointment status when status button clicked', async () => {
    let updateMock;
    await act(async () => {
      const res = renderComponent();
      updateMock = res.updateMock;
    });

    await waitFor(() => {
      expect(screen.getByText('John Kamau')).toBeInTheDocument();
    });

    // Find "Start service" button for Scheduled appointment
    const startBtn = screen.getByRole('button', { name: 'Start service' });
    fireEvent.click(startBtn);

    expect(updateMock).toHaveBeenCalledWith({
      appointment_id: 'APT-001',
      status: 'In-Progress',
    });
  });

  test('checkout at till packages cart and navigates to /till', async () => {
    await act(async () => {
      renderComponent();
    });

    await waitFor(() => {
      expect(screen.getByText('John Kamau')).toBeInTheDocument();
    });

    const checkoutBtns = screen.getAllByRole('button', { name: 'Checkout at till' });
    expect(checkoutBtns.length).toBeGreaterThan(0);
    fireEvent.click(checkoutBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/till', {
      state: {
        appointmentCart: expect.objectContaining({
          appointment_id: 'APT-001',
          customer_name: 'John Kamau',
          customer_phone: '0712345678',
          items: expect.arrayContaining([
            expect.objectContaining({
              item_code: 'HAIRCUT-01',
              item_name: 'Fade & Beard Trim',
              rate: 1000,
              staff: 'Barber Dennis',
            }),
          ]),
        }),
      },
    });
  });

  test('opens book appointment dialog on "Add walk-in" button click', async () => {
    await act(async () => {
      renderComponent();
    });

    const walkInBtn = screen.getByRole('button', { name: 'Add walk-in' });
    fireEvent.click(walkInBtn);

    expect(screen.getByText('Add a walk-in client')).toBeInTheDocument();
  });
});
