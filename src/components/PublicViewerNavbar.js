import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Colors, Space, Radius } from '../brand';

export const NAVBAR_HEIGHT = Platform.OS === 'web' ? 72 : 64;

// expo-blur has no blur on Android without the Dimezis backend, so a BlurView
// there is just a translucent panel that scroll content shows through.
// Match TabBar/Footer and paint an opaque surface instead.
function HeaderSurface({ children }) {
  if (Platform.OS === 'android') {
    return (
      <View style={[styles.headerBlur, styles.androidSurface]}>{children}</View>
    );
  }
  return (
    <BlurView intensity={90} tint="light" style={styles.headerBlur}>
      {children}
    </BlurView>
  );
}
const WEBSITE_URL = 'https://www.joinbaarat.com';

export default function PublicViewerNavbar() {
  const handleOpenWebsite = async () => {
    try {
      if (Platform.OS === 'web') {
        window.location.assign(WEBSITE_URL);
      } else {
        await Linking.openURL(WEBSITE_URL);
      }
    } catch (err) {
      console.error('[Navbar] Failed to open website:', err);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <HeaderSurface>
          <View style={styles.headerBackground} pointerEvents="none" />
          <View style={styles.headerContainer}>
            <View style={styles.headerInner}>
              <TouchableOpacity
                onPress={handleOpenWebsite}
                activeOpacity={0.8}
                style={styles.headerLogo}
              >
                <Text style={styles.headerTitle}>Baarat</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.headerDivider} pointerEvents="none" />
        </HeaderSurface>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 0,
    zIndex: 9999, // ✅ FIXED: Forces the wrapper above the ScrollView
    elevation: 9999, 
  },
  header: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: NAVBAR_HEIGHT,
    zIndex: 9999, // ✅ Match the wrapper's high z-index
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
      web: { boxShadow: '0 1px 10px rgba(0,0,0,0.05)' },
    }),
  },
  headerBlur: { flex: 1, width: '100%' },
  androidSurface: { backgroundColor: 'rgba(255,255,255,0.97)' },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  headerContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
    paddingHorizontal: Space[24],
  },
  headerInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLogo: { flexShrink: 0 },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'MaisonNeue-Bold',
    letterSpacing: -0.8,
    color: Colors.text.primary,
  },
  headerDivider: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
});