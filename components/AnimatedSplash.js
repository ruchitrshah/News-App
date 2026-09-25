import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';


const config = {
  particleCount: 72,
  trailSpan: 0.42,
  durationMs: 3000,           // ← increased from 5200
  rotationDurationMs: 28000,
  pulseDurationMs: 4600,
  strokeWidth: 1.6,
  orbitRadius: 7,
  detailAmplitude: 2.7,
  petalCount: 5,
  curveScale: 2,
};

function calculatePoint(progress, detailScale) {
  const t = progress * Math.PI * 2;
  const k = config.petalCount;
  const r = config.orbitRadius - config.detailAmplitude * detailScale * Math.cos(k * t);
  return {
    x: 50 + Math.cos(t) * r * config.curveScale,
    y: 50 + Math.sin(t) * r * config.curveScale,
  };
}

function normalizeProgress(progress) {
  return ((progress % 1) + 1) % 1;
}

function getDetailScale(time) {
  const pulseProgress = (time % config.pulseDurationMs) / config.pulseDurationMs;
  const pulseAngle = pulseProgress * Math.PI * 2;
  return 0.52 + ((Math.sin(pulseAngle + 0.55) + 1) / 2) * 0.48;
}

function getRotation(time) {
  return -((time % config.rotationDurationMs) / config.rotationDurationMs) * 360;
}

function buildPath(detailScale, steps = 120) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const point = calculatePoint(i / steps, detailScale);
    points.push(`${i === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
  }
  return points.join(' ');
}

export default function AnimatedSplash({ onFinish }) {
  const { width: windowWidth } = useWindowDimensions();
  const svgSize = Math.min(windowWidth * 0.72, 420);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const animationFrame = useRef(null);
  const startTime = useRef(Date.now());

  const [particles, setParticles] = useState([]);
  const [pathD, setPathD] = useState('');
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const time = now - startTime.current;
      const progress = (time % config.durationMs) / config.durationMs;
      const detailScale = getDetailScale(time);

      setRotation(getRotation(time));
      setPathD(buildPath(detailScale));

      const updatedParticles = [];
      for (let i = 0; i < config.particleCount; i++) {
        const tailOffset = i / (config.particleCount - 1);
        const point = calculatePoint(
          normalizeProgress(progress - tailOffset * config.trailSpan),
          detailScale
        );
        const fade = Math.pow(1 - tailOffset, 0.56);
        updatedParticles.push({
          x: point.x,
          y: point.y,
          r: 0.4 + fade * 1.4,   // ← was 0.9 + fade * 2.7
          opacity: 0.04 + fade * 0.96,
        });
      }

      setParticles(updatedParticles);
      animationFrame.current = requestAnimationFrame(animate);
    };

    animationFrame.current = requestAnimationFrame(animate);

    // 7200ms visible + 800ms fade = 8000ms total
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) onFinish();
      });
    }, 2200);

    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      clearTimeout(timer);
    };
  }, [fadeAnim, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.svgWrapper, { width: svgSize, height: svgSize }]}>
        <Svg width={svgSize} height={svgSize} viewBox="0 0 100 100">
          <G rotation={rotation} origin="50, 50">
            <Path
              d={pathD}
              stroke="rgba(188, 132, 50, 0.2)"
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {particles.map((p, i) => (
              <Circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill={i % 3 === 0 ? "#D09E4D" : "#BC8432"}
                opacity={p.opacity}
              />
            ))}
          </G>
        </Svg>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#030F24',  // ← dark green background
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  svgWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});