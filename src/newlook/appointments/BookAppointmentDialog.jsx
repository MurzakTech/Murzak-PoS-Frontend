import React, { useState } from 'react';
import Dialog from '../components/Dialog';
import Button from '../components/Button';
import Field from '../components/Field';
import T from './strings.appointments';

const D = T.dialog;

/**
 * Dialog for scheduling an appointment or seating a walk-in client.
 */
const BookAppointmentDialog = ({
  open,
  onClose,
  onSubmit,
  isWalkIn = false,
  staffList = ['Barber Dennis', 'Barber Sarah', 'Barber John'],
  serviceCatalog = [
    { code: 'HAIRCUT-01', name: 'Executive Haircut', rate: 800 },
    { code: 'BEARD-01', name: 'Beard Trim & Shape', rate: 400 },
    { code: 'WASH-01', name: 'Wash & Scalp Massage', rate: 300 },
    { code: 'FACIAL-01', name: 'Hot Towel & Scrub', rate: 600 },
  ],
}) => {
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [staff, setStaff] = useState(staffList[0] || '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [duration, setDuration] = useState('30');
  const [selectedServices, setSelectedServices] = useState([serviceCatalog[0]?.code].filter(Boolean));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const toggleService = (code) => {
    setSelectedServices((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setError(T.errors.clientRequired);
      return;
    }
    if (selectedServices.length === 0) {
      setError(T.errors.serviceRequired);
      return;
    }

    setBusy(true);
    setError('');

    try {
      const chosenServices = serviceCatalog.filter((s) => selectedServices.includes(s.code));
      await onSubmit({
        customer_name: clientName.trim(),
        customer_phone: phone.trim(),
        staff,
        appointment_date: date,
        appointment_time: time,
        duration_minutes: Number(duration),
        status: isWalkIn ? 'In-Progress' : 'Scheduled',
        service_items: chosenServices,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save appointment.');
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
      <Button variant="ghost" onClick={onClose} disabled={busy}>
        {D.cancel}
      </Button>
      <Button variant="primary" onClick={handleSave} disabled={busy}>
        {isWalkIn ? D.submitWalkIn : D.submit}
      </Button>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isWalkIn ? D.walkInTitle : D.bookTitle}
      footer={footer}
      busy={busy}
    >
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && (
          <div className="nl-auth__alert" role="alert" style={{ margin: '0 0 10px 0' }}>
            <span>{error}</span>
          </div>
        )}

        <Field
          label={D.clientName}
          value={clientName}
          onChange={setClientName}
          helper={D.clientNameHint}
          required
          data-autofocus
        />

        <Field
          label={D.phone}
          value={phone}
          onChange={setPhone}
          helper={D.phoneHint}
          type="tel"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label className="nl-label" htmlFor="apt-staff">{D.staff}</label>
            <select
              id="apt-staff"
              className="nl-input"
              value={staff}
              onChange={(e) => setStaff(e.target.value)}
            >
              {staffList.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="nl-label" htmlFor="apt-duration">{D.duration}</label>
            <select
              id="apt-duration"
              className="nl-input"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
            </select>
          </div>
        </div>

        {!isWalkIn && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field
              label={D.date}
              type="date"
              value={date}
              onChange={setDate}
              required
            />
            <Field
              label={D.time}
              type="time"
              value={time}
              onChange={setTime}
              required
            />
          </div>
        )}

        <div>
          <label className="nl-label" style={{ marginBottom: '6px', display: 'block' }}>{D.services}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {serviceCatalog.map((svc) => {
              const active = selectedServices.includes(svc.code);
              return (
                <button
                  type="button"
                  key={svc.code}
                  className={`nl-btn ${active ? 'nl-btn--primary' : 'nl-btn--ghost'} nl-btn--small`}
                  onClick={() => toggleService(svc.code)}
                >
                  {svc.name} (KES {svc.rate})
                </button>
              );
            })}
          </div>
        </div>

        <Field
          label={D.notes}
          value={notes}
          onChange={setNotes}
          helper={D.notesHint}
        />
      </form>
    </Dialog>
  );
};

export default BookAppointmentDialog;
