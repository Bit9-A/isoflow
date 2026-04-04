import { createTheme, ThemeOptions } from '@mui/material';

interface CustomThemeVars {
  appPadding: {
    x: number;
    y: number;
  };
  toolMenu: {
    height: number;
  };
  customPalette: {
    [key in string]: string;
  };
}

declare module '@mui/material/styles' {
  interface Theme {
    customVars: CustomThemeVars;
  }

  interface ThemeOptions {
    customVars: CustomThemeVars;
  }
}

export const customVars: CustomThemeVars = {
  appPadding: {
    x: 40,
    y: 40
  },
  toolMenu: {
    height: 40
  },
  customPalette: {
    diagramBg: '#f6faff',
    defaultColor: '#a5b8f3'
  }
};

const createShadows = () => {
  const shadows = Array(25)
    .fill('none')
    .map((shadow, i) => {
      if (i === 0) return 'none';
      const opacity = i * 0.01 + 0.03;
      return `0 ${i * 2}px ${i * 4}px rgba(0,0,0,${opacity}), 0 1px 2px rgba(0,0,0,0.02)`;
    }) as Required<ThemeOptions>['shadows'];

  return shadows;
};

export const themeConfig: ThemeOptions = {
  customVars,
  shadows: createShadows(),
  typography: {
    fontFamily: '"Outfit", "Inter", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em' },
    body1: { fontSize: '0.925rem', lineHeight: 1.6, letterSpacing: '0.01em' },
    body2: { fontSize: '0.8rem', lineHeight: 1.5, letterSpacing: '0.01em' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.02em' }
  },
  palette: {
    primary: {
      main: '#6366f1' // Indigo
    },
    secondary: {
      main: '#df004c' // Pink
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff'
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b'
    }
  },
  components: {
    MuiCard: {
      defaultProps: {
        elevation: 0,
        variant: 'outlined'
      },
      styleOverrides: {
        root: {
          borderRadius: '16px',
          borderColor: '#e2e8f0',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '16px'
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        variant: 'contained',
        disableRipple: true
      },
      styleOverrides: {
        root: {
          borderRadius: '10px',
          padding: '10px 20px',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
          },
          '&:active': {
            transform: 'scale(0.98)'
          }
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          '&:active': {
            transform: 'scale(0.95)'
          }
        }
      }
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          fontSize: '1.2rem'
        }
      }
    }
  }
};

export const theme = createTheme(themeConfig);
