import React from 'react';
import { ListItem, ListItemButton, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';

/**
 * One sidebar link. Always shows its label when the sidebar is expanded; in
 * the collapsed rail it shows the icon with a tooltip.
 */
const NavigationItem = React.memo(({ route, isSelected, desktopOpen, IconComponent, onNavigate }) => (
  <ListItem disablePadding sx={{ display: 'block', mb: 0.125 }}>
    <Tooltip title={!desktopOpen ? route.label : ''} placement="right">
      <ListItemButton
        selected={isSelected}
        onClick={() => onNavigate(route.path)}
        aria-current={isSelected ? 'page' : undefined}
        sx={{
          borderRadius: 2.5,
          minHeight: 38,
          px: desktopOpen ? 1.5 : 0,
          justifyContent: desktopOpen ? 'flex-start' : 'center',
          gap: desktopOpen ? 1.5 : 0,
          color: 'text.secondary',
          transition: 'background-color .15s ease, color .15s ease',
          '& .MuiListItemIcon-root': { color: 'text.secondary', minWidth: 0, justifyContent: 'center' },
          '&:hover': {
            backgroundColor: 'action.hover',
            color: 'text.primary',
            '& .MuiListItemIcon-root': { color: 'text.primary' },
          },
          '&.Mui-selected': {
            backgroundColor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.2 : 0.1),
            color: 'primary.main',
            '& .MuiListItemIcon-root': { color: 'primary.main' },
            '&:hover': {
              backgroundColor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.26 : 0.14),
            },
          },
        }}
      >
        <ListItemIcon>
          <IconComponent sx={{ fontSize: '1.3rem' }} />
        </ListItemIcon>
        {desktopOpen && (
          <ListItemText
            primary={route.label}
            primaryTypographyProps={{
              fontSize: '0.875rem',
              fontWeight: isSelected ? 650 : 500,
              noWrap: true,
              color: 'inherit',
            }}
          />
        )}
      </ListItemButton>
    </Tooltip>
  </ListItem>
));

NavigationItem.displayName = 'NavigationItem';

export default NavigationItem;
