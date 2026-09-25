import React, { useRef } from 'react';
import { View, StyleSheet, useWindowDimensions, Animated, Text, Platform } from 'react-native';
import { cardSurface } from './card';
import { Colors, Space, Spacing, Radius, Type, FontFamilies, FontSizes, LineHeights } from '../brand';

const SCREEN_MARGIN = Spacing.card.marginX;
const ITEM_ASPECT = 1.25;

export default function Carousal({ photos = [], fullName, location }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const { width: windowWidth } = useWindowDimensions();

  // ✅ Cap the screen width at 600 on web so it doesn't blow past the wrapper
  const screenWidth = Platform.OS === 'web' ? Math.min(windowWidth, 600) : windowWidth;

  // useWindowDimensions can report 0 on the very first paint. Left unguarded
  // that makes CARD_WIDTH negative, and the scroll interpolation below throws
  // "inputRange must be monotonically non-decreasing".
  const CARD_WIDTH = Math.max(1, screenWidth - SCREEN_MARGIN * 2);
  const ITEM_HEIGHT = CARD_WIDTH * ITEM_ASPECT;

  const renderItem = ({ item, index }) => {
    const scale = scrollX.interpolate({
      inputRange: [(index - 1) * CARD_WIDTH, index * CARD_WIDTH, (index + 1) * CARD_WIDTH],
      outputRange: [1.5, 1, 1.5],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.imageWrapper, { width: CARD_WIDTH, height: ITEM_HEIGHT }]}>
        <Animated.Image
          source={{ uri: item.uri }}
          style={[styles.image, { transform: [{ scale }] }]}
        />
        <View style={styles.imageFade} />
      </View>
    );
  };

  return (
    <View style={[styles.outerContainer, { height: ITEM_HEIGHT }]}>
      <Animated.FlatList
        data={photos}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        clipsToBounds={false}
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
        // ✅ Uses the stable identifier resolved in useProfileDerived
        keyExtractor={(item) => item.stableKey || item.uri} // ✅ Use the unique identifier
      />

      <View style={styles.pagination}>
        {photos.length > 1 && photos.map((_, i) => {
          const scale = scrollX.interpolate({
            inputRange: [(i - 1) * CARD_WIDTH, i * CARD_WIDTH, (i + 1) * CARD_WIDTH],
            outputRange: [1, 1.4, 1],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange: [(i - 1) * CARD_WIDTH, i * CARD_WIDTH, (i + 1) * CARD_WIDTH],
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={`dot-${i}`}
              style={[styles.dot, { transform: [{ scale }], opacity }]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    ...cardSurface,
    padding: 0,
    overflow: 'hidden',
    marginTop: Space[16],
    marginHorizontal: SCREEN_MARGIN,
  },
  imageWrapper: { overflow: 'hidden' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageFade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  pagination: {
    position: 'absolute',
    top: Space[20],
    flexDirection: 'row',
    alignSelf: 'center',
    zIndex: 10,
    alignItems: 'center',
    height: Space[10],
  },
  dot: {
    height: Space[6],
    width: Space[6],
    borderRadius: Radius[3],
    backgroundColor: Colors.text.onDark,
    marginHorizontal: Space[4],
  },
  nameOverlay: {
    position: 'absolute',
    bottom: Space[24],
    left: Space[24],
    right: Space[24],
    zIndex: 10,
  },
  nameText: {
    ...Type.pageTitle,
    marginBottom: Space[4],
    color: Colors.text.onDark,
  },
  locationOverlayText: {
    fontFamily: FontFamilies.medium,
    fontSize: FontSizes[16],
    lineHeight: LineHeights[24],
    color: Colors.text.onDark,
    opacity: 0.9,
  },
});