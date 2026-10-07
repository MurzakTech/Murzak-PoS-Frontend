import React from 'react';
import { Box, ButtonBase, Paper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  SpaceDashboardOutlined,
  ReceiptLongOutlined,
  PointOfSale,
  Inventory2Outlined,
  MenuRounded,
} from '@mui/icons-material';
import useRoleAccess from '../../hooks/useRoleAccess';

/**
 * Bottom tab bar for phones. The four things people do most are one thumb-tap
 * away, with "Sell" in the middle; everything else lives under "More", which
 * opens the full menu.
 */
const TABS = [
  { label: 'Home', path: '/dashboard', icon: SpaceDashboardOutlined },
  { label: 'Sales', path: '/sales/history', icon: ReceiptLongOutlined },
  { label: 'Sell', path: '/sales', icon: PointOfSale, primary: true },
  { label: 'Products', path: '/products', icon: Inventory2Outlined },
];

const isActive = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`);

const MobileBottomNav = ({ pathname, onNavigate, onMore, moreOpen }) => {
  const { hasAccess } = useRoleAccess();
  const tabs = TABS.filter((t) => hasAccess(t.path));
  const anyActive = tabs.some((t) => !t.primary && isActive(pathname, t.path));

  return (
    <Paper
      component="nav"
      aria-label="Quick navigation"
      elevation={0}
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (t) => t.zIndex.appBar,
        display: { xs: 'flex', md: 'none' },
        alignItems: 'stretch',
        height: 'calc(64px + env(safe-area-inset-bottom))',
        pb: 'env(safe-area-inset-bottom)',
        borderTop: 1,
        borderColor: 'divider',
        borderRadius: 0,
        bgcolor: (t) => alpha(t.palette.background.paper, 0.92),
        backdropFilter: 'saturate(180%) blur(12px)',
      }}
    >
      {[...tabs, { label: 'More', icon: MenuRounded, more: true }].map((tab) => {
        const Icon = tab.icon;
        const active = tab.more ? moreOpen || !anyActive : !tab.primary && isActive(pathname, tab.path);
        return (
          <ButtonBase
            key={tab.label}
            onClick={() => (tab.more ? onMore() : onNavigate(tab.path))}
            aria-current={active && !tab.more ? 'page' : undefined}
            sx={{
              flex: 1,
              flexDirection: 'column',
              gap: 0.25,
              color: active ? 'primary.main' : 'text.secondary',
              '&:active': { transform: 'scale(.96)' },
            }}
          >
            {tab.primary ? (
              <Box
                sx={{
                  width: 44,
                  height: 32,
                  borderRadius: 999,
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  background: (t) => t.custom.gradient,
                  boxShadow: (t) => `0 4px 12px ${alpha(t.palette.primary.main, 0.35)}`,
                }}
              >
                <Icon sx={{ fontSize: 20 }} />
              </Box>
            ) : (
              <Box
                sx={{
                  width: 44,
                  height: 32,
                  borderRadius: 999,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: active ? (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.22 : 0.1) : 'transparent',
                }}
              >
                <Icon sx={{ fontSize: 22 }} />
              </Box>
            )}
            <Typography variant="caption" sx={{ fontWeight: active || tab.primary ? 700 : 550, lineHeight: 1.1, color: tab.primary ? 'text.primary' : 'inherit' }}>
              {tab.label}
            </Typography>
          </ButtonBase>
        );
      })}
    </Paper>
  );
};

export default MobileBottomNav;
