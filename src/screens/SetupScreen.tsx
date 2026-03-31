import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, Animated, Easing,
  StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useVaultStore, getPasswordStrength } from '../store/vaultStore';
import { AppBackground } from '../components/AppBackground';
import { T } from '../theme/tokens';

export const SetupScreen: React.FC = () => {
  const { setup, isLoading, error } = useVaultStore();
  const [step, setStep] = useState<'intro' | 'create'>('intro');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // ── Animations ──
  const a1 = useRef(new Animated.Value(0)).current; 
  const a2 = useRef(new Animated.Value(0)).current;
  const a3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (a: Animated.Value, d: number) =>
      Animated.timing(a, { toValue: 1, duration: 500, delay: d, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    
    a1.setValue(0); a2.setValue(0); a3.setValue(0);
    Animated.parallel([anim(a1, 0), anim(a2, 100), anim(a3, 200)]).start();
  }, [step]);

  const entrance = (a: Animated.Value) => ({
    opacity: a,
    transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }]
  });

  const strengthTag = getPasswordStrength(password);
  const strengthColor = password ? (strengthTag === 'strong' ? T.success : T.warning) : T.faint;
  const strengthLabel = password ? strengthTag.charAt(0).toUpperCase() + strengthTag.slice(1) : 'Enter password';
  const strengthPct = password ? (strengthTag === 'strong' ? 95 : strengthTag === 'fair' ? 60 : 25) : 0;

  const handleSetup = async () => {
    if (password.length < 8) {
      Alert.alert('Security Policy', 'Your master password must be at least 8 characters long.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Match Error', 'Passwords do not match. Please re-enter.');
      return;
    }
    await setup(password);
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AppBackground />

      <KeyboardAvoidingView 
        style={s.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {step === 'intro' ? (
          <View style={s.intro}>
            <Animated.View style={[s.shieldContainer, entrance(a1)]}>
               <View style={s.hexOuter}>
                 <View style={s.hexInner}>
                    <Text style={s.shieldIcon}>🛡️</Text>
                 </View>
               </View>
            </Animated.View>

            <Animated.View style={[s.textCenter, entrance(a2)]}>
              <Text style={s.brandHeader}>SECUREX</Text>
              <Text style={s.introTitle}>Your Passwords,{"\n"}Safe with AI Pride</Text>
              <Text style={s.introSubtitle}>
                Intelligent vaulting, AI-driven breach detection{"\n"}and auto-hardening in one secure experience.
              </Text>
            </Animated.View>

            <Animated.View style={[s.ctaSection, entrance(a3)]}>
              <TouchableOpacity style={s.primaryCta} onPress={() => setStep('create')} activeOpacity={0.85}>
                <Text style={s.primaryCtaText}>Get Started</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        ) : (
          <View style={s.setupCardContainer}>
            <Animated.View style={[s.headerArea, entrance(a1)]}>
              <Text style={s.setupTitle}>Create Master Key</Text>
              <Text style={s.setupSubtitle}>
                This key unlocks your entire vault. If lost, your data cannot be recovered. Choose wisely.
              </Text>
            </Animated.View>

            <Animated.View style={[s.card, entrance(a2)]}>
              <View style={s.topHL} />
              
              <Text style={s.label}>MASTER PASSWORD</Text>
              <View style={[s.inputRow, isFocused && s.inputFocused]}>
                <TextInput
                  style={s.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter a strong key"
                  placeholderTextColor={T.faint}
                  secureTextEntry={!show}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShow(s => !s)} style={s.eyeBtn} activeOpacity={0.7}>
                  <Text style={s.eyeEmoji}>{show ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              {password ? (
                <View style={s.strengthRow}>
                  <View style={s.strengthTrack}><View style={[s.strengthFill, { width: `${strengthPct}%`, backgroundColor: strengthColor }]} /></View>
                  <Text style={[s.strengthLabel, { color: strengthColor }]}>{strengthLabel}</Text>
                </View>
              ) : null}

              <Text style={[s.label, { marginTop: 24 }]}>CONFIRM PASSWORD</Text>
              <TextInput
                style={s.inputSolo}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Repeat your password"
                placeholderTextColor={T.faint}
                secureTextEntry={!show}
                autoCapitalize="none"
              />

              {error ? <Text style={s.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[s.button, isLoading && s.buttonDisabled]}
                onPress={handleSetup}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={T.white} />
                ) : (
                  <Text style={s.buttonText}>🛡️ Create Vault</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[s.footer, entrance(a3)]}>
              <Text style={s.footerText}>Locked with military-grade AES-256</Text>
            </Animated.View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content:   { flex: 1 },
  intro:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: T.pad },

  shieldContainer: { marginBottom: 40 },
  hexOuter: {
    width: 140, height: 140, borderRadius: 32,
    backgroundColor: T.glass, borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
    ...T.shadowCard,
  },
  hexInner: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: T.cyanA08,
    alignItems: 'center', justifyContent: 'center',
  },
  shieldIcon: { fontSize: 40 },

  textCenter:  { alignItems: 'center', marginBottom: 60 },
  brandHeader: { ...T.fontLabel, color: T.muted, marginBottom: 12 },
  introTitle:  { ...T.fontHero, textAlign: 'center', lineHeight: 40 },
  introSubtitle: {
    ...T.fontCaption, color: T.muted,
    marginTop: 18, textAlign: 'center', lineHeight: 22,
    fontWeight: '500',
  },

  ctaSection: { width: '100%' },
  primaryCta: {
    backgroundColor: T.cyan,
    borderRadius: T.rPill,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: T.cyan, shadowOpacity: 0.4, shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 }, elevation: 12,
  },
  primaryCtaText: { ...T.fontBody, color: T.bg, fontWeight: '900', letterSpacing: 1 },

  // Setup Step
  setupCardContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: T.pad },
  headerArea:         { alignItems: 'center', marginBottom: 32 },
  setupTitle:         { ...T.fontHero, fontSize: 28 },
  setupSubtitle:      { ...T.fontCaption, color: T.muted, textAlign: 'center', marginTop: 10, lineHeight: 20 },

  card: {
    backgroundColor: T.glass, borderRadius: T.rCard,
    padding: 24, borderWidth: 1, borderColor: T.border,
    overflow: 'hidden', ...T.shadowCard,
  },
  topHL: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: T.borderTop },

  label: { ...T.fontLabel, color: T.muted, marginBottom: 8, fontSize: 10 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12, borderWidth: 1, borderColor: T.border,
    paddingHorizontal: 16, height: 54,
  },
  inputFocused: { borderColor: T.cyanA70 },
  input:        { flex: 1, ...T.fontBody, color: T.white },
  eyeEmoji:     { fontSize: 18 },
  eyeBtn:       { padding: 8 },

  strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 },
  strengthTrack: { flex: 1, height: 4, backgroundColor: T.border, borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: 4, borderRadius: 2 },
  strengthLabel: { ...T.fontCaption, fontSize: 11, fontWeight: '700', minWidth: 40 },

  inputSolo: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12, borderWidth: 1, borderColor: T.border,
    paddingHorizontal: 16, height: 54, ...T.fontBody, color: T.white,
  },
  errorText: { ...T.fontCaption, color: T.danger, marginTop: 14, textAlign: 'center' },
  button: {
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderWidth: 1, borderColor: T.cyanA70,
    borderRadius: T.rPill, paddingVertical: 16,
    alignItems: 'center', marginTop: 32,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText:     { ...T.fontBody, color: T.cyan, fontWeight: '800' },

  footer:     { marginTop: 40, alignItems: 'center' },
  footerText: { ...T.fontCaption, color: T.muted, fontSize: 11 },
});

