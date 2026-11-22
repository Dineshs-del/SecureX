import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Switch,
} from 'react-native';
import Svg, { Path, Circle, Line, Polyline } from 'react-native-svg';
import { useVaultStore } from '../store/vaultStore';
import { AppBackground } from '../components/AppBackground';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';

// Vector Icons
const ShieldCheckIcon = ({ size = 28, color = '#5EEAD4' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EyeIcon = ({ size = 20, color = '#A3B1C2' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EyeOffIcon = ({ size = 20, color = '#A3B1C2' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1={1} y1={1} x2={23} y2={23} stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const CheckIcon = ({ size = 16, color = '#5EEAD4' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const XIcon = ({ size = 16, color = '#FB7185' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1={18} y1={6} x2={6} y2={18} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    <Line x1={6} y1={6} x2={18} y2={18} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
  </Svg>
);

const AlertTriangleIcon = ({ size = 20, color = '#FBBF24' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1={12} y1={9} x2={12} y2={13} stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1={12} y1={17} x2={12.01} y2={17} stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const FingerprintIcon = ({ size = 20, color = '#5EEAD4' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.81 3.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M15 5v0a8 8 0 0 0-12 7v3a2 2 0 0 0 2 2h1" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M18 9a9 9 0 0 1 .91 4.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M12 2v2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M17 17l.5.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M12 14v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const SetupScreen: React.FC = () => {
  const { setup, isLoading } = useVaultStore();
  const toastRef = useRef<MicroToastHandle>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [enableBiometrics, setEnableBiometrics] = useState(true);



  // Validation checks (relaxed for easy custom passwords)
  const hasMinLength = password.length >= 4;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const allRulesMet = hasMinLength && passwordsMatch;

  // Strength score (0 to 4)
  let score = 0;
  if (password.length >= 4) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) || /[0-9]/.test(password)) score++;
  if (password.length >= 12) score++;

  const strengthLabel =
    score <= 1 ? 'Weak' : score === 2 ? 'Okay' : score === 3 ? 'Strong' : 'Very strong';
  const strengthColor =
    score <= 1 ? '#FB7185' : score === 2 ? '#FBBF24' : '#5EEAD4';

  const handleCreateVault = async () => {
    if (!allRulesMet) {
      toastRef.current?.show('Please enter at least 4 characters and ensure passwords match', 'error');
      return;
    }
    try {
      const success = await setup(password, enableBiometrics);
      if (success) {
        toastRef.current?.show('SecureX Vault created successfully!', 'success');
      } else {
        toastRef.current?.show('Failed to create vault', 'error');
      }
    } catch {
      toastRef.current?.show('Error initializing vault', 'error');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E13" />
      <AppBackground />

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Top row */}
        <View style={s.topRow}>
          <View style={s.shieldIconWrap}>
            <ShieldCheckIcon size={28} color="#67E8F9" />
          </View>
          <View style={s.topTitles}>
            <Text style={s.smallCapsWelcome}>WELCOME TO SECUREX</Text>
            <Text style={s.mainTitle}>Create your master password</Text>
          </View>
        </View>

        {/* 2. Subtitle sentence */}
        <Text style={s.subtitleText}>
          This one password unlocks everything. It never leaves this phone, and nobody can reset it for you.
        </Text>

        {/* 3. Glass Card with Master Password & Confirm Password */}
        <View style={s.glassCard}>
          <View style={s.inputBlock}>
            <Text style={s.fieldLabel}>MASTER PASSWORD</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.textInput}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter master password..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={s.eyeBtn}
                onPress={() => setShowPassword((p) => !p)}
                activeOpacity={0.7}
              >
                {showPassword ? <EyeOffIcon size={20} color="#A3B1C2" /> : <EyeIcon size={20} color="#A3B1C2" />}
              </TouchableOpacity>
            </View>
          </View>

          <View style={[s.inputBlock, { marginTop: 16 }]}>
            <Text style={s.fieldLabel}>CONFIRM PASSWORD</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.textInput}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter master password..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        {/* 4. Four-segment strength bar */}
        <View style={s.strengthContainer}>
          <View style={s.segmentsRow}>
            {[1, 2, 3, 4].map((idx) => {
              const filled = score >= idx;
              return (
                <View
                  key={idx}
                  style={[
                    s.segmentItem,
                    {
                      backgroundColor: filled ? strengthColor : 'rgba(255,255,255,0.12)',
                    },
                  ]}
                />
              );
            })}
          </View>
          <Text style={[s.strengthLabelText, { color: strengthColor }]}>
            {strengthLabel}
          </Text>
        </View>

        {/* 5. Requirement rules card */}
        <View style={s.glassCard}>
          <View style={s.ruleRow}>
            {hasMinLength ? <CheckIcon size={16} color="#5EEAD4" /> : <XIcon size={16} color="rgba(255,255,255,0.3)" />}
            <Text style={[s.ruleText, hasMinLength && s.ruleTextPassed]}>At least 4 characters</Text>
          </View>
          <View style={s.ruleDivider} />
          <View style={s.ruleRow}>
            {passwordsMatch ? <CheckIcon size={16} color="#5EEAD4" /> : <XIcon size={16} color="rgba(255,255,255,0.3)" />}
            <Text style={[s.ruleText, passwordsMatch && s.ruleTextPassed]}>Passwords match</Text>
          </View>
        </View>

        {/* 6. Amber warning card */}
        <View style={s.warningCard}>
          <AlertTriangleIcon size={20} color="#FBBF24" />
          <Text style={s.warningText}>
            If you lose this password, your vault cannot be recovered. Store it safely.
          </Text>
        </View>

        {/* 7. Biometric toggle row */}
        <View style={s.glassCardRow}>
          <View style={s.biometricLeft}>
            <View style={s.bioIconWrap}>
              <FingerprintIcon size={20} color="#5EEAD4" />
            </View>
            <View>
              <Text style={s.bioTitle}>Enable biometric unlock</Text>
              <Text style={s.bioSub}>Use fingerprint or Face ID for quick access</Text>
            </View>
          </View>
          <Switch
            value={enableBiometrics}
            onValueChange={setEnableBiometrics}
            trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#5EEAD4' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* 8. Primary action button */}
        <TouchableOpacity
          style={[s.primaryButton, !allRulesMet && s.btnDisabled]}
          activeOpacity={0.85}
          disabled={!allRulesMet || isLoading}
          onPress={handleCreateVault}
        >
          {isLoading ? (
            <ActivityIndicator color="#0A0E13" />
          ) : (
            <Text style={s.primaryButtonText}>Create vault</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <MicroToast ref={toastRef} />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E13',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 48,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  shieldIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(103, 232, 249, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(103, 232, 249, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  topTitles: {
    flex: 1,
  },
  smallCapsWelcome: {
    fontSize: 12,
    fontWeight: '700',
    color: '#67E8F9',
    letterSpacing: 1.8,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.78,
  },
  subtitleText: {
    fontSize: 14,
    color: '#A3B1C2',
    lineHeight: 20,
    marginBottom: 24,
  },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    marginBottom: 16,
  },
  inputBlock: {},
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    height: 52,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  eyeBtn: {
    padding: 6,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  segmentsRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 6,
    marginRight: 16,
  },
  segmentItem: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  strengthLabelText: {
    fontSize: 13,
    fontWeight: '700',
    width: 90,
    textAlign: 'right',
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  ruleDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 10,
  },
  ruleText: {
    fontSize: 14,
    color: '#A3B1C2',
    fontWeight: '500',
  },
  ruleTextPassed: {
    color: '#FFFFFF',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#FCD34D',
    lineHeight: 18,
    fontWeight: '500',
  },
  glassCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    marginBottom: 24,
  },
  biometricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    marginRight: 12,
  },
  bioIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(94, 234, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bioSub: {
    fontSize: 12,
    color: '#A3B1C2',
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A0E13',
  },
});
