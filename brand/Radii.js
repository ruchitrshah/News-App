// src/brand/Radii.js
// Radius tokens (dp)

const freeze = (obj) => Object.freeze(obj);

export const Radius = freeze({
  0: 0,
  3: 3,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  18: 18,
  22: 22,
  24: 24,
  50: 50,
  full: 9999, // pill/circle
});

export const Radii = freeze({
  control: freeze({
    sm: Radius[10],
    md: Radius[12],
    pill: Radius.full,
  }),

  card: freeze({
    default: Radius[24],
  }),

  badge: freeze({
    pill: Radius.full,
  }),

  avatar: freeze({
    circle: Radius.full,
  }),
});
