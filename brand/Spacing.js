// src/brand/Spacing.js
// Spacing tokens (dp). Keep primitives stable; add semantics only when repeated.

const freeze = (obj) => Object.freeze(obj);

export const Space = freeze({
  0: 0,
  2: 2,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  14: 14,
  15: 15,
  16: 16,
  18: 18,
  20: 20,
  24: 24,
  28: 28,
  30: 30,
  32: 32,
  36: 36,
  40: 40,
  44: 44,
  48: 48,
  52: 52,
  56: 56,
  64: 64,
});

export const Spacing = freeze({
  screen: freeze({
    paddingX: Space[24],
    paddingTop: Space[20],
    paddingBottom: Space[24],

    // Breathing room under a screen header, applied ON TOP OF the safe-area
    // top inset that SafeAreaView/SafeScreen already supplies.
    //
    // Deliberately NOT platform-branched. This replaced a per-platform
    // ternary (iOS 10 / Android 20) across 27 screens, written back when
    // Android reported a zero top inset. Android has been
    // edge-to-edge by default since Expo SDK 54, so it now reports the status
    // bar height exactly like iOS and the extra 10dp double-counted.
    //
    // The inset is the platform's job; the design spacing on top of it is the
    // same on every platform. Change this one value, not 27 call sites.
    headerTop: Space[10],
  }),

  card: freeze({
    marginX: Space[16],
    marginTop: Space[16],
    paddingX: Space[16],
    paddingY: Space[16],
  }),

  control: freeze({
    heightSm: Space[40],
    heightMd: Space[52],
    heightLg: Space[56],
    paddingX: Space[16],
    paddingY: Space[12],
  }),

  chip: freeze({
    paddingX: Space[16],
    paddingY: Space[10],
    gap: Space[8],
  }),

  list: freeze({
    rowGap: Space[16],
    sectionGap: Space[24],
    dividerInsetX: Space[24],
  }),

  badge: freeze({
    paddingX: Space[10],
    paddingY: Space[6],
    gap: Space[8],
  }),  
});

