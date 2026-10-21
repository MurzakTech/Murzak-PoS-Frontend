import { callServer } from './serverCall';

/**
 * Native Frappe Appointments API for Murzak POS
 *
 * Connects the POS frontend directly to Frappe's native Appointment DocTypes in Murzak-PoS-Backend:
 * - Supports Salon/Barber appointments & chair schedules
 * - Handles service duration, staff/practitioner allocation, and client details
 * - Enables 1-click 'Send to Till' to checkout appointments directly in the Murzak Till
 */

const APPOINTMENTS = 'murzak_pos.api.appointment_api';

/**
 * List appointments for a given company, date, and optional staff/chair filter.
 *
 * @param {Object} params
 * @param {string} params.company
 * @param {string} [params.date] - YYYY-MM-DD (defaults to today on the server)
 * @param {string} [params.staff] - Staff user or employee ID
 * @param {string} [params.status] - 'Scheduled' | 'In-Progress' | 'Completed' | 'Cancelled'
 */
export const listAppointments = async ({ company, date, staff, status } = {}) => {
  const reply = await callServer(
    `${APPOINTMENTS}.list_appointments`,
    { company, date, staff, status },
    { get: true, fallback: 'Could not load appointments.' }
  );
  return reply.data || [];
};

/**
 * Create a new appointment booking.
 *
 * @param {Object} data
 * @param {string} data.company
 * @param {string} [data.customer] - Existing Frappe customer ID or name
 * @param {string} data.customer_name
 * @param {string} data.customer_phone
 * @param {string} data.staff - Barber / Stylist / Practitioner
 * @param {string} data.appointment_date - YYYY-MM-DD
 * @param {string} data.appointment_time - HH:MM
 * @param {number} [data.duration_minutes=30]
 * @param {Array<string|Object>} [data.service_items=[]] - Service Item codes
 * @param {string} [data.notes]
 */
export const createAppointment = async (data) => {
  const reply = await callServer(
    `${APPOINTMENTS}.create_appointment`,
    data,
    { fallback: 'Could not create appointment.' }
  );
  return reply.data || reply;
};

/**
 * Update the status of an appointment.
 *
 * @param {Object} params
 * @param {string} params.appointment_id
 * @param {'Scheduled'|'In-Progress'|'Completed'|'Cancelled'} params.status
 */
export const updateAppointmentStatus = async ({ appointment_id, status }) => {
  const reply = await callServer(
    `${APPOINTMENTS}.update_status`,
    { appointment_id, status },
    { fallback: 'Could not update appointment status.' }
  );
  return reply.data || reply;
};

/**
 * Fetch full details of an appointment, including booked services and customer history.
 *
 * @param {string} appointmentId
 */
export const getAppointmentDetails = async (appointmentId) => {
  const reply = await callServer(
    `${APPOINTMENTS}.get_appointment`,
    { appointment_id: appointmentId },
    { get: true, fallback: 'Could not load appointment details.' }
  );
  return reply.data || reply;
};

/**
 * Convert an appointment into a till cart payload ready for instant checkout.
 *
 * Returns pre-formatted cart items with service code, rate, and barber attribution.
 *
 * @param {string} appointmentId
 */
export const prepareAppointmentForTill = async (appointmentId) => {
  const reply = await callServer(
    `${APPOINTMENTS}.prepare_for_till`,
    { appointment_id: appointmentId },
    { get: true, fallback: 'Could not prepare appointment for till checkout.' }
  );
  return reply.data || reply;
};
