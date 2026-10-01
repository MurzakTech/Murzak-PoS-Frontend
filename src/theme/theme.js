import { createTheme } from '@mui/material/styles';

// Brand palette — violet-to-blue gradient, matching the Murzak Technologies site
const brandPalette = {
  violet: '#7c3aed',
  indigo: '#6366f1',
  indigoLight: '#818cf8',
  indigoDark: '#4f46e5',
  blue: '#3b82f6',
  blueLight: '#60a5fa',
  blueDark: '#1d4ed8',
  navyBg: '#151a2e',
  navyPaper: '#1f2542',
};

// Light Theme
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: brandPalette.indigo,
      light: brandPalette.indigoLight,
      dark: brandPalette.indigoDark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: brandPalette.blue,
      light: brandPalette.blueLight,
      dark: brandPalette.blueDark,
      contrastText: '#ffffff',
    },
    background: {
      default: '#ffffff',
      paper: '#f7f7fb',
    },
    text: {
      primary: '#161326',
      secondary: '#5f5b74',
    },
    divider: 'rgba(99, 102, 241, 0.12)',
    action: {
      active: brandPalette.indigo,
      hover: 'rgba(99, 102, 241, 0.08)',
      selected: 'rgba(99, 102, 241, 0.12)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    fontSize: 14,
    h1: { fontSize: '2rem', fontWeight: 600, color: brandPalette.indigoDark },
    h2: { fontSize: '1.75rem', fontWeight: 600, color: brandPalette.indigoDark },
    h3: { fontSize: '1.5rem', fontWeight: 600, color: brandPalette.indigo },
    h4: { fontSize: '1.25rem', fontWeight: 600, color: brandPalette.indigo },
    h5: { fontSize: '1.125rem', fontWeight: 600, color: brandPalette.indigo },
    h6: { fontSize: '1rem', fontWeight: 600, color: brandPalette.indigo },
    body1: { fontSize: '0.875rem' },
    body2: { fontSize: '0.8125rem' },
    button: { fontSize: '0.875rem' },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 6,
          fontWeight: 500,
          fontSize: '0.875rem',
          padding: '6px 16px',
          minHeight: '36px',
        },
        sizeSmall: { padding: '4px 12px', fontSize: '0.8125rem', minHeight: '32px' },
        sizeLarge: { padding: '8px 20px', fontSize: '0.9375rem', minHeight: '40px' },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { padding: '8px' },
        sizeSmall: { padding: '4px' },
        sizeLarge: { padding: '12px' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': { fontSize: '0.875rem' },
          '& .MuiInputLabel-root': { fontSize: '0.875rem' },
          '& .MuiFormHelperText-root': { fontSize: '0.75rem' },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { fontSize: '0.875rem' },
        input: { padding: '8.5px 14px' },
        inputSizeSmall: { padding: '6.5px 12px', fontSize: '0.875rem' },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: '0.875rem' },
        sizeSmall: { fontSize: '0.875rem' },
      },
    },
    MuiFormControl: { defaultProps: { size: 'small' } },
    MuiSelect: { styleOverrides: { root: { fontSize: '0.875rem' } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { fontSize: '0.875rem' },
        input: { padding: '8.5px 14px' },
        inputSizeSmall: { padding: '6.5px 12px' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontSize: '0.75rem', height: '24px' },
        sizeSmall: { fontSize: '0.6875rem', height: '20px' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { fontSize: '0.875rem', padding: '8px 16px' },
        head: { fontSize: '0.8125rem', fontWeight: 600 },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: { minWidth: '40px', '& svg': { fontSize: '1.25rem' } },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: { fontSize: '0.875rem' },
        secondary: { fontSize: '0.8125rem' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { boxShadow: '0 2px 8px rgba(99, 102, 241, 0.1)' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: '0 2px 8px rgba(99, 102, 241, 0.1)' },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '56px !important',
          '@media (min-width: 600px)': { minHeight: '56px !important' },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontSize: '1.125rem', padding: '16px 24px' } },
    },
    MuiDialogContent: {
      styleOverrides: { root: { padding: '16px 24px' } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: '8px 16px' } },
    },
  },
});

// Dark Theme
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: brandPalette.indigoLight,
      light: '#a5b4fc',
      dark: brandPalette.indigo,
      contrastText: '#ffffff',
    },
    secondary: {
      main: brandPalette.blue,
      light: brandPalette.blueLight,
      dark: brandPalette.blueDark,
      contrastText: '#ffffff',
    },
    background: {
      default: brandPalette.navyBg,
      paper: brandPalette.navyPaper,
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.65)',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
    action: {
      active: brandPalette.indigoLight,
      hover: 'rgba(99, 102, 241, 0.1)',
      selected: 'rgba(99, 102, 241, 0.18)',
      disabled: 'rgba(255, 255, 255, 0.26)',
      disabledBackground: 'rgba(255, 255, 255, 0.12)',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    fontSize: 14,
    h1: { fontSize: '2rem', fontWeight: 600, color: '#ffffff' },
    h2: { fontSize: '1.75rem', fontWeight: 600, color: '#ffffff' },
    h3: { fontSize: '1.5rem', fontWeight: 600, color: brandPalette.indigoLight },
    h4: { fontSize: '1.25rem', fontWeight: 600, color: brandPalette.indigoLight },
    h5: { fontSize: '1.125rem', fontWeight: 600, color: brandPalette.blueLight },
    h6: { fontSize: '1rem', fontWeight: 600, color: brandPalette.blueLight },
    body1: { fontSize: '0.875rem' },
    body2: { fontSize: '0.8125rem' },
    button: { fontSize: '0.875rem' },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 6,
          fontWeight: 500,
          fontSize: '0.875rem',
          padding: '6px 16px',
          minHeight: '36px',
        },
        sizeSmall: { padding: '4px 12px', fontSize: '0.8125rem', minHeight: '32px' },
        sizeLarge: { padding: '8px 20px', fontSize: '0.9375rem', minHeight: '40px' },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { padding: '8px' },
        sizeSmall: { padding: '4px' },
        sizeLarge: { padding: '12px' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': { fontSize: '0.875rem' },
          '& .MuiInputLabel-root': { fontSize: '0.875rem' },
          '& .MuiFormHelperText-root': { fontSize: '0.75rem' },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { fontSize: '0.875rem' },
        input: { padding: '8.5px 14px' },
        inputSizeSmall: { padding: '6.5px 12px', fontSize: '0.875rem' },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: '0.875rem' },
        sizeSmall: { fontSize: '0.875rem' },
      },
    },
    MuiFormControl: { defaultProps: { size: 'small' } },
    MuiSelect: { styleOverrides: { root: { fontSize: '0.875rem' } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { fontSize: '0.875rem' },
        input: { padding: '8.5px 14px' },
        inputSizeSmall: { padding: '6.5px 12px' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontSize: '0.75rem', height: '24px' },
        sizeSmall: { fontSize: '0.6875rem', height: '20px' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { fontSize: '0.875rem', padding: '8px 16px' },
        head: { fontSize: '0.8125rem', fontWeight: 600 },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: { minWidth: '40px', '& svg': { fontSize: '1.25rem' } },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: { fontSize: '0.875rem' },
        secondary: { fontSize: '0.8125rem' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '56px !important',
          '@media (min-width: 600px)': { minHeight: '56px !important' },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontSize: '1.125rem', padding: '16px 24px' } },
    },
    MuiDialogContent: {
      styleOverrides: { root: { padding: '16px 24px' } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: '8px 16px' } },
    },
  },
});
