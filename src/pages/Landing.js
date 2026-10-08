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
  CheckCircle,
  WarningAmberRounded,
  PhoneAndroidOutlined,
  Check,
} from '@mui/icons-material';
import { useThemeMode } from '../theme/ThemeProvider';
import BrandLogo from '../components/Common/BrandLogo';
import ProductImage from '../components/Common/ProductImage';
import tillDesktop from '../assets/landing/till-desktop.jpg';
import tillPhone from '../assets/landing/till-phone.jpg';
import payPhone from '../assets/landing/pay-phone.jpg';
import dashboardShot from '../assets/landing/dashboard.jpg';

/**
 * Public landing page. Written around what a shop owner wants to know:
 * what does it do, how fast can I start, and what will it cost me in effort.
 * The pictures are real screens from the product (with sample shop data), so
 * what people see here is what they get. Nothing is hidden until scrolled to.
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
  { icon: InsightsOutlined, title: 'Clear reports', text: 'See sales, money owed to you, stock value and slow-moving items without building spreadsheets.' },
  { icon: VerifiedUserOutlined, title: 'Tax compliance', text: 'Connect eTIMS so your sales can be submitted for tax compliance.' },
  { icon: AdminPanelSettingsOutlined, title: 'Staff and permissions', text: 'Give each person their own login and only the access their job needs.' },
  { icon: DevicesOutlined, title: 'Works on your devices', text: 'Use it from a computer, tablet or phone with an internet connection.' },
];

// The automatic product pictures, shown off in a slowly moving strip
const SHOWCASE = [
  ['Brookside Milk 1L', 'Dairy'],
  ['Exe Bread 400g', 'Bakery'],
  ['Unga Jogoo 2kg', 'Flour'],
  ['Ketepa Tea 100g', 'Beverages'],
  ['Panadol Extra', 'Pharmacy'],
  ['Sukuma Wiki', 'Vegetables'],
  ['Bananas', 'Fruit'],
  ['Omo Detergent 1kg', 'Household'],
  ['Body Lotion 400ml', 'Personal care'],
  ['Phone Charger', 'Electronics'],
  ['Claw Hammer', 'Hardware'],
  ['Cotton T-Shirt', 'Clothing'],
  ['Exercise Book', 'Stationery'],
  ['Crisps 50g', 'Snacks'],
  ['Chicken 1kg', 'Butchery'],
  ['Coca-Cola 500ml', 'Drinks'],
].map(([item_name, item_group], i) => ({ item_code: `showcase-${i}`, item_name, item_group }));

const noMotion = { '@media (prefers-reduced-motion: reduce)': { animation: 'none' } };

const Section = ({ children, sx, id }) => (
  <Box id={id} component="section" sx={{ py: { xs: 7, md: 10 }, ...sx }}>
    <Container maxWidth="lg">{children}</Container>
  </Box>
);

const Shot = ({ src, alt, width, height, eager }) => (
  <Box
    component="img"
    src={src}
    alt={alt}
    width={width}
    height={height}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    sx={{ display: 'block', width: '100%', height: 'auto' }}
  />
);

// A computer screen around a screenshot
const BrowserFrame = ({ children, sx }) => (
  <Box sx={{ borderRadius: 3, overflow: 'hidden', border: 1, borderColor: 'divider', bgcolor: 'background.paper', boxShadow: (t) => `0 24px 60px ${alpha(t.palette.common.black, t.palette.mode === 'dark' ? 0.55 : 0.16)}`, ...sx }}>
    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', px: 1.5, height: 28, borderBottom: 1, borderColor: 'divider', bgcolor: (t) => t.custom.surface.subtle }}>
      {['#f87171', '#fbbf24', '#4ade80'].map((c) => (
        <Box key={c} sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: c }} />
      ))}
    </Box>
    {children}
  </Box>
);

// A phone around a screenshot
const PhoneFrame = ({ children, sx }) => (
  <Box sx={{ p: '7px', borderRadius: '30px', bgcolor: '#0f1222', boxShadow: (t) => `0 24px 50px ${alpha(t.palette.common.black, 0.35)}`, ...sx }}>
    <Box sx={{ borderRadius: '24px', overflow: 'hidden', bgcolor: '#fff' }}>{children}</Box>
  </Box>
);

const FloatingCard = ({ icon, title, text, color, sx }) => (
  <Card
    aria-hidden="true"
    sx={{
      position: 'absolute',
      display: 'flex',
      alignItems: 'center',
      gap: 1.25,
      px: 1.75,
      py: 1.25,
      borderRadius: 3,
      boxShadow: (t) => t.shadows[10],
      animation: 'murzak-float 6s ease-in-out infinite',
      ...noMotion,
      ...sx,
    }}
  >
    <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', color: `${color}.main`, bgcolor: (t) => alpha(t.palette[color].main, 0.14) }}>{icon}</Box>
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{title}</Typography>
      <Typography variant="caption" color="text.secondary">{text}</Typography>
    </Box>
  </Card>
);

const HeroVisual = () => (
  <Box sx={{ position: 'relative', pb: { xs: 6, md: 4 }, pl: { xs: 4, md: 6 } }}>
    {/* Soft colour behind the screens */}
    <Box aria-hidden="true" sx={{ position: 'absolute', inset: '-10% -8% 0 10%', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.55, background: (t) => t.custom.gradient }} />
    <BrowserFrame sx={{ position: 'relative' }}>
      <Shot src={tillDesktop} alt="The Murzak POS till: product pictures on the left, the current sale and a Charge button on the right" width={1280} height={800} eager />
    </BrowserFrame>
    <PhoneFrame sx={{ position: 'absolute', left: 0, bottom: 0, width: { xs: '30%', md: '27%' } }}>
      <Shot src={tillPhone} alt="The same till on a phone" width={780} height={1688} eager />
    </PhoneFrame>
    <FloatingCard
      icon={<CheckCircle fontSize="small" />}
      color="success"
      title="Sale complete"
      text="KES 802 paid by M-Pesa"
      sx={{ right: { xs: -4, md: -24 }, bottom: { xs: 8, md: 28 } }}
    />
    <FloatingCard
      icon={<WarningAmberRounded fontSize="small" />}
      color="warning"
      title="Running low"
      text="Brookside Milk 1L: 3 left"
      sx={{ display: { xs: 'none', sm: 'flex' }, right: { sm: 24, md: -36 }, top: { sm: -18, md: 40 }, animationDelay: '-3s' }}
    />
  </Box>
);

