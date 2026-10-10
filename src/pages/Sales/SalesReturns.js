import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { AssignmentReturn, Add, Refresh, Search, Cancel as CancelIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  listSalesReturns,
  createSalesReturn,
  cancelSalesReturn,
  getSalesInvoice,
} from '../../store/salesSlice';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';
import { getUserCompany } from '../../utils/getUserCompany';
import { money, round2 } from './pos/money';

// Common reasons are offered as a list so reports can group returns by cause;
// "Other" asks the cashier to describe it.
export const RETURN_REASONS = [
  'Damaged or defective',
  'Wrong item supplied',
  'Expired or near expiry',
  'Customer changed mind',
  'Pricing error',
  'Other',
];

const EMPTY_FILTERS = { return_against: '', customer: '', from_date: '', to_date: '' };

const today = () => new Date().toISOString().split('T')[0];

// Credit notes carry negative totals; the list shows the refund as a positive amount.
const refundAmount = (row) => Math.abs(Number(row?.rounded_total || row?.grand_total || 0));

const STATUS_STYLES = {
  Draft: '#64748B',
  Return: '#F59E0B',
  'Credit Note Issued': '#F59E0B',
  Paid: '#10B981',
  Cancelled: '#EF4444',
};

const statusLabel = (row) => {
  if (row.docstatus === 0) return 'Draft';
  if (row.docstatus === 2) return 'Cancelled';
  return row.status || 'Return';
};

/**
 * Turns the original invoice's lines into editable return lines. Every line
 * starts at zero so nothing is returned unless the cashier asks for it.
 */
export const buildReturnLines = (invoice) =>
  (invoice?.items || []).map((item) => ({
    row_id: item.name,
    item_code: item.item_code,
    item_name: item.item_name || item.item_code,
    sold_qty: Math.abs(Number(item.qty) || 0),
    rate: Number(item.rate) || 0,
    uom: item.uom,
    warehouse: item.warehouse,
    batch_no: item.batch_no,
    serial_no: item.serial_no,
    return_qty: 0,
  }));

/**
 * Builds the request the backend's create_sales_return expects, or returns an
 * error message the cashier can act on.
 */
export const buildReturnPayload = ({ invoice, lines, reason, notes, company }) => {
  const chosen = lines.filter((l) => Number(l.return_qty) > 0);
  if (chosen.length === 0) {
    return { error: 'Enter a return quantity for at least one item.' };
  }
  const tooMany = chosen.find((l) => Number(l.return_qty) > l.sold_qty);
  if (tooMany) {
    return { error: `You cannot return more ${tooMany.item_name} than was sold (${tooMany.sold_qty}).` };
  }
  if (!reason) {
    return { error: 'Choose a reason for the return.' };
  }
  if (reason === 'Other' && !notes?.trim()) {
    return { error: 'Describe the reason for the return.' };
  }

  const fullReason = [reason, notes?.trim()].filter(Boolean).join(': ');
  return {
    payload: {
      customer: invoice.customer,
      return_against: invoice.name,
      company: company || invoice.company,
      posting_date: today(),
      reason: fullReason,
      items: chosen.map((l) => ({
        item_code: l.item_code,
        qty: Number(l.return_qty),
        rate: l.rate,
        uom: l.uom,
        warehouse: l.warehouse,
        batch_no: l.batch_no || undefined,
        serial_no: l.serial_no || undefined,
        against_sales_invoice_item: l.row_id,
      })),
    },
  };
};

// Tells the cashier why an invoice cannot be returned, or null when it can.
export const returnBlocker = (invoice) => {
  if (!invoice?.name) return 'That invoice could not be found. Check the number and try again.';
  if (invoice.is_return) return 'This is already a return. Search for the original sale instead.';
  if (invoice.docstatus === 0) return 'This invoice is still a draft. Only completed sales can be returned.';
  if (invoice.docstatus === 2) return 'This invoice was cancelled, so there is nothing to return.';
  return null;
};

