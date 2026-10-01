import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Container,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Avatar,
  Stack,
  Divider,
  Alert,
  Tooltip,
  alpha,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  LinearProgress,
  Badge,
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Delete,
  Search,
  Person,
  Email,
  PersonAdd,
  People,
  CheckCircle,
  Cancel,
  FilterList,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  getWarehouseStaff,
  getWarehouseDetails,
  assignWarehousesToStaff,
  removeWarehouseFromStaff,
} from '../../store/warehouseSlice';
import { getStaffUsers } from '../../store/staffSlice';
import { showNotification } from '../../store/notificationSlice';

const WarehouseStaff = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedWarehouse, warehouseStaff, isLoading, isLoadingStaff } = useAppSelector(
    (state) => state.warehouse
  );
  const { staffUsers, isLoading: isLoadingStaffUsers } = useAppSelector((state) => state.staff);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    showEnabledOnly: false,
    showDisabledOnly: false,
  });

  // Fetch warehouse details and staff on mount
  useEffect(() => {
    if (id) {
      dispatch(getWarehouseDetails({ name: id }));
      dispatch(getWarehouseStaff({ warehouse: id }));
    }
  }, [dispatch, id]);

  // Fetch all staff users for the add dialog
  useEffect(() => {
    if (addDialogOpen && userCompany) {
      dispatch(getStaffUsers({ company: userCompany, enabledOnly: false }));
    }
  }, [dispatch, userCompany, addDialogOpen]);

  const handleAddStaff = async () => {
    if (selectedStaff.length === 0) {
      dispatch(
        showNotification({
          message: 'Please select at least one staff member',
          severity: 'warning',
          title: 'No Selection',
        })
      );
      return;
    }

    try {
      // Assign warehouse to selected staff
      for (const staffEmail of selectedStaff) {
        const result = await dispatch(
          assignWarehousesToStaff({
            user_email: staffEmail,
            warehouses: [id],
            replace_existing: false,
          })
        );

        if (result.type === 'warehouse/assignWarehousesToStaff/fulfilled') {
          // Refresh warehouse staff list
          await dispatch(getWarehouseStaff({ warehouse: id }));
        }
      }

      dispatch(
        showNotification({
          message: `Successfully added ${selectedStaff.length} staff member(s)`,
          severity: 'success',
          title: 'Staff Added',
        })
      );

      setAddDialogOpen(false);
      setSelectedStaff([]);
      setSearchQuery('');
    } catch (error) {
      dispatch(
        showNotification({
          message: 'Failed to add staff members',
          severity: 'error',
          title: 'Error',
        })
      );
    }
  };

  const handleRemoveStaff = async (staffEmail) => {
    const confirmRemove = window.confirm(
      'Are you sure you want to remove this staff member from the warehouse?'
    );

    if (!confirmRemove) return;

    const result = await dispatch(
      removeWarehouseFromStaff({
        user_email: staffEmail,
        warehouse: id,
      })
    );

    if (result.type === 'warehouse/removeWarehouseFromStaff/fulfilled') {
      dispatch(getWarehouseStaff({ warehouse: id }));
      dispatch(
        showNotification({
          message: 'Staff member removed successfully',
          severity: 'success',
          title: 'Removed',
        })
      );
    }
  };

  // Filter out already assigned staff from the add dialog
  const availableStaff = useMemo(() => {
    const assignedEmails = new Set(
      warehouseStaff.map(staff => staff.email || staff.name)
    );

    return staffUsers.filter(
      (staff) => !assignedEmails.has(staff.email || staff.name)
    );
  }, [staffUsers, warehouseStaff]);

  // Smart search filtering
  const filteredStaff = useMemo(() => {
    let filtered = availableStaff;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(staff =>
        (staff.full_name?.toLowerCase() || '').includes(query) ||
        (staff.email?.toLowerCase() || '').includes(query) ||
        (staff.first_name?.toLowerCase() || '').includes(query) ||
        (staff.last_name?.toLowerCase() || '').includes(query) ||
        (staff.role?.toLowerCase() || '').includes(query)
      );
    }

    // Apply status filters
    if (filters.showEnabledOnly) {
      filtered = filtered.filter(staff => staff.enabled === true || staff.enabled === 1);
    }
    if (filters.showDisabledOnly) {
      filtered = filtered.filter(staff => staff.enabled === false || staff.enabled === 0);
    }

    return filtered;
  }, [availableStaff, searchQuery, filters]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ 
          py: 8, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh' 
        }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!selectedWarehouse) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Avatar sx={{ 
            bgcolor: 'error.light', 
            color: 'error.main', 
            width: 60, 
            height: 60,
            mx: 'auto',
            mb: 2
          }}>
            <Person />
          </Avatar>
          <Typography variant="h5" gutterBottom color="error">
            Warehouse Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            The warehouse you're looking for doesn't exist or you don't have access.
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/warehouses')}
          >
            Back to Warehouses
          </Button>
        </Box>
      </Container>
    );
  }

  const warehouse = selectedWarehouse;

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
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
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton 
                onClick={() => navigate(`/warehouses/${id}`)}
                size="large"
                sx={{ 
                  border: 1,
                  borderColor: 'divider',
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ArrowBack />
              </IconButton>
              
              <Box>
                <Typography variant="h4" component="h1" fontWeight={700}>
                  Staff Management
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {warehouse.warehouse_name || warehouse.name}
                </Typography>
              </Box>
            </Stack>

            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => setAddDialogOpen(true)}
              sx={{ 
                textTransform: 'none',
                borderRadius: 2,
                px: 3
              }}
            >
              Add Staff Members
            </Button>
          </Stack>

          <Alert 
            severity="info" 
            icon={<People />}
            sx={{ 
              mt: 3,
              borderRadius: 2,
              alignItems: 'center'
            }}
          >
            Staff assigned here will have exclusive access to this warehouse. 
            Unassigned staff can access all warehouses.
          </Alert>
        </Paper>

        {/* Staff Table */}
        <Paper 
          elevation={0}
          sx={{ 
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            overflow: 'hidden'
          }}
        >
          <Box sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <People color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Assigned Staff Members
                </Typography>
                <Badge 
                  badgeContent={warehouseStaff.length} 
                  color="primary"
                  sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem', height: 20, minWidth: 20 } }}
                />
              </Stack>
            </Stack>
            <Divider sx={{ mb: 3 }} />

            {isLoadingStaff ? (
              <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            ) : warehouseStaff.length === 0 ? (
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 6, 
                  textAlign: 'center',
                  borderRadius: 2,
                  backgroundColor: 'grey.50'
                }}
              >
                <Avatar sx={{ 
                  bgcolor: 'grey.300', 
                  color: 'grey.600',
                  width: 64,
                  height: 64,
                  mx: 'auto',
                  mb: 2
                }}>
                  <People />
                </Avatar>
                <Typography variant="h6" gutterBottom color="text.secondary">
                  No Staff Assigned
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                  No staff members are specifically assigned to this warehouse. 
                  All users with warehouse access can view and manage this location.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<PersonAdd />}
                  onClick={() => setAddDialogOpen(true)}
                >
                  Assign Staff Members
                </Button>
              </Paper>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600, width: '40%' }}>Staff Member</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '35%' }}>Contact Information</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '15%' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '10%' }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {warehouseStaff.map((staff) => (
                      <TableRow 
                        key={staff.name || staff.email}
                        hover
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar sx={{ 
                              bgcolor: staff.enabled ? 'primary.main' : 'grey.400',
                              width: 40,
                              height: 40
                            }}>
                              {getInitials(staff.full_name || staff.email)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {staff.full_name || 
                                  `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 
                                  'Unknown User'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ID: {staff.name || 'N/A'}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Email fontSize="small" color="action" />
                              <Typography variant="body2">
                                {staff.email || staff.name || 'No email'}
                              </Typography>
                            </Stack>
                            {staff.phone && (
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="caption" color="text.secondary">
                                  Phone: {staff.phone}
                                </Typography>
                              </Stack>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={staff.enabled ? 'Active' : 'Inactive'}
                            size="small"
                            color={staff.enabled ? 'success' : 'error'}
                            icon={staff.enabled ? <CheckCircle fontSize="small" /> : <Cancel fontSize="small" />}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Remove from warehouse">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveStaff(staff.email || staff.name)}
                              sx={{ 
                                '&:hover': { 
                                  backgroundColor: 'error.light',
                                  color: 'error.main'
                                }
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Paper>

        {/* Add Staff Dialog with Smart Search */}
        <Dialog
          open={addDialogOpen}
          onClose={() => {
            setAddDialogOpen(false);
            setSelectedStaff([]);
            setSearchQuery('');
          }}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogTitle sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <PersonAdd color="primary" />
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Add Staff Members
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Select staff to assign to {warehouse.warehouse_name || warehouse.name}
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>

          <DialogContent sx={{ p: 0 }}>
            {/* Search and Filters */}
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search color="action" />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2 }
                  }}
                />

                <Stack direction="row" spacing={2} alignItems="center">
                  <FilterList fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    Filter by status:
                  </Typography>
                  <Chip
                    label="Active Only"
                    size="small"
                    color={filters.showEnabledOnly ? "primary" : "default"}
                    variant={filters.showEnabledOnly ? "filled" : "outlined"}
                    onClick={() => setFilters({
                      ...filters,
                      showEnabledOnly: !filters.showEnabledOnly,
                      showDisabledOnly: filters.showEnabledOnly ? filters.showDisabledOnly : false
                    })}
                  />
                  <Chip
                    label="Inactive Only"
                    size="small"
                    color={filters.showDisabledOnly ? "error" : "default"}
                    variant={filters.showDisabledOnly ? "filled" : "outlined"}
                    onClick={() => setFilters({
                      ...filters,
                      showDisabledOnly: !filters.showDisabledOnly,
                      showEnabledOnly: filters.showDisabledOnly ? filters.showEnabledOnly : false
                    })}
                  />
                </Stack>
              </Stack>
            </Box>

            {/* Staff List */}
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {isLoadingStaffUsers ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <CircularProgress />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Loading available staff...
                  </Typography>
                </Box>
              ) : filteredStaff.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Search sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No Staff Found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {searchQuery.trim() 
                      ? `No staff members match "${searchQuery}"`
                      : 'All staff members are already assigned to this warehouse'}
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {filteredStaff.map((staff) => {
                    const isSelected = selectedStaff.includes(staff.email || staff.name);
                    return (
                      <ListItem
                        key={staff.email || staff.name}
                        button
                        onClick={() => {
                          setSelectedStaff(prev =>
                            isSelected
                              ? prev.filter(email => email !== (staff.email || staff.name))
                              : [...prev, staff.email || staff.name]
                          );
                        }}
                        sx={{
                          borderBottom: 1,
                          borderColor: 'divider',
                          '&:hover': { backgroundColor: 'action.hover' }
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ 
                            bgcolor: isSelected ? 'primary.main' : 
                                    staff.enabled ? 'primary.light' : 'grey.400'
                          }}>
                            {getInitials(staff.full_name || staff.email)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={600}>
                              {staff.full_name || 
                                `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 
                                staff.email || 
                                staff.name}
                            </Typography>
                          }
                          secondary={
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <Typography variant="caption" color="text.secondary">
                                {staff.email || staff.name}
                              </Typography>
                              <Chip
                                label={staff.enabled ? 'Active' : 'Inactive'}
                                size="small"
                                color={staff.enabled ? 'success' : 'error'}
                                variant="outlined"
                              />
                              {staff.role && (
                                <Chip
                                  label={staff.role}
                                  size="small"
                                  color="default"
                                  variant="outlined"
                                />
                              )}
                            </Stack>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {
                              setSelectedStaff(prev =>
                                isSelected
                                  ? prev.filter(email => email !== (staff.email || staff.name))
                                  : [...prev, staff.email || staff.name]
                              );
                            }}
                            color="primary"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Box>

            {/* Selection Summary */}
            {selectedStaff.length > 0 && (
              <Box sx={{ 
                p: 2, 
                borderTop: 1, 
                borderColor: 'divider',
                backgroundColor: 'primary.light',
                color: 'primary.contrastText'
              }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" fontWeight={600}>
                    {selectedStaff.length} staff member{selectedStaff.length > 1 ? 's' : ''} selected
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setSelectedStaff([])}
                    sx={{ color: 'primary.contrastText' }}
                  >
                    Clear Selection
                  </Button>
                </Stack>
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
            <Button
              onClick={() => {
                setAddDialogOpen(false);
                setSelectedStaff([]);
                setSearchQuery('');
              }}
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleAddStaff}
              disabled={selectedStaff.length === 0 || isLoading}
              startIcon={selectedStaff.length > 0 && <PersonAdd />}
              sx={{ borderRadius: 2, px: 3 }}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                  Adding...
                </>
              ) : (
                `Add ${selectedStaff.length} Staff Member${selectedStaff.length > 1 ? 's' : ''}`
              )}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default WarehouseStaff;