import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Button, Icon } from '../newlook/components';
import { useThemeMode } from '../theme/ThemeProvider';
import BrandLogo from '../components/Common/BrandLogo';
import ProductImage from '../components/Common/ProductImage';
import Photo from '../components/Common/Photo';
import { photoUrl } from '../assets/photos';
import tillDesktop from '../assets/landing/till-desktop.jpg';
import tillPhone from '../assets/landing/till-phone.jpg';
import payPhone from '../assets/landing/pay-phone.jpg';
import dashboardShot from '../assets/landing/dashboard.jpg';
import '../newlook/landing/landing.css';

const STEPS = [
  { icon: 'user', title: 'Create your account', text: 'Tell us about your business. It takes a few minutes and we apply sensible defaults for you.' },
  { icon: 'layers', title: 'Add your products', text: 'Load a starter catalogue for your industry, import a spreadsheet, or add items one at a time.' },
  { icon: 'receipt', title: 'Start selling', text: 'Open the till and ring up your first sale. Stock, takings and reports update as you go.' },
];

const FEATURES = [
  { icon: 'till', title: 'A till for busy counters', text: 'Scan or tap to add items, apply offers automatically, and take cash, M-Pesa, card or a mix.' },
  { icon: 'box', title: 'Stop stock going missing', text: 'Track every store, get warned before you run out, and run stock counts with sign-off at each step.' },
  { icon: 'truck', title: 'Buying and suppliers', text: 'Raise purchase orders, receive goods and keep supplier invoices and payments in one place.' },
  { icon: 'users', title: 'Customers and loyalty', text: 'Sell on credit up to a limit you set, see who owes you, and reward regulars with points.' },
  { icon: 'chart', title: 'Reports you will read', text: 'Sales, money owed, stock value and slow movers, ready to view or export. No spreadsheets to build.' },
  { icon: 'check', title: 'KRA eTIMS built in', text: 'Add your eTIMS details once and your sales can be sent to KRA, so compliance is not a month-end scramble.' },
  { icon: 'settings', title: 'Staff you can trust', text: 'Every person has their own login. Cashiers sell; price changes, refunds and stock adjustments stay with managers.' },
  { icon: 'store', title: 'Works on your devices', text: 'Use the computer, tablet or phone you already have. All you need is an internet connection.' },
];

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

const INDUSTRIES = [
  ['restaurant', 'Restaurants and bars'],
  ['grocery', 'Groceries and supermarkets'],
  ['pharmacy', 'Pharmacies'],
  ['fashion', 'Fashion and boutiques'],
  ['electronics', 'Electronics and phones'],
  ['salon', 'Salons and barbers'],
  ['hardware', 'Hardware and building'],
  ['bookstore', 'Bookshops and stationery'],
].map(([key, label]) => ({ key, label, photo: `industry-${key}` }));

const Shot = ({ src, alt, width, height, eager }) => (
  <img
    src={src}
    alt={alt}
    width={width}
    height={height}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    style={{ display: 'block', width: '100%', height: 'auto' }}
  />
);

const BrowserFrame = ({ children, className = '', style }) => (
  <div className={`nl-browser-frame ${className}`.trim()} style={style}>
    <div className="nl-browser-frame__bar">
      <span className="nl-browser-frame__dot" style={{ backgroundColor: 'var(--bad)' }} />
      <span className="nl-browser-frame__dot" style={{ backgroundColor: 'var(--warn)' }} />
      <span className="nl-browser-frame__dot" style={{ backgroundColor: 'var(--good)' }} />
    </div>
    {children}
  </div>
);

const PhoneFrame = ({ children, className = '', style }) => (
  <div className={`nl-phone-frame ${className}`.trim()} style={style}>
    <div className="nl-phone-frame__inner">{children}</div>
  </div>
);

