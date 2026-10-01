import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Container,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Alert,
  Avatar,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  People,
  Star,
  LocationOn,
  Phone,
  Email,
  Business,
  AccountTree,
  Category,
  Home,
  CheckCircle,
  Cancel,
  Info
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getWarehouseDetails, getWarehouseStaff, setDefaultWarehouse } from '../../store/warehouseSlice';
import { showNotification } from '../../store/notificationSlice';

const WarehouseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedWarehouse, warehouseStaff, isLoadingDetails, isLoadingStaff } = useAppSelector(
    (state) => state.warehouse
  );
  const { user } = useAppSelector((state) => state.auth);

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  const handleSetAsDefault = async () => {
    if (!userCompany || !selectedWarehouse) {
      dispatch(showNotification({
        message: 'Company information is required',
        severity: 'error',
        title: 'Error',
      }));
      return;
    }

    const result = await dispatch(setDefaultWarehouse({
      company: userCompany,
      warehouse: selectedWarehouse.name,
    }));

    if (result.type === 'warehouse/setDefaultWarehouse/fulfilled') {
      dispatch(getWarehouseDetails({ name: selectedWarehouse.name }));
    }
  };

  useEffect(() => {
    if (id) {
      dispatch(getWarehouseDetails({ name: id }));
      dispatch(getWarehouseStaff({ warehouse: id }));
    }
  }, [dispatch, id]);

  if (isLoadingDetails) {
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
            <Info fontSize="large" />
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
        {/* Header Section */}
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
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton 
                onClick={() => navigate('/warehouses')}
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
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                    <Business sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" component="h1" fontWeight={700}>
                      {warehouse.warehouse_name || warehouse.name}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                      <Chip
                        label={warehouse.warehouse_type || 'No Type'}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        icon={warehouse.is_default ? <Star fontSize="small" /> : undefined}
                        label={warehouse.is_default ? "Default Warehouse" : "Not Default"}
                        size="small"
                        color={warehouse.is_default ? "primary" : "default"}
                        variant={warehouse.is_default ? "filled" : "outlined"}
                      />
                      <Chip
                        label={warehouse.disabled ? 'Disabled' : 'Active'}
                        size="small"
                        color={warehouse.disabled ? 'error' : 'success'}
                        icon={warehouse.disabled ? <Cancel fontSize="small" /> : <CheckCircle fontSize="small" />}
                      />
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2}>
              {!warehouse.is_default && (
                <Tooltip title="Set as default warehouse for all operations">
                  <Button
                    variant="outlined"
                    startIcon={<Star />}
                    onClick={handleSetAsDefault}
                    sx={{ 
                      textTransform: 'none',
                      borderRadius: 2,
                      px: 3
                    }}
                  >
                    Set as Default
                  </Button>
                </Tooltip>
              )}
              <Button
                variant="outlined"
                startIcon={<People />}
                onClick={() => navigate(`/warehouses/${warehouse.name}/staff`)}
                sx={{ 
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 3
                }}
              >
                Manage Staff
              </Button>
              <Button
                variant="contained"
                startIcon={<Edit />}
                onClick={() => navigate(`/warehouses/${warehouse.name}/edit`)}
                sx={{ 
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 3
                }}
              >
                Edit Warehouse
              </Button>
            </Stack>
          </Stack>

          {warehouse.is_default && (
            <Alert 
              severity="info" 
              icon={<Star />}
              sx={{ 
                mt: 3,
                borderRadius: 2,
                alignItems: 'center'
              }}
            >
              This is your default warehouse. It will be automatically selected for all operations.
            </Alert>
          )}
        </Paper>

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Basic Information Card */}
          <Grid item xs={12} md={6}>
            <Card 
              elevation={0}
              sx={{ 
                height: '100%',
                border: 1,
                borderColor: 'divider',
                borderRadius: 3
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                  <Business color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Basic Information
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={3}>
                  {/* Warehouse Details */}
                  <Grid item xs={12} sm={6}>
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Warehouse Name
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Home fontSize="small" color="action" />
                        <Typography variant="body1" fontWeight={500}>
                          {warehouse.warehouse_name || warehouse.name}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Warehouse ID
                      </Typography>
                      <Typography variant="body1" fontWeight={500} sx={{ fontFamily: 'Monospace' }}>
                        {warehouse.name}
                      </Typography>
                    </Stack>
                  </Grid>

                  {/* Company & Type */}
                  <Grid item xs={12} sm={6}>
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Company
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {warehouse.company || 'Not specified'}
                      </Typography>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Warehouse Type
                      </Typography>
                      <Chip
                        label={warehouse.warehouse_type || 'Unspecified'}
                        size="small"
                        color="primary"
                        variant="outlined"
                        icon={<Category fontSize="small" />}
                      />
                    </Stack>
                  </Grid>

                  {/* Status Indicators */}
                  <Grid item xs={12} sm={6}>
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Main Depot
                      </Typography>
                      <Chip
                        label={warehouse.is_main_depot ? 'Yes' : 'No'}
                        size="small"
                        color={warehouse.is_main_depot ? 'success' : 'default'}
                        variant={warehouse.is_main_depot ? 'filled' : 'outlined'}
                      />
                    </Stack>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Status
                      </Typography>
                      <Chip
                        label={warehouse.disabled ? 'Disabled' : 'Active'}
                        size="small"
                        color={warehouse.disabled ? 'error' : 'success'}
                        icon={warehouse.disabled ? <Cancel fontSize="small" /> : <CheckCircle fontSize="small" />}
                      />
                    </Stack>
                  </Grid>

                  {/* Parent Warehouse */}
                  {warehouse.parent_warehouse && (
                    <Grid item xs={12} sm={6}>
                      <Stack spacing={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          Parent Warehouse
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <AccountTree fontSize="small" color="action" />
                          <Typography variant="body1" fontWeight={500}>
                            {warehouse.parent_warehouse}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Grid>
                  )}

                  {/* Account */}
                  {warehouse.account && (
                    <Grid item xs={12}>
                      <Stack spacing={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          Account Code
                        </Typography>
                        <Typography variant="body1" fontWeight={500} sx={{ fontFamily: 'Monospace' }}>
                          {warehouse.account}
                        </Typography>
                      </Stack>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Address & Contact Card */}
          <Grid item xs={12} md={6}>
            <Card 
              elevation={0}
              sx={{ 
                height: '100%',
                border: 1,
                borderColor: 'divider',
                borderRadius: 3
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                  <LocationOn color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Address & Contact Information
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={3}>
                  {/* Address */}
                  {warehouse.address_line_1 && (
                    <Grid item xs={12}>
                      <Stack spacing={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          Street Address
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {warehouse.address_line_1}
                        </Typography>
                      </Stack>
                    </Grid>
                  )}

                  {warehouse.address_line_2 && (
                    <Grid item xs={12}>
                      <Stack spacing={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          Address Line 2
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {warehouse.address_line_2}
                        </Typography>
                      </Stack>
                    </Grid>
                  )}

                  {/* City, State, PIN */}
                  <Grid item xs={12} sm={6}>
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        City
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {warehouse.city || 'Not specified'}
                      </Typography>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        State / Province
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {warehouse.state || 'Not specified'}
                      </Typography>
                    </Stack>
                  </Grid>

                  {warehouse.pin && (
                    <Grid item xs={12} sm={6}>
                      <Stack spacing={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          PIN Code
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {warehouse.pin}
                        </Typography>
                      </Stack>
                    </Grid>
                  )}

                  {/* Contact Information */}
                  {(warehouse.phone_no || warehouse.mobile_no || warehouse.email_id) && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                        <Phone color="primary" fontSize="small" />
                        <Typography variant="subtitle2" fontWeight={600}>
                          Contact Details
                        </Typography>
                      </Stack>
                    </Grid>
                  )}

                  {warehouse.phone_no && (
                    <Grid item xs={12} sm={6}>
                      <Stack spacing={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          Phone Number
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Phone fontSize="small" color="action" />
                          <Typography variant="body1" fontWeight={500}>
                            {warehouse.phone_no}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Grid>
                  )}

                  {warehouse.mobile_no && (
                    <Grid item xs={12} sm={6}>
                      <Stack spacing={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          Mobile Number
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Phone fontSize="small" color="action" />
                          <Typography variant="body1" fontWeight={500}>
                            {warehouse.mobile_no}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Grid>
                  )}

                  {warehouse.email_id && (
                    <Grid item xs={12}>
                      <Stack spacing={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          Email Address
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Email fontSize="small" color="action" />
                          <Typography variant="body1" fontWeight={500}>
                            {warehouse.email_id}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Staff Management Card */}
          <Grid item xs={12}>
            <Card 
              elevation={0}
              sx={{ 
                border: 1,
                borderColor: 'divider',
                borderRadius: 3
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack 
                  direction="row" 
                  alignItems="center" 
                  justifyContent="space-between" 
                  sx={{ mb: 3 }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <People color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      Assigned Staff Members
                    </Typography>
                    <Chip 
                      label={`${warehouseStaff.length} staff`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </Stack>
                  
                  <Button
                    variant="contained"
                    startIcon={<People />}
                    onClick={() => navigate(`/warehouses/${warehouse.name}/staff`)}
                    sx={{ 
                      textTransform: 'none',
                      borderRadius: 2,
                      px: 3
                    }}
                  >
                    Manage Staff
                  </Button>
                </Stack>
                <Divider sx={{ mb: 3 }} />

                {isLoadingStaff ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                  </Box>
                ) : warehouseStaff.length === 0 ? (
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 4, 
                      textAlign: 'center',
                      borderRadius: 2,
                      backgroundColor: 'grey.50'
                    }}
                  >
                    <Avatar sx={{ 
                      bgcolor: 'grey.300', 
                      color: 'grey.600',
                      width: 56,
                      height: 56,
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
                      variant="outlined"
                      startIcon={<People />}
                      onClick={() => navigate(`/warehouses/${warehouse.name}/staff`)}
                    >
                      Assign Staff Members
                    </Button>
                  </Paper>
                ) : (
                  <TableContainer 
                    component={Paper} 
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                  >
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'grey.50' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Staff Member</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
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
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                  {staff.full_name?.charAt(0) || staff.email?.charAt(0) || 'U'}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight={500}>
                                    {staff.full_name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Unknown User'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    User ID: {staff.name || 'N/A'}
                                  </Typography>
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Email fontSize="small" color="action" />
                                <Typography variant="body2">
                                  {staff.email || staff.name || 'No email'}
                                </Typography>
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
                            <TableCell>
                              <Chip
                                label={staff.role || 'Staff'}
                                size="small"
                                color="default"
                                variant="outlined"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default WarehouseDetails;