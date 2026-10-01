import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  GridLegacy as Grid,
  Typography,
  Chip,
  IconButton,
  Box,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Close, CheckCircle, Cancel, Security } from '@mui/icons-material';
import useRoleManagement from '../../hooks/useRoleManagement';

const RoleDetails = ({ open, onClose, role }) => {
  const { selectedRole, isLoadingDetails, getRoleDetails } = useRoleManagement();
  const [details, setDetails] = useState(null);

  useEffect(() => {
    if (open && role) {
      const roleName = role.name || role.role_name;
      if (roleName) {
        getRoleDetails(roleName).then((result) => {
          if (result.type?.includes('fulfilled') && result.payload) {
            setDetails(result.payload);
          } else {
            // Fallback to the role prop if details fetch fails
            setDetails(role);
          }
        });
      }
    }
  }, [open, role]);

  if (!open || !role) return null;

  const roleData = details || role;
  const roleName = roleData.name || roleData.role_name;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Security />
            <Typography variant="h6">Role Details: {roleName}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {isLoadingDetails ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Role Name
              </Typography>
              <Typography variant="body1" gutterBottom>
                {roleName}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Status
              </Typography>
              <Chip
                label={roleData.disabled ? 'Disabled' : 'Enabled'}
                color={roleData.disabled ? 'default' : 'success'}
                icon={roleData.disabled ? <Cancel /> : <CheckCircle />}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Desk Access
              </Typography>
              <Chip
                label={roleData.desk_access ? 'Yes' : 'No'}
                color={roleData.desk_access ? 'success' : 'default'}
                icon={roleData.desk_access ? <CheckCircle /> : <Cancel />}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Two Factor Authentication
              </Typography>
              <Chip
                label={roleData.two_factor_auth ? 'Required' : 'Not Required'}
                color={roleData.two_factor_auth ? 'warning' : 'default'}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Role Type
              </Typography>
              <Chip
                label={roleData.is_custom ? 'Custom' : 'Standard'}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Users Assigned
              </Typography>
              <Typography variant="body1">
                {roleData.user_count || 0} user(s)
              </Typography>
            </Grid>

            {roleData.restrict_to_domain && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Restricted to Domain
                </Typography>
                <Typography variant="body1">{roleData.restrict_to_domain}</Typography>
              </Grid>
            )}

            {roleData.home_page && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Home Page
                </Typography>
                <Typography variant="body1">{roleData.home_page}</Typography>
              </Grid>
            )}

            {roleData.permission_count !== undefined && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Permissions
                </Typography>
                <Typography variant="body1">
                  {roleData.permission_count} permission(s) configured
                </Typography>
              </Grid>
            )}

            {roleData.doctypes_with_permissions && roleData.doctypes_with_permissions.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  DocTypes with Permissions
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {roleData.doctypes_with_permissions.map((doctype) => (
                    <Chip key={doctype} label={doctype} size="small" variant="outlined" />
                  ))}
                </Box>
              </Grid>
            )}

            {roleData.is_automatic && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="warning.main">
                  Note: This is an automatic/system role and cannot be modified or deleted.
                </Typography>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoleDetails;
