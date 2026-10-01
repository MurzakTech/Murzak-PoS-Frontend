import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
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
  IconButton,
  Chip,
  Menu,
  MenuItem,
  FormControlLabel,
  Switch,
  InputAdornment,
  Tooltip,
  Pagination,
  Stack,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Search,
  Security,
  CheckCircle,
  Cancel,
  Visibility,
  Lock,
} from '@mui/icons-material';
import useRoleManagement from '../../hooks/useRoleManagement';

const Roles = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're on a child route (e.g., /roles/new, /roles/:roleName)
  const isChildRoute = location.pathname !== '/roles';
  
  const {
    roles,
    isLoadingRoles,
    error,
    filters,
    pagination,
    deleteRole,
    disableRole,
    enableRole,
    listRoles,
    setFilters,
    setPagination,
    isAutomaticRole,
  } = useRoleManagement();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [disabledFilter, setDisabledFilter] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Load roles on mount and when filters/pagination change
  useEffect(() => {
    listRoles(
      {
        disabled: disabledFilter,
        isCustom: filters.isCustom,
        deskAccess: filters.deskAccess,
        search: filters.search || undefined,
      },
      {
        page: pagination.page,
        pageSize: pagination.pageSize,
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabledFilter, filters.isCustom, filters.deskAccess, filters.search, pagination.page, pagination.pageSize]);

  // Handle search with debounce
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    const timeout = setTimeout(() => {
      setFilters({ search: value });
      setPagination({ page: 1 });
    }, 500);
    setSearchTimeout(timeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const handleDetailsOpen = (role) => {
    const roleName = role.name || role.role_name;
    navigate(`/roles/${encodeURIComponent(roleName)}`);
    setAnchorEl(null);
  };

  const handlePermissionsOpen = (role) => {
    const roleName = role.name || role.role_name;
    navigate(`/roles/${encodeURIComponent(roleName)}/permissions`);
    setAnchorEl(null);
  };

  const handleEditOpen = (role) => {
    const roleName = role.name || role.role_name;
    navigate(`/roles/${encodeURIComponent(roleName)}/edit`);
    setAnchorEl(null);
  };

  const handleDeleteOpen = (role) => {
    setSelectedRole(role);
    setDeleteDialogOpen(true);
    setAnchorEl(null);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setSelectedRole(null);
  };

  const handleMenuOpen = (event, role) => {
    setAnchorEl(event.currentTarget);
    setSelectedRole(role);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    const roleName = selectedRole.name || selectedRole.role_name;
    const result = await deleteRole(roleName);
    if (result.type?.includes('fulfilled')) {
      handleDeleteClose();
      listRoles(
        {
          disabled: disabledFilter,
          isCustom: filters.isCustom,
          deskAccess: filters.deskAccess,
          search: filters.search || undefined,
        },
        {
          page: pagination.page,
          pageSize: pagination.pageSize,
        }
      );
    }
  };

  const handleToggleDisabled = async (role) => {
    const roleName = role.name || role.role_name;
    if (role.disabled) {
      await enableRole(roleName);
    } else {
      await disableRole(roleName);
    }
    listRoles(
      {
        disabled: disabledFilter,
        isCustom: filters.isCustom,
        deskAccess: filters.deskAccess,
        search: filters.search || undefined,
      },
      {
        page: pagination.page,
        pageSize: pagination.pageSize,
      }
    );
  };

  const handlePageChange = (event, value) => {
    setPagination({ page: value });
  };

  const handlePageSizeChange = (event) => {
    const newPageSize = parseInt(event.target.value, 10);
    setPagination({ pageSize: newPageSize, page: 1 });
  };

  const handleDisabledFilterChange = (checked) => {
    setDisabledFilter(checked ? false : null);
    setPagination({ page: 1 });
  };

  const selectedRoleName = selectedRole?.name || selectedRole?.role_name;
  const isRoleAutomatic = selectedRole ? isAutomaticRole(selectedRole) : false;

  // If we're on a child route, render the outlet (e.g., RoleForm, RoleDetails, etc.)
  if (isChildRoute) {
    return <Outlet />;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Role Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/roles/new')}
            sx={{ ml: 2 }}
          >
            Create Role
          </Button>
        </Box>

        {/* Filters and Search */}
        <Paper
  sx={{
    p: 3,
    mb: 3,
    borderRadius: 3,
    position: 'sticky',
    top: 64,               // adjust if needed
    zIndex: 1,
    backgroundColor: 'background.paper',
  }}
>
  <Grid container spacing={3} alignItems="center">

    {/* 🔍 Search */}
    <Grid item xs={12} md={4}>
      <TextField
        fullWidth
        label="Search Roles"
        placeholder="Search by role name or description"
        value={searchTerm}
        onChange={(e) => handleSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
    </Grid>

    {/* 🔁 Enabled Filter */}
    <Grid item xs={12} md={3}>
      <FormControlLabel
        sx={{ alignItems: 'flex-start' }}
        control={
          <Switch
            checked={disabledFilter === false}
            onChange={(e) => handleDisabledFilterChange(e.target.checked)}
            color="primary"
          />
        }
        label={
          <Box>
            <Typography fontWeight={500}>
              Enabled Roles Only
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Hide disabled roles
            </Typography>
          </Box>
        }
      />
    </Grid>

    {/* 📄 Page Size */}
    <Grid item xs={12} md={3}>
      <FormControl fullWidth>
        <InputLabel>Page Size</InputLabel>
        <Select
          value={pagination.pageSize}
          label="Page Size"
          onChange={handlePageSizeChange}
        >
          <MenuItem value={10}>10 per page</MenuItem>
          <MenuItem value={20}>20 per page</MenuItem>
          <MenuItem value={50}>50 per page</MenuItem>
          <MenuItem value={100}>100 per page</MenuItem>
        </Select>
      </FormControl>
    </Grid>

    {/* 📊 Total Count */}
    <Grid
      item
      xs={12}
      md={2}
      sx={{
        display: 'flex',
        justifyContent: { xs: 'flex-start', md: 'flex-end' },
      }}
    >
      <Chip
        label={`Total Roles: ${pagination.total || 0}`}
        color="primary"
        variant="outlined"
        sx={{ fontWeight: 500 }}
      />
    </Grid>

  </Grid>
</Paper>


        {/* Roles Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Role Name</TableCell>
                <TableCell>Desk Access</TableCell>
                <TableCell>Two Factor Auth</TableCell>
                <TableCell>Custom</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Users</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingRoles ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No roles found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => {
                  const isAutomatic = isAutomaticRole(role);
                  return (
                    <TableRow key={role.name || role.role_name} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {isAutomatic && (
                            <Tooltip title="System role (cannot be modified)">
                              <Lock fontSize="small" color="disabled" />
                            </Tooltip>
                          )}
                          <Typography variant="body2" fontWeight="medium">
                            {role.name || role.role_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {role.desk_access ? (
                          <Chip icon={<CheckCircle />} label="Yes" size="small" color="success" />
                        ) : (
                          <Chip icon={<Cancel />} label="No" size="small" color="default" />
                        )}
                      </TableCell>
                      <TableCell>
                        {role.two_factor_auth ? (
                          <Chip label="Required" size="small" color="warning" />
                        ) : (
                          <Chip label="Not Required" size="small" color="default" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={role.is_custom ? 'Custom' : 'Standard'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={role.disabled ? 'Disabled' : 'Enabled'}
                          color={role.disabled ? 'default' : 'success'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{role.user_count || 0}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, role)}
                          disabled={isLoadingRoles}
                        >
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3, gap: 2 }}>
            <Pagination
              count={pagination.totalPages}
              page={pagination.page}
              onChange={handlePageChange}
              color="primary"
              showFirstButton
              showLastButton
            />
            <Typography variant="body2" color="text.secondary">
              Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} roles
            </Typography>
          </Box>
        )}

        {/* Action Menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={() => handleDetailsOpen(selectedRole)}>
            <Visibility fontSize="small" sx={{ mr: 1 }} />
            View Details
          </MenuItem>
          <MenuItem onClick={() => handlePermissionsOpen(selectedRole)}>
            <Security fontSize="small" sx={{ mr: 1 }} />
            Manage Permissions
          </MenuItem>
          {!isAutomaticRole(selectedRole) && (
            <>
              <MenuItem onClick={() => handleEditOpen(selectedRole)}>
                <Edit fontSize="small" sx={{ mr: 1 }} />
                Edit
              </MenuItem>
              <MenuItem
                onClick={() => handleToggleDisabled(selectedRole)}
                disabled={isLoadingRoles}
              >
                {selectedRole?.disabled ? (
                  <>
                    <CheckCircle fontSize="small" sx={{ mr: 1 }} />
                    Enable
                  </>
                ) : (
                  <>
                    <Cancel fontSize="small" sx={{ mr: 1 }} />
                    Disable
                  </>
                )}
              </MenuItem>
              <MenuItem
                onClick={() => handleDeleteOpen(selectedRole)}
                sx={{ color: 'error.main' }}
              >
                <Delete fontSize="small" sx={{ mr: 1 }} />
                Delete
              </MenuItem>
            </>
          )}
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={handleDeleteClose}>
          <DialogTitle>Delete Role</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the role "{selectedRoleName}"? This action cannot be
              undone.
            </Typography>
            {selectedRole?.user_count > 0 && (
              <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                Warning: This role is assigned to {selectedRole.user_count} user(s). You must
                remove it from all users before deleting.
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteClose}>Cancel</Button>
            <Button
              onClick={handleDelete}
              color="error"
              variant="contained"
              disabled={isLoadingRoles || selectedRole?.user_count > 0}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default Roles;

