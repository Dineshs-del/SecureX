import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, StatusBar,
  Animated, Easing, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Keychain from 'react-native-keychain';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { useVaultStore } from '../store/vaultStore';
import { AppBackground } from '../components/AppBackground';
import { T } from '../theme/tokens';
import { useRoute } from '@react-navigation/native';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';

const rnBiometrics = new ReactNativeBiometrics();

export const UnlockScreen: React.FC = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const route = useRoute<any>();
  const { unlock, unlockWithBiometrics, isBiometricEnabled, isLoading, error } = useVaultStore();

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isLockout, setIsLockout] = useState(false);
  
  const inputRef = useRef<TextInput>(null);
  const toastRef = useRef<MicroToastHandle>(null);

  const msg = route.params?.message;

  // ── Staggered fade+slide animations ──
  const a1 = useRef(new Animated.Value(0)).current; // lock icon
  const a2 = useRef(new Animated.Value(0)).current; // title
  const a3 = useRef(new Animated.Value(0)).current; // card
  const a4 = useRef(new Animated.Value(0)).current; // footer
  
  // ── Lock ring pulse (glow intensity only) ──
  const glowAnim = useRef(new Animated.Value(0.2)).current; // 0.2 → 0.4

  // ── Unlock Button Press State ──
  const [isBtnPressed, setIsBtnPressed] = useState(false);

  useEffect(() => {
    const stagger = (anim: Animated.Value, delay: number) =>
      Animated.timing(anim, {
        toValue: 1, duration: 480, delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });

    Animated.parallel([
      stagger(a1, 0), stagger(a2, 100), stagger(a3, 200), stagger(a4, 300),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.4, duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.2, duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [a1, a2, a3, a4, glowAnim]);

  const animStyle = (a: Animated.Value) => ({
    opacity: a,
    transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  });

  const tryBiometric = useCallback(async () => {
    try {
      const { available } = await rnBiometrics.isSensorAvailable();
      if (!available) {
        setBiometricEnabled(false);
        return;
      }

      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: 'Confirm your identity to unlock',
        cancelButtonText: 'Use password',
      });

      if (success) {
        const unlockRes = await unlockWithBiometrics();
        if (!unlockRes) {
          inputRef.current?.focus();
        }
      } else {
        // user cancelled or failed — focus password input
        inputRef.current?.focus();
      }
    } catch (e) {
      inputRef.current?.focus();
    }
  }, [unlockWithBiometrics]);

  useEffect(() => {
    const initBiometric = async () => {
      const enabled = await isBiometricEnabled();
      setBiometricEnabled(enabled);
      if (enabled) {
        setTimeout(tryBiometric, 600);
      }
    };
    initBiometric();
  }, [isBiometricEnabled, tryBiometric]);

  const handleUnlock = async () => {
    if (!password) return;
    await unlock(password);
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* ── Static Background ── */}
      <AppBackground />

      <KeyboardAvoidingView 
        style={s.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.inner}>
          
          {/* ── 1. Lock Visual ── */}
          <Animated.View style={[s.lockSection, animStyle(a1)]}>
            {/* Pulsing ring - opacity only */}
            <Animated.View style={[s.pulseRing, { shadowOpacity: glowAnim }]} />
            <View style={s.hexOuter}>
              <View style={s.hexInner}>
                <Text style={s.lockEmoji}>🔒</Text>
              </View>
            </View>
          </Animated.View>

          {/* ── 2. Title ── */}
          <Animated.View style={[s.titleSection, animStyle(a2)]}>
            <Text style={s.mainTitle}>Vault Locked</Text>
            <Text style={[s.subtitle, msg && { color: T.cyan, opacity: 1, fontWeight: '600' }]}>
              {msg || 'Enter your master password'}
            </Text>
          </Animated.View>

          {/* ── 3. Input Card ── */}
          <Animated.View style={[s.card, animStyle(a3)]}>
            <View style={s.topHL} />
            
            {/* Password Input */}
            <View style={[
              s.inputRow, 
              isFocused && s.inputRowFocused
            ]}>
              <TextInput
                ref={inputRef}
                style={s.input}
                placeholder="Master password"
                placeholderTextColor={T.faint}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleUnlock}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn} activeOpacity={0.7}>
                <Text style={s.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error ? <Text style={s.errorText}>{error}</Text> : null}

            {/* Unlock Button */}
            <TouchableOpacity
              style={[
                s.unlockBtn, 
                isBtnPressed && s.unlockBtnPressed,
                isLoading && s.btnDisabled
              ]}
              onPress={handleUnlock}
              onPressIn={() => setIsBtnPressed(true)}
              onPressOut={() => setIsBtnPressed(false)}
              disabled={isLoading}
              activeOpacity={1} // custom press state
            >
              {isLoading
                ? <ActivityIndicator color={T.cyan} />
                : <Text style={s.unlockBtnText}>Unlock Vault</Text>
              }
            </TouchableOpacity>

            {/* Biometric Button */}
            {biometricEnabled && !isLockout && (
              <TouchableOpacity style={s.biometricBtn} onPress={tryBiometric} activeOpacity={0.75}>
                <Text style={s.biometricIcon}>👆</Text>
                <Text style={s.biometricText}>Biometric Unlock</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* ── 4. Footer ── */}
          <Animated.View style={[s.footerSection, animStyle(a4)]}>
            <Text style={s.footerText}>Protected with AES-256 encryption</Text>
          </Animated.View>

        </View>
      </KeyboardAvoidingView>
      <MicroToast ref={toastRef} />
    </SafeAreaView>
  );
};

