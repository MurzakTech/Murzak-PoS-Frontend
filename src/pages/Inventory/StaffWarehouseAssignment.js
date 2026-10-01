import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  CircularProgress,
  Grid,
  Container,
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
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  FormControlLabel
} from '@mui/material';
import { ArrowBack, Edit, Search, Clear } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  getStaffWarehouses,
  assignWarehousesToStaff,
  removeWarehouseFromStaff,
  listWarehouses,
} from '../../store/warehouseSlice';
import { getStaffUsers } from '../../store/staffSlice';
import { showNotification } from '../../store/notificationSlice';

const StaffWarehouseAssignment = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { staffWarehouses, warehouses, isLoading } = useAppSelector(
    (state) => state.warehouse
  );
  const { staffUsers, isLoading: isLoadingStaff } = useAppSelector((state) => state.staff);
  const { user } = useAppSelector((state) => state.auth);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedWarehouses, setSelectedWarehouses] = useState([]);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch staff users and warehouses on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(getStaffUsers({ company: userCompany, enabledOnly: false }));
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
    }
  }, [dispatch, userCompany]);

  const handleAssignClick = async (staff) => {
    setSelectedStaff(staff);
    // Fetch current warehouses for this staff
    const result = await dispatch(getStaffWarehouses({ user_email: staff.email || staff.name }));
    if (result.type === 'warehouse/getStaffWarehouses/fulfilled') {
      setSelectedWarehouses(
        result.payload.warehouses.map((w) => w.name)
      );
    }
    setAssignmentDialogOpen(true);
  };

  const handleAssignmentSubmit = async () => {
    if (!selectedStaff) return;

    const result = await dispatch(
      assignWarehousesToStaff({
        user_email: selectedStaff.email || selectedStaff.name,
        warehouses: selectedWarehouses,
        replace_existing: replaceExisting,
      })
    );

    if (result.type === 'warehouse/assignWarehousesToStaff/fulfilled') {
      setAssignmentDialogOpen(false);
      setSelectedStaff(null);
      setSelectedWarehouses([]);
      // Refresh staff list to show updated warehouse counts
      if (userCompany) {
        dispatch(getStaffUsers({ company: userCompany, enabledOnly: false }));
      }
    }
  };

  const handleRemoveWarehouse = async (staff, warehouseName) => {
    const result = await dispatch(
      removeWarehouseFromStaff({
        user_email: staff.email || staff.name,
        warehouse: warehouseName,
      })
    );

    if (result.type === 'warehouse/removeWarehouseFromStaff/fulfilled') {
      // Refresh staff warehouses
      await dispatch(getStaffWarehouses({ user_email: staff.email || staff.name }));
      // Refresh staff list
      if (userCompany) {
        dispatch(getStaffUsers({ company: userCompany, enabledOnly: false }));
      }
    }
  };

  // Filter staff based on search term
  const filteredStaff = staffUsers.filter((staff) => {
    const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.full_name || '';
    const email = staff.email || staff.name || '';
    const searchLower = searchTerm.toLowerCase();
    return (
      !searchTerm ||
      fullName.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate('/warehouses')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            Staff-Warehouse Assignment
          </Typography>
        </Box>

        {/* Search */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment:
                searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
            }}
          />
        </Paper>

        {/* Staff Table */}
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assigned Warehouses</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingStaff ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No staff found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((staff) => (
                  <StaffRow
                    key={staff.name || staff.email}
                    staff={staff}
                    onAssignClick={handleAssignClick}
                    onRemoveWarehouse={handleRemoveWarehouse}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Assignment Dialog */}
        <Dialog
          open={assignmentDialogOpen}
          onClose={() => {
            setAssignmentDialogOpen(false);
            setSelectedStaff(null);
            setSelectedWarehouses([]);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Assign Warehouses to {selectedStaff?.full_name || selectedStaff?.email || selectedStaff?.name}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Warehouses</InputLabel>
                  <Select
                    multiple
                    value={selectedWarehouses}
                    onChange={(e) => setSelectedWarehouses(e.target.value)}
                    input={<OutlinedInput label="Warehouses" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const warehouse = warehouses.find((w) => w.name === value);
                          return (
                            <Chip
                              key={value}
                              label={warehouse?.warehouse_name || value}
                              size="small"
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {warehouses.map((warehouse) => (
                      <MenuItem key={warehouse.name} value={warehouse.name}>
                        <Checkbox checked={selectedWarehouses.indexOf(warehouse.name) > -1} />
                        <ListItemText
                          primary={warehouse.warehouse_name || warehouse.name}
                          secondary={warehouse.warehouse_type}
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={replaceExisting}
                      onChange={(e) => setReplaceExisting(e.target.checked)}
                    />
                  }
                  label="Replace existing assignments"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setAssignmentDialogOpen(false);
                setSelectedStaff(null);
                setSelectedWarehouses([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignmentSubmit}
              variant="contained"
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={20} /> : 'Assign'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

// Staff Row Component
const StaffRow = ({ staff, onAssignClick, onRemoveWarehouse }) => {
  const dispatch = useAppDispatch();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchWarehouses = async () => {
      setLoading(true);
      const result = await dispatch(
        getStaffWarehouses({ user_email: staff.email || staff.name })
      );
      if (result.type === 'warehouse/getStaffWarehouses/fulfilled') {
        setWarehouses(result.payload.warehouses || []);
      }
      setLoading(false);
    };
    fetchWarehouses();
  }, [dispatch, staff]);

  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2" fontWeight={500}>
          {staff.full_name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || '-'}
        </Typography>
      </TableCell>
      <TableCell>{staff.email || staff.name || '-'}</TableCell>
      <TableCell>
        <Chip
          label={staff.enabled === 1 || staff.enabled === true ? 'Enabled' : 'Disabled'}
          color={staff.enabled === 1 || staff.enabled === true ? 'success' : 'error'}
          size="small"
        />
      </TableCell>
      <TableCell>
        {loading ? (
          <CircularProgress size={16} />
        ) : warehouses.length === 0 ? (
          <Typography variant="body2" color="text.secondary" fontStyle="italic">
            All warehouses
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {warehouses.map((warehouse) => (
              <Chip
                key={warehouse.name}
                label={warehouse.warehouse_name || warehouse.name}
                size="small"
                onDelete={() => onRemoveWarehouse(staff, warehouse.name)}
              />
            ))}
          </Box>
        )}
      </TableCell>
      <TableCell align="right">
        <Button
          size="small"
          startIcon={<Edit />}
          onClick={() => onAssignClick(staff)}
        >
          Assign
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default StaffWarehouseAssignment;

