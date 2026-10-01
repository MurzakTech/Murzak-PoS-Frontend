import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  GridLegacy as Grid,
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
  Link,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  ArrowBack,
  Print,
  Receipt,
  Download,
  AttachFile,
  Edit,
  Payment,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  getPurchaseInvoiceDetails,
  clearSelectedPurchaseInvoice,
} from '../../store/purchaseSlice';
import StatusChip from '../../components/Layout/StatusChip';
import UpdatePurchaseInvoiceDialog from '../../components/Purchases/UpdatePurchaseInvoiceDialog';
import PayPurchaseInvoiceDialog from '../../components/Purchases/PayPurchaseInvoiceDialog';

const PurchaseInvoiceDetails = () => {
  const { invoiceNo } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const {
    selectedPurchaseInvoice,
    isLoadingPurchaseInvoiceDetails,
  } = useAppSelector((state) => state.purchase);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);

  useEffect(() => {
    if (invoiceNo) {
      dispatch(getPurchaseInvoiceDetails({ invoice_no: invoiceNo }));
    }
    
    // Cleanup on unmount
    return () => {
      dispatch(clearSelectedPurchaseInvoice());
    };
  }, [dispatch, invoiceNo]);

  if (isLoadingPurchaseInvoiceDetails) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!selectedPurchaseInvoice) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h6" color="error">
            Purchase Invoice not found
          </Typography>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/purchases/invoices')}
            sx={{ 
              mt: 2,
              textTransform: 'none',
              fontSize: '0.8125rem'
            }}
          >
            Back to Purchase Invoices
          </Button>
        </Box>
      </Container>
    );
  }

  const invoice = selectedPurchaseInvoice;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return '#10B981';
      case 'draft':
        return '#64748B';
      case 'unpaid':
      case 'overdue':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      case 'partly paid':
        return '#3B82F6';
      default:
        return undefined;
    }
  };

  // Format currency
  const formatCurrency = (amount, currency = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/purchases/invoices')}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" component="h1">
              Purchase Invoice: {invoice.invoice_no}
            </Typography>
            <StatusChip
              label={invoice.status}
              color={getStatusColor(invoice.status)}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {invoice.docstatus === 0 && (
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => setUpdateDialogOpen(true)}
                sx={{ 
                  textTransform: 'none',
                  fontSize: '0.8125rem'
                }}
              >
                Edit
              </Button>
            )}
            {invoice.docstatus === 1 && 
             invoice.outstanding_amount > 0 && 
             invoice.status?.toLowerCase() !== 'paid' && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<Payment />}
                onClick={() => setPayDialogOpen(true)}
                sx={{ 
                  textTransform: 'none',
                  fontSize: '0.8125rem'
                }}
              >
                Pay Invoice
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={() => {
                // TODO: Implement print functionality
                window.print();
              }}
              sx={{ 
                textTransform: 'none',
                fontSize: '0.8125rem'
              }}
            >
              Print
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Invoice Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Invoice Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Invoice Number
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {invoice.invoice_no}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Supplier
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {invoice.supplier_name || invoice.supplier || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Posting Date
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(invoice.posting_date)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Due Date
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(invoice.due_date)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Bill No
                    </Typography>
                    <Typography variant="body1">
                      {invoice.bill_no || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Bill Date
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(invoice.bill_date)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Company
                    </Typography>
                    <Typography variant="body1">
                      {invoice.company || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Currency
                    </Typography>
                    <Typography variant="body1">
                      {invoice.currency || 'KES'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Financial Summary */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Financial Summary
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Net Total
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {formatCurrency(invoice.net_total || 0, invoice.currency)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Taxes & Charges
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {formatCurrency(invoice.total_taxes_and_charges || 0, invoice.currency)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Grand Total
                    </Typography>
                    <Typography variant="h6" color="primary" fontWeight={600}>
                      {formatCurrency(invoice.grand_total || 0, invoice.currency)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Paid Amount
                    </Typography>
                    <Typography variant="body1" fontWeight={500} color="success.main">
                      {formatCurrency(invoice.paid_amount || 0, invoice.currency)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Outstanding Amount
                    </Typography>
                    <Typography variant="body1" fontWeight={500} color="warning.main">
                      {formatCurrency(invoice.outstanding_amount || 0, invoice.currency)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Write-off Amount
                    </Typography>
                    <Typography variant="body1">
                      {formatCurrency(invoice.write_off_amount || 0, invoice.currency)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Items Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Items
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Item Code</TableCell>
                        <TableCell>Item Name</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell>UOM</TableCell>
                        <TableCell align="right">Rate</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Warehouse</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoice.items && invoice.items.length > 0 ? (
                        invoice.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.item_code}</TableCell>
                            <TableCell>{item.item_name}</TableCell>
                            <TableCell>{item.description || '-'}</TableCell>
                            <TableCell align="right">{item.qty?.toLocaleString() || '0'}</TableCell>
                            <TableCell>{item.uom || '-'}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(item.rate || 0, invoice.currency)}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(item.amount || 0, invoice.currency)}
                            </TableCell>
                            <TableCell>{item.warehouse || '-'}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No items found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Taxes */}
          {invoice.taxes && invoice.taxes.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Taxes & Charges
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Description</TableCell>
                          <TableCell align="right">Rate</TableCell>
                          <TableCell align="right">Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {invoice.taxes.map((tax, index) => (
                          <TableRow key={index}>
                            <TableCell>{tax.description || tax.account_head || '-'}</TableCell>
                            <TableCell align="right">
                              {tax.rate ? `${tax.rate}%` : '-'}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(tax.tax_amount || 0, invoice.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Linked Documents */}
          {(invoice.purchase_orders?.length > 0 || invoice.purchase_receipts?.length > 0) && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Linked Documents
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  {invoice.purchase_orders && invoice.purchase_orders.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Purchase Orders
                      </Typography>
                      <List dense>
                        {invoice.purchase_orders.map((po, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <Receipt fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={po} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                  {invoice.purchase_receipts && invoice.purchase_receipts.length > 0 && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Purchase Receipts (GRNs)
                      </Typography>
                      <List dense>
                        {invoice.purchase_receipts.map((grn, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <Receipt fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={grn} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Attachments */}
          {invoice.attachments && invoice.attachments.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Attachments
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <List>
                    {invoice.attachments.map((file, index) => (
                      <ListItem
                        key={index}
                        secondaryAction={
                          <IconButton
                            edge="end"
                            component="a"
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download />
                          </IconButton>
                        }
                      >
                        <ListItemIcon>
                          <AttachFile />
                        </ListItemIcon>
                        <ListItemText
                          primary={file.file_name}
                          secondary={`${formatFileSize(file.file_size)} ${file.is_private ? '(Private)' : '(Public)'}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Update Purchase Invoice Dialog */}
      <UpdatePurchaseInvoiceDialog
        open={updateDialogOpen}
        onClose={() => setUpdateDialogOpen(false)}
        invoice={invoice}
      />

      {/* Pay Purchase Invoice Dialog */}
      <PayPurchaseInvoiceDialog
        open={payDialogOpen}
        onClose={() => setPayDialogOpen(false)}
        invoice={invoice}
      />
    </Container>
  );
};

export default PurchaseInvoiceDetails;

