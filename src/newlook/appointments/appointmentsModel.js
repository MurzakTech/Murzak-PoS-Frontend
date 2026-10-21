import T from './strings.appointments';

export const STATUS_COLORS = {
  Scheduled: 'neutral',
  'In-Progress': 'warning',
  Completed: 'success',
  Cancelled: 'error',
};

/**
 * Normalise raw appointment records from Frappe into consistent UI objects.
 */
export const normaliseAppointment = (item = {}) => ({
  id: item.name || item.id || `apt-${Date.now()}`,
  name: item.name || item.id,
  customer_name: item.customer_name || 'Walk-in Client',
  customer_phone: item.customer_phone || '',
  staff: item.staff || item.practitioner_name || item.practitioner || 'Any Barber',
  appointment_date: item.appointment_date || new Date().toISOString().slice(0, 10),
  appointment_time: (item.appointment_time || '09:00:00').slice(0, 5),
  duration_minutes: Number(item.duration_minutes || 30),
  status: item.status || 'Scheduled',
  services: Array.isArray(item.services)
    ? item.services
    : typeof item.service_items === 'string'
    ? item.service_items.split(',').map((s) => ({ item_code: s.trim(), item_name: s.trim(), rate: 0 }))
    : Array.isArray(item.service_items)
    ? item.service_items
    : [],
  notes: item.notes || '',
});

/**
 * Convert an appointment into a till checkout payload.
 * Each service item preserves the assigned barber for commission calculation.
 */
export const packageAppointmentForTill = (apt) => {
  const norm = normaliseAppointment(apt);
  return {
    source: 'appointment',
    appointment_id: norm.name,
    customer_name: norm.customer_name,
    customer_phone: norm.customer_phone,
    items: norm.services.map((svc) => ({
      item_code: svc.item_code || svc.name || 'SERVICE',
      item_name: svc.item_name || svc.item_code || 'Service',
      rate: Number(svc.rate || 0),
      qty: 1,
      staff: norm.staff,
      is_service: true,
    })),
  };
};

/**
 * Filter appointments by staff and status search.
 */
export const filterAppointments = (list = [], { staff, status, search }) => {
  return list.filter((apt) => {
    if (staff && staff !== 'All' && apt.staff !== staff) return false;
    if (status && status !== 'All' && apt.status !== status) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = apt.customer_name.toLowerCase().includes(q);
      const matchPhone = (apt.customer_phone || '').includes(q);
      const matchStaff = (apt.staff || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchStaff) return false;
    }
    return true;
  });
};
