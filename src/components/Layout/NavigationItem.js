import React from 'react';
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

const NavigationItem = React.memo(({
  route,
  isSelected,
  desktopOpen,
  IconComponent,
  onNavigate,
}) => {
  const theme = useTheme();

  const handleClick = () => {
      onNavigate(route.path);
  };

  return (
    <ListItem disablePadding sx={{ mb: 0.125, px: 0.75 }}>
      <Tooltip title={!desktopOpen ? route.label : ''} placement="right" arrow>
        <ListItemButton
          selected={isSelected}
          onClick={handleClick}
          sx={{
            borderRadius: 0.75,
            minHeight: 34,
            py: 0.625,
            px: desktopOpen ? 1.5 : 0,
            justifyContent: desktopOpen ? 'flex-start' : 'center',
            position: 'relative',
            '&.Mui-selected': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: '20%',
                bottom: '20%',
                width: 3,
                backgroundColor: theme.palette.primary.main,
                borderRadius: '0 2px 2px 0',
              },
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
              },
              '& .MuiListItemIcon-root': {
                color: theme.palette.primary.main,
              },
              '& .MuiListItemText-primary': {
                fontWeight: 600,
                color: theme.palette.primary.main,
              },
            },
            '&:hover': {
              backgroundColor: alpha(theme.palette.action.hover, 0.04),
            },
            transition: 'all 0.15s ease',
          }}
        >
          <ListItemIcon sx={{ 
            minWidth: desktopOpen ? 28 : 'auto',
            justifyContent: 'center',
            display: 'flex',
            alignItems: 'center',
            color: isSelected ? 'primary.main' : 'text.secondary',
          }}>
            <IconComponent 
              sx={{
                fontSize: '1.125rem',
              }}
            />
          </ListItemIcon>
          {desktopOpen && (
            <ListItemText
              primary={route.label}
              primaryTypographyProps={{
                fontSize: '0.8125rem',
                fontWeight: isSelected ? 600 : 500,
                color: isSelected ? 'primary.main' : 'text.primary',
                noWrap: true,
              }}
            />
          )}
        </ListItemButton>
      </Tooltip>
    </ListItem>
  );
});

NavigationItem.displayName = 'NavigationItem';

export default NavigationItem;