// ─── Styles ─────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  content: { flex: 1, paddingHorizontal: T.pad },
  inner:   { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Lock
  lockSection: { alignItems: 'center', justifyContent: 'center', marginBottom: 28, width: 140, height: 140 },
  pulseRing: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    borderWidth: 1.5, borderColor: T.cyanA18,
    shadowColor: T.cyan, shadowRadius: 24, shadowOffset: { width: 0, height: 0 },
    // opacity animates 0.2 -> 0.4
  },
  hexOuter: {
    width: 104, height: 104, borderRadius: 24,
    backgroundColor: T.glass, borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
    ...T.shadowCard,
  },
  hexInner: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: T.cyanA08,
    alignItems: 'center', justifyContent: 'center',
  },
  lockEmoji: { fontSize: 32 },

  // Title
  titleSection: { alignItems: 'center', marginBottom: 32 },
  mainTitle:    { ...T.fontHero, fontSize: 30, letterSpacing: 0 },
  subtitle:     { ...T.fontCaption, color: T.muted, marginTop: 8, fontSize: 13 },

  // Glass Card
  card: {
    width: '100%',
    backgroundColor: T.glass,
    borderRadius: T.rCard,
    padding: T.pad,
    borderWidth: 1, borderColor: T.border,
    overflow: 'hidden',
    ...T.shadowCard,
  },
  topHL: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: T.borderTop },

  // Input
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: T.rChip,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 16,
    height: 54,
  },
  inputRowFocused: {
    borderColor: 'rgba(0,229,255,0.35)',
  },
  input: {
    flex: 1, height: '100%',
    fontSize: 16, color: T.white, fontWeight: '500',
  },
  eyeBtn:  { paddingHorizontal: 8, paddingVertical: 12, marginRight: -8 },
  eyeText: { fontSize: 18 },

  // Error
  errorText: { ...T.fontCaption, fontSize: 12, color: T.danger, marginTop: 12, textAlign: 'center' },

  // Unlock BTN
  unlockBtn: {
    marginTop: 20,
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.4)',
    borderRadius: T.rPill,
    height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  unlockBtnPressed: {
    backgroundColor: 'rgba(0,229,255,0.15)',
  },
  btnDisabled: { opacity: 0.5 },
  unlockBtnText: { ...T.fontBody, color: T.cyan, fontWeight: '800' },

  // Biometric
  biometricBtn: {
    marginTop: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 48,
    borderRadius: T.rPill,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  biometricIcon: { fontSize: 18, marginRight: 8 },
  biometricText: { ...T.fontCaption, color: T.muted },

  // Footer
  footerSection: { marginTop: 32 },
  footerText:    { ...T.fontCaption, fontSize: 11, color: T.muted, textAlign: 'center' },
});
