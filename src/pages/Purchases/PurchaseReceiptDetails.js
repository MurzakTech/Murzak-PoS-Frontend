import React, { useEffect } from 'react';
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
} from '@mui/material';
import { ArrowBack, Print } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  getPurchaseReceipt,
  clearSelectedPurchaseReceipt,
} from '../../store/purchaseSlice';

const PurchaseReceiptDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const {
    selectedPurchaseReceipt,
    isLoadingPurchaseReceiptDetails,
  } = useAppSelector((state) => state.purchase);

  useEffect(() => {
    if (id) {
      dispatch(getPurchaseReceipt({ name: id }));
    }

    // Cleanup on unmount
    return () => {
      dispatch(clearSelectedPurchaseReceipt());
    };
  }, [dispatch, id]);

  if (isLoadingPurchaseReceiptDetails) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!selectedPurchaseReceipt) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h6" color="error">
            Purchase Receipt not found
          </Typography>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/purchases/receipts')}
            sx={{ mt: 2 }}
          >
            Back to Purchase Receipts
          </Button>
        </Box>
      </Container>
    );
  }

  const receipt = selectedPurchaseReceipt;

  const getStatusChip = (docstatus) => {
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
            <IconButton onClick={() => navigate('/purchases/receipts')}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" component="h1">
              Purchase Receipt: {receipt.name}
            </Typography>
            {getStatusChip(receipt.docstatus)}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={() => window.print()}
            >
              Print
            </Button>
            <Button variant="outlined" onClick={() => navigate('/purchases/receipts')}>
              Back to List
            </Button>
          </Box>
        </Box>

        {/* Document Information */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Document Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Receipt Number
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {receipt.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>{getStatusChip(receipt.docstatus)}</Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Supplier
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {receipt.supplier || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Posting Date
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {receipt.posting_date || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Company
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {receipt.company || '-'}
                    </Typography>
                  </Grid>
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
                      Total Amount
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      KES{' '}
                      {(receipt.grand_total || receipt.total || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Items Count
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {receipt.items_count || receipt.items?.length || 0} item(s)
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Items Table */}
        <Paper sx={{ p: 3 }}>
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
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell>Warehouse</TableCell>
                  <TableCell align="right">Rate</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {receipt.items && receipt.items.length > 0 ? (
                  receipt.items.map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {item.item_code}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.item_name || '-'}</TableCell>
                      <TableCell align="right">{item.qty || 0}</TableCell>
                      <TableCell>{item.warehouse || '-'}</TableCell>
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
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
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
    </Container>
  );
};

export default PurchaseReceiptDetails;