const ProductStrip = () => {
  const items = [...SHOWCASE, ...SHOWCASE]; // twice, so the loop is seamless
  return (
    <Box
      aria-hidden="true"
      sx={{
        overflow: 'hidden',
        maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, width: 'max-content', animation: 'murzak-marquee 60s linear infinite', ...noMotion, '&:hover': { animationPlayState: 'paused' } }}>
        {items.map((p, i) => (
          <Card key={`${p.item_code}-${i}`} sx={{ width: 168, flexShrink: 0, overflow: 'hidden', borderRadius: 3 }}>
            <ProductImage product={p} rounded={0} />
            <Box sx={{ px: 1.5, py: 1.25 }}>
              <Typography variant="subtitle2" noWrap sx={{ fontWeight: 650 }}>{p.item_name}</Typography>
              <Typography variant="caption" color="text.secondary">{p.item_group}</Typography>
            </Box>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

const Ticks = ({ items }) => (
  <Stack spacing={1.25} component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
    {items.map((text) => (
      <Box component="li" key={text} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
        <Box sx={{ mt: '2px', width: 22, height: 22, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'success.main', bgcolor: (t) => alpha(t.palette.success.main, 0.14) }}>
          <Check sx={{ fontSize: 15 }} />
        </Box>
        <Typography variant="body1">{text}</Typography>
      </Box>
    ))}
  </Stack>
);

// Picture on one side, explanation on the other
const Spotlight = ({ eyebrow, title, text, points, visual, flip }) => (
  <Box sx={{ display: 'grid', gap: { xs: 4, md: 8 }, alignItems: 'center', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
    <Box sx={{ order: { md: flip ? 2 : 1 } }}>{visual}</Box>
    <Box sx={{ order: { md: flip ? 1 : 2 } }}>
      <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>{eyebrow}</Typography>
      <Typography variant="h3" sx={{ mt: 0.5, mb: 1.5 }}>{title}</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 480 }}>{text}</Typography>
      <Ticks items={points} />
    </Box>
  </Box>
);

const Landing = () => {
  const navigate = useNavigate();
  const { mode, toggleColorMode } = useThemeMode();

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', overflowX: 'hidden' }}>
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
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
          <Box sx={{ display: 'grid', gap: { xs: 6, md: 6 }, gridTemplateColumns: { xs: '1fr', md: '0.9fr 1.1fr' }, alignItems: 'center' }}>
            <Box sx={{ animation: 'murzak-fade-up .5s ease both' }}>
              <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
                Point of sale for growing businesses
              </Typography>
              <Typography variant="h1" sx={{ mt: 1, mb: 2.5, fontSize: { xs: '2.25rem', md: '3.25rem' } }}>
                Sell faster. Know your stock. <Box component="span" sx={{ background: (t) => t.custom.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>See your numbers.</Box>
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
              <Stack direction="row" spacing={2.5} useFlexGap flexWrap="wrap" sx={{ mt: 3.5, color: 'text.secondary' }}>
                {[
                  [DevicesOutlined, 'Computer, tablet or phone'],
                  [PhoneAndroidOutlined, 'Cash, M-Pesa, card and credit'],
                ].map(([Icon, label]) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Icon sx={{ fontSize: 18, color: 'primary.main' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
            <HeroVisual />
          </Box>
        </Container>
      </Box>

      {/* Product pictures */}
      <Box component="section" sx={{ py: { xs: 6, md: 8 }, borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="md" sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" sx={{ mb: 1.25 }}>Every product looks the part</Typography>
          <Typography variant="body1" color="text.secondary">
            Add your own product photos, or let Murzak POS draw a picture for each one automatically. Your till looks finished from the first day.
          </Typography>
        </Container>
        <ProductStrip />
      </Box>

      {/* Spotlights */}
      <Section>
        <Stack spacing={{ xs: 9, md: 12 }}>
          <Spotlight
            eyebrow="At the counter"
            title="A till your staff learn in minutes"
            text="Big product pictures, a search box that also takes barcode scans, and one large button to charge. Nothing on screen that leads away from the sale."
            points={[
              'Tap a picture or scan a barcode to add it',
              'Offers and discounts are applied for you',
              'Put a sale on hold and bring it back later',
              'Prints a till-roll receipt, or skip printing',
            ]}
            visual={
              <BrowserFrame>
                <Shot src={tillDesktop} alt="The till with product pictures and the current sale" width={1280} height={800} />
              </BrowserFrame>
            }
          />
          <Spotlight
            flip
            eyebrow="On the move"
            title="Sell from your phone"
            text="The same till fits a phone. The Charge button sits under your thumb, and payment takes the whole screen so nothing gets mixed up."
            points={['Cash, M-Pesa, card, credit or a mix', 'Change to give is worked out for you', 'Works on the phones your team already has']}
            visual={
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 2, sm: 4 }, px: { xs: 1, sm: 4 } }}>
                <PhoneFrame sx={{ width: '44%', maxWidth: 240, transform: 'translateY(24px)' }}>
                  <Shot src={tillPhone} alt="Choosing products on a phone" width={780} height={1688} />
                </PhoneFrame>
                <PhoneFrame sx={{ width: '44%', maxWidth: 240 }}>
                  <Shot src={payPhone} alt="Taking an M-Pesa payment on a phone" width={780} height={1688} />
                </PhoneFrame>
              </Box>
            }
          />
          <Spotlight
            eyebrow="Behind the counter"
            title="Know how your shop is doing"
            text="Your sales, money owed to you, purchases and stock alerts on one page, for one store or all of them."
            points={['Sales trend for any period', 'See who owes you and how much', 'Low-stock alerts before you run out', 'Export a summary to a spreadsheet']}
            visual={
              <BrowserFrame>
                <Shot src={dashboardShot} alt="The owner dashboard with sales, money owed and charts" width={1280} height={800} />
              </BrowserFrame>
            }
          />
        </Stack>
      </Section>

      {/* How it works */}
      <Section id="how-it-works" sx={{ bgcolor: 'background.paper', borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
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
            <Card key={title} sx={{ p: 3, bgcolor: 'background.default' }}>
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
      <Section id="features">
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
            <Box
              key={title}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                transition: 'transform .2s ease, box-shadow .2s ease, border-color .2s ease',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: (t) => t.shadows[6], borderColor: 'primary.main' },
              }}
            >
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
      <Section sx={{ pt: 0 }}>
        <Box sx={{ position: 'relative', overflow: 'hidden', textAlign: 'center', p: { xs: 4, md: 7 }, borderRadius: 5, color: '#fff', background: (t) => t.custom.gradient }}>
          <Box aria-hidden="true" sx={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', top: -120, right: -60, bgcolor: 'rgba(255,255,255,.12)' }} />
          <Box aria-hidden="true" sx={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', bottom: -90, left: -40, bgcolor: 'rgba(255,255,255,.1)' }} />
          <Typography variant="h2" sx={{ position: 'relative', color: '#fff', mb: 1.5 }}>
            Ready to run your business with less stress?
          </Typography>
          <Typography variant="body1" sx={{ position: 'relative', opacity: 0.9, mb: 3.5, maxWidth: 520, mx: 'auto' }}>
            Create your account and add your first products today.
          </Typography>
          <Button size="large" variant="contained" endIcon={<ArrowForward />} onClick={() => navigate('/register')} sx={{ position: 'relative', bgcolor: '#fff', color: 'primary.dark', '&:hover': { bgcolor: '#f1f1ff' } }}>
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
