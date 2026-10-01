import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Dialog,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Search, KeyboardReturn, ArrowForward } from '@mui/icons-material';
import { getNavigationRoutes } from '../../routes/routes';
import useRoleAccess from '../../hooks/useRoleAccess';
import iconMap from './iconMap';

/**
 * Quick jump (Ctrl/Cmd + K). Type what you want to do or where you want to go;
 * results are limited to pages the signed-in person is allowed to open.
 */

// Common jobs, phrased the way a shop owner would say them
const QUICK_ACTIONS = [
  { label: 'Open point of sale', path: '/sales', icon: 'PointOfSale', keywords: 'new sale checkout sell till cashier' },
  { label: 'Add a product', path: '/products/new', icon: 'Add', keywords: 'new item create stock' },
  { label: 'Load starter products for my industry', path: '/products/load-products', icon: 'CloudDownload', keywords: 'import seed template catalogue' },
  { label: 'Import products from a spreadsheet', path: '/products/bulk-import', icon: 'Upload', keywords: 'csv excel bulk' },
  { label: 'Create a purchase order', path: '/purchases/create-order', icon: 'AddShoppingCart', keywords: 'buy order supplier restock' },
  { label: 'Transfer stock between stores', path: '/stock-transfers/create', icon: 'SwapHoriz', keywords: 'move branch' },
  { label: 'Add a store', path: '/warehouses/new', icon: 'Warehouse', keywords: 'branch warehouse location' },
];

const CommandPalette = ({ open, onClose, onNavigate }) => {
  const { hasAccess } = useRoleAccess();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef(null);

  // Build the searchable list once per permission change
  const items = useMemo(() => {
    const actions = QUICK_ACTIONS.filter((a) => hasAccess(a.path)).map((a) => ({ ...a, group: 'Quick actions' }));

    const pages = [];
    getNavigationRoutes().forEach((route) => {
      if (route.hideFromMenu || route.path === '*' || !hasAccess(route.path)) return;
      pages.push({ label: route.label, path: route.path, icon: route.icon, group: 'Go to', keywords: '' });
      (route.pageChildren || []).forEach((child) => {
        if (child.path === route.path || !hasAccess(child.path)) return;
        pages.push({
          label: `${route.label} › ${child.label}`,
          path: child.path,
          icon: child.icon || route.icon,
          group: 'Go to',
          keywords: child.label,
        });
      });
    });
    return [...actions, ...pages];
  }, [hasAccess]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    const scored = items
      .map((item) => {
        const label = item.label.toLowerCase();
        const hay = `${label} ${item.keywords || ''}`.toLowerCase();
        if (!q.split(/\s+/).every((word) => hay.includes(word))) return null;
        return { item, score: label.startsWith(q) ? 0 : label.includes(q) ? 1 : 2 };
      })
      .filter(Boolean)
      // Keep each group together (actions first), best match first within a group
      .sort((a, b) => (a.item.group === b.item.group ? a.score - b.score : a.item.group === 'Quick actions' ? -1 : 1));
    return scored.map((s) => s.item);
  }, [items, query]);

  // Reset whenever it opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  // Keep the highlighted row visible while arrowing through a long list
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (item) => {
    if (!item) return;
    onClose();
    onNavigate(item.path);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    }
  };

  let lastGroup = null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-label="Search and jump to"
      slotProps={{
        paper: { sx: { alignSelf: 'flex-start', mt: { xs: 2, sm: 10 }, mx: { xs: 1.5, sm: 'auto' }, overflow: 'hidden' } },
        backdrop: { sx: { backdropFilter: 'blur(3px)' } },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
        <Search sx={{ color: 'text.secondary' }} />
        <InputBase
          autoFocus
          fullWidth
          placeholder="Search pages or type what you want to do..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          inputProps={{ 'aria-label': 'Search', role: 'combobox', 'aria-expanded': true, 'aria-controls': 'command-list' }}
          sx={{ fontSize: '1rem' }}
        />
        <Typography
          variant="caption"
          sx={{ px: 0.75, py: 0.25, border: 1, borderColor: 'divider', borderRadius: 1, color: 'text.secondary', fontWeight: 600 }}
        >
          Esc
        </Typography>
      </Box>

      <List id="command-list" ref={listRef} role="listbox" sx={{ maxHeight: 400, overflowY: 'auto', p: 1 }}>
        {results.length === 0 && (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <Typography variant="subtitle1">Nothing matches "{query}"</Typography>
            <Typography variant="body2" color="text.secondary">
              Try a different word, like "stock", "customers" or "reports".
            </Typography>
          </Box>
        )}
        {results.map((item, index) => {
          const Icon = iconMap[item.icon] || ArrowForward;
          const showHeading = item.group !== lastGroup;
          lastGroup = item.group;
          const isActive = index === active;
          return (
            <React.Fragment key={`${item.group}-${item.path}-${item.label}`}>
              {showHeading && (
                <Typography variant="overline" sx={{ display: 'block', px: 1.5, pt: 1, color: 'text.disabled' }}>
                  {item.group}
                </Typography>
              )}
              <ListItemButton
                role="option"
                aria-selected={isActive}
                data-active={isActive}
                selected={isActive}
                onMouseMove={() => setActive(index)}
                onClick={() => choose(item)}
                sx={{
                  borderRadius: 2,
                  py: 0.9,
                  '&.Mui-selected': { backgroundColor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.22 : 0.1) },
                }}
              >
                <ListItemIcon sx={{ minWidth: 38, color: isActive ? 'primary.main' : 'text.secondary' }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: isActive ? 600 : 500 }} />
                {isActive && <KeyboardReturn sx={{ fontSize: 16, color: 'text.secondary' }} />}
              </ListItemButton>
            </React.Fragment>
          );
        })}
      </List>

      <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 2, bgcolor: 'action.hover' }}>
        <Typography variant="caption" color="text.secondary">
          <b>Up / Down</b> to move
        </Typography>
        <Typography variant="caption" color="text.secondary">
          <b>Enter</b> to open
        </Typography>
      </Box>
    </Dialog>
  );
};

export default CommandPalette;
