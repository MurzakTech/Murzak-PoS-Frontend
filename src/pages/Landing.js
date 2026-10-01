import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AppBar, Box, Button, Card, Container, IconButton, Link, Stack, Toolbar, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ArrowForward,
  DarkModeOutlined,
  LightModeOutlined,
  PointOfSaleOutlined,
  Inventory2Outlined,
  LocalShippingOutlined,
  PeopleAltOutlined,
  InsightsOutlined,
  VerifiedUserOutlined,
  DevicesOutlined,
  AdminPanelSettingsOutlined,
  PersonAddAltOutlined,
  CategoryOutlined,
  ReceiptLongOutlined,
} from '@mui/icons-material';
import { useThemeMode } from '../theme/ThemeProvider';
import BrandLogo from '../components/Common/BrandLogo';

/**
 * Public landing page. Written around what a shop owner wants to know:
 * what does it do, how fast can I start, and what will it cost me in effort.
 * Everything here renders immediately (no content hidden behind scroll animations).
 */

const STEPS = [
  { icon: PersonAddAltOutlined, title: 'Create your account', text: 'Tell us about your business. It takes a few minutes and we apply sensible defaults for you.' },
  { icon: CategoryOutlined, title: 'Add your products', text: 'Load a starter catalogue for your industry, import a spreadsheet, or add items one at a time.' },
  { icon: ReceiptLongOutlined, title: 'Start selling', text: 'Open the till, ring up your first sale and watch your stock and reports update automatically.' },
];

const FEATURES = [
  { icon: PointOfSaleOutlined, title: 'Fast point of sale', text: 'A till built for busy counters, with discounts, multiple payment methods and receipts.' },
  { icon: Inventory2Outlined, title: 'Stock you can trust', text: 'Track quantities across stores, get low-stock alerts, and count and reconcile stock.' },
  { icon: LocalShippingOutlined, title: 'Buying and suppliers', text: 'Raise purchase orders, receive goods and keep supplier invoices and payments in one place.' },
  { icon: PeopleAltOutlined, title: 'Customers and loyalty', text: 'Keep customer records, offer credit within limits, and reward repeat buyers.' },
  { icon: InsightsOutlined, title: 'Clear reports', text: 'See sales, profit, stock value and slow-moving items without building spreadsheets.' },
  { icon: VerifiedUserOutlined, title: 'Tax compliance', text: 'Connect eTIMS so your sales can be submitted for tax compliance.' },
  { icon: AdminPanelSettingsOutlined, title: 'Staff and permissions', text: 'Give each person their own login and only the access their job needs.' },
  { icon: DevicesOutlined, title: 'Works on your devices', text: 'Use it from a computer, tablet or phone with an internet connection.' },
];

const Section = ({ children, sx, id }) => (
  <Box id={id} component="section" sx={{ py: { xs: 7, md: 10 }, ...sx }}>
    <Container maxWidth="lg">{children}</Container>
  </Box>
);

// An illustrative preview of the product, drawn with plain UI pieces so it always matches the live look
const ProductPreview = () => (
  <Card sx={{ p: 2.5, boxShadow: (t) => t.shadows[8], transform: { md: 'rotate(1.2deg)' } }} aria-hidden="true">
    <Stack direction="row" spacing={0.75} sx={{ mb: 2 }}>
      {['#f87171', '#fbbf24', '#4ade80'].map((c) => (
        <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c }} />
      ))}
    </Stack>
    <Typography variant="h6" sx={{ mb: 0.25 }}>
      Good morning
    </Typography>
    <Typography variant="caption" color="text.secondary">
      Here is how your shop is doing
    </Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25, my: 2 }}>
      {[
        ['Revenue', 'primary'],
        ['Profit', 'success'],
        ['Owed to you', 'warning'],
      ].map(([label, color]) => (
        <Box key={label} sx={{ p: 1.25, borderRadius: 2, bgcolor: (t) => alpha(t.palette[color].main, 0.1) }}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Box sx={{ height: 10, mt: 1, width: '70%', borderRadius: 1, bgcolor: (t) => alpha(t.palette[color].main, 0.45) }} />
        </Box>
      ))}
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.75, height: 96 }}>
      {[40, 62, 48, 74, 58, 86, 68, 92, 78, 100].map((h, i) => (
        <Box key={i} sx={{ flex: 1, height: `${h}%`, borderRadius: '5px 5px 0 0', background: (t) => (i === 9 ? t.custom.gradient : alpha(t.palette.primary.main, 0.22)) }} />
      ))}
    </Box>
  </Card>
);

