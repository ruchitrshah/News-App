// The one icon primitive for the news feed. Every icon is a morphicons
// MorphIcon fed lucide icon *data*, so any icon can spring into any other by
// changing the `icon` prop — play → pause, bookmark → bookmark-check, etc.
import React from 'react';
import { MorphIcon } from 'morphicons/react-native';

export default function Icon({
  icon,
  size = 22,
  color = '#FFFFFF',
  strokeWidth = 1.9,
  spring = 'snappy',
  label,
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
      {...rest}
    />
  );
}
