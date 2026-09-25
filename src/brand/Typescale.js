import { Platform, Dimensions, PixelRatio } from 'react-native';
import { Colors } from './Colors';

const freeze = (obj) => Object.freeze(obj);

// ─── Screen dimensions ────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Design baseline ─────────────────────────────────────────────────────────
// DESIGN_WIDTH is the screen width the fonts were tuned for.
// iPhone 17 Pro Max = 430 logical points — that's the device the app was
// designed and approved on. Every other device scales down from there.
const DESIGN_WIDTH  = 430;

// NOTE: there is deliberately no Android-specific size penalty here.
//
// This was previously an extra ~8% reduction applied on top of the
// proportional scale. The stated reason was that Android renders fonts with
// heavier metrics — true of the *system* faces (Roboto vs SF), but this app
// ships MaisonNeue and loads the identical TTF on both platforms, so there is
// no metric difference to correct for.
//
// Its real effect: a 412dp Pixel rendered text at 0.881 while a 412dp iPhone
// got 0.958 — same physical width, 8% smaller text, on exactly the cheaper
// devices where legibility matters most. Width already drives the scale below;
// the platform should not also.

// Web gets a flat 0.9× to compensate for higher-DPI desktop monitors.
const FONT_SCALE_WEB = 0.9;

// ─── Compute per-platform font scale ─────────────────────────────────────────
//
// Rule: never scale UP (don't enlarge text on wider screens).
// Native: proportional from DESIGN_WIDTH, floor 0.82 — same on iOS & Android
// Web:    flat FONT_SCALE_WEB
//
export const FONT_SCALE = (() => {
  if (Platform.OS === 'web') return FONT_SCALE_WEB;

  // Never go above 1.0 even on phones wider than the design width
  const screenRatio = Math.min(1, SCREEN_WIDTH / DESIGN_WIDTH);

  return Math.max(0.82, screenRatio);
})();

// ─── Space scale (margins, padding) ──────────────────────────────────────────
// Slightly less aggressive than font scale so layouts don't collapse on small
// screens, but still reduces proportionally. Capped higher (0.88 floor).
export const SPACE_SCALE = (() => {
  if (Platform.OS === 'web') return 1.0;
  const screenRatio = Math.min(1, SCREEN_WIDTH / DESIGN_WIDTH);
  return Math.max(0.88, screenRatio);
})();

// Utility for one-off responsive values anywhere in the codebase:
//   import { scaleSpace } from '../brand/Typescale';
//   paddingHorizontal: scaleSpace(24)
export const scaleSpace = (value) =>
  SPACE_SCALE < 1 ? Math.round(value * SPACE_SCALE) : value;

// Use PixelRatio.roundToNearestPixel to ensure crisp rendering on specific device densities
const scaleFont = (s) => 
  FONT_SCALE < 1 ? PixelRatio.roundToNearestPixel(s * FONT_SCALE) : s;

// ─── Token Builder ────────────────────────────────────────────────────────────
// Calculates line height dynamically based on the scaled font size to prevent 
// text clipping when users increase their OS accessibility font size.
const t = (style) => {
  const scaledFontSize = style.fontSize ? scaleFont(style.fontSize) : undefined;
  
  let scaledLineHeight = undefined;
  if (style.fontSize && style.lineHeight) {
    // Calculate the ratio of line-height to font-size from the design
    const ratio = style.lineHeight / style.fontSize;
    scaledLineHeight = PixelRatio.roundToNearestPixel(scaledFontSize * ratio);
  } else if (style.lineHeight) {
    // Fallback if only lineHeight is provided without fontSize
    scaledLineHeight = FONT_SCALE < 1 ? PixelRatio.roundToNearestPixel(style.lineHeight * FONT_SCALE) : style.lineHeight;
  }

  return {
    ...style,
    ...(scaledFontSize && { fontSize: scaledFontSize }),
    ...(scaledLineHeight && { lineHeight: scaledLineHeight }),
  };
};

// ─── Font families ────────────────────────────────────────────────────────────
export const FontFamilies = freeze({
  bold:   'MaisonNeue-Bold',
  demi:   'MaisonNeue-Demi',
  medium: 'MaisonNeue-Medium',
});

export const FontAssets = freeze({
  [FontFamilies.bold]:   require('../../assets/fonts/MaisonNeue-Bold.ttf'),
  [FontFamilies.demi]:   require('../../assets/fonts/MaisonNeue-Demi.ttf'),
  [FontFamilies.medium]: require('../../assets/fonts/MaisonNeue-Medium.ttf'),
});

// Base sizes (tuned for iPhone 17 Pro Max — scale applied automatically above)
export const FontSizes = freeze({
  40: 40, 28: 28, 24: 24, 20: 20, 18: 18,
  17: 17, 16: 16, 15: 15, 14: 14, 12: 12,
});

export const LineHeights = freeze({
  52: 52, 36: 36, 32: 32, 30: 30, 28: 28, 24: 24,
  23: 23, 22: 22, 16: 16,
});

