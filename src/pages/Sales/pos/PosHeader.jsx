import React, { useEffect, useState } from 'react';
import { Badge, Box, Button, Chip, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Switch, Tooltip, Typography } from '@mui/material';
import {
  ArrowBack,
  Fullscreen,
  FullscreenExit,
  MoreVert,
  PauseCircleOutline,
  History,
  LockOutlined,
  Print,
  DarkModeOutlined,
  LightModeOutlined,
  StorefrontOutlined,
  PersonOutline,
  ReceiptLong,
  ExpandMore,
  ImageOutlined,
  RestaurantOutlined,
} from '@mui/icons-material';
import BrandLogo from '../../../components/Common/BrandLogo';
import SystemStatus from '../../../components/Layout/SystemStatus';
import Clock from './Clock';

/**
 * Slim top strip for the till. Everything a cashier needs to know at a glance
 * (store, who is signed in, shift status) and nothing that leads away from selling.
 */
const PosHeader = ({
  storeName,
  warehouses = [],
  canChangeStore,
  onChangeStore,
  cashierName,
  sessionOpen,
  onSessionDetails,
  heldCount,
  onOpenHeld,
  onExit,
  onCloseSession,
  onGoHistory,
  themeMode,
  onToggleTheme,
  autoPrint,
  kitchenEnabled,
  onOpenKitchenSettings,
  onToggleAutoPrint,
  showPictures,
  onToggleShowPictures,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [storeAnchor, setStoreAnchor] = useState(null);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    } catch (e) {
      // Some kiosk browsers manage this themselves; nothing to do
    }
  };

  return (
    <Box
      component="header"
      sx={{
        height: 56,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.75, sm: 1.5 },
        px: { xs: 0.75, sm: 1.5 },
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Tooltip title="Back to dashboard">
        <IconButton onClick={onExit} aria-label="Exit point of sale" sx={{ color: 'text.secondary' }}>
          <ArrowBack />
        </IconButton>
      </Tooltip>

      <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.5 }}>
        <BrandLogo size={26} textVariant="subtitle1" />
        <Divider orientation="vertical" flexItem sx={{ my: 1.5 }} />
      </Box>

      {/* Phones: just the store name, so the cashier knows which till this is */}
      <Typography variant="subtitle1" noWrap sx={{ display: { xs: 'block', md: 'none' }, fontWeight: 700, minWidth: 0 }}>
        {storeName || 'Point of sale'}
      </Typography>

      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2.5, minWidth: 0, color: 'text.secondary' }}>
        <Tooltip title={warehouses.length > 1 && !canChangeStore ? 'Finish or hold the current sale to change store' : warehouses.length > 1 ? 'Change store' : ''}>
          <span>
            <Button
              color="inherit"
              size="small"
              disabled={warehouses.length < 2 || !canChangeStore}
              onClick={(e) => setStoreAnchor(e.currentTarget)}
              startIcon={<StorefrontOutlined sx={{ fontSize: 18 }} />}
              endIcon={warehouses.length > 1 ? <ExpandMore /> : null}
              sx={{ color: 'text.secondary', fontWeight: 600, minWidth: 0, '&.Mui-disabled': { color: 'text.secondary' } }}
            >
              <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>{storeName || 'No store selected'}</Typography>
            </Button>
          </span>
        </Tooltip>
        <Menu anchorEl={storeAnchor} open={Boolean(storeAnchor)} onClose={() => setStoreAnchor(null)}>
          {warehouses.map((w) => (
            <MenuItem key={w.name} selected={(w.warehouse_name || w.name) === storeName || w.name === storeName} onClick={() => { setStoreAnchor(null); onChangeStore(w); }}>
              {w.warehouse_name || w.name}
            </MenuItem>
          ))}
        </Menu>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <PersonOutline sx={{ fontSize: 18 }} />
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
            {cashierName}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1 }} />

      {sessionOpen && (
        <Chip
          size="small"
          color="success"
          variant="outlined"
          icon={<ReceiptLong />}
          label="Till open"
          onClick={onSessionDetails}
          sx={{ fontWeight: 700, '& .MuiChip-label': { display: { xs: 'none', sm: 'block' } }, '& .MuiChip-icon': { mx: { xs: 0.75, sm: undefined } } }}
        />
      )}

      {heldCount > 0 && (
        <>
          <Button size="small" variant="outlined" color="warning" startIcon={<PauseCircleOutline />} onClick={onOpenHeld} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
            Held sales ({heldCount})
          </Button>
          <IconButton color="warning" onClick={onOpenHeld} aria-label={`Held sales (${heldCount})`} sx={{ display: { xs: 'inline-flex', sm: 'none' } }}>
            <Badge badgeContent={heldCount} color="warning">
              <PauseCircleOutline />
            </Badge>
          </IconButton>
        </>
      )}

      <SystemStatus />
      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
        <Clock />
      </Box>

      <Tooltip title={isFullscreen ? 'Leave full screen' : 'Full screen'}>
        <IconButton onClick={toggleFullscreen} aria-label={isFullscreen ? 'Leave full screen' : 'Enter full screen'} sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'inline-flex' } }}>
          {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
        </IconButton>
      </Tooltip>

      <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="More options" sx={{ color: 'text.secondary' }}>
        <MoreVert />
      </IconButton>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem onClick={() => { setMenuAnchor(null); onGoHistory(); }}>
          <ListItemIcon><History fontSize="small" /></ListItemIcon>
          <ListItemText>Sales history</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setMenuAnchor(null); onToggleTheme(); }}>
          <ListItemIcon>{themeMode === 'dark' ? <LightModeOutlined fontSize="small" /> : <DarkModeOutlined fontSize="small" />}</ListItemIcon>
          <ListItemText>{themeMode === 'dark' ? 'Light screen' : 'Dark screen'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={onToggleShowPictures}>
          <ListItemIcon><ImageOutlined fontSize="small" /></ListItemIcon>
          <ListItemText>Show product pictures</ListItemText>
          <Switch edge="end" size="small" checked={!!showPictures} tabIndex={-1} />
        </MenuItem>
        <MenuItem onClick={onToggleAutoPrint}>
          <ListItemIcon><Print fontSize="small" /></ListItemIcon>
          <ListItemText>Print receipt automatically</ListItemText>
          <Switch edge="end" size="small" checked={autoPrint} tabIndex={-1} />
        </MenuItem>
        <MenuItem onClick={() => { setMenuAnchor(null); onOpenKitchenSettings(); }}>
          <ListItemIcon><RestaurantOutlined fontSize="small" /></ListItemIcon>
          <ListItemText>Kitchen tickets</ListItemText>
          <Switch edge="end" size="small" checked={!!kitchenEnabled} tabIndex={-1} />
        </MenuItem>
        {sessionOpen && <Divider />}
        {sessionOpen && (
          <MenuItem onClick={() => { setMenuAnchor(null); onCloseSession(); }} sx={{ color: 'error.main' }}>
            <ListItemIcon><LockOutlined fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Close till (end shift)</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default PosHeader;
