// src/brand/Feed.js
//
// Semantic tokens for the news feed, mapped straight onto the house light
// system in Colors.js — white surfaces, near-black text, navy primary, gold
// accent. Feed components read from here so the surface can be retuned in one
// place without touching the shared Colors module.
import { Palette, Colors, ColorUtils, HobbyColors } from './Colors';

const freeze = (obj) => Object.freeze(obj);

export const FeedColors = freeze({
  page: Colors.surface.page,
  card: Colors.surface.subtle,
  cardRaised: Colors.surface.card,

  text: freeze({
    primary: Colors.text.primary,
    secondary: Colors.text.secondary,
    tertiary: Colors.text.tertiary,
    muted: Colors.text.muted,
  }),

  hairline: Colors.border.subtle,
  glass: Colors.surface.soft,
  glassStrong: ColorUtils.rgba(Palette.base.white, 0.9),
  scrim: ColorUtils.rgba(Palette.base.white, 0.88),

  // Market direction — the house duotone strokes, readable on white.
  up: HobbyColors.green.stroke,
  upSoft: ColorUtils.rgba(HobbyColors.green.stroke, 0.1),
  down: Palette.status.danger,
  downSoft: Palette.status.dangerSoft,
  flat: Colors.text.tertiary,
  flatSoft: Colors.surface.soft,

  // The feed's one accent: the house ink. Selected pill, progress, icons.
  accent: Colors.text.primary,
  accentSoft: Colors.surface.soft,

  // Over footage: captions and the scrim that keeps them legible.
  video: freeze({
    background: Palette.neutral[900],
    scrim: ColorUtils.rgba(Palette.base.black, 0.72),
    caption: Palette.base.white,
    captionShadow: ColorUtils.rgba(Palette.base.black, 0.45),
  }),

  nav: freeze({
    active: Colors.brand.primary,
    activeForeground: Colors.brand.onPrimary,
  }),
});