const FloatingCard = ({ icon, title, text, tone = 'success', style }) => (
  <div className="nl-floating-card" aria-hidden="true" style={style}>
    <div className={`nl-floating-card__icon is-${tone}`}>
      <Icon name={icon} />
    </div>
    <div>
      <p className="nl-floating-card__title">{title}</p>
      <p className="nl-floating-card__text">{text}</p>
    </div>
  </div>
);

const HeroVisual = () => (
  <div className="nl-hero-visual">
    <BrowserFrame>
      <Shot src={tillDesktop} alt="The Murzak POS till: product pictures on the left, the current sale and a Charge button on the right" width={1280} height={800} eager />
    </BrowserFrame>
    <PhoneFrame style={{ position: 'absolute', left: 0, bottom: 0, width: '28%' }}>
      <Shot src={tillPhone} alt="The same till on a phone" width={780} height={1688} eager />
    </PhoneFrame>
    <FloatingCard
      icon="check"
      tone="success"
      title="Sale complete"
      text="KES 802 paid by M-Pesa"
      style={{ position: 'absolute', right: -12, bottom: 20 }}
    />
    <FloatingCard
      icon="alert"
      tone="warning"
      title="Running low"
      text="Brookside Milk 1L: 3 left"
      style={{ position: 'absolute', right: -20, top: 30, animationDelay: '-3s' }}
    />
  </div>
);

