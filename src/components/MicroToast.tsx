import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { T } from '../theme/tokens';

export interface MicroToastHandle {
  show: (message: string) => void;
}

export const MicroToast = forwardRef<MicroToastHandle>((props, ref) => {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useImperativeHandle(ref, () => ({
    show: (msg: string) => {
      setMessage(msg);
      setVisible(true);
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    },
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[s.toast, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
      <Text style={s.text}>{message}</Text>
    </Animated.View>
  );
});

const s = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: '#06d6a0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10,
    elevation: 5,
    zIndex: 9999,
  },
  text: {
    fontFamily: 'Syne', fontWeight: '700', fontSize: 13, color: '#080c10',
  },
});
