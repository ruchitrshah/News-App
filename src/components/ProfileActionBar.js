import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Settings as SettingsIcon } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from './Button';
import { Colors, Space } from '../brand';

// Measured from this component's own styles, not guessed:
//   blur.paddingTop  Space[14]  = 14
//   Button minHeight Space[52]  = 52
//   blur.paddingBottom          = max(insets.bottom, 20) + 14
// so the bar is 80 + max(insets.bottom, 20) tall — the SAME formula on iOS and
// Android. The old `ACTION_BAR_HEIGHT = ios ? 110 : 90` split was fiction.
const ACTION_BAR_CHROME = Space[14] + Space[52] + Space[14]; // 80

/**
 * Extra breathing room between the last content and the top of the bar.
 *
 * 82 is not arbitrary: it reproduces the approved iOS spacing exactly.
 * Previously iOS resolved to 110 + 52 + insets.bottom(34) = 196 against a real
 * bar height of 114, i.e. 82dp of clearance — while Android got only 62dp.
 * Expressing it as (real height + fixed clearance) keeps iOS pixel-identical
 * and gives every other device that same 82dp instead of 20dp less.
 */
export const ACTION_BAR_CLEARANCE = Space[52] + Space[30]; // 82

/**
 * Real rendered height of the action bar on this device.
 *
 * The old `ACTION_BAR_HEIGHT` constant claimed iOS 110 / Android 90, but the
 * bar pads itself by `max(insets.bottom, 20) + 14` on both platforms — the
 * split was fiction, and it left Android content 20dp short of clearing it.
 */
export function useActionBarHeight() {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'web') return ACTION_BAR_CHROME + Space[24];
  return ACTION_BAR_CHROME + Math.max(insets.bottom, Space[20]);
}

// ✅ BlurView falls back to a solid/backdrop-blur View on web
function ActionBarWrapper({ style, children, paddingBottom }) {
  if (Platform.OS === 'web') {
    return (
      <View style={[style, styles.webFallback, { paddingBottom }]}>
        {children}
      </View>
    );
  }
  if (Platform.OS === 'android') {
    return (
      <View style={[style, styles.androidSurface, { paddingBottom }]}>
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={80}
      tint="light"
      style={[style, { paddingBottom }]}
    >
      {children}
    </BlurView>
  );
}

export default function ProfileActionBar({
  navigation,
  viewMode = 'owner',
  onShare,
  onError,           // ✅ optional: bubble errors up to parent Snackbar
  fullName = '',
  shareLink = '',
  primaryCta = 'Create Your Own Profile',
  showSettings = true,
}) {
  const insets = useSafeAreaInsets();

  const paddingBottom = Platform.OS === 'web'
    ? Space[24]
    : Math.max(insets.bottom, 20) + 14;

  // ✅ No Alert.alert on web — use onError callback if provided
  const showError = (message) => {
    if (onError) {
      onError(message);
      return;
    }
    if (Platform.OS === 'web') {
      console.warn('[ActionBar]', message);
    } else {
      Alert.alert('Error', message);
    }
  };

  const handleShare = async () => {
    // ✅ If caller passes a custom share handler, use it
    if (onShare) {
      await onShare();
      return;
    }

    if (!shareLink) {
      showError('No share link available');
      return;
    }

    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Share.share({
          message: fullName
            ? `Check out ${fullName}'s profile on Baarat`
            : `Check out this Profile on Baarat`,
          url: shareLink,
          title: fullName ? `${fullName}'s Profile` : 'Baarat Profile',
        });
      } else {
        // ✅ Web: use navigator.share if available, else copy to clipboard
        if (navigator?.share) {
          await navigator.share({
            title: fullName ? `${fullName}'s Profile on Baarat` : 'Baarat Profile',
            text: fullName
              ? `Check out ${fullName}'s profile on Baarat`
              : `Check out this Profile on Baarat`,
            url: shareLink,
          });
        } else {
          await Clipboard.setStringAsync(shareLink);
          if (onError) {
            onError('Link copied to clipboard!');  // reuse snackbar for success too
          }
        }
      }
    } catch (err) {
      // navigator.share throws if user cancels — don't treat as error
      if (err?.name !== 'AbortError') {
        console.error('[Share] Error:', err);
        // Fallback: copy to clipboard silently
        try {
          await Clipboard.setStringAsync(shareLink);
        } catch (_) {}
      }
    }
  };

  return (
    <View style={styles.wrapper}>
      <ActionBarWrapper
        style={styles.blur}
        paddingBottom={paddingBottom}
      >
        <View style={[styles.tint, { pointerEvents: 'none' }]} />
        <View style={styles.topLine} pointerEvents="none" />

        <View style={styles.row}>
          <View style={styles.mainAction}>
            <Button title={primaryCta} onPress={handleShare} />
          </View>

          {!!showSettings && (
            <TouchableOpacity
              style={styles.settingsWrap}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <View style={styles.settingsTint} pointerEvents="none" />
              <View style={styles.settingsRim} pointerEvents="none" />
              <SettingsIcon size={22} color={Colors.icon.primary} />
            </TouchableOpacity>
          )}
        </View>
      </ActionBarWrapper>
    </View>
  );
}

const SETTINGS_SIZE = 56;

const styles = StyleSheet.create({
  wrapper: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: { elevation: 20 },
      web: {
        boxShadow: '0 -6px 24px rgba(0,0,0,0.08)',
      },
    }),
  },

  blur: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingHorizontal: Space[24],
    paddingTop: Space[14],
  },

  // ✅ Web fallback: solid background + CSS backdrop blur
  androidSurface: { backgroundColor: 'rgba(255,255,255,0.97)' },
  webFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)', // Safari
  },

  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },

  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0.75,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  mainAction: { flex: 1 },

  settingsWrap: {
    width: SETTINGS_SIZE,
    height: SETTINGS_SIZE,
    borderRadius: SETTINGS_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Space[12],
  },

  settingsTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  settingsRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: SETTINGS_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
  },
});