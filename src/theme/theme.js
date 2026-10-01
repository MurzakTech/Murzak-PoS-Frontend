import { createTheme, alpha } from '@mui/material/styles';

/**
 * Murzak POS design system.
 *
 * One builder produces both light and dark themes so they cannot drift apart.
 * Design intent: calm, confident and easy to scan. White cards on a soft grey
 * canvas, one strong brand colour for primary actions, and plenty of
 * whitespace so a first-time user always knows where to look.
 */

const brand = {
  indigo: '#4f46e5', // primary action colour (AA contrast with white text)
  indigoLight: '#818cf8',
  indigoDark: '#3730a3',
  violet: '#7c3aed',
  sky: '#0ea5e9',
};

const tokens = {
  light: {
    primary: { main: brand.indigo, light: brand.indigoLight, dark: brand.indigoDark },
    secondary: { main: brand.sky, light: '#38bdf8', dark: '#0369a1' },
    success: { main: '#15803d', light: '#22c55e', dark: '#166534' },
    warning: { main: '#b45309', light: '#f59e0b', dark: '#92400e' },
    error: { main: '#dc2626', light: '#f87171', dark: '#b91c1c' },
    info: { main: '#0369a1', light: '#38bdf8', dark: '#075985' },
    background: { default: '#f5f6fa', paper: '#ffffff' },
    text: { primary: '#14162b', secondary: '#5a5f7a', disabled: '#9a9eb5' },
    divider: '#e4e6f0',
    surface: { subtle: '#f9fafc', sunken: '#eef0f6' },
  },
  dark: {
    primary: { main: '#8e90f9', light: '#b4b6fc', dark: brand.indigo },
    secondary: { main: '#38bdf8', light: '#7dd3fc', dark: brand.sky },
    success: { main: '#4ade80', light: '#86efac', dark: '#22c55e' },
    warning: { main: '#fbbf24', light: '#fcd34d', dark: '#f59e0b' },
    error: { main: '#f87171', light: '#fca5a5', dark: '#ef4444' },
    info: { main: '#38bdf8', light: '#7dd3fc', dark: '#0ea5e9' },
    background: { default: '#0d101f', paper: '#151930' },
    text: { primary: '#eef0fb', secondary: '#a4a9c6', disabled: '#6b7194' },
    divider: 'rgba(255, 255, 255, 0.09)',
    surface: { subtle: '#12162a', sunken: '#0a0c18' },
  },
};

const fontFamily = [
  '"Inter Variable"',
  'Inter',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
].join(',');

// Soft, layered shadows. Index matches MUI's elevation scale.
const softShadow = (mode) => {
  const c = mode === 'dark' ? '0, 0, 0' : '20, 22, 43';
  const o = mode === 'dark' ? [0.35, 0.4, 0.5] : [0.05, 0.08, 0.12];
  return [
    'none',
    `0 1px 2px rgba(${c}, ${o[0]})`,
    `0 1px 3px rgba(${c}, ${o[0]}), 0 1px 2px rgba(${c}, ${o[0]})`,
    `0 2px 6px rgba(${c}, ${o[0]}), 0 1px 3px rgba(${c}, ${o[0]})`,
    `0 4px 12px rgba(${c}, ${o[1]})`,
    `0 6px 16px rgba(${c}, ${o[1]})`,
    `0 8px 20px rgba(${c}, ${o[1]})`,
    `0 10px 24px rgba(${c}, ${o[1]})`,
    `0 12px 28px rgba(${c}, ${o[2]})`,
  ];
};

