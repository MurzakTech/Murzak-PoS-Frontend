import React from 'react';
import { Box, Typography, Button, IconButton, Tooltip, alpha, Skeleton } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * PageHeader Component
 * Modern, minimal header for list pages with title, stats, and action buttons
 */
const PageHeader = ({
  title,
  subtitle,
  icon: Icon,
  stats = [],
  actions = [],
  loading = false,
}) => {
  const theme = useTheme();

  // Helper to resolve color value from theme reference or direct color
  const resolveColor = (colorValue) => {
    if (!colorValue) return theme.palette.primary.main;
    
    // If it's already a valid color format (hex, rgb, etc.), return as is
    if (typeof colorValue === 'string' && (colorValue.startsWith('#') || colorValue.startsWith('rgb') || colorValue.startsWith('hsl'))) {
      return colorValue;
    }
    
    // If it's a theme reference string like 'primary.main', resolve it
    if (typeof colorValue === 'string' && colorValue.includes('.')) {
      const parts = colorValue.split('.');
      let resolved = theme.palette;
      for (const part of parts) {
        if (resolved && resolved[part]) {
          resolved = resolved[part];
        } else {
          return theme.palette.primary.main; // Fallback
        }
      }
      return resolved;
    }
    
    // Fallback to primary color
    return theme.palette.primary.main;
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Skeleton variant="circular" width={32} height={32} />
          <Box>
            <Skeleton width={150} height={24} />
            <Skeleton width={100} height={16} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton variant="rounded" width={100} height={28} />
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 2,
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      {/* Left side - Title and Stats */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {/* Icon and Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {Icon && (
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
              }}
            >
              <Icon sx={{ fontSize: '1.125rem' }} />
            </Box>
          )}
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                color: 'text.primary',
                fontSize: '1rem',
                lineHeight: 1.2,
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Stats Pills */}
        {stats.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              ml: 1,
              pl: 2,
              borderLeft: 1,
              borderColor: 'divider',
            }}
          >
            {stats.map((stat, index) => {
              const statColor = resolveColor(stat.color);
              
              return (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    py: 0.25,
                    borderRadius: 0.5,
                    backgroundColor: alpha(statColor, 0.08),
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: stat.color || 'primary.main',
                      fontSize: '0.6875rem',
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontSize: '0.625rem' }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Right side - Actions */}
      {actions.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {actions.map((action, index) => {
            if (action.type === 'icon') {
              return (
                <Tooltip key={index} title={action.tooltip || action.label}>
                  <IconButton
                    size="small"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        borderColor: alpha(theme.palette.primary.main, 0.3),
                      },
                    }}
                  >
                    {action.icon}
                  </IconButton>
                </Tooltip>
              );
            }

            return (
              <Button
                key={index}
                variant={action.variant || 'contained'}
                size="small"
                color={action.color || 'primary'}
                startIcon={action.icon}
                onClick={action.onClick}
                disabled={action.disabled}
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  ...action.sx,
                }}
              >
                {action.label}
              </Button>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default PageHeader;
