import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  GridLegacy as Grid,
  FormControlLabel,
  Switch,
  IconButton,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import { Close, CheckCircle, Warning, Info } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import useRoleManagement from '../../hooks/useRoleManagement';
import { useDebounce } from '../../hooks/useDebounce';

const RoleForm = ({ open, onClose, onSubmit, role, loading }) => {
  const isEdit = !!role;
  const { listRoles } = useRoleManagement();

  const [roleNameValue, setRoleNameValue] = useState('');
  const [checkingRole, setCheckingRole] = useState(false);
  const [roleExists, setRoleExists] = useState(false);
  const [similarRoles, setSimilarRoles] = useState([]);
  const [validationMessage, setValidationMessage] = useState(null);

  // Debounce role name for existence check
  const debouncedRoleName = useDebounce(roleNameValue, 500);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
    setError,
    clearErrors,
  } = useForm({
    defaultValues: {
      role_name: '',
      desk_access: true,
      two_factor_auth: false,
      restrict_to_domain: '',
      home_page: '',
      is_custom: true,
    },
    mode: 'onChange', // Enable real-time validation
  });

  // Watch role name for real-time validation
  const watchedRoleName = watch('role_name');

  // Check role existence when debounced role name changes (only for create mode)
  useEffect(() => {
    if (!isEdit && debouncedRoleName && debouncedRoleName.trim().length >= 2) {
      checkRoleExists(debouncedRoleName.trim());
    } else {
      setRoleExists(false);
      setSimilarRoles([]);
      setValidationMessage(null);
    }
  }, [debouncedRoleName, isEdit]);

  // Update role name value when watched value changes
  useEffect(() => {
    if (watchedRoleName !== undefined) {
      setRoleNameValue(watchedRoleName);
    }
  }, [watchedRoleName]);

  // Reset form when role changes
  useEffect(() => {
    if (open) {
      if (role) {
        const roleName = role.name || role.role_name || '';
        reset({
          role_name: roleName,
          desk_access: role.desk_access !== undefined ? Boolean(role.desk_access) : true,
          two_factor_auth: role.two_factor_auth !== undefined ? Boolean(role.two_factor_auth) : false,
          restrict_to_domain: role.restrict_to_domain || '',
          home_page: role.home_page || '',
          is_custom: role.is_custom !== undefined ? Boolean(role.is_custom) : true,
        });
        setRoleNameValue(roleName);
      } else {
        reset({
          role_name: '',
          desk_access: true,
          two_factor_auth: false,
          restrict_to_domain: '',
          home_page: '',
          is_custom: true,
        });
        setRoleNameValue('');
      }
      // Reset validation state
      setRoleExists(false);
      setSimilarRoles([]);
      setValidationMessage(null);
      clearErrors('role_name');
    }
  }, [open, role, reset, clearErrors]);

  // Check if role exists
  const checkRoleExists = useCallback(async (roleName) => {
    if (!roleName || roleName.trim().length < 2) {
      setRoleExists(false);
      setSimilarRoles([]);
      setValidationMessage(null);
      return;
    }

    setCheckingRole(true);
    try {
      const result = await listRoles(
        { search: roleName },
        { page: 1, pageSize: 20 }
      );

      if (result.type?.includes('fulfilled') && result.payload?.roles) {
        const roles = result.payload.roles || [];
        const exactMatch = roles.find(
          (r) =>
            (r.name || r.role_name || '').toLowerCase() === roleName.toLowerCase()
        );

        if (exactMatch) {
          setRoleExists(true);
          setValidationMessage({
            type: 'error',
            message: `Role "${exactMatch.name || exactMatch.role_name}" already exists`,
          });
          setError('role_name', {
            type: 'manual',
            message: 'This role already exists',
          });
        } else {
          setRoleExists(false);
          clearErrors('role_name');

          // Find similar roles
          const similar = roles
            .filter((r) => {
              const rName = (r.name || r.role_name || '').toLowerCase();
              return (
                rName.includes(roleName.toLowerCase()) ||
                roleName.toLowerCase().includes(rName)
              );
            })
            .slice(0, 5)
            .map((r) => r.name || r.role_name);

          if (similar.length > 0) {
            setSimilarRoles(similar);
            setValidationMessage({
              type: 'info',
              message: `Similar roles found: ${similar.join(', ')}`,
            });
          } else {
            setSimilarRoles([]);
            setValidationMessage({
              type: 'success',
              message: 'Role name is available',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking role existence:', error);
      setValidationMessage(null);
    } finally {
      setCheckingRole(false);
    }
  }, [listRoles, setError, clearErrors]);

  const onSubmitForm = async (data) => {
    // For create mode, check role existence one more time before submitting
    if (!isEdit) {
      await checkRoleExists(data.role_name.trim());
      if (roleExists) {
        setError('role_name', {
          type: 'manual',
          message: 'This role already exists. Please choose a different name.',
        });
        return;
      }
    }

    // Remove empty strings for optional fields
    const submitData = {
      role_name: data.role_name.trim(),
      desk_access: data.desk_access,
      two_factor_auth: data.two_factor_auth,
      is_custom: data.is_custom,
    };
    
    if (data.restrict_to_domain?.trim()) {
      submitData.restrict_to_domain = data.restrict_to_domain.trim();
    }
    
    if (data.home_page?.trim()) {
      submitData.home_page = data.home_page.trim();
    }

    onSubmit(submitData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmitForm)}>
        <DialogTitle>
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid item>
              {isEdit ? 'Edit Role' : 'Create Role'}
            </Grid>
            <Grid item>
              <IconButton onClick={onClose} size="small">
                <Close />
              </IconButton>
            </Grid>
          </Grid>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Controller
                name="role_name"
                control={control}
                rules={{
                  required: 'Role name is required',
                  minLength: {
                    value: 2,
                    message: 'Role name must be at least 2 characters',
                  },
                  maxLength: {
                    value: 100,
                    message: 'Role name must be less than 100 characters',
                  },
                  pattern: {
                    value: /^[A-Za-z0-9\s\-_]+$/,
                    message: 'Role name can only contain letters, numbers, spaces, hyphens, and underscores',
                  },
                  validate: {
                    noLeadingSpace: (value) =>
                      !value?.startsWith(' ') || 'Role name cannot start with a space',
                    noTrailingSpace: (value) =>
                      !value?.endsWith(' ') || 'Role name cannot end with a space',
                    noDoubleSpace: (value) =>
                      !value?.includes('  ') || 'Role name cannot contain consecutive spaces',
                  },
                }}
                render={({ field }) => (
                  <Box>
                    <TextField
                      {...field}
                      label="Role Name"
                      fullWidth
                      required
                      disabled={isEdit || loading}
                      error={!!errors.role_name || roleExists}
                      helperText={
                        errors.role_name?.message ||
                        (checkingRole && 'Checking availability...') ||
                        (roleExists && 'This role already exists') ||
                        (validationMessage?.type === 'success' && validationMessage.message) ||
                        ''
                      }
                      InputProps={{
                        endAdornment: checkingRole ? (
                          <CircularProgress size={20} />
                        ) : roleExists ? (
                          <Warning color="error" />
                        ) : validationMessage?.type === 'success' && watchedRoleName?.trim().length >= 2 ? (
                          <CheckCircle color="success" />
                        ) : null,
                      }}
                      onChange={(e) => {
                        field.onChange(e);
                        setRoleNameValue(e.target.value);
                        if (roleExists) {
                          clearErrors('role_name');
                          setRoleExists(false);
                          setValidationMessage(null);
                        }
                      }}
                    />
                    {/* Validation Messages */}
                    {!isEdit && watchedRoleName && watchedRoleName.trim().length >= 2 && (
                      <Box sx={{ mt: 1 }}>
                        {validationMessage && (
                          <Alert
                            severity={
                              validationMessage.type === 'error'
                                ? 'error'
                                : validationMessage.type === 'success'
                                ? 'success'
                                : 'info'
                            }
                            icon={
                              validationMessage.type === 'error' ? (
                                <Warning />
                              ) : validationMessage.type === 'success' ? (
                                <CheckCircle />
                              ) : (
                                <Info />
                              )
                            }
                            sx={{ mb: 1 }}
                          >
                            {validationMessage.message}
                          </Alert>
                        )}
                        {similarRoles.length > 0 && !roleExists && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary" gutterBottom>
                              Similar roles:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                              {similarRoles.map((similarRole, index) => (
                                <Chip
                                  key={index}
                                  label={similarRole}
                                  size="small"
                                  variant="outlined"
                                  onClick={() => {
                                    // Don't auto-fill, just show suggestion
                                  }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="desk_access"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch {...field} checked={field.value} />}
                    label="Desk Access"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="two_factor_auth"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch {...field} checked={field.value} />}
                    label="Require Two Factor Authentication"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="is_custom"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch {...field} checked={field.value} />}
                    label="Custom Role"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="restrict_to_domain"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Restrict to Domain (Optional)"
                    fullWidth
                    helperText="Optional: Restrict this role to a specific domain"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="home_page"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Home Page (Optional)"
                    fullWidth
                    helperText="Optional: Default home page route (e.g., '/app')"
                    placeholder="/app"
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || checkingRole || (roleExists && !isEdit)}
          >
            {loading ? <CircularProgress size={20} /> : isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default RoleForm;
