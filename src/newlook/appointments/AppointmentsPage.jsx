import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { Chip } from '../components/Chip';
import EmptyState from '../components/EmptyState';
import { PageHeader } from '../shell';
import { useToast } from '../components/Toast';
import { useAppSelector } from '../../store/hooks';
import { getUserCompany } from '../../utils/getUserCompany';
import {
  listAppointments,
  createAppointment,
  updateAppointmentStatus,
} from '../../api/appointmentsApi';
import BookAppointmentDialog from './BookAppointmentDialog';
import {
  STATUS_COLORS,
  normaliseAppointment,
  packageAppointmentForTill,
  filterAppointments,
} from './appointmentsModel';
import T from './strings.appointments';
import './appointments.css';

const DEFAULT_STAFF = ['Barber Dennis', 'Barber Sarah', 'Barber John', 'Barber Alex'];

const AppointmentsPage = ({ load = listAppointments, save = createAppointment, update = updateAppointmentStatus }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAppSelector((s) => s.auth);
  const company = getUserCompany(user) || 'Demo Salon';

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedStaff, setSelectedStaff] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isWalkIn, setIsWalkIn] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await load({ company, date });
      setAppointmentsList((data || []).map(normaliseAppointment));
    } catch (err) {
      if (toast?.error) toast.error('Could not load appointments.');
    } finally {
      setLoading(false);
    }
  }, [company, date, load, toast]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleCreate = async (payload) => {
    await save({ ...payload, company });
    if (toast?.success) toast.success(T.bookingSuccess.replace('{client}', payload.customer_name));
    fetchAppointments();
  };

  const handleStatusChange = async (aptId, newStatus) => {
    await update({ appointment_id: aptId, status: newStatus });
    if (toast?.success) toast.success(T.statusChanged.replace('{status}', T.statuses[newStatus] || newStatus));
    fetchAppointments();
  };

  const handleCheckoutAtTill = (apt) => {
    const payload = packageAppointmentForTill(apt);
    navigate('/till', {
      state: {
        appointmentCart: payload,
      },
    });
  };

  const filtered = useMemo(() => {
    return filterAppointments(appointmentsList, {
      staff: selectedStaff,
      status: selectedStatus,
      search,
    });
  }, [appointmentsList, selectedStaff, selectedStatus, search]);

  const actions = (
    <div style={{ display: 'flex', gap: '8px' }}>
      <Button
        variant="ghost"
        onClick={() => {
          setIsWalkIn(true);
          setDialogOpen(true);
        }}
      >
        {T.addWalkIn}
      </Button>
      <Button
        variant="primary"
        onClick={() => {
          setIsWalkIn(false);
          setDialogOpen(true);
        }}
      >
        {T.newAppointment}
      </Button>
    </div>
  );

  return (
    <div className="nl-appointments-page">
      <PageHeader
        title={T.title}
        subtitle={T.subtitle}
        actions={actions}
      />

      <div className="nl-appointments__toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label className="nl-label" htmlFor="apt-date-picker">{T.date}:</label>
          <input
            id="apt-date-picker"
            type="date"
            className="nl-input nl-input--small"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Button
            variant="ghost"
            size="small"
            onClick={() => setDate(new Date().toISOString().slice(0, 10))}
          >
            {T.today}
          </Button>
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '4px 0' }}>
          {['All', ...DEFAULT_STAFF].map((st) => (
            <button
              key={st}
              type="button"
              className={`nl-btn ${selectedStaff === st ? 'nl-btn--primary' : 'nl-btn--ghost'} nl-btn--small`}
              onClick={() => setSelectedStaff(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p className="nl-helper">Loading appointments...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={T.noAppointments}
            description={T.noAppointmentsHint}
            action={{
              label: T.newAppointment,
              onClick: () => {
                setIsWalkIn(false);
                setDialogOpen(true);
              },
            }}
          />
        </Card>
      ) : (
        <div className="nl-appointments__grid">
          {filtered.map((apt) => {
            const isCompleted = apt.status === 'Completed';
            const isCancelled = apt.status === 'Cancelled';
            return (
              <Card key={apt.id} className="nl-appointments__card">
                <div className="nl-appointments__card-head">
                  <div>
                    <span className="nl-appointments__time">{apt.appointment_time}</span>
                    <span className="nl-appointments__duration">({apt.duration_minutes}m)</span>
                  </div>
                  <Chip tone={STATUS_COLORS[apt.status] || 'neutral'}>
                    {T.statuses[apt.status] || apt.status}
                  </Chip>
                </div>

                <div className="nl-appointments__card-client">
                  <h3 className="nl-appointments__name">{apt.customer_name}</h3>
                  {apt.customer_phone && <p className="nl-appointments__phone">{apt.customer_phone}</p>}
                </div>

                <div className="nl-appointments__card-meta">
                  <span className="nl-appointments__chair">💺 {apt.staff}</span>
                  <div className="nl-appointments__services">
                    {apt.services.map((s, idx) => (
                      <span key={idx} className="nl-appointments__service-pill">
                        {s.item_name || s.item_code}
                      </span>
                    ))}
                  </div>
                  {apt.notes && <p className="nl-appointments__notes">"{apt.notes}"</p>}
                </div>

                <div className="nl-appointments__card-actions">
                  {!isCompleted && !isCancelled && (
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => handleCheckoutAtTill(apt)}
                    >
                      {T.checkoutAtTill}
                    </Button>
                  )}
                  {apt.status === 'Scheduled' && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => handleStatusChange(apt.id || apt.name, 'In-Progress')}
                    >
                      {T.inChair}
                    </Button>
                  )}
                  {apt.status === 'In-Progress' && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => handleStatusChange(apt.id || apt.name, 'Completed')}
                    >
                      {T.markDone}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <BookAppointmentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
        isWalkIn={isWalkIn}
        staffList={DEFAULT_STAFF}
      />
    </div>
  );
};

export default AppointmentsPage;
