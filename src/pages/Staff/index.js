import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  CircularProgress,
  Tooltip,
  Menu,
  Switch,
  FormControlLabel,
  Grid,
  Avatar,
  alpha,
  InputAdornment,
  Stack,
  Divider,
  Alert,
  Badge,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  FormLabel,
  Tab,
  Tabs,
  Autocomplete,

} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Visibility,
  PersonAdd,
  Security,
  Block,
  CheckCircle,
  Search,
  Clear,
  FilterList,
  Email,
  Phone,
  Person,
  PersonOff,
  CalendarToday,
  Business,
  Key,
  Send,
  Group,
  VerifiedUser,
  ArrowDropDown,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import {
  getStaffUsers,
  getAllRoles,
  createStaffUser,
  updateStaffUser,
  assignRolesToStaff,
  removeRolesFromStaff,
  disableStaffUser,
  enableStaffUser,
  getStaffUserDetails,
  clearSelectedStaffUser,
} from '../../store/staffSlice';
import { showNotification } from '../../store/notificationSlice';
import { useTheme } from '@mui/material/styles';
import ConfirmDialog from '../../components/Common/ConfirmDialog';

const Staff = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { staffUsers, roles, isLoading, isLoadingRoles, selectedStaffUser } = useAppSelector(
    (state) => state.staff
  );
  const { user } = useAppSelector((state) => state.auth);
  const userCompany = user?.company || user?.custom_company || user?.company_name || user?.company_data?.name || user?.company_data?.company_name;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingUserAction, setPendingUserAction] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleDialogUser, setRoleDialogUser] = useState(null);
  const [enabledOnly, setEnabledOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState('all');
  const [selectedRolesFilter, setSelectedRolesFilter] = useState([]);
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const [searchableRoles, setSearchableRoles] = useState([]);
  const searchTimeoutRef = useRef(null);

  const {
    control: createControl,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm({
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      phone: '',
      roles: [],
      enabled: true,
      send_welcome_email: false,
    },
  });

  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    watch: watchEdit,
    formState: { errors: editErrors },
  } = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      enabled: true,
      userEmail: '', // Store email in form to preserve it
    },
  });

  const {
    control: roleControl,
    handleSubmit: handleRoleSubmit,
    reset: resetRole,
    watch: watchRole,
  } = useForm({
    defaultValues: {
      roles: [],
      replaceExisting: false,
    },
  });

  useEffect(() => {
    dispatch(getStaffUsers({ enabledOnly }));
    dispatch(getAllRoles());
  }, [dispatch, enabledOnly]);

  // Debounced server-side role search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If search term is empty, use existing roles from Redux store
    if (!roleSearchTerm.trim()) {
      setSearchableRoles(roles);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      dispatch(getAllRoles({ search: roleSearchTerm })).then((result) => {
        if (result.type === 'staff/getAllRoles/fulfilled') {
          setSearchableRoles(result.payload.roles || []);
        }
      });
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [roleSearchTerm, dispatch, roles]);

  // Initialize searchable roles when roles are loaded (only if no search is active and dialog is open)
  useEffect(() => {
    if (roles.length > 0 && !roleSearchTerm && (createDialogOpen || roleDialogOpen)) {
      setSearchableRoles(roles);
    }
  }, [roles, roleSearchTerm, createDialogOpen, roleDialogOpen]);

  const handleMenuOpen = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleCreateOpen = () => {
    resetCreate();
    setRoleSearchTerm('');
    setSearchableRoles(roles.length > 0 ? roles : []);
    setCreateDialogOpen(true);
  };

  const handleCreateClose = () => {
    setCreateDialogOpen(false);
    setRoleSearchTerm('');
    resetCreate();
  };

  const handleEditOpen = (user) => {
    const userEmail = user.email || user.name || '';
    resetEdit({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.mobile_no || user.phone || '',
      enabled: user.enabled === 1,
      userEmail: userEmail, // Store email in form
    });
    setSelectedUser(user);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedUser(null);
    resetEdit();
  };

  const handleViewOpen = async (user) => {
    setSelectedUser(user);
    await dispatch(getStaffUserDetails(user.email));
    setViewDialogOpen(true);
    handleMenuClose();
  };

  const handleViewClose = () => {
    setViewDialogOpen(false);
    setSelectedUser(null);
    dispatch(clearSelectedStaffUser());
  };

  const handleRoleOpen = (user) => {
    resetRole({
      roles: user.roles || [],
      replaceExisting: false,
    });
    setRoleDialogUser(user);
    setRoleSearchTerm('');
    setSearchableRoles(roles.length > 0 ? roles : []);
    setRoleDialogOpen(true);
    handleMenuClose();
  };

  const handleRoleClose = () => {
    setRoleDialogOpen(false);
    setRoleDialogUser(null);
    setRoleSearchTerm('');
    resetRole();
  };

  const onCreateSubmit = async (data) => {
    const result = await dispatch(
      createStaffUser({
        ...data,
        company: userCompany || '',
      })
    );
    if (result.type === 'staff/createStaffUser/fulfilled') {
      handleCreateClose();
      dispatch(getStaffUsers({ enabledOnly }));
    }
  };

  const onEditSubmit = async (data) => {
    // Get email from form data first, then fallback to selectedUser
    const userEmail = data.userEmail || selectedUser?.email || selectedUser?.name;
    
    if (!userEmail) {
      dispatch(showNotification({
        message: 'Staff member email is missing. Please try again.',
        severity: 'error',
        title: 'Error',
      }));
      return;
    }

    // Remove userEmail from data before sending (it's not part of the update payload)
    const { userEmail: _, ...updateData } = data;

    const result = await dispatch(
      updateStaffUser({
        userEmail: userEmail,
        ...updateData,
      })
    );
    if (result.type === 'staff/updateStaffUser/fulfilled') {
      // Close edit and role dialogs
      handleEditClose();
      handleRoleClose();
      
      // If view dialog is open, reload staff details to show updated info
      if (viewDialogOpen && userEmail) {
        await dispatch(getStaffUserDetails(userEmail));
      } else {
        // If view dialog is not open, close it to prevent stale state
        handleViewClose();
      }
      
      dispatch(getStaffUsers({ enabledOnly }));
    }
  };

  const onRoleSubmit = async (data) => {
    // Use roleDialogUser or fallback to selectedStaffUser
    const user = roleDialogUser || selectedStaffUser;
    
    if (!user || !user.email) {
      console.error('No user selected for role update');
      return;
    }

    const currentRoles = user.roles || [];
    const newRoles = data.roles.filter((role) => !currentRoles.includes(role));
    const removedRoles = currentRoles.filter((role) => !data.roles.includes(role));

    if (data.replaceExisting) {
      const result = await dispatch(
        assignRolesToStaff({
          userEmail: user.email,
          roles: data.roles,
          replaceExisting: true,
        })
      );
      if (assignRolesToStaff.fulfilled.match(result)) {
        // Close edit and role dialogs
        handleRoleClose();
        handleEditClose();
        
        // If view dialog is open, reload staff details to show updated info
        if (viewDialogOpen && user.email) {
          await dispatch(getStaffUserDetails(user.email));
        } else {
          // If view dialog is not open, close it to prevent stale state
          handleViewClose();
        }
        
        dispatch(getStaffUsers({ enabledOnly }));
      }
    } else {
      if (newRoles.length > 0) {
        await dispatch(
          assignRolesToStaff({
            userEmail: user.email,
            roles: newRoles,
            replaceExisting: false,
          })
        );
      }
      if (removedRoles.length > 0) {
        await dispatch(
          removeRolesFromStaff({
            userEmail: user.email,
            roles: removedRoles,
          })
        );
      }
      // Close edit and role dialogs
      handleRoleClose();
      handleEditClose();
      
      // If view dialog is open, reload staff details to show updated info
      if (viewDialogOpen && user.email) {
        await dispatch(getStaffUserDetails(user.email));
      } else {
        // If view dialog is not open, close it to prevent stale state
        handleViewClose();
      }
      
      dispatch(getStaffUsers({ enabledOnly }));
    }
  };

  const handleToggleEnabled = (user) => {
    // Show confirmation dialog for disable action, directly enable otherwise
    if (user.enabled === 1) {
      setPendingUserAction(user);
      setConfirmDialogOpen(true);
      handleMenuClose();
    } else {
      // Enable directly without confirmation
      handleConfirmToggle(user);
      handleMenuClose();
    }
  };

  const handleConfirmToggle = async (user) => {
    if (user.enabled === 1) {
      await dispatch(disableStaffUser(user.email));
    } else {
      await dispatch(enableStaffUser(user.email));
    }
    dispatch(getStaffUsers({ enabledOnly }));
  };

  const handleConfirmDialogConfirm = async () => {
    if (pendingUserAction) {
      await handleConfirmToggle(pendingUserAction);
      setPendingUserAction(null);
      setConfirmDialogOpen(false);
    }
  };

  const handleConfirmDialogClose = () => {
    setConfirmDialogOpen(false);
    setPendingUserAction(null);
  };

  const selectedRoles = watchRole('roles');

  // Smart filtering
  const filteredStaffUsers = useMemo(() => {
    let filtered = staffUsers;

    // Apply tab filter
    if (tabValue === 'active') {
      filtered = filtered.filter(user => user.enabled === 1);
    } else if (tabValue === 'inactive') {
      filtered = filtered.filter(user => user.enabled === 0);
    }

    // Apply role filter
    if (selectedRolesFilter.length > 0) {
      filtered = filtered.filter(user =>
        user.roles && selectedRolesFilter.every(role => user.roles.includes(role))
      );
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((user) => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.full_name || '';
        const email = user.email || '';
        const phone = user.mobile_no || user.phone || '';
        return (
          fullName.toLowerCase().includes(searchLower) ||
          email.toLowerCase().includes(searchLower) ||
          phone.toLowerCase().includes(searchLower) ||
          (user.roles && user.roles.some((role) => role.toLowerCase().includes(searchLower)))
        );
      });
    }

    return filtered;
  }, [staffUsers, searchTerm, tabValue, selectedRolesFilter]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 4, 
          mb: 4, 
          borderRadius: 3,
          background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
          border: 1,
          borderColor: 'divider'
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
              Staff Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage staff members, roles, and permissions
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={handleCreateOpen}
            sx={{ 
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              py: 1.5
            }}
          >
            Add New Staff
          </Button>
        </Stack>
      </Paper>

      {/* Filters and Search */}
      <Paper
  sx={{
    p: 3,
    mb: 3,
    borderRadius: 3,
  }}
