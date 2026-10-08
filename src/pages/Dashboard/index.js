import React, { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  TrendingUp,
  Inventory,
  Receipt,
  AccountBalance,
  AssignmentReturn,
  TrendingDown,
  LocalShipping,
  Download,
  Refresh as RefreshIcon,
  PointOfSale,
  Add,
  CheckCircleOutline,
  Inventory2Outlined,
  RocketLaunchOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { listWarehouses } from '../../store/warehouseSlice';
import { getStaffUsers } from '../../store/staffSlice';
import { getProducts } from '../../store/productSlice';
import { bulkUploadProducts } from '../../store/productSeedingSlice';
import SectionCard from '../../components/Common/SectionCard';
import StatCard from '../../components/Common/StatCard';
import EmptyState from '../../components/Common/EmptyState';
import { PageSkeleton } from '../../components/Common/LoadingState';
import GettingStarted, { useChecklistState } from './GettingStarted';
import WelcomeSetup from './WelcomeSetup';
import { SalesTrendChart, MonthlySalesChart } from './DashboardCharts';
import { formatMoney, getGreeting, PERIOD_LABELS } from './formatters';

const EMPTY_DATA = {
  stats: {
    totalSales: 0,
    netSales: 0,
    salesReturns: 0,
    totalPurchases: 0,
    netPurchases: 0,
    purchaseReturns: 0,
    invoicesDue: 0,
    totalExpense: 0,
    profitMargin: 0,
    salesReturnsCount: 0,
    purchaseReturnsCount: 0,
    invoicesDueCount: 0,
  },
  salesLast30Days: [],
  monthlySales: [],
  salesDue: [],
  purchasesDue: [],
  stockAlerts: [],
  pendingShipments: [],
};

// Compact, single-row filter bar
const FilterBar = ({ filters, onChange, warehouses, staffUsers, loading, onRefresh, onExport }) => (
  <Card sx={{ p: 1.5, mb: 3 }}>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
      <FormControl sx={{ minWidth: 170 }}>
        <InputLabel id="period-label">Period</InputLabel>
        <Select labelId="period-label" label="Period" value={filters.period} onChange={(e) => onChange('period', e.target.value)}>
          {Object.entries(PERIOD_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {filters.period === 'custom' && (
        <>
          <TextField
            label="From"
            type="date"
            value={filters.from_date || ''}
            onChange={(e) => onChange('from_date', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="To"
            type="date"
            value={filters.to_date || ''}
            onChange={(e) => onChange('to_date', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </>
      )}

      <FormControl sx={{ minWidth: 170 }}>
        <InputLabel id="store-label">Store</InputLabel>
        <Select labelId="store-label" label="Store" value={filters.warehouse} onChange={(e) => onChange('warehouse', e.target.value)}>
          <MenuItem value="">All stores</MenuItem>
          {warehouses.map((wh) => (
            <MenuItem key={wh.name} value={wh.name}>
              {wh.warehouse_name || wh.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 170 }}>
        <InputLabel id="staff-label">Staff member</InputLabel>
        <Select labelId="staff-label" label="Staff member" value={filters.staff} onChange={(e) => onChange('staff', e.target.value)}>
          <MenuItem value="">All staff</MenuItem>
          {staffUsers.map((s) => (
            <MenuItem key={s.name || s.email} value={s.name || s.email}>
              {s.full_name || s.name || s.email}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ flexGrow: 1 }} />

      <Stack direction="row" spacing={1}>
        <Tooltip title="Refresh figures">
          <span>
            <IconButton onClick={onRefresh} disabled={loading} aria-label="Refresh figures">
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Button variant="outlined" startIcon={<Download />} onClick={onExport}>
          Export
        </Button>
      </Stack>
    </Stack>
  </Card>
);

const statusColor = (status) => (status === 'Overdue' || status === 'Critical' ? 'error' : status === 'Due Soon' || status === 'Low' ? 'warning' : 'default');

const Dashboard = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { user, isLoading: isLoadingAuth } = useAppSelector((state) => state.auth);
  const { warehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
  const { staffUsers } = useAppSelector((state) => state.staff);
  const { pagination } = useAppSelector((state) => state.product);

  const [filters, setFilters] = useState({ period: '30days', warehouse: '', staff: '', from_date: null, to_date: null });
  const [productCheck, setProductCheck] = useState('pending'); // 'pending' | 'done' | 'failed'
  const [loadingStarter, setLoadingStarter] = useState(false);

  const company = user?.company;
  const currency = user?.company_currency || 'KES';
  const firstName = user?.first_name || user?.full_name?.split(' ')[0] || '';
  const industry = user?.pos_industry || null;
  const checklist = useChecklistState(company);

  // Default the store filter to the active store once it is known
  useEffect(() => {
    if (activeWarehouse && !filters.warehouse) {
      setFilters((prev) => ({ ...prev, warehouse: activeWarehouse.name || activeWarehouse.warehouse_name || '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWarehouse]);

  // Does this business have any products yet? That decides which view we show.
  useEffect(() => {
    if (isLoadingAuth || productCheck !== 'pending') return;
    if (company) {
      dispatch(getProducts({ company, page: 1, page_size: 1 }))
        .unwrap()
        .then(() => setProductCheck('done'))
        .catch(() => setProductCheck('failed'));
    } else if (!user) {
      setProductCheck('failed');
    }
  }, [dispatch, user, company, productCheck, isLoadingAuth]);

  const { data: dashboardData, loading: metricsLoading, error, refetch } = useDashboardMetrics(filters);

  useEffect(() => {
    if (company) {
      dispatch(listWarehouses({ company, limit: 1000 }));
      dispatch(getStaffUsers({ company, enabledOnly: false }));
    }
  }, [dispatch, company]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'period' && value !== 'custom') {
        next.from_date = null;
        next.to_date = null;
      }
      return next;
    });
  };

  const goTo = (path) => navigate(path);

  const handleLoadStarter = async () => {
    const code = industry?.industry_code || industry?.name;
    if (!code) return;
    setLoadingStarter(true);
    try {
      await dispatch(bulkUploadProducts()).unwrap();
    } catch (e) {
      // Carry on to the setup page, which shows its own progress and errors
      console.error('Starter product upload failed:', e);
    }
    navigate(`/industry/${encodeURIComponent(code)}/products`);
  };

  // Still working out who this is and whether they have products
  if (isLoadingAuth || productCheck === 'pending') {
    return <PageSkeleton />;
  }

  // Brand-new business with no products: guide them to add some
  const hasNoProducts = productCheck === 'done' && pagination.total === 0;
  if (hasNoProducts) {
    return (
      <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
        <WelcomeSetup
          firstName={firstName}
          companyName={user?.company_name || company}
          industry={industry}
          loadingStarter={loadingStarter}
          onLoadStarter={handleLoadStarter}
          onNavigate={goTo}
        />
        <GettingStarted checklist={checklist} productCount={0} staffCount={staffUsers.length} hasSales={false} onNavigate={goTo} />
      </Box>
    );
  }

  const data = { ...EMPTY_DATA, ...(dashboardData || {}), stats: { ...EMPTY_DATA.stats, ...(dashboardData?.stats || {}) } };
  const { stats } = data;
  const periodLabel = PERIOD_LABELS[filters.period] || '';
  // Net sales minus expenses recorded in the accounts. It does not subtract what the stock
  // cost, so it is labelled for what it is rather than as profit. The server's "profitMargin"
  // is a fixed placeholder (it assumes stock costs 70% of sales), so it is not shown.
  const afterExpenses = (stats.netSales || 0) - (stats.totalExpense || 0);
  const pendingItems = data.pendingShipments.reduce((acc, s) => acc + (s.items || 0), 0);
  const outstandingTotal = data.salesDue.reduce((acc, d) => acc + (d.amount || 0), 0);

  const handleExportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Revenue', stats.totalSales],
      ['Net Sales', stats.netSales],
      ['Total Purchases', stats.totalPurchases],
      ['Net Purchases', stats.netPurchases],
      ['Outstanding Invoices', stats.invoicesDue],
      ['Sales Returns', stats.salesReturns],
      ['Purchase Returns', stats.purchaseReturns],
      ['Operating Expenses', stats.totalExpense],
      ['Sales after expenses (cost of stock not included)', afterExpenses],
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dashboard-summary-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const money = (v) => formatMoney(v, currency);
  const guideVisible = !checklist[0].dismissed;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', animation: 'murzak-fade-up .3s ease both' }}>
      {/* Greeting + the two things people do most */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h3">
            {getGreeting()}
            {firstName ? `, ${firstName}` : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Here is how {user?.company_name || company || 'your business'} is doing. Showing {periodLabel.toLowerCase()}.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.25}>
          {!guideVisible && (
            <Button
              color="inherit"
              startIcon={<RocketLaunchOutlined />}
              sx={{ color: 'text.secondary' }}
              onClick={() => checklist[1]({ ...checklist[0], dismissed: false, collapsed: false })}
            >
              Setup guide
            </Button>
          )}
          <Button variant="outlined" startIcon={<Add />} onClick={() => goTo('/products/new')}>
            Add product
          </Button>
          <Button variant="contained" startIcon={<PointOfSale />} onClick={() => goTo('/sales')}>
            New sale
          </Button>
        </Stack>
      </Stack>

      <GettingStarted
        checklist={checklist}
        productCount={pagination.total}
        staffCount={staffUsers.length}
        hasSales={stats.totalSales > 0}
        onNavigate={goTo}
      />

      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        warehouses={warehouses}
        staffUsers={staffUsers}
        loading={metricsLoading}
        onRefresh={refetch}
        onExport={handleExportCSV}
      />

      {error && !dashboardData && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={refetch}>
              Try again
            </Button>
          }
        >
          We could not load your figures. {typeof error === 'string' ? error : ''}
        </Alert>
      )}

      {/* Headline numbers */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, mb: 2 }}>
        <StatCard label="Revenue" value={money(stats.totalSales)} hint={`Net of returns: ${money(stats.netSales)}`} icon={<TrendingUp />} accent="primary" loading={metricsLoading} />
        <StatCard
          label="Sales after expenses"
          value={money(afterExpenses)}
          hint="Cost of stock not yet included"
          icon={<AccountBalance />}
          accent={afterExpenses < 0 ? 'error' : 'success'}
          loading={metricsLoading}
        />
        <StatCard
          label="Money owed to you"
          value={money(stats.invoicesDue)}
          hint={`${stats.invoicesDueCount || data.salesDue.length} unpaid invoices`}
          icon={<Receipt />}
          accent="warning"
          loading={metricsLoading}
          onClick={() => goTo('/sales/history')}
        />
        <StatCard label="Purchases" value={money(stats.totalPurchases)} hint={`Net of returns: ${money(stats.netPurchases)}`} icon={<Inventory />} accent="secondary" loading={metricsLoading} onClick={() => goTo('/purchases')} />
      </Box>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, mb: 3 }}>
        <StatCard size="sm" label="Sales returns" value={money(stats.salesReturns)} hint={`${stats.salesReturnsCount} returns`} icon={<AssignmentReturn />} accent="warning" loading={metricsLoading} />
        <StatCard size="sm" label="Purchase returns" value={money(stats.purchaseReturns)} hint={`${stats.purchaseReturnsCount} returns`} icon={<TrendingDown />} accent="error" loading={metricsLoading} />
        <StatCard size="sm" label="Operating expenses" value={money(stats.totalExpense)} hint="In this period" icon={<AccountBalance />} accent="info" loading={metricsLoading} />
        <StatCard
          size="sm"
          label="Stock on the way"
          value={`${pendingItems.toLocaleString()} items`}
          hint={`${data.pendingShipments.length} pending shipments`}
          icon={<LocalShipping />}
          accent="primary"
          loading={metricsLoading}
          onClick={() => goTo('/stock-transfers')}
        />
      </Box>

      {/* Trends */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, mb: 3 }}>
        <SalesTrendChart data={data.salesLast30Days} currency={currency} subtitle={periodLabel} onOpenPOS={() => goTo('/sales')} />
        <MonthlySalesChart data={data.monthlySales} currency={currency} onOpenPOS={() => goTo('/sales')} />
      </Box>

      {/* Things that need attention */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
        <SectionCard
          title="Unpaid invoices"
          subtitle="Customers who still owe you"
          noPadding
          action={data.salesDue.length > 0 ? <Chip size="small" color="warning" label={money(outstandingTotal)} /> : null}
        >
          {data.salesDue.length === 0 ? (
            <EmptyState compact icon={<CheckCircleOutline />} title="All caught up" description="No unpaid invoices right now." />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Due</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.salesDue.slice(0, 5).map((row, i) => (
                    <TableRow key={row.id ?? i} hover>
                      <TableCell>{row.customer || 'Walk-in customer'}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {money(row.amount)}
                      </TableCell>
                      <TableCell>{row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-GB') : '-'}</TableCell>
                      <TableCell>
                        <Chip label={row.status || 'Pending'} size="small" color={statusColor(row.status)} variant="outlined" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </SectionCard>

        <SectionCard
          title="Running low on stock"
          subtitle="Reorder these soon"
          noPadding
          action={data.stockAlerts.length > 0 ? <Chip size="small" color="warning" label={`${data.stockAlerts.length} items`} /> : null}
        >
          {data.stockAlerts.length === 0 ? (
            <EmptyState compact icon={<Inventory2Outlined />} title="Stock levels look healthy" description="Items that fall below their minimum will appear here." />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">In stock</TableCell>
                    <TableCell align="right">Minimum</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.stockAlerts.slice(0, 5).map((row, i) => (
                    <TableRow key={row.id ?? i} hover>
                      <TableCell>{row.product || '-'}</TableCell>
                      <TableCell align="right">{row.currentStock ?? 0}</TableCell>
                      <TableCell align="right">{row.minStock ?? 0}</TableCell>
                      <TableCell>
                        <Chip label={row.status || 'Low'} size="small" color={statusColor(row.status)} variant="outlined" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </SectionCard>
      </Box>
    </Box>
  );
};

export default Dashboard;