const Landing = () => {
  const navigate = useNavigate();
  const { mode, toggleColorMode } = useThemeMode();

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <AppBar position="sticky" sx={{ bgcolor: (t) => alpha(t.palette.background.default, 0.85), backdropFilter: 'blur(10px)', borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: 1 }}>
            <RouterLink to="/" aria-label="Murzak POS home" style={{ textDecoration: 'none' }}>
              <BrandLogo size={34} textVariant="h5" />
            </RouterLink>
            <Box sx={{ flexGrow: 1 }} />
            <Link href="#features" underline="none" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, px: 1.5, fontWeight: 600, '&:hover': { color: 'text.primary' } }}>
              Features
            </Link>
            <Link href="#how-it-works" underline="none" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, px: 1.5, fontWeight: 600, '&:hover': { color: 'text.primary' } }}>
              How it works
            </Link>
            <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton onClick={toggleColorMode} aria-label="Toggle colour theme" sx={{ color: 'text.secondary' }}>
                {mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}
              </IconButton>
            </Tooltip>
            <Button color="inherit" onClick={() => navigate('/login')} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              Sign in
            </Button>
            <Button variant="contained" onClick={() => navigate('/register')}>
              Get started
            </Button>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Hero */}
      <Box sx={{ position: 'relative', overflow: 'hidden', background: (t) => t.custom.gradientSoft }}>
        <Container maxWidth="lg" sx={{ py: { xs: 7, md: 11 } }}>
          <Box sx={{ display: 'grid', gap: { xs: 6, md: 8 }, gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, alignItems: 'center' }}>
            <Box sx={{ animation: 'murzak-fade-up .5s ease both' }}>
              <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
                Point of sale for growing businesses
              </Typography>
              <Typography variant="h1" sx={{ mt: 1, mb: 2.5, fontSize: { xs: '2.25rem', md: '3.25rem' } }}>
                Sell faster. Know your stock. <Box component="span" sx={{ background: (t) => t.custom.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>See your profit.</Box>
              </Typography>
              <Typography variant="h6" component="p" color="text.secondary" sx={{ fontWeight: 400, lineHeight: 1.6, maxWidth: 520, mb: 4 }}>
                Murzak POS brings your till, inventory, purchasing and reports together, so you spend less time on admin and more time with customers.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button variant="contained" size="large" endIcon={<ArrowForward />} onClick={() => navigate('/register')}>
                  Create your account
                </Button>
                <Button variant="outlined" size="large" onClick={() => navigate('/login')}>
                  Sign in
                </Button>
              </Stack>
            </Box>
            <ProductPreview />
          </Box>
        </Container>
      </Box>

      {/* How it works */}
      <Section id="how-it-works">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h2" sx={{ mb: 1.5 }}>
            Up and running in three steps
          </Typography>
          <Typography variant="body1" color="text.secondary">
            No long training or complicated setup.
          </Typography>
        </Box>
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <Card key={title} sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 3, display: 'grid', placeItems: 'center', color: '#fff', background: (t) => t.custom.gradient }}>
                  <Icon />
                </Box>
                <Typography variant="overline" color="text.secondary">
                  Step {i + 1}
                </Typography>
              </Stack>
              <Typography variant="h5" gutterBottom>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {text}
              </Typography>
            </Card>
          ))}
        </Box>
      </Section>

      {/* Features */}
      <Section id="features" sx={{ bgcolor: 'background.paper', borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h2" sx={{ mb: 1.5 }}>
            Everything your business needs day to day
          </Typography>
          <Typography variant="body1" color="text.secondary">
            One system instead of a till, a notebook and three spreadsheets.
          </Typography>
        </Box>
        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <Box key={title} sx={{ p: 2.5, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
              <Box sx={{ width: 40, height: 40, mb: 1.75, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.1) }}>
                <Icon />
              </Box>
              <Typography variant="h6" gutterBottom>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {text}
              </Typography>
            </Box>
          ))}
        </Box>
      </Section>

      {/* Closing call to action */}
      <Section>
        <Box sx={{ textAlign: 'center', p: { xs: 4, md: 7 }, borderRadius: 5, color: '#fff', background: (t) => t.custom.gradient }}>
          <Typography variant="h2" sx={{ color: '#fff', mb: 1.5 }}>
            Ready to run your business with less stress?
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9, mb: 3.5, maxWidth: 520, mx: 'auto' }}>
            Create your account and add your first products today.
          </Typography>
          <Button size="large" variant="contained" endIcon={<ArrowForward />} onClick={() => navigate('/register')} sx={{ bgcolor: '#fff', color: 'primary.dark', '&:hover': { bgcolor: '#f1f1ff' } }}>
            Create your account
          </Button>
        </Box>
      </Section>

      <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', py: 3 }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              &copy; {new Date().getFullYear()} Murzak POS. All rights reserved.
            </Typography>
            <Stack direction="row" spacing={3}>
              {[
                ['Privacy Policy', '/privacy-policy'],
                ['Terms of Service', '/terms-of-service'],
                ['Contact Us', '/contact-us'],
              ].map(([label, to]) => (
                <Link key={to} component={RouterLink} to={to} underline="hover" color="text.secondary" variant="body2">
                  {label}
                </Link>
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default Landing;
