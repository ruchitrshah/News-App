import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { Crown, X } from './AppIcons';

import { supabase } from '../lib/supabase';
import { useProfileStore } from '../store/profileStore';
import { Space, Type, Colors } from '../brand';
import { Button } from '../components'; // ✅ Using existing shared Button

const HERO_IMAGE = require('../../assets/images/PremiumPage.png');
const GOLD = '#C9A84C';

export default function PremiumUpsellModal({ visible, onDismiss }) {
  const { width } = useWindowDimensions();
  const userId = useProfileStore((s) => s.id);
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb && width > 1024;

  const handleJoinWaitlist = async () => {
    if (joined || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('browse_waitlist')
        .upsert(
          { user_id: userId, joined_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
      setJoined(true);
    } catch (e) {
      console.warn('[PremiumUpsellModal] Waitlist join failed:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => (
    <View style={styles.root}>
      <ImageBackground
        source={HERO_IMAGE}
        style={styles.hero}
        resizeMode="cover"
      >
        {/* ✅ Linear Gradient restricted to the bottom portion only */}
        {isWeb ? (
          <>
            <style>{`
              .premium-overlay {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 65%; /* Gradient only covers the bottom text area */
                background: linear-gradient(to bottom, 
                  rgba(13,13,13,0) 0%, 
                  rgba(13,13,13,0.85) 40%, 
                  rgba(13,13,13,1) 100%
                );
                pointer-events: none;
              }
            `}</style>
            <div className="premium-overlay" />
          </>
        ) : (
          /* Native Fallback: A dark container behind the text */
          <View style={styles.nativeTextBackground} />
        )}

        {/* Close button */}
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.closeBtn}
          activeOpacity={0.8}
        
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <X size={20} color="#fff" />
        </TouchableOpacity>

        {/* Text & Fixed Bottom Action Area */}
        <View style={styles.bottomSection}>
          <View style={styles.brandRow}>
            <Crown size={18} color={GOLD} fill={GOLD} />
            <Text style={styles.brandLabel}>Baarat <Text style={styles.brandSuffix}>Browse</Text></Text>
          </View>

          <Text style={[Type.pageTitle, styles.headline]}>
            Find your{'\n'}match faster
          </Text>
          <Text style={[Type.bodySecondary, styles.subhead]}>
            Automate your search. No longer a manual process.
          </Text>

          <View style={styles.buttonWrapper}>
            <Button
              title={joined ? "You're on the waitlist ✓" : "Join the waitlist"}
              onPress={handleJoinWaitlist}
              variant="whiteSolid"
              loading={loading}
              disabled={joined}
            />
          </View>
        </View>
      </ImageBackground>
    </View>
  );

  if (isDesktopWeb) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
        <View style={styles.webDesktopBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onDismiss} />
          <View style={styles.desktopModalBox}>
            {renderContent()}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={isWeb ? "overFullScreen" : "pageSheet"}
      transparent={isWeb}
      onRequestClose={onDismiss}
    >
      {isWeb ? (
        <View style={styles.webMobileWrapper}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onDismiss} />
          <View style={styles.webMobileSheet}>{renderContent()}</View>
        </View>
      ) : (
        renderContent()
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  hero: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  closeBtn: {
    position: 'absolute',
    top: Space[20],
    right: Space[20],
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSection: {
    paddingHorizontal: Space[32],
    paddingBottom: Platform.OS === 'ios' ? Space[48] : Space[32],
    zIndex: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[8],
    marginBottom: Space[16],
  },
  brandLabel: {
    ...Type.formLabel,
    color: GOLD,
    fontSize: 16,
    letterSpacing: 1,
  },
  brandSuffix: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '400',
  },
  headline: {
    color: '#fff',
    fontSize: 42,
    lineHeight: 48,
  },
  subhead: {
    color: 'rgba(255,255,255,0.6)',
    marginBottom: Space[32],
  },
  buttonWrapper: {
    width: '100%',
  },

  // Desktop Web Styles
  webDesktopBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopModalBox: {
    width: 500,
    height: 750,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#000',
  },

  // Mobile Web Styles
  webMobileWrapper: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  webMobileSheet: {
    width: '100%',
    height: '92%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
});