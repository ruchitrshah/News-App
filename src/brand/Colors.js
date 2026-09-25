// src/brand/Colors.js
const freeze = (obj) => Object.freeze(obj);

export const ColorUtils = freeze({
  rgba(hex, alpha = 1) {
    const h = String(hex || '').replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },
});

export const Palette = freeze({
  base: freeze({
    black: '#000000',
    white: '#FFFFFF',
  }),

  neutral: freeze({
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    900: '#111827',

    iosLabel: '#8E8E93',
    placeholder: '#B6BFC3',
    snackbar: '#323232',
  }),

  brand: freeze({
    primary: '#030F24',       // deep navy
    primarySoft: '#0A1F3D',   // dark navy tint
    primaryBorder: '#BC8432', // gold border
    gold: '#D09E4D',          // bright gold
    goldDeep: '#BC8432',      // deep gold
  }),

  status: freeze({
    danger: '#EF4444',
    warning: '#FBBF24',
    dangerSoft: '#FEF2F2',
    dangerBorderSoft: '#FEE2E2',
  }),
});

export const Colors = freeze({
  brand: freeze({
    primary: Palette.brand.primary,
    onPrimary: Palette.base.white,
    soft: Palette.brand.primarySoft,
    borderSoft: Palette.brand.primaryBorder,
    gold: Palette.brand.gold,
    goldDeep: Palette.brand.goldDeep,
  }),

  status: freeze({
    danger: Palette.status.danger,
    warning: Palette.status.warning,
    dangerSoft: Palette.status.dangerSoft,
    dangerBorderSoft: Palette.status.dangerBorderSoft,
  }),

  text: freeze({
    primary: Palette.neutral[900],
    secondary: Palette.neutral[700],
    tertiary: Palette.neutral[500],
    muted: Palette.neutral[400],

    label: Palette.neutral[500],
    hint: Palette.neutral[500],
    placeholder: Palette.neutral.placeholder,
    disabled: Palette.neutral[400],

    onDark: Palette.base.white,
    onLight: Palette.base.black,
  }),

  icon: freeze({
    primary: Palette.neutral[700],
    secondary: Palette.neutral[500],
    muted: Palette.neutral[400],
    onDark: Palette.base.white,
  }),

  surface: freeze({
    page: Palette.base.white,
    card: Palette.base.white,

    subtle: Palette.neutral[50],
    soft: Palette.neutral[100],

    snackbar: Palette.neutral.snackbar,
  }),

  background: freeze({
    surface: Palette.base.white,
    page: Palette.base.white,
    card: Palette.base.white,
    subtle: Palette.neutral[50],
    soft: Palette.neutral[100],
  }),

  border: freeze({
    subtle: Palette.neutral[200],
    default: Palette.neutral[300],
    strong: Palette.base.black,

    focus: Palette.base.black,
    brand: Palette.brand.primary,
    danger: Palette.status.danger,
  }),

  shadow: freeze({
    color: Palette.base.black,
  }),

  overlay: freeze({
    scrim: ColorUtils.rgba(Palette.base.black, 0.4),
    scrimStrong: ColorUtils.rgba(Palette.base.black, 0.6),
  }),
});

export const ComponentTokens = freeze({
  button: freeze({
    primary: freeze({
      background: Palette.brand.primary,   // navy
      foreground: Palette.base.white,
      border: Palette.brand.primary,       // navy
      spinner: Palette.base.white,
    }),
    secondary: freeze({
      background: Palette.neutral[100],
      foreground: Palette.neutral[900],
      border: Palette.neutral[100],
      spinner: Palette.base.black,
    }),
    outline: freeze({
      background: 'transparent',
      foreground: Palette.base.black,
      border: Palette.base.black,
      spinner: Palette.base.black,
    }),
    ghost: freeze({
      background: 'transparent',
      foreground: Palette.status.danger,
      border: 'transparent',
      spinner: Palette.status.danger,
    }),
    white: freeze({
      background: Palette.base.white,
      foreground: Palette.base.black,
      border: Palette.base.white,
      spinner: Palette.base.black,
    }),
    whiteOutline: freeze({
      background: 'transparent',
      foreground: Palette.base.white,
      border: Palette.base.white,
      spinner: Palette.base.white,
    }),
    disabled: freeze({
      background: Palette.neutral[200],
      foreground: Palette.neutral[400],
      border: Palette.neutral[200],
      spinner: Palette.neutral[400],
    }),
  }),

  chip: freeze({
    default: freeze({
      background: Palette.neutral[100],
      border: Palette.neutral[300],
      foreground: Palette.neutral[700],
    }),
    selected: freeze({
      background: Palette.brand.primary,   // navy
      border: Palette.brand.primary,       // navy
      foreground: Palette.base.white,
    }),
    disabled: freeze({
      background: Palette.neutral[100],
      border: Palette.neutral[200],
      foreground: Palette.neutral[400],
    }),
  }),

  badge: freeze({
    neutral: freeze({
      background: Palette.neutral[100],
      border: Palette.neutral[200],
      foreground: Palette.neutral[600],
    }),
    brand: freeze({
      background: Palette.brand.primarySoft,
      border: Palette.brand.primaryBorder,
      foreground: Palette.brand.primary,
    }),
    danger: freeze({
      background: Palette.status.dangerSoft,
      border: Palette.status.dangerBorderSoft,
      foreground: Palette.status.danger,
    }),
  }),
});
// Duotone hobby accents: strong strokes on light chips, bright strokes when selected.
export const HobbyColors = freeze({
  blue: freeze({ stroke: '#2563EB', selected: '#93C5FD', fill: '#60A5FA' }),
  violet: freeze({ stroke: '#7C3AED', selected: '#C4B5FD', fill: '#A78BFA' }),
  coral: freeze({ stroke: '#DB2777', selected: '#F9A8D4', fill: '#F472B6' }),
  amber: freeze({ stroke: '#B45309', selected: '#FCD34D', fill: '#FBBF24' }),
  teal: freeze({ stroke: '#0F766E', selected: '#5EEAD4', fill: '#2DD4BF' }),
  green: freeze({ stroke: '#15803D', selected: '#86EFAC', fill: '#4ADE80' }),
});
