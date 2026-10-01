import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  GridLegacy as Grid,
  FormControlLabel,
  Switch,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
  Container,
  Paper,
} from '@mui/material';
import { ArrowBack, CheckCircle, Warning, Info } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import useRoleManagement from '../../hooks/useRoleManagement';
import { useDebounce } from '../../hooks/useDebounce';

const RoleForm = () => {
  const navigate = useNavigate();
  const { roleName } = useParams();
  const isEdit = !!roleName;
  const { listRoles, createRole, updateRole, getRoleDetails } = useRoleManagement();

  const [roleNameValue, setRoleNameValue] = useState('');
  const [checkingRole, setCheckingRole] = useState(false);
  const [roleExists, setRoleExists] = useState(false);
  const [similarRoles, setSimilarRoles] = useState([]);
  const [validationMessage, setValidationMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [roleData, setRoleData] = useState(null);

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
    mode: 'onChange',
  });

  // Watch role name for real-time validation
  const watchedRoleName = watch('role_name');

  // Load role data if editing
  useEffect(() => {
    if (isEdit && roleName) {
      const decodedRoleName = decodeURIComponent(roleName);
      setIsLoading(true);
      getRoleDetails(decodedRoleName).then((result) => {
        setIsLoading(false);
        if (result.type?.includes('fulfilled') && result.payload) {
          const role = result.payload;
          setRoleData(role);
          const roleNameValue = role.name || role.role_name || '';
          reset({
            role_name: roleNameValue,
            desk_access: role.desk_access !== undefined ? Boolean(role.desk_access) : true,
            two_factor_auth: role.two_factor_auth !== undefined ? Boolean(role.two_factor_auth) : false,
            restrict_to_domain: role.restrict_to_domain || '',
            home_page: role.home_page || '',
            is_custom: role.is_custom !== undefined ? Boolean(role.is_custom) : true,
          });
          setRoleNameValue(roleNameValue);
        }
      });
    }
  }, [isEdit, roleName, getRoleDetails, reset]);

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

    setIsLoading(true);

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

    try {
      let result;
      if (isEdit) {
        const decodedRoleName = decodeURIComponent(roleName);
        result = await updateRole(decodedRoleName, submitData);
      } else {
        result = await createRole(submitData);
      }

      if (result.type?.includes('fulfilled')) {
        navigate('/roles');
      }
    } catch (error) {
      console.error('Error saving role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isEdit && isLoading && !roleData) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/roles')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            {isEdit ? 'Edit Role' : 'Create Role'}
          </Typography>
        </Box>

        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit(onSubmitForm)}>
            <Grid container spacing={2}>
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
                        disabled={isEdit || isLoading}
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

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/roles')}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isLoading || checkingRole || (roleExists && !isEdit)}
                  >
                    {isLoading ? <CircularProgress size={20} /> : isEdit ? 'Update' : 'Create'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default RoleForm;

