import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View, Platform } from 'react-native';
import { CheckCircle2, Info, AlertCircle } from './AppIcons';
import { Colors, Space, Radius, Type } from '../brand';

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    backgroundColor: Colors.surface.snackbar || '#1A1A1A',
  },
  info: {
    icon: Info,
    backgroundColor: Colors.surface.snackbar || '#1A1A1A',
  },
  error: {
    icon: AlertCircle,
    backgroundColor: '#B91C1C',
  },
};

export default function Snackbar({
  visible,
  message,
  onDismiss,
  duration = 2500,
  variant = 'success',   // 'success' | 'info' | 'error'
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  const { icon: Icon, backgroundColor } = VARIANTS[variant] ?? VARIANTS.success;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => hide(), duration);
      return () => clearTimeout(timer);
    } else {
      opacity.setValue(0);
      translateY.setValue(20);
    }
  }, [visible]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 10,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss?.());
  };

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.content,
          { opacity, transform: [{ translateY }], backgroundColor },
        ]}
      >
        <View style={styles.inner}>
          <Icon size={20} color={Colors.text.onDark} style={styles.icon} />
          <Text style={styles.text}>{message}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 40 : 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    paddingHorizontal: Space[20],
    paddingVertical: Space[14],
    borderRadius: Radius.full || 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 12 },
      web: { boxShadow: '0 8px 24px rgba(0,0,0,0.2)' },
    }),
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: Space[12],
  },
  text: {
    ...Type.snackbar,
    lineHeight: undefined,
  },
});