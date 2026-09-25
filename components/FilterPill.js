import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal as RNModal,
  Pressable,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';

import { Radio } from './Radio';
import Button from './Button';
import { Colors, Space, Radius, Type, Motion } from '../brand';
import { useBottomInset } from '../brand/responsive';

// Curve and durations come from the motion tokens so this sheet cannot drift
// away from the rest of the app's timing. See src/brand/Motion.js.
const EASE_OUT = Motion.ease.out;
const DURATION_IN = Motion.duration.enter;
const DURATION_OUT = Motion.duration.exit;

// Until the sheet has measured itself, start it far enough down to be offscreen.
const FALLBACK_TRAVEL = 420;

/**
 * A compact filter control: a pill showing the current selection, opening a
 * floating sheet to change it.
 *
 * Backdrop and sheet are animated separately. RNModal's `animationType="slide"`
 * moves the whole modal as one object, so the dim slides up with the sheet
 * instead of fading in behind it — two things that should be independent,
 * visibly glued together.
 */
export default function FilterPill({
  value,
  onChange,
  options = [],
  title = 'Filter by',
  disabled = false,
}) {
  const [mounted, setMounted] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(0)).current;
  const bottomInset = useBottomInset();

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? title,
    [options, value, title]
  );

  const open = useCallback(() => {
    setMounted(true);
    Animated.timing(anim, {
      toValue: 1,
      duration: DURATION_IN,
      easing: EASE_OUT,
      useNativeDriver: true,
    }).start();
  }, [anim]);

  const close = useCallback(() => {
    Animated.timing(anim, {
      toValue: 0,
      duration: DURATION_OUT,
      easing: EASE_OUT,
      useNativeDriver: true,
    }).start(({ finished }) => {
      // Unmount only once it's actually gone, or the sheet vanishes mid-exit.
      if (finished) setMounted(false);
    });
  }, [anim]);

  const select = useCallback(
    (next) => {
      close();
      // Re-picking the current filter should just dismiss, not re-run the work.
      if (next !== value) onChange?.(next);
    },
    [close, onChange, value]
  );

  // Press feedback: the pill has to feel like it heard the tap.
  const pressTo = useCallback(
    (toValue) => {
      Animated.timing(pressAnim, {
        toValue,
        duration: 140,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    },
    [pressAnim]
  );

  const backdropOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const sheetTranslate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetHeight || FALLBACK_TRAVEL, 0],
  });

  const pillScale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.97],
  });

  return (
    <>
      <Animated.View style={{ transform: [{ scale: pillScale }], alignSelf: 'flex-start' }}>
        <TouchableOpacity
          style={[styles.pill, disabled && styles.pillDisabled]}
          onPress={open}
          onPressIn={() => pressTo(1)}
          onPressOut={() => pressTo(0)}
          disabled={disabled}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel={`${title}: ${selectedLabel}`}
        >
          <Text style={styles.pillText} numberOfLines={1}>
            {selectedLabel}
          </Text>
          <ChevronDown size={16} color={Colors.icon.primary} strokeWidth={2} />
        </TouchableOpacity>
      </Animated.View>

      <RNModal
        visible={mounted}
        transparent
        animationType="none"
        onRequestClose={close}
        statusBarTranslucent
      >
        {/* Fades independently of the sheet's travel. */}
        <Animated.View
          pointerEvents={mounted ? 'auto' : 'none'}
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        <Animated.View
          onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
          style={[
            styles.sheet,
            { marginBottom: bottomInset, transform: [{ translateY: sheetTranslate }] },
          ]}
        >
          <Text style={styles.sheetTitle}>{title}</Text>

          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {options.map((option, i) => {
              const isSelected = option.value === value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.row, i < options.length - 1 && styles.rowDivider]}
                  onPress={() => select(option.value)}
                  activeOpacity={0.6}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>
                    {option.label}
                  </Text>
                  <Radio selected={isSelected} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Button title="Close" variant="primary" onPress={close} />
        </Animated.View>
      </RNModal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[6],
    paddingLeft: Space[16],
    paddingRight: Space[12],
    paddingVertical: Space[8],
    borderRadius: Radius.full ?? 9999,
    backgroundColor: Colors.surface.soft,
  },
  pillDisabled: { opacity: 0.5 },
  pillText: { ...Type.button, color: Colors.text.primary, textTransform: 'none' },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,24,40,0.52)',
    zIndex: 1,
  },

  // Inset on all three sides so it reads as a floating card, not a panel
  // welded to the bottom of the screen.
  sheet: {
    position: 'absolute',
    left: Space[12],
    right: Space[12],
    bottom: 0,
    zIndex: 2,
    maxHeight: '72%',
    backgroundColor: Colors.surface.page,
    borderRadius: 28,
    paddingTop: Space[24],
    paddingHorizontal: Space[20],
    paddingBottom: Space[16],
    gap: Space[12],
    ...StyleSheet.flatten({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 24,
    }),
  },
  sheetTitle: {
    ...Type.cardTitle,
    textAlign: 'center',
  },

  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Space[16],
    gap: Space[16],
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.subtle,
  },
  rowText: { ...Type.option, flex: 1 },
  rowTextSelected: { ...Type.optionSelected },
});
