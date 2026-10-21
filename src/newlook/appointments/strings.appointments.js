/**
 * Every visible word of the Appointments screen, booking dialog, chair schedule, and till checkout.
 */
const appointments = {
  title: 'Appointments',
  subtitle: 'Client bookings, barber and stylist schedules, and till checkout',
  newAppointment: 'Book appointment',
  addWalkIn: 'Add walk-in',
  today: 'Today',
  date: 'Date',
  allStaff: 'All staff',
  chair: 'Chair / Staff',
  status: 'Status',
  checkoutAtTill: 'Checkout at till',
  inChair: 'Start service',
  markDone: 'Mark completed',
  cancel: 'Cancel booking',
  client: 'Client',
  phone: 'Phone',
  time: 'Time',
  duration: 'Duration',
  services: 'Services',
  notes: 'Notes',
  noAppointments: 'No appointments scheduled for this day',
  noAppointmentsHint: 'Press Book appointment or Add walk-in to schedule a client.',
  bookingSuccess: 'Appointment booked for {client}',
  tillPrepared: 'Prepared {count} service(s) for till checkout',
  statusChanged: 'Appointment marked as {status}',

  statuses: {
    Scheduled: 'Scheduled',
    'In-Progress': 'In-Chair',
    Completed: 'Completed',
    Cancelled: 'Cancelled',
  },

  dialog: {
    bookTitle: 'Book an appointment',
    walkInTitle: 'Add a walk-in client',
    clientName: 'Client name',
    clientNameHint: 'e.g. Dennis Mutua',
    phone: 'Phone number',
    phoneHint: 'e.g. 0712 345 678',
    staff: 'Assigned barber or stylist',
    staffHint: 'Choose who will serve the client',
    date: 'Appointment date',
    time: 'Time slot',
    duration: 'Estimated duration (minutes)',
    services: 'Select service(s)',
    servicesHint: 'e.g. Executive Haircut, Beard Trim, Wash',
    notes: 'Special requests or preferences',
    notesHint: 'e.g. Low fade, skin sensitive to razor',
    submit: 'Confirm booking',
    submitWalkIn: 'Seat walk-in now',
    cancel: 'Cancel',
  },

  errors: {
    clientRequired: 'Enter the client name.',
    phoneRequired: 'Enter a valid mobile phone number.',
    staffRequired: 'Choose a barber or stylist.',
    dateRequired: 'Select the appointment date.',
    timeRequired: 'Select a time slot.',
    serviceRequired: 'Select at least one service.',
  },
};

export default appointments;
