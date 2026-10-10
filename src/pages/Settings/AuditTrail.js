import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Link, Typography } from '@mui/material';
import { ManageSearch, Refresh, FileDownload } from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';
import useRoleAccess from '../../hooks/useRoleAccess';
import { getUserCompany } from '../../utils/getUserCompany';
import { listAuditEvents, getAuditFilterOptions } from '../../api/auditApi';

const PAGE_SIZE = 50;

// Colours group actions by how much attention they deserve.
export const ACTION_COLORS = {
  Created: '#10B981',
  Updated: '#3B82F6',
  Submitted: '#6366F1',
  Cancelled: '#F59E0B',
  Deleted: '#EF4444',
  'Signed in': '#64748B',
  'Signed out': '#64748B',
  'Sign-in failed': '#EF4444',
};

// Documents that have their own page in the app, so the audit row can link to them.
export const DOCUMENT_ROUTES = {
  'Sales Invoice': '/sales/invoice/',
  'POS Invoice': '/sales/pos-invoice/',
  'Purchase Invoice': '/purchases/invoices/',
  'Purchase Receipt': '/purchases/receipts/',
  'Stock Entry': '/inventory/stock-entries/',
  Supplier: '/suppliers/',
};

const isoDate = (d) => d.toISOString().split('T')[0];

export const defaultFilters = (now = new Date()) => {
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  return { search: '', user: '', module: '', action: '', from_date: isoDate(weekAgo), to_date: isoDate(now) };
};

