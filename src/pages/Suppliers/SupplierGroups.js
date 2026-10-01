import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  CircularProgress,
  GridLegacy as Grid,
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
  Pagination,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import { ArrowBack, Add, Edit, MoreVert, Search, Clear, Visibility } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  getSupplierGroups,
  createSupplierGroup,
  updateSupplierGroup,
  getSupplierGroupDetails,
} from '../../store/supplierSlice';

const SupplierGroups = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    supplierGroups,
    selectedSupplierGroup,
    isLoading,
    isLoadingDetails,
  } = useAppSelector((state) => state.supplier);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    is_group: false, // Show only leaf nodes by default
    parent_supplier_group: '',
  });

  const {
    control: createControl,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm({
    defaultValues: {
      supplier_group_name: '',
      parent_supplier_group: '',
      is_group: false,
      payment_terms: '',
    },
  });

  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm();

  // Fetch supplier groups on mount
  useEffect(() => {
    dispatch(getSupplierGroups(filters));
  }, [dispatch, filters]);

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const handleMenuOpen = (event, group) => {
    setAnchorEl(event.currentTarget);
    setSelectedGroup(group);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedGroup(null);
  };

  const handleCreateOpen = () => {
    resetCreate();
    setCreateDialogOpen(true);
  };

  const handleCreateClose = () => {
    setCreateDialogOpen(false);
    resetCreate();
  };

  const handleEditOpen = (group) => {
    resetEdit({
      supplier_group_name: group.supplier_group_name || group.name,
      parent_supplier_group: group.parent_supplier_group || '',
      is_group: group.is_group === 1 || group.is_group === true,
      payment_terms: group.payment_terms || '',
    });
    setSelectedGroup(group);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedGroup(null);
    resetEdit();
  };

  const handleDetailsOpen = async (group) => {
    const result = await dispatch(getSupplierGroupDetails({ name: group.name }));
    if (result.type === 'supplier/getSupplierGroupDetails/fulfilled') {
      setDetailsDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDetailsClose = () => {
    setDetailsDialogOpen(false);
  };

  const onCreateSubmit = async (data) => {
    const groupData = {
      supplier_group_name: data.supplier_group_name,
      parent_supplier_group: data.parent_supplier_group || undefined,
      is_group: data.is_group || false,
      payment_terms: data.payment_terms || undefined,
    };

    const result = await dispatch(createSupplierGroup(groupData));

    if (result.type === 'supplier/createSupplierGroup/fulfilled') {
      handleCreateClose();
      dispatch(getSupplierGroups(filters));
    }
  };

  const onEditSubmit = async (data) => {
    if (!selectedGroup) {
      return;
    }

    const groupData = {
      name: selectedGroup.name,
      supplier_group_name: data.supplier_group_name,
      parent_supplier_group: data.parent_supplier_group || undefined,
      is_group: data.is_group || false,
      payment_terms: data.payment_terms || undefined,
    };

    const result = await dispatch(updateSupplierGroup(groupData));

    if (result.type === 'supplier/updateSupplierGroup/fulfilled') {
      handleEditClose();
      dispatch(getSupplierGroups(filters));
    }
  };

  // Filter groups based on search term
  const filteredGroups = supplierGroups.filter((group) => {
    const matchesSearch =
      !searchTerm ||
      (group.supplier_group_name || group.name)
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Get parent groups for dropdown
  const parentGroups = supplierGroups.filter((g) => g.is_group === 1 || g.is_group === true);

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/suppliers')}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" component="h1">
              Supplier Groups
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateOpen}
            sx={{ textTransform: 'none' }}
          >
            Add Supplier Group
          </Button>
        </Box>

        {/* Search and Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search supplier groups..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => handleSearch('')}>
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant={filters.is_group ? 'contained' : 'outlined'}
                onClick={() => setFilters({ ...filters, is_group: !filters.is_group })}
              >
                {filters.is_group ? 'Show Groups' : 'Show Leaf Nodes'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Supplier Groups Table */}
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Group Name</TableCell>
                <TableCell>Parent Group</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Payment Terms</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No supplier groups found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredGroups.map((group) => (
                  <TableRow key={group.name} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {group.supplier_group_name || group.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{group.parent_supplier_group || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={group.is_group === 1 || group.is_group === true ? 'Group' : 'Leaf'}
                        size="small"
                        color={group.is_group === 1 || group.is_group === true ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{group.payment_terms || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, group)}>
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Action Menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={() => handleDetailsOpen(selectedGroup)}>
            <Visibility sx={{ mr: 1 }} fontSize="small" />
            View Details
          </MenuItem>
          <MenuItem onClick={() => handleEditOpen(selectedGroup)}>
            <Edit sx={{ mr: 1 }} fontSize="small" />
            Edit
          </MenuItem>
        </Menu>

        {/* Create Supplier Group Dialog */}
        <Dialog open={createDialogOpen} onClose={handleCreateClose} maxWidth="sm" fullWidth>
          <form onSubmit={handleCreateSubmit(onCreateSubmit)}>
            <DialogTitle>Add New Supplier Group</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Controller
                    name="supplier_group_name"
                    control={createControl}
                    rules={{ required: 'Supplier group name is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Supplier Group Name"
                        fullWidth
                        required
                        error={!!createErrors.supplier_group_name}
                        helperText={createErrors.supplier_group_name?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="parent_supplier_group"
                    control={createControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Parent Supplier Group"
                        fullWidth
                        select
                        SelectProps={{ native: true }}
                      >
                        <option value="">None (Root Group)</option>
                        {parentGroups.map((group) => (
                          <option key={group.name} value={group.name}>
                            {group.supplier_group_name || group.name}
                          </option>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="payment_terms"
                    control={createControl}
                    render={({ field }) => (
                      <TextField {...field} label="Payment Terms" fullWidth />
                    )}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCreateClose}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isLoading}>
                {isLoading ? <CircularProgress size={20} /> : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Edit Supplier Group Dialog */}
        <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
          <form onSubmit={handleEditSubmit(onEditSubmit)}>
            <DialogTitle>Edit Supplier Group</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Controller
                    name="supplier_group_name"
                    control={editControl}
                    rules={{ required: 'Supplier group name is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Supplier Group Name"
                        fullWidth
                        required
                        error={!!editErrors.supplier_group_name}
                        helperText={editErrors.supplier_group_name?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="parent_supplier_group"
                    control={editControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Parent Supplier Group"
                        fullWidth
                        select
                        SelectProps={{ native: true }}
                      >
                        <option value="">None (Root Group)</option>
                        {parentGroups
                          .filter((g) => g.name !== selectedGroup?.name)
                          .map((group) => (
                            <option key={group.name} value={group.name}>
                              {group.supplier_group_name || group.name}
                            </option>
                          ))}
                      </TextField>
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="payment_terms"
                    control={editControl}
                    render={({ field }) => (
                      <TextField {...field} label="Payment Terms" fullWidth />
                    )}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleEditClose}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isLoading}>
                {isLoading ? <CircularProgress size={20} /> : 'Update'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={detailsDialogOpen} onClose={handleDetailsClose} maxWidth="sm" fullWidth>
          <DialogTitle>Supplier Group Details</DialogTitle>
          <DialogContent>
            {isLoadingDetails ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : selectedSupplierGroup ? (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Group Name
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {selectedSupplierGroup.supplier_group_name || selectedSupplierGroup.name}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Parent Group
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {selectedSupplierGroup.parent_supplier_group || 'None (Root Group)'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Type
                  </Typography>
                  <Chip
                    label={
                      selectedSupplierGroup.is_group === 1 || selectedSupplierGroup.is_group === true
                        ? 'Group'
                        : 'Leaf'
                    }
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
                {selectedSupplierGroup.payment_terms && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Payment Terms
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {selectedSupplierGroup.payment_terms}
                    </Typography>
                  </Grid>
                )}
                {selectedSupplierGroup.supplier_count !== undefined && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Number of Suppliers
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {selectedSupplierGroup.supplier_count}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            ) : (
              <Typography>No details available</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDetailsClose}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default SupplierGroups;