const buildTheme = (mode) => {
  const t = tokens[mode];
  const base = createTheme();
  const shadows = [...base.shadows];
  softShadow(mode).forEach((s, i) => {
    shadows[i] = s;
  });
  // Everything above the soft scale reuses the largest soft shadow.
  for (let i = 9; i < shadows.length; i += 1) shadows[i] = softShadow(mode)[8];

  const isDark = mode === 'dark';
  const inputBg = isDark ? alpha('#ffffff', 0.03) : '#ffffff';

  return createTheme({
    palette: {
      mode,
      primary: { ...t.primary, contrastText: isDark ? '#0d101f' : '#ffffff' },
      secondary: { ...t.secondary, contrastText: '#ffffff' },
      success: t.success,
      warning: t.warning,
      error: t.error,
      info: t.info,
      background: t.background,
      text: t.text,
      divider: t.divider,
      action: {
        hover: alpha(t.primary.main, isDark ? 0.1 : 0.06),
        selected: alpha(t.primary.main, isDark ? 0.18 : 0.1),
        focus: alpha(t.primary.main, 0.16),
      },
    },
    // Project-specific tokens, available as theme.custom.* in any component.
    custom: {
      surface: t.surface,
      gradient: `linear-gradient(135deg, ${brand.indigo} 0%, ${brand.violet} 55%, ${brand.sky} 120%)`,
      gradientSoft: `linear-gradient(135deg, ${alpha(brand.indigo, isDark ? 0.22 : 0.08)} 0%, ${alpha(brand.sky, isDark ? 0.14 : 0.06)} 100%)`,
      sidebar: {
        width: 248,
        collapsedWidth: 68,
        background: isDark ? '#0a0d1b' : '#ffffff',
      },
      topbarHeight: 60,
    },
    typography: {
      fontFamily,
      fontSize: 14,
      h1: { fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 },
      h2: { fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
      h3: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.25 },
      h4: { fontSize: '1.25rem', fontWeight: 650, letterSpacing: '-0.01em', lineHeight: 1.3 },
      h5: { fontSize: '1.0625rem', fontWeight: 650, letterSpacing: '-0.005em', lineHeight: 1.35 },
      h6: { fontSize: '0.9375rem', fontWeight: 650, lineHeight: 1.4 },
      subtitle1: { fontSize: '0.9375rem', fontWeight: 500 },
      subtitle2: { fontSize: '0.8125rem', fontWeight: 600 },
      body1: { fontSize: '0.875rem', lineHeight: 1.55 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
      caption: { fontSize: '0.75rem', lineHeight: 1.45 },
      overline: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em' },
      button: { fontSize: '0.875rem', fontWeight: 600, textTransform: 'none' },
    },
    shape: { borderRadius: 10 },
    shadows,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
          body: { fontFeatureSettings: '"cv11", "ss01"', textRendering: 'optimizeLegibility' },
          '*:focus-visible': {
            outline: `2px solid ${t.primary.main}`,
            outlineOffset: 2,
            borderRadius: 4,
          },
          '::selection': { backgroundColor: alpha(t.primary.main, 0.25) },
          // Slim, quiet scrollbars
          '*': { scrollbarWidth: 'thin', scrollbarColor: `${alpha(t.text.secondary, 0.35)} transparent` },
          '*::-webkit-scrollbar': { width: 8, height: 8 },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(t.text.secondary, 0.3),
            borderRadius: 8,
          },
          // Respect users who prefer reduced motion
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              transitionDuration: '0.01ms !important',
            },
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: t.divider },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 14,
            border: `1px solid ${t.divider}`,
            boxShadow: shadows[1],
            backgroundImage: 'none',
          },
        },
      },
      MuiCardContent: {
        styleOverrides: { root: { padding: 20, '&:last-child': { paddingBottom: 20 } } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 9,
            fontWeight: 600,
            fontSize: '0.875rem',
            padding: '7px 16px',
            minHeight: 38,
            transition: 'background-color .15s ease, box-shadow .15s ease, transform .05s ease',
            '&:active': { transform: 'translateY(1px)' },
          },
          containedPrimary: {
            '&:hover': { backgroundColor: t.primary.dark, boxShadow: shadows[3] },
          },
          outlined: { borderColor: isDark ? alpha('#fff', 0.2) : '#d3d6e6' },
          sizeSmall: { padding: '4px 12px', fontSize: '0.8125rem', minHeight: 32, borderRadius: 8 },
          sizeLarge: { padding: '10px 22px', fontSize: '0.9375rem', minHeight: 46, borderRadius: 11 },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { borderRadius: 9 },
          sizeSmall: { padding: 6 },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, borderRadius: 9 },
        },
      },
      MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
      MuiFormControl: { defaultProps: { size: 'small' } },
      MuiInputLabel: { styleOverrides: { root: { fontSize: '0.875rem' } } },
      MuiFormHelperText: { styleOverrides: { root: { marginLeft: 2, fontSize: '0.75rem' } } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
            borderRadius: 9,
            backgroundColor: inputBg,
            transition: 'box-shadow .15s ease, border-color .15s ease',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? alpha('#fff', 0.16) : '#d3d6e6' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? alpha('#fff', 0.3) : '#a9aec8' },
            '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(t.primary.main, 0.18)}` },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: t.primary.main, borderWidth: 1.5 },
            '&.Mui-error.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(t.error.main, 0.18)}` },
          },
          input: { padding: '10px 14px' },
          inputSizeSmall: { padding: '9px 12px' },
        },
      },
      MuiSelect: { styleOverrides: { select: { borderRadius: 9 } } },
      MuiAutocomplete: { styleOverrides: { paper: { borderRadius: 12, border: `1px solid ${t.divider}` } } },
      MuiChip: {
        styleOverrides: {
          root: { fontSize: '0.75rem', fontWeight: 600, height: 26, borderRadius: 8 },
          sizeSmall: { fontSize: '0.6875rem', height: 22, borderRadius: 7 },
        },
      },
      MuiTableContainer: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiTableHead: {
        styleOverrides: {
          root: { '& .MuiTableCell-root': { backgroundColor: t.surface.subtle } },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { fontSize: '0.8125rem', padding: '11px 16px', borderBottom: `1px solid ${t.divider}` },
          head: {
            fontSize: '0.6875rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: t.text.secondary,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: { root: { '&:last-child td': { borderBottom: 0 } } },
      },
      MuiTabs: {
        styleOverrides: { indicator: { height: 3, borderRadius: '3px 3px 0 0' } },
      },
      MuiTab: {
        styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44 } },
      },
      MuiListItemIcon: { styleOverrides: { root: { minWidth: 36, '& svg': { fontSize: '1.25rem' } } } },
      MuiListItemText: {
        styleOverrides: { primary: { fontSize: '0.875rem' }, secondary: { fontSize: '0.8125rem' } },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'inherit' },
        styleOverrides: { root: { backgroundImage: 'none', boxShadow: 'none' } },
      },
      MuiToolbar: { styleOverrides: { root: { minHeight: '60px !important' } } },
      MuiDrawer: { styleOverrides: { paper: { backgroundImage: 'none', borderRadius: 0 } } },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 18, border: `1px solid ${t.divider}`, boxShadow: shadows[8] },
        },
      },
      MuiDialogTitle: { styleOverrides: { root: { fontSize: '1.0625rem', fontWeight: 650, padding: '20px 24px 8px' } } },
      MuiDialogContent: { styleOverrides: { root: { padding: '12px 24px' } } },
      MuiDialogActions: { styleOverrides: { root: { padding: '12px 24px 20px', gap: 4 } } },
      MuiMenu: {
        styleOverrides: {
          paper: { borderRadius: 12, border: `1px solid ${t.divider}`, boxShadow: shadows[6], marginTop: 4 },
        },
      },
      MuiMenuItem: { styleOverrides: { root: { fontSize: '0.875rem', borderRadius: 8, margin: '1px 6px' } } },
      MuiPopover: { styleOverrides: { paper: { borderRadius: 12, border: `1px solid ${t.divider}` } } },
      MuiTooltip: {
        defaultProps: { arrow: true },
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? '#2a2f52' : '#1c1f3a',
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: 500,
            borderRadius: 8,
            padding: '6px 10px',
          },
          arrow: { color: isDark ? '#2a2f52' : '#1c1f3a' },
        },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: 12, alignItems: 'center' }, message: { fontSize: '0.8125rem' } },
      },
      MuiLinearProgress: {
        styleOverrides: { root: { borderRadius: 999, height: 8 }, bar: { borderRadius: 999 } },
      },
      MuiSkeleton: { defaultProps: { animation: 'wave' } },
      MuiBadge: { styleOverrides: { badge: { fontWeight: 700 } } },
      MuiBreadcrumbs: { styleOverrides: { root: { fontSize: '0.8125rem' } } },
      // Flex gap instead of margins: prevents clashes with Grid's negative margins
      MuiStack: { defaultProps: { useFlexGap: true } },
      MuiDivider: { styleOverrides: { root: { borderColor: t.divider } } },
    },
  });
};

export const lightTheme = buildTheme('light');
export const darkTheme = buildTheme('dark');
