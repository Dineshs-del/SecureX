import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface MicroToastHandle {
  show: (message: string, type?: ToastType) => void;
}

export const MicroToast = forwardRef<MicroToastHandle>((props, ref) => {
  const [message, setMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('success');
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useImperativeHandle(ref, () => ({
    show: (msg: string, type: ToastType = 'success') => {
      setMessage(msg);
      setToastType(type);
      setVisible(true);
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    },
  }));

  if (!visible) return null;

  const getBgColor = () => {
    switch (toastType) {
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#06b6d4';
      default: return '#06d6a0';
    }
  };

  const getTextColor = () => {
    return toastType === 'error' ? '#ffffff' : '#080c10';
  };

  return (
    <Animated.View style={[s.toast, { backgroundColor: getBgColor(), opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
      <Text style={[s.text, { color: getTextColor() }]}>{message}</Text>
    </Animated.View>
  );
});

const s = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10,
    elevation: 5,
    zIndex: 9999,
  },
  text: {
    fontFamily: 'Syne', fontWeight: '700', fontSize: 13,
  },
});

