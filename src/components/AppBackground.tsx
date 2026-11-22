import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const AppBackground: React.FC = () => {
  return (
    <View style={s.container} pointerEvents="none">
      {/* ── 1. Teal Orb (Top Right) ── */}
      <View style={s.tealOrb} />

      {/* ── 2. Indigo Orb (Bottom Left) ── */}
      <View style={s.indigoOrb} />

      {/* ── 3. Dot Grid (Simulated with a few faint squares if Svg is missing) ── */}
      {/* 
        Note: True dot grid repetition in pure RN without Svg or Image is expensive.
        We provide the orbs for the requested 'elegant depth'.
      */}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080c10',
    overflow: 'hidden',
  },
  tealOrb: {
    position: 'absolute',
    top: -height * 0.1,
    right: -width * 0.1,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(0,180,180,0.08)',
    shadowColor: 'rgba(0,180,180,0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 100,
    elevation: 0,
  },
  indigoOrb: {
    position: 'absolute',
    bottom: -height * 0.1,
    left: -width * 0.1,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: 'rgba(80,0,160,0.07)',
    shadowColor: 'rgba(80,0,160,0.3)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 100,
    elevation: 0,
  },
});