const NewReturnDialog = ({ open, initialInvoice, company, onClose, onCreated }) => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [invoiceNo, setInvoiceNo] = useState(initialInvoice || '');
  const [invoice, setInvoice] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lines, setLines] = useState([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const lookup = useCallback(async (number) => {
    const name = (number || '').trim();
    if (!name) return;
    setIsLookingUp(true);
    setLookupError('');
    setFormError('');
    setInvoice(null);
    setLines([]);
    const result = await dispatch(getSalesInvoice({ name }));
    setIsLookingUp(false);
    const found = result.payload?.salesInvoice;
    const blocker = getSalesInvoice.fulfilled.match(result) ? returnBlocker(found) : returnBlocker(null);
    if (blocker) {
      setLookupError(blocker);
      return;
    }
    setInvoice(found);
    setLines(buildReturnLines(found));
  }, [dispatch]);

  useEffect(() => {
    if (open && initialInvoice) {
      setInvoiceNo(initialInvoice);
      lookup(initialInvoice);
    }
  }, [open, initialInvoice, lookup]);

  const setQty = (index, value) => {
    setFormError('');
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, return_qty: value } : l)));
  };

  const returnAll = () => setLines((prev) => prev.map((l) => ({ ...l, return_qty: l.sold_qty })));

  const total = round2(lines.reduce((sum, l) => sum + (Number(l.return_qty) || 0) * l.rate, 0));
  const currency = invoice?.currency || 'KES';

  const handleSubmit = async () => {
    const { payload, error } = buildReturnPayload({ invoice, lines, reason, notes, company });
    if (error) {
      setFormError(error);
      return;
    }
    setIsSaving(true);
    const result = await dispatch(createSalesReturn(payload));
    setIsSaving(false);
    if (createSalesReturn.fulfilled.match(result)) {
      onCreated(result.payload.salesReturn);
    }
  };

  return (
    <Dialog open={open} onClose={isSaving ? undefined : onClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
      <DialogTitle>New Sales Return</DialogTitle>
      <DialogContent dividers>
        <Box
          component="form"
          onSubmit={(e) => { e.preventDefault(); lookup(invoiceNo); }}
          sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}
        >
          <TextField
            label="Original invoice number"
            placeholder="e.g. ACC-SINV-2026-00012"
            size="small"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            sx={{ flex: '1 1 240px' }}
            autoFocus={!initialInvoice}
          />
          <Button
            type="submit"
            variant="outlined"
            startIcon={isLookingUp ? <CircularProgress size={16} /> : <Search />}
            disabled={isLookingUp || !invoiceNo.trim()}
          >
            Find sale
          </Button>
        </Box>

        {lookupError && <Alert severity="warning" sx={{ mb: 2 }}>{lookupError}</Alert>}

        {!invoice && !lookupError && !isLookingUp && (
          <Typography variant="body2" color="text.secondary">
            Type the invoice number from the customer's receipt, then choose Find sale.
          </Typography>
        )}

        {invoice && (
          <>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 2 }}>
              <Typography variant="body2"><strong>Customer:</strong> {invoice.customer_name || invoice.customer}</Typography>
              <Typography variant="body2"><strong>Sold on:</strong> {invoice.posting_date ? new Date(invoice.posting_date).toLocaleDateString() : '-'}</Typography>
              <Typography variant="body2"><strong>Sale total:</strong> {money(invoice.grand_total, currency)}</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Items being returned</Typography>
              <Button size="small" onClick={returnAll}>Return everything</Button>
            </Box>
            <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Sold</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right" sx={{ width: 110 }}>Return qty</TableCell>
                    <TableCell align="right">Refund</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((line, index) => {
                    const over = Number(line.return_qty) > line.sold_qty;
                    return (
                      <TableRow key={line.row_id || index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{line.item_name}</Typography>
                          {line.item_name !== line.item_code && (
                            <Typography variant="caption" color="text.secondary">{line.item_code}</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">{line.sold_qty} {line.uom || ''}</TableCell>
                        <TableCell align="right">{money(line.rate, currency)}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={line.return_qty}
                            onChange={(e) => setQty(index, Math.max(0, Number(e.target.value) || 0))}
                            error={over}
                            inputProps={{ min: 0, max: line.sold_qty, step: 'any', 'aria-label': `Return quantity for ${line.item_name}` }}
                            sx={{ width: 90 }}
                          />
                        </TableCell>
                        <TableCell align="right">{money((Number(line.return_qty) || 0) * line.rate, currency)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <FormControl size="small" sx={{ flex: '1 1 220px' }} required>
                <InputLabel id="return-reason-label">Reason</InputLabel>
                <Select
                  labelId="return-reason-label"
                  label="Reason"
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); setFormError(''); }}
                >
                  {RETURN_REASONS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                size="small"
                label={reason === 'Other' ? 'Describe the reason' : 'Notes (optional)'}
                required={reason === 'Other'}
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setFormError(''); }}
                sx={{ flex: '2 1 260px' }}
              />
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              Saving records a credit note against this sale and puts the returned items back into stock.
              Hand the customer their refund the usual way; the credit note reduces what the system says they owe.
            </Alert>

            <Typography variant="h6" align="right">Refund total: {money(total, currency)}</Typography>
          </>
        )}

        {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>Close</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!invoice || isSaving || total <= 0}
          startIcon={isSaving ? <CircularProgress size={16} /> : <AssignmentReturn />}
        >
          {isSaving ? 'Saving...' : 'Save return'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const CancelReturnDialog = ({ open, salesReturn, onClose, onConfirm, isLoading }) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Cancel return {salesReturn?.name}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Cancelling reverses this credit note and takes the returned items back out of stock.
          Only do this if the return was recorded by mistake.
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          required
          label="Why is this return being cancelled?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>Keep return</Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => onConfirm(reason.trim())}
          disabled={isLoading || !reason.trim()}
          startIcon={isLoading ? <CircularProgress size={16} /> : null}
        >
          {isLoading ? 'Cancelling...' : 'Cancel return'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const SalesReturns = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const invoiceFromUrl = searchParams.get('invoice');

  const { salesReturns, isLoadingReturns } = useAppSelector((state) => state.sales);
  const { user } = useAppSelector((state) => state.auth);
  const company = getUserCompany(user);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [newOpen, setNewOpen] = useState(Boolean(invoiceFromUrl));
  const [toCancel, setToCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const load = useCallback(() => {
    const params = { limit_start: 0, limit_page_length: 100 };
    if (company) params.company = company;
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value) params[key] = value.trim();
    });
    dispatch(listSalesReturns(params));
  }, [dispatch, company, appliedFilters]);

  useEffect(() => {
    load();
  }, [load]);

  // The filter bar reports every keystroke; wait for typing to pause before asking the server.
  useEffect(() => {
    const timer = setTimeout(() => setAppliedFilters(filters), 400);
    return () => clearTimeout(timer);
  }, [filters]);

  const closeNew = () => {
    setNewOpen(false);
    if (invoiceFromUrl) setSearchParams({}, { replace: true });
  };

  const handleCreated = () => {
    closeNew();
    load();
  };

  const handleCancelConfirm = async (reason) => {
    setIsCancelling(true);
    const result = await dispatch(cancelSalesReturn({ name: toCancel.name, reason }));
    setIsCancelling(false);
    if (cancelSalesReturn.fulfilled.match(result)) {
      setToCancel(null);
      load();
    }
  };

  const activeReturns = salesReturns.filter((r) => r.docstatus === 1);
  const totalRefunded = activeReturns.reduce((sum, r) => sum + refundAmount(r), 0);

  const columns = useMemo(() => [
    {
      field: 'name',
      header: 'Return #',
      render: (value) => <Typography variant="body2" fontWeight={500}>{value}</Typography>,
    },
    {
      field: 'return_against',
      header: 'Original sale',
      render: (value) => (value ? (
        <Link
          component="button"
          variant="body2"
          onClick={(e) => { e.stopPropagation(); navigate(`/sales/invoice/${value}`); }}
        >
          {value}
        </Link>
      ) : '-'),
    },
    { field: 'customer', header: 'Customer' },
    {
      field: 'posting_date',
      header: 'Date',
      render: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
    {
      field: 'grand_total',
      header: 'Refund',
      align: 'right',
      render: (value, row) => money(refundAmount(row)),
    },
    {
      field: 'status',
      header: 'Status',
      render: (value, row) => {
        const label = statusLabel(row);
        return <StatusChip status={label.toLowerCase()} label={label} color={STATUS_STYLES[label] || '#64748B'} />;
      },
    },
    {
      field: 'actions',
      header: '',
      align: 'right',
      render: (value, row) => (row.docstatus === 1 ? (
        <Tooltip title="Cancel this return">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setToCancel(row); }} aria-label={`Cancel return ${row.name}`}>
            <CancelIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null),
    },
  ], [navigate]);

  const filterBarFilters = [
    { type: 'text', key: 'customer', label: 'Customer', value: filters.customer, placeholder: 'Customer...', width: 160 },
    { type: 'date', key: 'from_date', label: 'From Date', value: filters.from_date, width: 140 },
    { type: 'date', key: 'to_date', label: 'To Date', value: filters.to_date, width: 140 },
  ];

  return (
    <Box>
      <PageHeader
        title="Sales Returns"
        subtitle="Record goods brought back by customers and issue credit notes"
        icon={AssignmentReturn}
        stats={[
          { value: activeReturns.length, label: 'Returns', color: 'primary.main' },
          { value: money(totalRefunded), label: 'Refunded', color: 'warning.main' },
        ]}
        actions={[
          { label: 'Refresh', icon: <Refresh />, onClick: load, variant: 'outlined' },
          { label: 'New Return', icon: <Add />, onClick: () => setNewOpen(true) },
        ]}
        loading={isLoadingReturns && salesReturns.length === 0}
      />

      <Box sx={{ mb: 2 }}>
        <FilterBar
          searchValue={filters.return_against}
          searchPlaceholder="Original invoice number..."
          onSearchChange={(value) => setFilters((f) => ({ ...f, return_against: value }))}
          filters={filterBarFilters}
          onFilterChange={(key, value) => setFilters((f) => ({ ...f, [key]: value || '' }))}
          onClearFilters={() => setFilters(EMPTY_FILTERS)}
        />
      </Box>

      <DataTable
        columns={columns}
        rows={salesReturns}
        loading={isLoadingReturns}
        emptyMessage="No sales returns yet. Use New Return when a customer brings goods back."
        emptyIcon={AssignmentReturn}
        rowKey="name"
      />

      {newOpen && (
        <NewReturnDialog
          open={newOpen}
          initialInvoice={invoiceFromUrl}
          company={company}
          onClose={closeNew}
          onCreated={handleCreated}
        />
      )}

      <CancelReturnDialog
        open={Boolean(toCancel)}
        salesReturn={toCancel}
        onClose={() => setToCancel(null)}
        onConfirm={handleCancelConfirm}
        isLoading={isCancelling}
      />
    </Box>
  );
};

export default SalesReturns;
