import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, IconButton, Stack, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import { ArrowBack, Fullscreen, FullscreenExit, NotificationsActive, NotificationsOff, SwapHoriz } from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import useKitchenSettings from '../../hooks/useKitchenSettings';
import useStationBoard from '../../hooks/useStationBoard';
import { ticketTitle, orderTypeOf } from '../../utils/kitchenTickets';

const stationKey = (company) => `pos_station_v1:${company || 'no-company'}`;
const soundKey = 'pos_station_sound_v1';

const readValue = (key) => {
  try {
    return window.localStorage.getItem(key) || '';
  } catch (e) {
    return '';
  }
};
const writeValue = (key, value) => {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch (e) {
    // the screen still works; it just asks again next time
  }
};

const minutesSince = (iso, now) => {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? Math.max(0, Math.floor((now - t) / 60000)) : 0;
};

// Calm when new, amber when it has waited a while, red when it is late
const ageColour = (minutes) => (minutes >= 15 ? 'error' : minutes >= 8 ? 'warning' : 'success');

const clock = (iso) => {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
};

const Lines = ({ ticket }) => (
  <Box>
    {ticket.adds.map((a, i) => (
      <Box key={`a${i}`} sx={{ mb: 0.75 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{a.qty} x {a.item_name}</Typography>
        {a.note && <Typography sx={{ fontSize: 16, fontStyle: 'italic', pl: 2.5, color: 'warning.main', fontWeight: 700 }}>{a.note}</Typography>}
      </Box>
    ))}
    {ticket.changes.map((c, i) => (
      <Box key={`c${i}`} sx={{ mb: 0.75, p: 0.75, border: 2, borderColor: 'warning.main', borderRadius: 1 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 900 }}>CHANGE</Typography>
        <Typography sx={{ fontSize: 18, fontWeight: 800 }}>{c.item_name}</Typography>
        <Typography sx={{ fontSize: 16, fontStyle: 'italic' }}>now: {c.note || '(no note)'}</Typography>
      </Box>
    ))}
    {ticket.voids.length > 0 && (
      <Box sx={{ mb: 0.5, p: 0.75, border: 2, borderColor: 'error.main', borderRadius: 1 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 900, color: 'error.main' }}>CANCELLED, DO NOT MAKE</Typography>
        {ticket.voids.map((v, i) => (
          <Typography key={`v${i}`} sx={{ fontSize: 18, fontWeight: 800, textDecoration: 'line-through' }}>
            {v.qty} x {v.item_name}{v.note ? ` (${v.note})` : ''}
          </Typography>
        ))}
      </Box>
    )}
  </Box>
);

const TicketCard = ({ ticket, now, onMark }) => {
  const minutes = minutesSince(ticket.createdAt, now);
  const counter = orderTypeOf(ticket.orderType, ticket.label) === 'counter';
  const colour = ticket.status === 'Ready' ? 'success' : ageColour(minutes);
  return (
    <Box
      data-testid={`card-${ticket.id}`}
      sx={{ border: 3, borderColor: `${colour}.main`, borderRadius: 2, bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <Box sx={{ px: 1.5, py: 1, bgcolor: `${colour}.main`, color: `${colour}.contrastText`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1, color: 'inherit', minWidth: 0 }} noWrap>{ticketTitle(ticket)}</Typography>
        <Typography sx={{ fontSize: counter ? 32 : 20, fontWeight: 900, color: 'inherit', lineHeight: 1 }}>#{ticket.number}</Typography>
      </Box>
      <Box sx={{ px: 1.5, pt: 0.75, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">{clock(ticket.createdAt)}{ticket.waiter ? `  ${ticket.waiter}` : ''}</Typography>
        {ticket.round > 1 && <Chip size="small" color="info" label={`Round ${ticket.round}`} />}
        <Chip size="small" variant="outlined" label={ticket.status === 'New' ? 'New' : ticket.status} color={ticket.status === 'Ready' ? 'success' : ticket.status === 'Preparing' ? 'primary' : 'default'} />
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" sx={{ fontWeight: 800 }}>{minutes} min</Typography>
      </Box>
      <Box sx={{ px: 1.5, py: 1, flexGrow: 1 }}>
        <Lines ticket={ticket} />
      </Box>
      <Stack direction="row" spacing={1} sx={{ p: 1.5, pt: 0 }}>
        {ticket.status === 'New' && (
          <Button fullWidth variant="outlined" size="large" onClick={() => onMark(ticket.id, 'Preparing')}>Start</Button>
        )}
        {(ticket.status === 'New' || ticket.status === 'Preparing') && (
          <Button fullWidth variant="contained" color="success" size="large" onClick={() => onMark(ticket.id, 'Ready')}>Ready</Button>
        )}
        {ticket.status === 'Ready' && (
          <Button fullWidth variant="contained" size="large" onClick={() => onMark(ticket.id, 'Served')}>Served</Button>
        )}
      </Stack>
    </Box>
  );
};

const CancelRecord = ({ ticket }) => (
  <Box data-testid={`cancel-${ticket.id}`} sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, p: 1.5, bgcolor: 'background.paper' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
      <Typography sx={{ fontWeight: 800 }}>{ticketTitle(ticket)} <Typography component="span" color="text.secondary">#{ticket.number}</Typography></Typography>
      <Typography variant="caption" color="text.secondary">{clock(ticket.createdAt)}{ticket.waiter ? `  by ${ticket.waiter}` : ''}</Typography>
    </Box>
    {ticket.voids.map((v, i) => (
      <Typography key={i} variant="body2" sx={{ color: 'error.main', fontWeight: 700 }}>
        Cancelled: {v.qty} x {v.item_name}{v.note ? ` (${v.note})` : ''}
      </Typography>
    ))}
  </Box>
);

/**
 * The screen for a kitchen or bar: a tablet or monitor left on this page shows the tickets for one station,
 * newest orders last, and the cooks mark them Start, Ready and Served. Ready tells the waiter.
 * Cancellations have their own tab and are kept as a record for the last day.
 */
const KitchenStation = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { warehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
  const company = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;
  const warehouse = activeWarehouse?.name || activeWarehouse?.warehouse_name || '';
  const waitingForStore = warehouses.length > 0 && !warehouse;

  const { settings, status: settingsStatus } = useKitchenSettings({ company });
  const [chosen, setChosen] = useState(() => readValue(stationKey(company)));
  const [tab, setTab] = useState('orders');
  const [sound, setSound] = useState(() => readValue(soundKey) === 'on');
  const [now, setNow] = useState(Date.now());
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const audio = useRef(null);

  useEffect(() => {
    setChosen(readValue(stationKey(company)));
  }, [company]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener('fullscreenchange', onChange);
    };
  }, []);

  const station = settings.stations.find((s) => s.name === chosen) || null;

  const beep = useCallback(() => {
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      audio.current = audio.current || new Context();
      const ctx = audio.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      // no sound on this device; the card still appears
    }
  }, []);

  const soundRef = useRef(sound);
  soundRef.current = sound;
  const onNew = useCallback(() => { if (soundRef.current) beep(); }, [beep]);

  const active = settings.enabled && settings.screens && settingsStatus !== 'unavailable' && Boolean(station) && !waitingForStore;
  const { board, history, status, error, mark } = useStationBoard({
    company: active ? company : '',
    warehouse,
    station: active ? station.name : '',
    withHistory: tab === 'cancellations',
    onNew,
  });

  const choose = (name) => {
    writeValue(stationKey(company), name);
    setChosen(name);
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    writeValue(soundKey, next ? 'on' : '');
    if (next) beep(); // a tap is what lets the browser play sound later
  };

  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    } catch (e) {
      // some kiosk browsers manage this themselves
    }
  };

  const sorted = useMemo(() => board, [board]);

  // ---- before there is a screen to show
  const notReady = (title, text, extra) => (
    <Box sx={{ maxWidth: 520, mx: 'auto', textAlign: 'center', p: 4 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>{title}</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>{text}</Typography>
      {extra}
      <Button sx={{ mt: 2 }} startIcon={<ArrowBack />} onClick={() => navigate('/sales')}>Back to the till</Button>
    </Box>
  );

  let body;
  if (!company || waitingForStore || (settingsStatus === 'checking' && !settings.enabled)) {
    body = <Box sx={{ textAlign: 'center', p: 6 }}><CircularProgress aria-label="Loading" /></Box>;
  } else if (settingsStatus === 'unavailable') {
    body = notReady('Station screens are not available yet', 'This server cannot show tickets on station screens yet, so orders print only.');
  } else if (!settings.enabled || !settings.screens) {
    body = notReady('Station screens are switched off', 'Open Kitchen tickets in the till menu, switch on "Also show tickets on station screens" and save.');
  } else if (!station) {
    body = (
      <Box sx={{ maxWidth: 520, mx: 'auto', textAlign: 'center', p: 4 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>Which station is this screen?</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>This device will show the tickets for the station you pick. You can change it later.</Typography>
        <Stack spacing={1.5}>
          {settings.stations.map((s) => (
            <Button key={s.id} variant="contained" size="large" onClick={() => choose(s.name)}>{s.name}</Button>
          ))}
        </Stack>
      </Box>
    );
  } else {
    body = (
      <Box sx={{ p: { xs: 1, sm: 2 } }}>
        {status === 'offline' && <Alert severity="warning" sx={{ mb: 1.5 }}>The connection was lost. Showing the last tickets received; trying again.</Alert>}
        {status === 'unavailable' && <Alert severity="info" sx={{ mb: 1.5 }}>This server cannot show tickets on station screens yet.</Alert>}
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}

        {tab === 'orders' ? (
          sorted.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 8, fontSize: 20 }}>
              {status === 'checking' ? 'Loading tickets...' : 'No orders waiting.'}
            </Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', alignItems: 'start' }}>
              {sorted.map((t) => <TicketCard key={t.id} ticket={t} now={now} onMark={mark} />)}
            </Box>
          )
        ) : (
          <Box sx={{ maxWidth: 720, mx: 'auto' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Items the waiters cancelled in the last 24 hours, kept as a record.
            </Typography>
            {history.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>No cancellations.</Typography>
            ) : (
              <Stack spacing={1}>{history.map((t) => <CancelRecord key={t.id} ticket={t} />)}</Stack>
            )}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Box component="header" sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1, px: 1, minHeight: 56, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap' }}>
        <Tooltip title="Back to the till">
          <IconButton onClick={() => navigate('/sales')} aria-label="Back to the till"><ArrowBack /></IconButton>
        </Tooltip>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>{station ? station.name : 'Station screen'}</Typography>
        {station && (
          <Tooltip title="Change station">
            <IconButton size="small" onClick={() => choose('')} aria-label="Change station"><SwapHoriz /></IconButton>
          </Tooltip>
        )}
        {active && (
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ ml: 1 }}>
            <Tab value="orders" label={`Orders (${board.length})`} />
            <Tab value="cancellations" label="Cancellations" />
          </Tabs>
        )}
        <Box sx={{ flexGrow: 1 }} />
        {active && (
          <Chip size="small" color={status === 'online' ? 'success' : status === 'offline' ? 'warning' : 'default'} label={status === 'online' ? 'Connected' : status === 'offline' ? 'Offline' : 'Checking'} />
        )}
        {active && (
          <Tooltip title={sound ? 'Sound on for new orders' : 'Sound off'}>
            <IconButton onClick={toggleSound} aria-label={sound ? 'Turn sound off' : 'Turn sound on'}>
              {sound ? <NotificationsActive /> : <NotificationsOff />}
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={isFullscreen ? 'Leave full screen' : 'Full screen'}>
          <IconButton onClick={toggleFullscreen} aria-label={isFullscreen ? 'Leave full screen' : 'Enter full screen'}>
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>{body}</Box>
    </Box>
  );
};

export default KitchenStation;
