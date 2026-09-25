// src/brand/Motion.js
//
// Motion tokens. Every animation in the app reads its curve and duration from
// here for the same reason colours come from Colors.js: two screens that pick
// their own timing drift apart, and the drift is what makes an app feel
// assembled rather than designed.
//
// The rules encoded below:
//
//   · Custom curves only. The stock easings are too weak to read as
//     intentional — they lack the punch at the start where the eye is.
//   · UI motion stays under 300ms. A 215ms sheet feels more responsive than a
//     400ms one, and the difference is not subtle.
//   · Exit is faster than enter. The system should answer faster than it
//     announces; a dismissal the user already decided on should not be
//     narrated back to them.
//   · Never ease-in on UI. It delays the first frames, which is exactly the
//     moment the user is watching.
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Easing } from 'react-native';

export const Motion = {
  ease: {
    // Entering / exiting — fastest at the start, so the response feels instant.
    out: Easing.bezier(0.23, 1, 0.32, 1),
    // Moving or morphing on screen — accelerates and decelerates naturally.
    inOut: Easing.bezier(0.77, 0, 0.175, 1),
    // iOS drawer curve (Ionic). Long, low tail — good for sheets that track a
    // finger.
    drawer: Easing.bezier(0.32, 0.72, 0, 1),
  },

  duration: {
    pressIn: 120,   // Touch feedback has to beat the user's own perception.
    pressOut: 160,
    micro: 170,     // Icon swaps, badge changes, small crossfades.
    enter: 215,     // The house enter duration. Sheets, cards, screens.
    exit: 170,      // Deliberately quicker than `enter`.
  },

  spring: {
    // A small overshoot — for things that should feel like they arrived.
    pop: { stiffness: 320, damping: 18, mass: 0.85 },
    // No perceptible overshoot — for things settling into place.
    settle: { stiffness: 240, damping: 22, mass: 0.9 },
  },

  // Press feedback. Subtle on purpose: below 0.95 the button looks like it is
  // being squashed rather than pressed.
  pressScale: 0.97,
};

export default Motion;

// ── Reduced motion ─────────────────────────────────────────────────────────
//
// "Reduce motion" is not "no motion". Opacity and colour still carry meaning
// and stay; what goes is travel — the sliding, the scaling, anything that moves
// a thing across the screen. A user who has asked for this should still see
// that one profile became another.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => {
        if (active) setReduced(!!value);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (value) => setReduced(!!value)
    );

    return () => {
      active = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}
