import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  GridLegacy as Grid,
  Chip,
  IconButton,
  Container,
  Divider,
  CircularProgress,
  Paper,
} from '@mui/material';
import { ArrowBack, CheckCircle, Cancel, Security } from '@mui/icons-material';
import useRoleManagement from '../../hooks/useRoleManagement';

const RoleDetails = () => {
  const navigate = useNavigate();
  const { roleName } = useParams();
  const { selectedRole, isLoadingDetails, getRoleDetails } = useRoleManagement();
  const [details, setDetails] = useState(null);

  useEffect(() => {
    if (roleName) {
      const decodedRoleName = decodeURIComponent(roleName);
      getRoleDetails(decodedRoleName).then((result) => {
        if (result.type?.includes('fulfilled') && result.payload) {
          setDetails(result.payload);
        }
      });
    }
  }, [roleName, getRoleDetails]);

  if (isLoadingDetails) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const roleData = details || selectedRole;
  if (!roleData) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h6" color="error">
            Role not found
          </Typography>
          <Button onClick={() => navigate('/roles')} sx={{ mt: 2 }}>
            Back to Roles
          </Button>
        </Box>
      </Container>
    );
  }

  const displayRoleName = roleData.name || roleData.role_name;

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/roles')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Security />
            <Typography variant="h4" component="h1">
              Role Details: {displayRoleName}
            </Typography>
          </Box>
        </Box>

        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Role Name
              </Typography>
              <Typography variant="body1" gutterBottom>
                {displayRoleName}
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

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/roles')}
            >
              Back to Roles
            </Button>
            <Button
              variant="contained"
              startIcon={<Security />}
              onClick={() => navigate(`/roles/${encodeURIComponent(displayRoleName)}/permissions`)}
            >
              Manage Permissions
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RoleDetails;

