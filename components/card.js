import { Colors } from '../brand/Colors';
import { Space, Spacing } from '../brand/Spacing';
import { Radii } from '../brand/Radii';

export const cardSurface = {
  backgroundColor: Colors.surface.card,
  marginHorizontal: Spacing.card.marginX,
  marginTop: Space[15],
  borderRadius: Radii.card.default,

  // shadowColor: Colors.shadow.color,
  // shadowOffset: { width: 0, height: 10 },
  // shadowOpacity: 0.06,
  // shadowRadius: 20,

  elevation: 2,
  overflow: 'hidden',
};
