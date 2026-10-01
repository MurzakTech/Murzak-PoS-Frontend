import React from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Tooltip,
  alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Inventory } from '@mui/icons-material';

const SubMenu = ({
  children,
  isExpanded,
  desktopOpen,
  iconMap,
  isChildSelected,
  onNavigate,
}) => {
  const theme = useTheme();

  return (
    <Collapse 
      in={isExpanded} 
      timeout={200}
      unmountOnExit
      sx={{
        '& .MuiCollapse-wrapper': {
          transition: 'opacity 0.2s ease-in-out',
        },
      }}
    >
      <List 
        component="div" 
        disablePadding 
        sx={{ 
          pl: 2,
          '@keyframes fadeInSlide': {
            '0%': {
              opacity: 0,
              transform: 'translateX(-8px)',
            },
            '100%': {
              opacity: 1,
              transform: 'translateX(0)',
            },
          },
        }}
      >
        {children
          .filter((childRoute) => !childRoute.hideFromMenu)
          .map((childRoute, index) => {
          const ChildIconComponent = iconMap[childRoute.icon] || null;
          const isChildRouteSelected = isChildSelected(childRoute.path);
          
          return (
            <ListItem 
              key={childRoute.path} 
              disablePadding 
              sx={{ 
                mb: 0.5,
                ...(isExpanded && {
                  animation: 'fadeInSlide 0.2s ease-out forwards',
                  animationDelay: `${index * 15}ms`,
                }),
              }}
            >
              <Tooltip title={!desktopOpen ? childRoute.label : ''} placement="right">
                <ListItemButton
                  selected={isChildRouteSelected}
                  onClick={() => onNavigate(childRoute.path)}
                  sx={{
                    borderRadius: 2,
                    minHeight: 40,
                    pl: 3,
                    position: 'relative',
                    transition: 'all 0.15s ease-in-out',
                    '&::before': isChildRouteSelected ? {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: '60%',
                      backgroundColor: theme.palette.primary.main,
                      borderRadius: '0 2px 2px 0',
                    } : {},
                    '&.Mui-selected': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.15),
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.2),
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
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    },
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: 32, 
                    justifyContent: 'center',
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    {ChildIconComponent ? (
                      <ChildIconComponent 
                        fontSize="small" 
                        color={isChildRouteSelected ? 'primary' : 'inherit'} 
                      />
                    ) : (
                      <Inventory 
                        fontSize="small" 
                        color={isChildRouteSelected ? 'primary' : 'inherit'} 
                      />
                    )}
                  </ListItemIcon>
                  <ListItemText 
                    primary={childRoute.label} 
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                  />
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>
    </Collapse>
  );
};

export default SubMenu;

