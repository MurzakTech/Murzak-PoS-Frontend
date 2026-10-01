import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
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
  Paper,
  Alert,
} from '@mui/material';
import { ArrowBack, Print, CheckCircle, Pending, Receipt } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getGRNDetails, clearSelectedGRN } from '../../store/grnSlice';
import CreatePurchaseInvoiceDialog from '../../components/Purchases/CreatePurchaseInvoiceDialog';

const GRNDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { selectedGRN, isLoadingDetails } = useAppSelector((state) => state.grn);
  const [createInvoiceDialogOpen, setCreateInvoiceDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(getGRNDetails({ grn_no: id }));
    }

    // Cleanup on unmount
    return () => {
      dispatch(clearSelectedGRN());
    };
  }, [dispatch, id]);

  if (isLoadingDetails) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!selectedGRN) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h6" color="error">
            GRN not found
          </Typography>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/purchases/grns')}
            sx={{ 
              mt: 2,
              textTransform: 'none',
              fontSize: '0.8125rem'
            }}
          >
            Back to GRN List
          </Button>
        </Box>
      </Container>
    );
  }

  const grn = selectedGRN;

  const getStatusChip = (status) => {
    if (!status) return null;
    const statusLower = status.toLowerCase();
    if (statusLower.includes('received') || statusLower.includes('completed')) {
      return <Chip label={status} size="small" color="success" />;
    }
    if (statusLower.includes('to bill') || statusLower.includes('pending')) {
      return <Chip label={status} size="small" color="warning" />;
    }
    return <Chip label={status} size="small" color="default" />;
  };

  const getDocStatusChip = (docstatus) => {
    switch (docstatus) {
      case 0:
        return <Chip label="Draft" size="small" color="default" />;
      case 1:
        return <Chip label="Submitted" size="small" color="success" />;
      case 2:
        return <Chip label="Cancelled" size="small" color="error" />;
      default:
        return <Chip label="Unknown" size="small" />;
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/purchases/grns')}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" component="h1">
              GRN: {grn.grn_no || grn.name}
            </Typography>
            {getStatusChip(grn.status)}
            {getDocStatusChip(grn.docstatus)}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {grn.docstatus === 1 && grn.status && !grn.status.toLowerCase().includes('cancelled') && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<Receipt />}
                onClick={() => setCreateInvoiceDialogOpen(true)}
                sx={{ 
                  textTransform: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}
              >
                Create Purchase Invoice
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={() => window.print()}
              sx={{ 
                textTransform: 'none',
                fontSize: '0.8125rem'
              }}
            >
              Print
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => navigate('/purchases/grns')}
              sx={{ 
                textTransform: 'none',
                fontSize: '0.8125rem'
              }}
            >
              Back to List
            </Button>
          </Box>
        </Box>

        {/* GRN Summary */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  GRN Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      GRN Number
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {grn.grn_no || grn.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {getStatusChip(grn.status)}
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Supplier
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {grn.supplier_name || grn.supplier || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Company
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {grn.company || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Posting Date
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {grn.posting_date
                        ? new Date(grn.posting_date).toLocaleDateString()
                        : '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Posting Time
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {grn.posting_time || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Warehouse
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {grn.set_warehouse || '-'}
                    </Typography>
                  </Grid>
                  {grn.purchase_order && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Purchase Order
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {grn.purchase_order}
                      </Typography>
                    </Grid>
                  )}
                  {grn.is_return === 1 && (
                    <Grid item xs={12}>
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        This is a Return GRN
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Summary
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Grand Total
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      KES{' '}
                      {(grn.grand_total || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Grid>
                  {grn.net_total && (
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Net Total
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        KES{' '}
                        {grn.net_total.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Typography>
                    </Grid>
                  )}
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Items Count
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {grn.items_count || (grn.items ? grn.items.length : 0)} item(s)
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Total Quantity
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {(grn.total_qty || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      % Received
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {(grn.per_received || 0).toFixed(2)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      % Billed
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {(grn.per_billed || 0).toFixed(2)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Document Status
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {getDocStatusChip(grn.docstatus)}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Purchase Order Details */}
        {grn.purchase_order_details && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Purchase Order Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    PO Number
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {grn.purchase_order_details.po_no}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Transaction Date
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {grn.purchase_order_details.transaction_date
                      ? new Date(grn.purchase_order_details.transaction_date).toLocaleDateString()
                      : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {grn.purchase_order_details.status || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Grand Total
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    KES{' '}
                    {(grn.purchase_order_details.grand_total || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Items Table */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Items
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <TableContainer
            sx={{
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
              backgroundColor: 'background.paper',
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Item Code</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Item Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Quantity</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Received</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Rejected</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Rate</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Warehouse</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>UOM</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Stock Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {grn.items && grn.items.length > 0 ? (
                  grn.items.map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {item.item_code}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.item_name || '-'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{item.qty || 0}</TableCell>
                      <TableCell align="right">{item.received_qty || 0}</TableCell>
                      <TableCell align="right">{item.rejected_qty || 0}</TableCell>
                      <TableCell align="right">
                        KES{' '}
                        {(item.rate || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={500}>
                          KES{' '}
                          {(item.amount || 0).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.warehouse || '-'}</TableCell>
                      <TableCell>{item.uom || '-'}</TableCell>
                      <TableCell>
                        {item.applied_to_stock ? (
                          <Chip
                            icon={<CheckCircle />}
                            label="Applied"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        ) : (
                          <Chip
                            icon={<Pending />}
                            label="Pending"
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                        {item.stock_entry && (
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Entry: {item.stock_entry}
                            </Typography>
                            {item.stock_entry_date && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                Date: {new Date(item.stock_entry_date).toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 6, border: 'none' }}>
                      <Typography variant="body2" color="text.secondary">
                        No items found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      {/* Create Purchase Invoice Dialog */}
      <CreatePurchaseInvoiceDialog
        open={createInvoiceDialogOpen}
        onClose={() => setCreateInvoiceDialogOpen(false)}
        grnNo={grn.grn_no || grn.name}
        grnData={grn}
      />
    </Container>
  );
};

export default GRNDetails;
