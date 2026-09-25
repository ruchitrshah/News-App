// Web twin of Icon.js. morphicons' React Native binding animates through
// `setNativeProps`, which react-native-svg's web renderer ignores — icons
// would render one state behind. On web we use morphicons' DOM binding, which
// drives a real <svg> directly. Same props, same icon data.
import React from 'react';
import { MorphIcon } from 'morphicons/react';

export default function Icon({
  icon,
  size = 22,
  color = '#FFFFFF',
  strokeWidth = 1.9,
  spring = 'snappy',
  label,
  style,
  ...rest
}) {
  return (
    <MorphIcon
      icon={icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth
      spring={spring}
      reducedMotion="user"
      label={label}
      // Positioned so it paints above absolutely-positioned siblings (the
      // Glass layers); a static <svg> would be painted underneath them.
      style={{ display: 'block', flexShrink: 0, position: 'relative' }}
    />
  );
}
