import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Typography } from '@mui/material';
import { CalendarToday, Refresh, FileDownload } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { listWarehouses } from '../../store/warehouseSlice';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';
import { getUserCompany } from '../../utils/getUserCompany';
import { getExpiryAlerts } from '../../api/expiryApi';
import { money } from '../Sales/pos/money';

export const STATUS_COLORS = {
  Expired: '#EF4444',
  'Expires within 7 days': '#F59E0B',
  'Expiring soon': '#3B82F6',
};

const WINDOWS = [7, 14, 30, 60, 90];
const DEFAULT_DAYS = 30;
const EMPTY_FILTERS = { search: '', days: String(DEFAULT_DAYS), warehouse: '', include_expired: true };

// "Expired 3 days ago", "Expires today", "Expires in 5 days"
export const describeDaysLeft = (daysLeft) => {
  const n = Number(daysLeft);
  if (Number.isNaN(n)) return '-';
  if (n < -1) return `Expired ${-n} days ago`;
  if (n === -1) return 'Expired yesterday';
  if (n === 0) return 'Expires today';
  if (n === 1) return 'Expires tomorrow';
  return `Expires in ${n} days`;
};

// Search across item name, code, batch and warehouse, ignoring case.
export const filterAlerts = (alerts, search) => {
  const term = (search || '').trim().toLowerCase();
  if (!term) return alerts;
  return alerts.filter((a) =>
    [a.item_name, a.item_code, a.batch_no, a.warehouse].some((v) => String(v || '').toLowerCase().includes(term))
  );
};

export const toCsv = (alerts) => {
  const header = ['Item', 'Item code', 'Batch', 'Warehouse', 'Quantity', 'Unit', 'Expiry date', 'Days left', 'Status', 'Stock value'];
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = alerts.map((a) => [
    a.item_name, a.item_code, a.batch_no, a.warehouse, a.qty, a.stock_uom, a.expiry_date, a.days_left, a.status, a.stock_value,
  ]);
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
};

const downloadCsv = (alerts, days) => {
  const blob = new Blob([`﻿${toCsv(alerts)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expiry-alerts_next-${days}-days_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const ExpiryAlerts = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { warehouses } = useAppSelector((state) => state.warehouse);
  const company = getUserCompany(user);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const days = Number(filters.days) || DEFAULT_DAYS;
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // Ignore replies to requests that newer filters have replaced.
  const requestId = useRef(0);

  useEffect(() => {
    if (company) dispatch(listWarehouses({ company, limit: 1000 }));
  }, [dispatch, company]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    setError('');
    try {
      const result = await getExpiryAlerts({
        company,
        days,
        warehouse: filters.warehouse,
        includeExpired: filters.include_expired,
      });
      if (id !== requestId.current) return;
      setAlerts(result.alerts);
      setSummary(result.summary);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e.message);
      setAlerts([]);
      setSummary(null);
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [company, days, filters.warehouse, filters.include_expired]);

  useEffect(() => {
    load();
  }, [load]);

  // One line per item, batch and store; the table needs that as a single key.
  const visible = useMemo(
    () => filterAlerts(alerts, filters.search).map((a) => ({ ...a, key: `${a.item_code}|${a.batch_no}|${a.warehouse}` })),
    [alerts, filters.search]
  );

  const count = (status) => summary?.by_status?.find((s) => s.status === status)?.lines || 0;

  const columns = useMemo(() => [
    {
      field: 'item_name',
      header: 'Item',
      width: '24%',
      render: (value, row) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>{value}</Typography>
          {value !== row.item_code && (
            <Typography variant="caption" color="text.secondary">{row.item_code}</Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'batch_no',
      header: 'Batch',
      width: '13%',
      render: (value) => <Typography variant="body2">{value || '-'}</Typography>,
    },
    { field: 'warehouse', header: 'Store', width: '15%' },
    {
      field: 'qty',
      header: 'Quantity',
      align: 'right',
      width: '10%',
      render: (value, row) => `${Number(value).toLocaleString()} ${row.stock_uom || ''}`,
    },
    {
      field: 'expiry_date',
      header: 'Expiry',
      width: '16%',
      render: (value, row) => (
        <Box>
          <Typography variant="body2">{value ? new Date(value).toLocaleDateString() : '-'}</Typography>
          <Typography variant="caption" color="text.secondary">{describeDaysLeft(row.days_left)}</Typography>
        </Box>
      ),
    },
    {
      field: 'status',
      header: 'Status',
      width: '12%',
      render: (value) => (
        <StatusChip status={(value || '').toLowerCase()} label={value} color={STATUS_COLORS[value] || '#64748B'} />
      ),
    },
    {
      field: 'stock_value',
      header: 'Value',
      align: 'right',
      render: (value) => money(value),
    },
  ], []);

  const filterBarFilters = [
    {
      type: 'select',
      key: 'days',
      label: 'Expiring within',
      value: filters.days,
      width: 150,
      options: WINDOWS.map((d) => ({ value: String(d), label: `${d} days` })),
    },
    {
      type: 'select',
      key: 'warehouse',
      label: 'Store',
      value: filters.warehouse,
      width: 180,
      options: [
        { value: '', label: 'All stores' },
        ...(warehouses || []).map((wh) => ({ value: wh.name, label: wh.warehouse_name || wh.name })),
      ],
    },
    { type: 'chip', key: 'include_expired', label: 'Show expired', value: filters.include_expired },
  ];

  return (
    <Box>
      <PageHeader
        title="Expiry Alerts"
        subtitle="Stock that has expired or will expire soon, so you can sell, return or remove it in time"
        icon={CalendarToday}
        stats={[
          { value: count('Expired'), label: 'Expired', color: 'error.main' },
          { value: count('Expires within 7 days'), label: 'Within 7 days', color: 'warning.main' },
          { value: money(summary?.value_at_risk || 0), label: 'Value at risk', color: 'primary.main' },
        ]}
        actions={[
          { label: 'Refresh', icon: <Refresh />, onClick: load, variant: 'outlined' },
          {
            label: 'Export CSV',
            icon: <FileDownload />,
            onClick: () => downloadCsv(visible, days),
            disabled: visible.length === 0,
            variant: 'outlined',
          },
        ]}
        loading={isLoading && alerts.length === 0}
      />

      <Box sx={{ mb: 2 }}>
        <FilterBar
          searchValue={filters.search}
          searchPlaceholder="Item, batch or store..."
          onSearchChange={(value) => setFilters((f) => ({ ...f, search: value }))}
          filters={filterBarFilters}
          onFilterChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
          onClearFilters={() => setFilters(EMPTY_FILTERS)}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {count('Expired') > 0 && filters.include_expired && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Expired stock should not be sold. Remove it from the shelf, then record it as damaged or return it to the supplier.
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={visible}
        loading={isLoading}
        emptyMessage={`Nothing expires in the next ${days} days.`}
        emptyIcon={CalendarToday}
        rowKey="key"
      />

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        Expiry dates come from item batches and from the expiry date entered when stock is received.
        Items without an expiry date are not listed.
      </Typography>
    </Box>
  );
};

export default ExpiryAlerts;
