import React from 'react';
import { Box, Button, Card, Chip, CircularProgress, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  AutoAwesome,
  AddCircleOutline,
  UploadFile,
  ArrowForward,
  Restaurant,
  LocalBar,
  Store,
  ShoppingCart,
  Home,
  LocalHospital,
  Build,
  School,
  Spa,
  FitnessCenter,
  DirectionsCar,
  Computer,
  BusinessCenter,
} from '@mui/icons-material';

// Pick an icon that matches the person's industry so the first screen feels personal
const industryIcon = (code = '', name = '') => {
  const key = `${code} ${name}`.toLowerCase();
  const table = [
    [/restaurant|food|cafe/, Restaurant],
    [/bar\b/, LocalBar],
    [/retail|shop|store|supermarket|grocery/, Store],
    [/cloth|fashion|apparel/, ShoppingCart],
    [/furniture/, Home],
    [/pharmacy|medical|hospital|health/, LocalHospital],
    [/hardware|construction|building/, Build],
    [/education|school|university/, School],
    [/beauty|salon|spa/, Spa],
    [/fitness|gym|sport/, FitnessCenter],
    [/automotive|car|vehicle/, DirectionsCar],
    [/electronics|computer|tech/, Computer],
  ];
  const hit = table.find(([re]) => re.test(key));
  return hit ? hit[1] : BusinessCenter;
};

/**
 * First-run screen for an account with no products yet. Offers the three ways
 * to get a catalogue in, with the fastest (industry starter pack) highlighted.
 */
const PathCard = ({ icon: Icon, title, description, cta, onClick, recommended, loading }) => (
  <Card
    sx={{
      p: 3,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
      overflow: 'visible',
      borderColor: recommended ? 'primary.main' : undefined,
      borderWidth: recommended ? 2 : 1,
      boxShadow: recommended ? (t) => `0 8px 28px ${alpha(t.palette.primary.main, 0.2)}` : undefined,
    }}
  >
    {recommended && (
      <Chip label="Fastest way to start" color="primary" size="small" sx={{ position: 'absolute', top: -13, left: 20, fontWeight: 700 }} />
    )}
    <Box
      sx={{
        width: 48,
        height: 48,
        mb: 2,
        borderRadius: 3,
        display: 'grid',
        placeItems: 'center',
        color: recommended ? '#fff' : 'primary.main',
        background: (t) => (recommended ? t.custom.gradient : alpha(t.palette.primary.main, 0.1)),
      }}
    >
      <Icon />
    </Box>
    <Typography variant="h5" gutterBottom>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, flexGrow: 1 }}>
      {description}
    </Typography>
    <Button
      variant={recommended ? 'contained' : 'outlined'}
      endIcon={loading ? <CircularProgress size={16} color="inherit" /> : <ArrowForward />}
      onClick={onClick}
      disabled={loading}
      fullWidth
    >
      {cta}
    </Button>
  </Card>
);

const WelcomeSetup = ({ firstName, companyName, industry, loadingStarter, onLoadStarter, onNavigate }) => {
  const industryName = industry?.industry_name || industry?.name;
  const StarterIcon = industry ? industryIcon(industry.industry_code, industryName) : AutoAwesome;

  return (
    <Box sx={{ animation: 'murzak-fade-up .3s ease both' }}>
      <Card
        sx={{
          p: { xs: 3, md: 5 },
          mb: 3,
          textAlign: 'center',
          background: (t) => t.custom.gradientSoft,
        }}
      >
        <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
          Welcome{firstName ? `, ${firstName}` : ''}
        </Typography>
        <Typography variant="h2" sx={{ mt: 0.5, mb: 1.5 }}>
          Let us get {companyName || 'your business'} ready to sell
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto' }}>
          First, add the products you sell. Choose whichever way is quickest for you; you can always add more later.
        </Typography>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', md: industry ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' },
          mb: 3,
          pt: 1.5,
        }}
      >
        {industry && (
          <PathCard
            recommended
            icon={StarterIcon}
            title={`Start with ${industryName} products`}
            description="We load a ready-made catalogue with common products and categories for your industry. Edit or remove anything afterwards."
            cta="Load starter products"
            loading={loadingStarter}
            onClick={onLoadStarter}
          />
        )}
        <PathCard
          icon={AddCircleOutline}
          title="Add a product yourself"
          description="Best if you only sell a few items. Enter a name, price and unit and you are done."
          cta="Add first product"
          onClick={() => onNavigate('/products/new')}
        />
        <PathCard
          icon={UploadFile}
          title="Import from a spreadsheet"
          description="Already have your products in Excel or CSV? Upload the file and add hundreds at once."
          cta="Import products"
          onClick={() => onNavigate('/products/bulk-import')}
        />
      </Box>
    </Box>
  );
};

export default WelcomeSetup;