// ─── Type tokens ──────────────────────────────────────────────────────────────
export const Type = freeze({
  pageTitle: t({
    fontFamily: FontFamilies.bold,
    fontSize: FontSizes[28],
    // 28/32 was a 1.14 ratio — the only token in this scale under 1.20, and
    // tight enough that iOS shaved the tops off ascenders in every screen
    // title. 36 puts it at 1.29, in line with carousalText (1.30).
    lineHeight: LineHeights[36],
    color: Colors.text.primary,
    marginBottom: scaleSpace(10),
  }),

  carousalText: t({
    fontFamily: FontFamilies.demi,
    fontSize: FontSizes[40],
    lineHeight: LineHeights[52],
    color: Colors.text.primary,
    marginBottom: scaleSpace(10),
  }),

  subtitle: t({
    fontFamily: FontFamilies.medium,
    fontSize: FontSizes[18],
    lineHeight: LineHeights[24],
    color: Colors.text.tertiary,
  }),

  biotext: t({
    fontFamily: FontFamilies.medium,
    fontSize: FontSizes[18],
    lineHeight: LineHeights[30],
    color: Colors.text.secondary,
  }),

  sectionHeader: t({
    fontFamily: FontFamilies.bold,
    fontSize: FontSizes[20],
    lineHeight: LineHeights[24],
    color: Colors.text.primary,
    letterSpacing: 0.3,
    marginTop: scaleSpace(32),
    marginBottom: scaleSpace(12),
  }),

  cardTitle: t({
    fontFamily: FontFamilies.bold,
    fontSize: FontSizes[20],
    lineHeight: LineHeights[24],
    color: Colors.text.primary,
  }),

  modalTitle: t({
    fontFamily: FontFamilies.bold,
    fontSize: FontSizes[24],
    lineHeight: LineHeights[32],
    color: Colors.text.onLight,
  }),

  bodyPrimary: t({
    fontFamily: FontFamilies.medium,
    fontSize: FontSizes[17],
    lineHeight: LineHeights[24],
    color: Colors.text.primary,
  }),

  bodySecondary: t({
    fontFamily: FontFamilies.medium,
    fontSize: FontSizes[18],
    lineHeight: LineHeights[28],
    color: Colors.text.secondary,
    marginTop: scaleSpace(6),
  }),

  bodyTertiary: t({
    fontFamily: FontFamilies.medium,
    fontSize: FontSizes[18],
    lineHeight: LineHeights[22],
    color: Colors.text.tertiary,
    marginTop: scaleSpace(6),
  }),

  bodyTertiaryTight: t({
    fontFamily: FontFamilies.medium,
    fontSize: FontSizes[16],
    lineHeight: LineHeights[23],
    color: Colors.text.tertiary,
  }),

  primaryValue: t({
    fontFamily: FontFamilies.demi,
    fontSize: FontSizes[18],
    lineHeight: LineHeights[24],
    color: Colors.text.primary,
  }),

  label: t({
    fontFamily: FontFamilies.bold,
    fontSize: FontSizes[16],
    lineHeight: LineHeights[22],
    color: Colors.text.muted,
    textTransform: 'uppercase',
    marginBottom: scaleSpace(8),
  }),

  formLabel: t({
    fontFamily: FontFamilies.demi,
    fontSize: FontSizes[16],
    lineHeight: LineHeights[24],
    color: Colors.text.label,
    textTransform: 'uppercase',
    marginBottom: scaleSpace(10),
  }),

  hint: t({
    fontFamily: FontFamilies.medium,
    fontSize: FontSizes[16],
    lineHeight: LineHeights[24],
    color: Colors.text.hint,
  }),

  note: t({
    fontFamily: FontFamilies.demi,
    fontSize: FontSizes[18],
    lineHeight: LineHeights[22],
    color: Colors.brand.primary,
    textAlign: 'left',
    textTransform: 'uppercase',
  }),

  badgeLabel: t({
    fontFamily: FontFamilies.bold,
    fontSize: FontSizes[15],
    lineHeight: LineHeights[16],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  }),

  empty: t({
    fontFamily: FontFamilies.medium,
    fontSize: FontSizes[15],
    lineHeight: LineHeights[22],
    color: Colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: scaleSpace(8),
  }),

  caption: t({
    fontFamily: FontFamilies.medium,
    fontSize: FontSizes[14],
    lineHeight: LineHeights[16],
    color: Colors.text.secondary,
  }),

  captionBold: t({
    fontFamily: FontFamilies.bold,
    fontSize: FontSizes[14],
    lineHeight: LineHeights[16],
    color: Colors.text.primary,
  }),

  button: t({
    fontFamily: FontFamilies.bold,
    fontSize: FontSizes[16],
    lineHeight: LineHeights[22],
  }),

  chip: t({
    fontFamily: FontFamilies.medium,
    fontSize: FontSizes[16],
    lineHeight: LineHeights[22],
    color: Colors.text.secondary,
  }),

  chipSelected: t({
    fontFamily: FontFamilies.demi,
    fontSize: FontSizes[16],
    lineHeight: LineHeights[22],
    color: Colors.text.onDark,
  }),

  option: t({
    fontFamily: FontFamilies.medium,
    fontSize: FontSizes[17],
    lineHeight: LineHeights[24],
    color: Colors.text.onLight,
  }),

  optionSelected: t({
    fontFamily: FontFamilies.demi,
    fontSize: FontSizes[17],
    lineHeight: LineHeights[24],
    color: Colors.text.onLight,
  }),

  snackbar: t({
    fontFamily: FontFamilies.medium,
    fontSize: FontSizes[15],
    lineHeight: LineHeights[22],
    color: Colors.text.onDark,
    textAlign: 'center',
  }),
});