import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, Collapse, IconButton, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  CheckCircle,
  RadioButtonUnchecked,
  ExpandLess,
  ExpandMore,
  Close,
  ArrowForward,
  RocketLaunchOutlined,
} from '@mui/icons-material';

/**
 * "Get started" checklist.
 *
 * A new owner should never have to wonder "what do I do next?". Steps that we
 * can verify from real data tick themselves off (products added, staff
 * invited, first sale made). The rest are marked done by the person.
 */

const storageKey = (company) => `getting_started_v1_${company || 'default'}`;

const readState = (company) => {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(company)) || '{}');
    return {
      done: Array.isArray(raw.done) ? raw.done : [],
      dismissed: !!raw.dismissed,
      // undefined = never chosen, so we decide based on progress
      collapsed: typeof raw.collapsed === 'boolean' ? raw.collapsed : undefined,
    };
  } catch (e) {
    return { done: [], dismissed: false, collapsed: undefined };
  }
};

/**
 * Holds the checklist progress for a company. The dashboard owns this so it can
 * also offer a "Show setup guide" link after the guide has been hidden.
 */
export const useChecklistState = (company) => {
  const [state, setState] = useState(() => readState(company));

  useEffect(() => setState(readState(company)), [company]);

  const persist = useCallback(
    (next) => {
      setState(next);
      try {
        localStorage.setItem(storageKey(company), JSON.stringify(next));
      } catch (e) {
        // not critical: progress just won't be remembered next visit
      }
    },
    [company]
  );

  return [state, persist];
};

const GettingStarted = ({ checklist, productCount, staffCount, hasSales, onNavigate }) => {
  const [state, persist] = checklist;

  const steps = useMemo(
    () => [
      {
        id: 'account',
        title: 'Create your business account',
        description: 'Your company is set up and ready.',
        auto: true,
        done: true,
      },
      {
        id: 'products',
        title: 'Add your products',
        description: 'Load starter products for your industry, import a spreadsheet, or add them one by one.',
        auto: true,
        done: productCount > 0,
        cta: { label: 'Add products', path: '/products/load-products' },
      },
      {
        id: 'stock',
        title: 'Enter your opening stock',
        description: 'Tell the system how much of each product you have today so sales deduct correctly.',
        cta: { label: 'Import stock', path: '/products/bulk-stock-import' },
      },
      {
        id: 'payments',
        title: 'Check payment methods and tax',
        description: 'Confirm cash, M-Pesa and bank options, and set up eTIMS if you issue tax invoices.',
        cta: { label: 'Review settings', path: '/settings/payment-gateways' },
      },
      {
        id: 'team',
        title: 'Invite your team',
        description: 'Give cashiers and managers their own logins with the right permissions.',
        auto: true,
        done: staffCount > 1,
        cta: { label: 'Add staff', path: '/staff' },
      },
      {
        id: 'sale',
        title: 'Make your first sale',
        description: 'Open the point of sale and ring up a test sale to see how it all fits together.',
        auto: true,
        done: !!hasSales,
        cta: { label: 'Open POS', path: '/sales' },
      },
    ],
    [productCount, staffCount, hasSales]
  );

  const isDone = (s) => s.done || state.done.includes(s.id);
  const doneCount = steps.filter(isDone).length;
  const complete = doneCount === steps.length;
  const nextId = steps.find((s) => !isDone(s))?.id;
  // New businesses see the full list; once most steps are done it starts tucked away
  const expanded = state.collapsed === undefined ? doneCount < 4 : !state.collapsed;

  if (state.dismissed) return null;

  return (
    <Card sx={{ mb: 3, overflow: 'hidden', background: (t) => (complete ? undefined : t.custom.gradientSoft) }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5, pb: expanded ? 1.5 : 2.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 3,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            background: (t) => t.custom.gradient,
            flexShrink: 0,
          }}
        >
          <RocketLaunchOutlined />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h5">{complete ? 'You are all set up' : 'Get started with Murzak POS'}</Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.75 }}>
            <LinearProgress
              variant="determinate"
              value={(doneCount / steps.length) * 100}
              sx={{ flexGrow: 1, maxWidth: 260, height: 7 }}
              aria-label="Setup progress"
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
              {doneCount} of {steps.length} done
            </Typography>
          </Stack>
        </Box>
        <Tooltip title={expanded ? 'Collapse' : 'Expand'}>
          <IconButton aria-label={expanded ? 'Collapse checklist' : 'Expand checklist'} onClick={() => persist({ ...state, collapsed: expanded })}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Hide this guide">
          <IconButton aria-label="Hide setup guide" onClick={() => persist({ ...state, dismissed: true })}>
            <Close fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          {steps.map((step) => {
            const done = isDone(step);
            const isNext = step.id === nextId;
            return (
              <Box
                key={step.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 1,
                  py: 1.25,
                  borderRadius: 2.5,
                  bgcolor: (t) => (isNext ? alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.14 : 0.07) : 'transparent'),
                }}
              >
                {done ? (
                  <CheckCircle sx={{ color: 'success.main' }} />
                ) : (
                  <RadioButtonUnchecked sx={{ color: isNext ? 'primary.main' : 'text.disabled' }} />
                )}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ textDecoration: done ? 'line-through' : 'none', color: done ? 'text.secondary' : 'text.primary' }}
                  >
                    {step.title}
                  </Typography>
                  {!done && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {step.description}
                    </Typography>
                  )}
                </Box>
                {!done && step.cta && (
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                    {!step.auto && (
                      <Button size="small" color="inherit" sx={{ color: 'text.secondary' }} onClick={() => persist({ ...state, done: [...state.done, step.id] })}>
                        Mark done
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant={isNext ? 'contained' : 'outlined'}
                      endIcon={<ArrowForward />}
                      onClick={() => onNavigate(step.cta.path)}
                    >
                      {step.cta.label}
                    </Button>
                  </Stack>
                )}
              </Box>
            );
          })}
        </Box>
      </Collapse>
    </Card>
  );
};

export default GettingStarted;
