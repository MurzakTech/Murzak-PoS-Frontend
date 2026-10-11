import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { Box, ButtonBase, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Assessment,
  Warning,
  CalendarToday,
  Book,
  Input,
  Output,
  SwapHoriz,
  Checklist,
  FactCheck,
  ListAlt,
  Tune,
  Inventory2,
} from '@mui/icons-material';
import useRoleAccess from '../../hooks/useRoleAccess';

// The landing page is organised by what a person wants to do, not by what the records are
// called in the system. Tiles for pages a person's role cannot open are left out.
const SECTIONS = [
  {
    title: 'Check your stock',
    tiles: [
      { path: '/inventory/stock-summary', icon: Assessment, title: 'What is in stock', text: 'How much of each product you have in every store.' },
      { path: '/inventory/low-stock', icon: Warning, title: 'Running low', text: 'Products that need restocking soon.' },
      { path: '/inventory/expiry-alerts', icon: CalendarToday, title: 'Expiring soon', text: 'Products close to their expiry date.' },
      { path: '/inventory/stock-ledger', icon: Book, title: 'Stock history', text: 'Every movement in and out of one product.' },
    ],
  },
  {
    title: 'Change your stock',
    tiles: [
      { path: '/inventory/material-receipts', icon: Input, title: 'Stock in', text: 'Record stock that has come in, such as opening stock.' },
      { path: '/inventory/material-issues', icon: Output, title: 'Stock out', text: 'Record stock that is damaged, expired or used by the business.' },
      { path: '/inventory/material-transfers', icon: SwapHoriz, title: 'Move between stores', text: 'Send stock from one store to another.' },
      { path: '/inventory/stock-reconciliation', icon: Checklist, title: 'Count your stock', text: 'Compare the shelf with the system and fix any difference.' },
      { path: '/inventory/multi-level-reconciliation', icon: FactCheck, title: 'Team stock count', text: 'A stock count that several people check and approve.' },
    ],
  },
  {
    title: 'More',
    tiles: [
      { path: '/inventory/stock-entries', icon: ListAlt, title: 'All stock movements', text: 'Every stock record, with its status.' },
      { path: '/inventory/item-details', icon: Inventory2, title: 'Product stock details', text: 'Stock, value and batches for one product in a store.' },
      { path: '/inventory/stock-entry', icon: Tune, title: 'Advanced stock entry', text: 'For repacking or making a product from others.' },
    ],
  },
];

const Tile = ({ tile, onOpen }) => {
  const Icon = tile.icon;
  return (
    <ButtonBase
      onClick={() => onOpen(tile.path)}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        p: 2,
        textAlign: 'left',
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        transition: 'border-color .15s ease, box-shadow .15s ease',
        '&:hover': { borderColor: 'primary.main', boxShadow: (t) => t.shadows[2] },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2.5,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          color: 'primary.main',
          bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.2 : 0.1),
        }}
      >
        <Icon fontSize="small" />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 650, lineHeight: 1.3 }}>
          {tile.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {tile.text}
        </Typography>
      </Box>
    </ButtonBase>
  );
};

const Inventory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAccess } = useRoleAccess();

  // Child pages (stock list, receipts and so on) render in place of this landing page
  if (location.pathname !== '/inventory') {
    return <Outlet />;
  }

  const sections = SECTIONS.map((section) => ({
    ...section,
    tiles: section.tiles.filter((tile) => hasAccess(tile.path)),
  })).filter((section) => section.tiles.length > 0);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
        Inventory
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        What would you like to do?
      </Typography>

      {sections.map((section) => (
        <Box key={section.title} component="section" sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 1.5, fontWeight: 650 }}>
            {section.title}
          </Typography>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {section.tiles.map((tile) => (
              <Tile key={tile.path} tile={tile} onOpen={navigate} />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default Inventory;