>
  <Stack spacing={3}>

    {/* ===== STATUS TABS ===== */}
    <TabContext value={tabValue}>
      <Box>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          aria-label="staff status tabs"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
            },
          }}
        >
          <Tab
            value="all"
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <Group fontSize="small" />
                <span>All Staff</span>
                <Chip
                  label={staffUsers.length}
                  size="small"
                  variant="outlined"
                />
              </Stack>
            }
          />

          <Tab
            value="active"
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircle fontSize="small" color="success" />
                <span>Active</span>
                <Chip
                  label={staffUsers.filter(u => u.enabled === 1).length}
                  size="small"
                  color="success"
                  variant="outlined"
                />
              </Stack>
            }
          />

          <Tab
            value="inactive"
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <PersonOff fontSize="small" color="error" />
                <span>Inactive</span>
                <Chip
                  label={staffUsers.filter(u => u.enabled === 0).length}
                  size="small"
                  color="error"
                  variant="outlined"
                />
              </Stack>
            }
          />
        </Tabs>
      </Box>
    </TabContext>

    <Divider />

    {/* ===== SEARCH & FILTERS ===== */}
    <Grid container spacing={3} alignItems="flex-end">

      {/* SEARCH */}
      <Grid item xs={12} md={5}>
        <FormLabel sx={{ mb: 0.5 }}>
          Search Staff
        </FormLabel>
        <TextField
          fullWidth
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Name, email, phone, or role"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearchTerm('')}
                >
                  <Clear fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Grid>

      {/* ROLE FILTER */}
      <Grid item xs={12} md={4}>
        <FormLabel sx={{ mb: 0.5 }}>
          Filter by Role
        </FormLabel>
        <TextField
          select
          fullWidth
          variant="outlined"
          SelectProps={{
            multiple: true,
            renderValue: (selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((role) => (
                  <Chip
                    key={role}
                    label={role}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            ),
          }}
          value={selectedRolesFilter}
          onChange={(e) => setSelectedRolesFilter(e.target.value)}
        >
          {roles.map((role) => (
            <MenuItem key={role.name} value={role.name}>
              <Checkbox checked={selectedRolesFilter.includes(role.name)} />
              <ListItemText primary={role.label} />
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      {/* ENABLED SWITCH */}
      <Grid item xs={12} md={3}>
        <FormLabel sx={{ mb: 0.5 }}>
          Status Filter
        </FormLabel>
        <FormControlLabel
          control={
            <Switch
              checked={enabledOnly}
              onChange={(e) => setEnabledOnly(e.target.checked)}
            />
          }
          label={
            <Box>
              <Typography variant="body2">
                Enabled Only
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Hide disabled staff
              </Typography>
            </Box>
          }
          sx={{ alignItems: 'flex-start', ml: 0 }}
        />
      </Grid>

    </Grid>

  </Stack>
</Paper>


      {/* Staff Table */}
      <Paper 
        elevation={0}
        sx={{ 
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              borderRadius: 3,
            }}
          >
            <Stack alignItems="center" spacing={2}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                Loading staff members...
              </Typography>
            </Stack>
          </Box>
        )}
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600, pl: 4 }}>Staff Member</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Roles</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 600, pr: 4 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStaffUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Stack alignItems="center" spacing={2}>
                      <Search sx={{ fontSize: 48, color: 'grey.400' }} />
                      <Typography variant="h6" color="text.secondary">
                        No Staff Members Found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {searchTerm || selectedRolesFilter.length > 0 
                          ? 'Try adjusting your filters or search terms'
                          : 'No staff members available. Add your first staff member!'}
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<PersonAdd />}
                        onClick={handleCreateOpen}
                        sx={{ mt: 2 }}
                      >
                        Add First Staff Member
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaffUsers.map((user) => (
                  <TableRow 
                    key={user.email} 
                    hover
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell sx={{ pl: 4 }}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ 
                          bgcolor: user.enabled ? 'primary.main' : 'grey.400',
                          width: 40,
                          height: 40
                        }}>
                          {getInitials(user.full_name || user.email)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {user.full_name || `${user.first_name} ${user.last_name}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {user.name || user.email.split('@')[0]}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Email fontSize="small" color="action" />
                          <Typography variant="body2" noWrap>
                            {user.email}
                          </Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Phone fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {user.mobile_no || user.phone || 'No phone'}
                          </Typography>
                        </Stack>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 200 }}>
                        {user.roles && user.roles.length > 0 ? (
                          <>
                            {user.roles.slice(0, 2).map((role) => (
                              <Chip
                                key={role}
                                label={role}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            ))}
                            {user.roles.length > 2 && (
                              <Tooltip 
                                title={
                                  <Box sx={{ p: 1 }}>
                                    {user.roles.slice(2).map(role => (
                                      <Chip 
                                        key={role} 
                                        label={role} 
                                        size="small" 
                                        sx={{ m: 0.5 }}
                                      />
                                    ))}
                                  </Box>
                                }
                              >
                                <Chip
                                  label={`+${user.roles.length - 2}`}
                                  size="small"
                                />
                              </Tooltip>
                            )}
                          </>
                        ) : (
                          <Typography variant="caption" color="text.secondary" fontStyle="italic">
                            No roles
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.enabled === 1 ? 'Active' : 'Inactive'}
                        size="small"
                        color={user.enabled === 1 ? 'success' : 'error'}
                        icon={user.enabled === 1 ? <CheckCircle /> : <Block />}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {user.creation
                            ? new Date(user.creation).toLocaleDateString()
                            : 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.creation
                            ? new Date(user.creation).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right" sx={{ pr: 4 }}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewOpen(user)}
                            sx={{ 
                              border: 1,
                              borderColor: 'divider'
                            }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEditOpen(user)}
                            sx={{ 
                              border: 1,
                              borderColor: 'divider'
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="More Actions">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, user)}
                            sx={{ 
                              border: 1,
                              borderColor: 'divider'
                            }}
                          >
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => handleRoleOpen(selectedUser)} sx={{ py: 1.5 }}>
          <Security sx={{ mr: 2, fontSize: 20 }} />
          <Box>
            <Typography variant="body2">Manage Roles</Typography>
            <Typography variant="caption" color="text.secondary">
              Assign or remove permissions
            </Typography>
          </Box>
        </MenuItem>
        <MenuItem onClick={() => handleToggleEnabled(selectedUser)} sx={{ py: 1.5 }}>
          {selectedUser?.enabled === 1 ? (
            <>
              <Block sx={{ mr: 2, fontSize: 20 }} color="error" />
              <Box>
                <Typography variant="body2">Disable Account</Typography>
                <Typography variant="caption" color="text.secondary">
                  Prevent user from accessing
                </Typography>
              </Box>
            </>
          ) : (
            <>
              <CheckCircle sx={{ mr: 2, fontSize: 20 }} color="success" />
              <Box>
                <Typography variant="body2">Enable Account</Typography>
                <Typography variant="caption" color="text.secondary">
                  Restore user access
                </Typography>
              </Box>
            </>
          )}
        </MenuItem>
      </Menu>

      {/* Create Staff Dialog */}
      <Dialog
  open={createDialogOpen}
  onClose={isLoading ? undefined : handleCreateClose}
  maxWidth="md"
  fullWidth
  PaperProps={{
    sx: {
      borderRadius: 3,
    },
  }}
>
  <form onSubmit={handleCreateSubmit(onCreateSubmit)}>

    {/* ===== HEADER ===== */}
    <DialogTitle sx={{ px: 4, py: 3, borderBottom: 1, borderColor: 'divider' }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <PersonAdd color="primary" />
        <Box>
          <Typography variant="h6" fontWeight={600}>
            Create New Staff Member
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add a new staff member to your organization
          </Typography>
        </Box>
      </Stack>
    </DialogTitle>

    {/* ===== CONTENT ===== */}
    <DialogContent sx={{ px: 4, py: 3 }}>
      <Grid container spacing={3}>

        {/* PERSONAL INFO */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight={600}>
            Personal Information
          </Typography>
          <Divider sx={{ mt: 1 }} />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormLabel sx={{ mb: 0.5 }}>First Name</FormLabel>
          <Controller
            name="first_name"
            control={createControl}
            rules={{ required: 'First name is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                variant="outlined"
                error={!!createErrors.first_name}
                helperText={createErrors.first_name?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormLabel sx={{ mb: 0.5 }}>Last Name</FormLabel>
          <Controller
            name="last_name"
            control={createControl}
            rules={{ required: 'Last name is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                variant="outlined"
                error={!!createErrors.last_name}
                helperText={createErrors.last_name?.message}
              />
            )}
          />
        </Grid>

        {/* ACCOUNT DETAILS */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight={600}>
            Account Details
          </Typography>
          <Divider sx={{ mt: 1 }} />
        </Grid>

        <Grid item xs={12}>
          <FormLabel sx={{ mb: 0.5 }}>Email Address</FormLabel>
          <Controller
            name="email"
            control={createControl}
            rules={{
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                type="email"
                fullWidth
                variant="outlined"
                error={!!createErrors.email}
                helperText={createErrors.email?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <FormLabel sx={{ mb: 0.5 }}>Password</FormLabel>
          <Controller
            name="password"
            control={createControl}
            rules={{
              required: 'Password is required',
              minLength: { value: 8, message: 'Minimum 8 characters' },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                type="password"
                fullWidth
                variant="outlined"
                error={!!createErrors.password}
                helperText={createErrors.password?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Key fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <FormLabel sx={{ mb: 0.5 }}>Phone Number</FormLabel>
          <Controller
            name="phone"
            control={createControl}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                variant="outlined"
                placeholder="+254712345678"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
        </Grid>

        {/* ROLES */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight={600}>
            Roles & Access
          </Typography>
          <Divider sx={{ mt: 1 }} />
        </Grid>

        <Grid item xs={12}>
          <FormLabel sx={{ mb: 0.5 }}>Assign Roles</FormLabel>
          <Controller
            name="roles"
            control={createControl}
            render={({ field: { onChange, value, ...field } }) => {
              // Merge selected roles with searchable roles to ensure selected roles are always visible
              const selectedRoleObjects = roles.filter((role) => value.includes(role.name));
              const searchableRoleNames = new Set(searchableRoles.map(r => r.name));
              const selectedNotInSearchable = selectedRoleObjects.filter(r => !searchableRoleNames.has(r.name));
              const availableOptions = [...selectedNotInSearchable, ...searchableRoles];
              
              return (
                <Autocomplete
                  {...field}
                  multiple
                  options={availableOptions}
                  inputValue={roleSearchTerm}
                  onInputChange={(event, newInputValue) => {
                    setRoleSearchTerm(newInputValue);
                  }}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') {
                      const roleObj = roles.find((r) => r.name === option);
                      return roleObj?.label || option;
                    }
                    return option.label || option.name || '';
                  }}
                  value={availableOptions.filter((role) => value.includes(role.name))}
                  onChange={(event, newValue) => {
                    onChange(newValue.map((role) => role.name));
                  }}
                  filterOptions={(x) => x} // Disable client-side filtering since we do server-side
                  isOptionEqualToValue={(option, value) => option.name === value.name}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search and select roles..."
                      variant="outlined"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <Security fontSize="small" color="action" />
                            </InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.name}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Typography variant="body2" fontWeight={500}>
                          {option.label || option.name}
                        </Typography>
                        {option.description && (
                          <Typography variant="caption" color="text.secondary">
                            {option.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.name}
                        label={option.label || option.name}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    ))
                  }
                  noOptionsText="No roles found"
                  loading={isLoadingRoles}
                />
              );
            }}
          />
        </Grid>

        {/* STATUS */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight={600}>
            Account Status
          </Typography>
          <Divider sx={{ mt: 1 }} />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Controller
            name="enabled"
            control={createControl}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={!!field.value} />}
                label={
                  <Box>
                    <Typography variant="body2">
                      Account Enabled
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      User can login immediately
                    </Typography>
                  </Box>
                }
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Controller
            name="send_welcome_email"
            control={createControl}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={!!field.value} />}
                label={
                  <Box>
                    <Typography variant="body2">
                      Send Welcome Email
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Send login credentials
                    </Typography>
                  </Box>
                }
              />
            )}
          />
        </Grid>

      </Grid>
    </DialogContent>

    {/* ===== FOOTER ===== */}
    <DialogActions
      sx={{
        px: 4,
        py: 2,
        borderTop: 1,
        borderColor: 'divider',
        position: 'sticky',
        bottom: 0,
        backgroundColor: 'background.paper',
      }}
    >
      <Button onClick={handleCreateClose} disabled={isLoading}>
        Cancel
      </Button>
      <Button
        type="submit"
        variant="contained"
        disabled={isLoading}
        sx={{ px: 3 }}
      >
        {isLoading ? <CircularProgress size={20} /> : 'Create Staff Member'}
      </Button>
    </DialogActions>

  </form>
</Dialog>


      {/* Edit Staff Dialog - Similar structure but for editing */}
      <Dialog
  open={editDialogOpen}
  onClose={handleEditClose}
  maxWidth="sm"
  fullWidth
  PaperProps={{
    sx: {
      borderRadius: 3,
      maxHeight: '90vh', // prevents overflow on small screens
    },
  }}
>
  <form onSubmit={handleEditSubmit(onEditSubmit)}>

    {/* 🔹 Sticky Header */}
    <DialogTitle
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 2,
        backgroundColor: 'background.paper',
        p: 3,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <Edit color="primary" />
        <Box>
          <Typography variant="h6" fontWeight={600}>
            Edit Staff Member
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedUser?.email || selectedUser?.name || 'N/A'}
          </Typography>
        </Box>
      </Stack>
    </DialogTitle>

    {/* 🔹 Scrollable Content */}
    <DialogContent
      dividers
      sx={{
        p: 3,
        overflowY: 'auto',
      }}
    >
      <Grid container spacing={3}>

        <Grid item xs={12} sm={6}>
          <Controller
            name="first_name"
            control={editControl}
            rules={{ required: 'First name is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="First Name"
                fullWidth
                required
                error={!!editErrors.first_name}
                helperText={editErrors.first_name?.message}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Controller
            name="last_name"
            control={editControl}
            rules={{ required: 'Last name is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Last Name"
                fullWidth
                required
                error={!!editErrors.last_name}
                helperText={editErrors.last_name?.message}
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <Controller
            name="phone"
            control={editControl}
            render={({ field }) => (
              <TextField
                {...field}
                label="Phone Number"
                fullWidth
                placeholder="+254712345678"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <Controller
            name="enabled"
            control={editControl}
            render={({ field }) => (
              <FormControlLabel
                sx={{ alignItems: 'flex-start' }}
                control={<Switch {...field} checked={field.value} />}
                label={
                  <Box>
                    <Typography fontWeight={500}>
                      Account Enabled
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Allow user to login to the system
                    </Typography>
                  </Box>
                }
              />
            )}
          />
        </Grid>

      </Grid>
    </DialogContent>

    {/* 🔹 Sticky Footer */}
    <DialogActions
      sx={{
        position: 'sticky',
        bottom: 0,
        zIndex: 2,
        backgroundColor: 'background.paper',
        p: 3,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Button onClick={handleEditClose}>
        Cancel
      </Button>
      <Button
        type="submit"
        variant="contained"
        disabled={isLoading}
        sx={{ px: 3 }}
      >
        {isLoading ? <CircularProgress size={20} /> : 'Update Staff'}
      </Button>
    </DialogActions>

  </form>
</Dialog>


      {/* View Details Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={handleViewClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Person color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Staff Member Details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Complete profile information
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : selectedStaffUser ? (
            <Stack spacing={3}>
              {/* Header with Avatar */}
              <Stack direction="row" alignItems="center" spacing={3}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: 'primary.main',
                    fontSize: '2rem',
                  }}
                >
                  {getInitials(selectedStaffUser.full_name || selectedStaffUser.email)}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    {selectedStaffUser.full_name ||
                      `${selectedStaffUser.first_name} ${selectedStaffUser.last_name}`}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {selectedStaffUser.email}
                  </Typography>
                  <Chip
                    label={selectedStaffUser.enabled === 1 ? 'Active' : 'Inactive'}
                    color={selectedStaffUser.enabled === 1 ? 'success' : 'error'}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Stack>

              <Divider />

              {/* Details Grid */}
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      <Phone fontSize="small" sx={{ mr: 1 }} />
                      Phone Number
                    </Typography>
                    <Typography variant="body2">
                      {selectedStaffUser.mobile_no || selectedStaffUser.phone || 'Not provided'}
                    </Typography>
                  </Stack>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      <Business fontSize="small" sx={{ mr: 1 }} />
                      Company
                    </Typography>
                    <Typography variant="body2">
                      {selectedStaffUser.company || 'Not specified'}
                    </Typography>
                  </Stack>
                </Grid>
                
                <Grid item xs={12}>
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      <CalendarToday fontSize="small" sx={{ mr: 1 }} />
                      Created Date
                    </Typography>
                    <Typography variant="body2">
                      {selectedStaffUser.creation
                        ? new Date(selectedStaffUser.creation).toLocaleString()
                        : 'Unknown'}
                    </Typography>
                  </Stack>
                </Grid>

                <Grid item xs={12}>
                  <Stack spacing={2}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      <VerifiedUser fontSize="small" sx={{ mr: 1 }} />
                      Assigned Roles
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {selectedStaffUser.roles && selectedStaffUser.roles.length > 0 ? (
                        selectedStaffUser.roles.map((role) => (
                          <Chip 
                            key={role} 
                            label={role} 
                            size="small" 
                            color="primary"
                            variant="outlined"
                          />
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                          No roles assigned
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </Stack>
          ) : (
            <Typography>No details available</Typography>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
          <Button 
            onClick={handleViewClose} 
            sx={{ borderRadius: 2 }}
          >
            Close
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => handleEditOpen(selectedStaffUser)}
            sx={{ borderRadius: 2 }}
          >
            Edit Profile
          </Button>
          <Button 
            variant="contained" 
            onClick={() => handleRoleOpen(selectedStaffUser)}
            sx={{ borderRadius: 2 }}
          >
            Manage Roles
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Roles Dialog */}
      <Dialog
  open={roleDialogOpen}
  onClose={handleRoleClose}
  maxWidth="sm"
  fullWidth
  PaperProps={{
    sx: {
      borderRadius: 3,
      maxHeight: '90vh',
    },
  }}
>
  <form onSubmit={handleRoleSubmit(onRoleSubmit)}>

    {/* 🔹 Sticky Header */}
    <DialogTitle
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 2,
        backgroundColor: 'background.paper',
        p: 3,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <Security color="primary" />
        <Box>
          <Typography variant="h6" fontWeight={600}>
            Manage Roles & Permissions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {(roleDialogUser || selectedStaffUser)?.email || 'Unknown User'}
          </Typography>
        </Box>
      </Stack>
    </DialogTitle>

    {/* 🔹 Scrollable Content */}
    <DialogContent
      dividers
      sx={{
        p: 3,
        overflowY: 'auto',
      }}
    >
      <Stack spacing={3}>

        {/* Roles Selector */}
        <FormControl fullWidth>
          <FormLabel sx={{ mb: 0.5 }}>Select Roles</FormLabel>
          <Controller
            name="roles"
            control={roleControl}
            render={({ field: { onChange, value, ...field } }) => {
              // Merge selected roles with searchable roles to ensure selected roles are always visible
              const selectedRoleObjects = roles.filter((role) => value.includes(role.name));
              const searchableRoleNames = new Set(searchableRoles.map(r => r.name));
              const selectedNotInSearchable = selectedRoleObjects.filter(r => !searchableRoleNames.has(r.name));
              const availableOptions = [...selectedNotInSearchable, ...searchableRoles];
              
              return (
                <Autocomplete
                  {...field}
                  multiple
                  options={availableOptions}
                  inputValue={roleSearchTerm}
                  onInputChange={(event, newInputValue) => {
                    setRoleSearchTerm(newInputValue);
                  }}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') {
                      const roleObj = roles.find((r) => r.name === option);
                      return roleObj?.label || option;
                    }
                    return option.label || option.name || '';
                  }}
                  value={availableOptions.filter((role) => value.includes(role.name))}
                  onChange={(event, newValue) => {
                    onChange(newValue.map((role) => role.name));
                  }}
                  filterOptions={(x) => x} // Disable client-side filtering since we do server-side
                  isOptionEqualToValue={(option, value) => option.name === value.name}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search and select roles..."
                      variant="outlined"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <Security fontSize="small" color="action" />
                            </InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.name}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Typography variant="body2" fontWeight={500}>
                          {option.label || option.name}
                        </Typography>
                        {option.description && (
                          <Typography variant="caption" color="text.secondary">
                            {option.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.name}
                        label={option.label || option.name}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    ))
                  }
                  noOptionsText="No roles found"
                  loading={isLoadingRoles}
                />
              );
            }}
          />
        </FormControl>

        {/* Replace Roles Toggle */}
        <Controller
          name="replaceExisting"
          control={roleControl}
          render={({ field }) => (
            <FormControlLabel
              sx={{ alignItems: 'flex-start' }}
              control={<Switch {...field} checked={field.value} />}
              label={
                <Box>
                  <Typography fontWeight={500}>
                    Replace Existing Roles
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Clear all current roles and assign only selected ones
                  </Typography>
                </Box>
              }
            />
          )}
        />

        {/* Info Alert */}
        {selectedRoles.length > 0 && (
          <Alert
            severity="info"
            icon={<VerifiedUser />}
            sx={{ borderRadius: 2 }}
          >
            <Typography variant="body2">
              <strong>{selectedRoles.length}</strong> role(s) selected.  
              User will have permissions for:{' '}
              <strong>
                {selectedRoles
                  .map((role) => {
                    const roleObj = roles.find((r) => r.name === role);
                    return roleObj?.label || role;
                  })
                  .join(', ')}
              </strong>
            </Typography>
          </Alert>
        )}

      </Stack>
    </DialogContent>

    {/* 🔹 Sticky Footer */}
    <DialogActions
      sx={{
        position: 'sticky',
        bottom: 0,
        zIndex: 2,
        backgroundColor: 'background.paper',
        p: 3,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Button onClick={handleRoleClose}>
        Cancel
      </Button>
      <Button
        type="submit"
        variant="contained"
        disabled={isLoading}
        sx={{ px: 3 }}
      >
        {isLoading ? <CircularProgress size={20} /> : 'Update Roles'}
      </Button>
    </DialogActions>

  </form>
</Dialog>

      {/* Confirm Disable Dialog */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={handleConfirmDialogClose}
        onConfirm={handleConfirmDialogConfirm}
        title="Disable Staff Member"
        message={
          pendingUserAction
            ? `Are you sure you want to disable ${
                pendingUserAction.full_name ||
                `${pendingUserAction.first_name || ''} ${pendingUserAction.last_name || ''}`.trim() ||
                pendingUserAction.email
              }? They will not be able to access the system until re-enabled.`
            : 'Are you sure you want to disable this staff member?'
        }
        confirmText="Disable"
        cancelText="Cancel"
        variant="warning"
        loading={isLoading}
      />

    </Box>
  );
};

export default Staff;