export const formatWhen = (timestamp) => {
  if (!timestamp) return '-';
  const d = new Date(String(timestamp).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? String(timestamp) : d.toLocaleString();
};

// Quote every cell so commas, quotes and line breaks in details survive in Excel.
export const toCsv = (events) => {
  const header = ['When', 'Staff', 'Email', 'Action', 'Area', 'Document type', 'Document', 'Details'];
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = events.map((e) => [
    e.timestamp, e.user_name, e.user, e.action, e.module, e.doctype, e.docname, e.summary,
  ]);
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
};

const downloadCsv = (events, filters) => {
  const blob = new Blob([`﻿${toCsv(events)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-trail_${filters.from_date || 'start'}_to_${filters.to_date || 'today'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const AuditTrail = () => {
  const navigate = useNavigate();
  const { hasAccess } = useRoleAccess();
  const { user } = useAppSelector((state) => state.auth);
  const company = getUserCompany(user);

  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [options, setOptions] = useState({ users: [], modules: [], actions: [] });
  const [events, setEvents] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  // Ignore replies to requests that newer filters have replaced.
  const requestId = useRef(0);

  useEffect(() => {
    getAuditFilterOptions(company).then(setOptions).catch(() => {});
  }, [company]);

  // The filter bar reports every keystroke; wait for typing to pause before asking the server.
  useEffect(() => {
    const timer = setTimeout(() => setAppliedFilters(filters), 400);
    return () => clearTimeout(timer);
  }, [filters]);

  const load = useCallback(async (append = false, offset = 0) => {
    const id = ++requestId.current;
    if (append) setIsLoadingMore(true); else setIsLoading(true);
    setError('');
    try {
      const result = await listAuditEvents({
        ...appliedFilters,
        search: appliedFilters.search.trim(),
        company,
        limit_start: offset,
        limit_page_length: PAGE_SIZE,
      });
      if (id !== requestId.current) return;
      setEvents((prev) => (append ? [...prev, ...result.events] : result.events));
      setHasMore(result.hasMore);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e.message);
      if (!append) setEvents([]);
    } finally {
      if (id === requestId.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [appliedFilters, company]);

  useEffect(() => {
    load(false, 0);
  }, [load]);

  const counts = useMemo(() => ({
    total: events.length,
    risky: events.filter((e) => ['Cancelled', 'Deleted', 'Sign-in failed'].includes(e.action)).length,
    staff: new Set(events.map((e) => e.user)).size,
  }), [events]);

  const columns = useMemo(() => [
    {
      field: 'timestamp',
      header: 'When',
      width: '15%',
      render: (value) => <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{formatWhen(value)}</Typography>,
    },
    {
      field: 'user_name',
      header: 'Staff',
      width: '15%',
      render: (value, row) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>{value || row.user}</Typography>
          {value && value !== row.user && (
            <Typography variant="caption" color="text.secondary">{row.user}</Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'action',
      header: 'Action',
      width: '12%',
      render: (value) => (
        <StatusChip status={(value || '').toLowerCase()} label={value} color={ACTION_COLORS[value] || '#64748B'} />
      ),
    },
    {
      field: 'docname',
      header: 'Document',
      width: '20%',
      render: (value, row) => {
        if (!value) return <Typography variant="body2" color="text.secondary">{row.module}</Typography>;
        const base = DOCUMENT_ROUTES[row.doctype];
        const canOpen = base && row.action !== 'Deleted' && hasAccess(`${base}${value}`);
        return (
          <Box>
            <Typography variant="caption" color="text.secondary">{row.doctype}</Typography>
            <Box>
              {canOpen ? (
                <Link component="button" variant="body2" onClick={() => navigate(`${base}${encodeURIComponent(value)}`)}>
                  {value}
                </Link>
              ) : (
                <Typography variant="body2">{value}</Typography>
              )}
            </Box>
          </Box>
        );
      },
    },
    {
      field: 'summary',
      header: 'Details',
      render: (value) => <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{value}</Typography>,
    },
  ], [hasAccess, navigate]);

  const select = (key, label, values, width = 150) => ({
    type: 'select',
    key,
    label,
    value: filters[key],
    width,
    options: [{ value: '', label: `All ${label.toLowerCase()}` }, ...values],
  });

  const filterBarFilters = [
    select('user', 'Staff', options.users || [], 170),
    select('module', 'Areas', (options.modules || []).map((m) => ({ value: m, label: m }))),
    select('action', 'Actions', (options.actions || []).map((a) => ({ value: a, label: a }))),
    { type: 'date', key: 'from_date', label: 'From Date', value: filters.from_date, width: 140 },
    { type: 'date', key: 'to_date', label: 'To Date', value: filters.to_date, width: 140 },
  ];

  return (
    <Box>
      <PageHeader
        title="Audit Trail"
        subtitle="Who did what, and when: sales, stock, prices, staff and sign-ins"
        icon={ManageSearch}
        stats={[
          { value: counts.total, label: hasMore ? 'Shown' : 'Events', color: 'primary.main' },
          { value: counts.risky, label: 'Cancels, deletes, failed sign-ins', color: 'error.main' },
          { value: counts.staff, label: 'Staff', color: 'info.main' },
        ]}
        actions={[
          { label: 'Refresh', icon: <Refresh />, onClick: () => load(false, 0), variant: 'outlined' },
          {
            label: 'Export CSV',
            icon: <FileDownload />,
            onClick: () => downloadCsv(events, appliedFilters),
            disabled: events.length === 0,
            variant: 'outlined',
          },
        ]}
        loading={isLoading && events.length === 0}
      />

      <Box sx={{ mb: 2 }}>
        <FilterBar
          searchValue={filters.search}
          searchPlaceholder="Document number or email..."
          onSearchChange={(value) => setFilters((f) => ({ ...f, search: value }))}
          filters={filterBarFilters}
          onFilterChange={(key, value) => setFilters((f) => ({ ...f, [key]: value || '' }))}
          onClearFilters={() => setFilters(defaultFilters())}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={events}
        loading={isLoading}
        emptyMessage="No activity matches these filters. Try a wider date range."
        emptyIcon={ManageSearch}
        rowKey="id"
      />

      {hasMore && !isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button
            variant="outlined"
            onClick={() => load(true, events.length)}
            disabled={isLoadingMore}
            startIcon={isLoadingMore ? <CircularProgress size={16} /> : null}
          >
            {isLoadingMore ? 'Loading...' : 'Show more'}
          </Button>
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        The export contains the events loaded on this page. Use Show more first to include older ones.
      </Typography>
    </Box>
  );
};

export default AuditTrail;