const ProductStrip = () => {
  const items = [...SHOWCASE, ...SHOWCASE];
  return (
    <div className="nl-product-strip-wrapper" aria-hidden="true">
      <div className="nl-product-strip">
        {items.map((p, i) => (
          <div key={`${p.item_code}-${i}`} className="nl-product-card">
            <ProductImage product={p} rounded={0} />
            <div className="nl-product-card__meta">
              <p className="nl-product-card__name">{p.item_name}</p>
              <p className="nl-product-card__group">{p.item_group}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Ticks = ({ items }) => (
  <ul className="nl-ticks">
    {items.map((text) => (
      <li key={text} className="nl-ticks__item">
        <span className="nl-ticks__icon">
          <Icon name="check" />
        </span>
        <span>{text}</span>
      </li>
    ))}
  </ul>
);

const Spotlight = ({ eyebrow, title, text, points, visual, flip }) => (
  <div className={`nl-spotlight ${flip ? 'is-flipped' : ''}`}>
    <div className="nl-spotlight__visual">{visual}</div>
    <div className="nl-spotlight__content">
      <div className="nl-landing-overline">{eyebrow}</div>
      <h2 className="nl-spotlight__title">{title}</h2>
      <p className="nl-spotlight__text">{text}</p>
      <Ticks items={points} />
    </div>
  </div>
);

const CounterStory = () => (
  <section id="counter" className="nl-landing-section is-surface">
    <div className="nl-landing-container">
      <div className="nl-spotlight">
        <Photo
          name="counter-cashier"
          alt="A cashier tapping the card reader at a till that shows the items in the current sale"
          ratio={4 / 5}
          position="50% 45%"
          style={{ borderRadius: 'var(--radius-card)' }}
        />
        <div className="nl-spotlight__content">
          <div className="nl-landing-overline">Built around your counter</div>
          <h2 className="nl-spotlight__title">From the first item to the last payment</h2>
          <p className="nl-spotlight__text">
            Murzak POS runs in a web browser, so it fits what is already on your counter: a tablet, a touchscreen computer or a phone. Ring up the sale, then take payment the way your customer prefers.
          </p>
          <Photo
            name="counter-card-reader"
            alt="A counter with a till screen showing the total and a card machine ready for payment"
            ratio={3 / 2}
            position="50% 55%"
            style={{ borderRadius: 'var(--radius-card)', marginBottom: 'var(--space-4)' }}
          />
          <Ticks items={['Works in any modern browser, nothing to install', 'Card machine sales are recorded at the till like any other payment', 'Receipts print on a till roll, or skip printing']} />
          <p style={{ fontSize: 'var(--caption-size)', color: 'var(--muted)', marginTop: 'var(--space-3)' }}>
            Illustrative photos. Murzak POS is software: it runs on the devices you already own.
          </p>
        </div>
      </div>
    </div>
  </section>
);

const IndustryStrip = () => {
  const shown = INDUSTRIES.filter((i) => photoUrl(i.photo));
  if (shown.length < 3) return null;
  return (
    <section id="industries" className="nl-landing-section">
      <div className="nl-landing-container">
        <div className="nl-landing-section__header">
          <h2 className="nl-landing-section__title">Made for your kind of business</h2>
          <p className="nl-landing-section__subtitle">
            Pick your industry when you sign up and start with a ready-made product list.
          </p>
        </div>
        <div
          style={{
            display: 'grid',
            gap: 'var(--space-4)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          {shown.map((i) => (
            <Photo
              key={i.key}
              name={i.photo}
              alt={i.label}
              ratio={4 / 5}
              position="50% 20%"
              style={{ borderRadius: 'var(--radius-card)' }}
            />
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 'var(--caption-size)', color: 'var(--muted)', marginTop: 'var(--space-4)' }}>
          Illustrative photos.
        </p>
      </div>
    </section>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const { mode, toggleColorMode } = useThemeMode();

  return (
    <div className="nl-landing">
      {/* Navbar */}
      <header className="nl-landing-nav">
        <div className="nl-landing-container">
          <div className="nl-landing-nav__inner">
            <RouterLink to="/" aria-label="Murzak POS home" style={{ textDecoration: 'none' }}>
              <BrandLogo size={32} />
            </RouterLink>

            <nav className="nl-landing-nav__links">
              <a href="#features" className="nl-landing-nav__link">
                Features
              </a>
              <a href="#how-it-works" className="nl-landing-nav__link">
                How it works
              </a>
            </nav>

            <div className="nl-landing-nav__actions">
              <Button
                variant="ghost"
                icon={mode === 'dark' ? 'sun' : 'moon'}
                aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={toggleColorMode}
              />
              <Button variant="secondary" onClick={() => navigate('/login')}>
                Sign in
              </Button>
              <Button variant="primary" onClick={() => navigate('/register')}>
                Get started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="nl-landing-hero">
        <div className="nl-landing-container">
          <div className="nl-landing-hero__grid">
            <div>
              <div className="nl-landing-overline">
                Point of sale built for Kenyan businesses
              </div>
              <h1 className="nl-landing-hero__title">
                Sell faster. Stay compliant.{' '}
                <span className="nl-landing-highlight">See every shilling.</span>
              </h1>
              <p className="nl-landing-hero__text">
                Murzak POS puts your till, stock, buying and reports in one place. Take cash and M-Pesa at the counter, send sales to KRA eTIMS, and know what is selling in every store, from any phone, tablet or computer.
              </p>
              <div className="nl-landing-hero__cta">
                <Button variant="primary" icon="chevronRight" iconEnd onClick={() => navigate('/register')}>
                  Create your account
                </Button>
                <Button variant="secondary" onClick={() => navigate('/login')}>
                  Sign in
                </Button>
              </div>
              <div className="nl-landing-hero__badges">
                <div className="nl-landing-badge-item">
                  <Icon name="store" />
                  <span>Computer, tablet or phone</span>
                </div>
                <div className="nl-landing-badge-item">
                  <Icon name="till" />
                  <span>Cash, M-Pesa, card and credit</span>
                </div>
                <div className="nl-landing-badge-item">
                  <Icon name="check" />
                  <span>Connects to KRA eTIMS</span>
                </div>
              </div>
            </div>
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* Product Strip */}
      <section className="nl-landing-section" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="nl-landing-container">
          <div className="nl-landing-section__header">
            <h2 className="nl-landing-section__title">Every product looks the part</h2>
            <p className="nl-landing-section__subtitle">
              Add your own product photos, or let Murzak POS draw a picture for each one automatically. Your till looks finished from the first day.
            </p>
          </div>
        </div>
        <ProductStrip />
      </section>

      {/* Counter Story */}
      <CounterStory />

      {/* Spotlights */}
      <section className="nl-landing-section">
        <div className="nl-landing-container">
          <div className="nl-spotlight-list">
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
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)' }}>
                  <PhoneFrame style={{ width: '45%', maxWidth: 220, transform: 'translateY(24px)' }}>
                    <Shot src={tillPhone} alt="Choosing products on a phone" width={780} height={1688} />
                  </PhoneFrame>
                  <PhoneFrame style={{ width: '45%', maxWidth: 220 }}>
                    <Shot src={payPhone} alt="Taking an M-Pesa payment on a phone" width={780} height={1688} />
                  </PhoneFrame>
                </div>
              }
            />
            <Spotlight
              eyebrow="Behind the counter"
              title="Know how your shop is doing"
              text="Your sales, money owed to you, purchases and stock alerts on one page, for one store or all of them. Check it from home, not just from behind the counter."
              points={['Sales trend for any period', 'See who owes you and how much', 'Low-stock alerts before you run out', 'Export a summary to a spreadsheet']}
              visual={
                <BrowserFrame>
                  <Shot src={dashboardShot} alt="The owner dashboard with sales, money owed and charts" width={1280} height={800} />
                </BrowserFrame>
              }
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="nl-landing-section is-surface">
        <div className="nl-landing-container">
          <div className="nl-landing-section__header">
            <h2 className="nl-landing-section__title">Up and running in three steps</h2>
            <p className="nl-landing-section__subtitle">No long training or complicated setup.</p>
          </div>
          <div className="nl-landing-grid-3">
            {STEPS.map(({ icon, title, text }, i) => (
              <div key={title} className="nl-step-card">
                <div className="nl-step-card__top">
                  <div className="nl-step-card__icon">
                    <Icon name={icon} />
                  </div>
                  <span className="nl-step-card__step">Step {i + 1}</span>
                </div>
                <h3 className="nl-step-card__title">{title}</h3>
                <p className="nl-step-card__text">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="nl-landing-section">
        <div className="nl-landing-container">
          <div className="nl-landing-section__header">
            <h2 className="nl-landing-section__title">Everything your business needs day to day</h2>
            <p className="nl-landing-section__subtitle">
              One system instead of a till, a notebook and three spreadsheets.
            </p>
          </div>
          <div className="nl-landing-grid-4">
            {FEATURES.map(({ icon, title, text }) => (
              <div key={title} className="nl-feature-card">
                <div className="nl-feature-card__icon">
                  <Icon name={icon} />
                </div>
                <h3 className="nl-feature-card__title">{title}</h3>
                <p className="nl-feature-card__text">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Strip */}
      <IndustryStrip />

      {/* Closing CTA */}
      <section className="nl-landing-section" style={{ paddingTop: 0 }}>
        <div className="nl-landing-container">
          <div className="nl-landing-cta">
            <h2 className="nl-landing-cta__title">Your shop, under control by this evening</h2>
            <p className="nl-landing-cta__text">
              Create your account, load a starter catalogue for your industry and ring up your first sale today.
            </p>
            <Button variant="primary" icon="chevronRight" iconEnd onClick={() => navigate('/register')}>
              Create your account
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="nl-landing-footer">
        <div className="nl-landing-container">
          <div className="nl-landing-footer__inner">
            <p style={{ margin: 0 }}>
              &copy; {new Date().getFullYear()} Murzak Technologies. All rights reserved.
            </p>
            <div className="nl-landing-footer__links">
              <RouterLink to="/privacy-policy" className="nl-landing-footer__link">
                Privacy Policy
              </RouterLink>
              <RouterLink to="/terms-of-service" className="nl-landing-footer__link">
                Terms of Service
              </RouterLink>
              <RouterLink to="/contact-us" className="nl-landing-footer__link">
                Contact Us
              </RouterLink>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
