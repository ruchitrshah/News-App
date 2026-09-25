// The only controls an embedded clip gets: tap anywhere to play / pause, and a
// fullscreen toggle in the corner. YouTube's own chrome is switched off.
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Play, Maximize2, Minimize2 } from 'lucide';

import Icon from '../../components/icons/Icon';
import { Colors, Space, Motion, Palette, ColorUtils } from '../../brand';

export default function PlayerControls({ playing, fullscreen, onToggle, onFullscreen }) {
  return (
    <View style={styles.layer} pointerEvents="box-none">
      <Pressable
        style={styles.surface}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause video' : 'Play video'}
      >
        {!playing ? (
          <View style={styles.play}>
            <Icon icon={Play} size={22} strokeWidth={2.2} color={Colors.text.onDark} />
          </View>
        ) : null}
      </Pressable>
      <Pressable
        onPress={onFullscreen}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={fullscreen ? 'Exit full screen' : 'Full screen'}
        style={({ pressed }) => [styles.fs, pressed && { transform: [{ scale: Motion.pressScale }] }]}
      >
        <Icon icon={fullscreen ? Minimize2 : Maximize2} size={16} strokeWidth={2.2} color={Colors.text.onDark} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  surface: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  play: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ColorUtils.rgba(Palette.base.black, 0.5),
  },
  fs: {
    position: 'absolute',
    right: Space[10],
    bottom: Space[10],
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ColorUtils.rgba(Palette.base.black, 0.5),
  },
});
