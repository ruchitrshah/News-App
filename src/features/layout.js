// Geometry of the home screen, per the lo-fi: pill rail, then one rounded
// video card inset from the screen edges, with the voice bar floating inside
// the card's bottom edge. The card, captions, voice bar and toast all read
// from here so they stay aligned.
import { Space, Radius } from '../brand';
import { useBottomInset } from '../brand/responsive';

export const CARD = Object.freeze({
  marginX: Space[18],
  radius: Radius[18],
  // Voice bar / captions inset from the card's own edges.
  innerX: Space[20],
  innerBottom: Space[24],
});

export const BAR_HEIGHT = Space[52];

// Card's gap from the screen bottom: clears the home indicator / nav bar
// without leaving a slab of white under the card on devices with none.
export function useCardBottom() {
  const inset = useBottomInset(0);
  return Math.max(Space[18], Math.round(inset / 2));
}

// Distance from the card bottom to the top of the voice bar — captions and
// the toast sit just above this.
export const BAR_TOP_IN_CARD = CARD.innerBottom + BAR_HEIGHT;
