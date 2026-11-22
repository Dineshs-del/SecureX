import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Vibration,
  BackHandler,
  AppState,
  AppStateStatus,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { useVaultStore } from '../store/vaultStore';
import { AppBackground } from '../components/AppBackground';
import { T } from '../theme/tokens';

const rnBiometrics = new ReactNativeBiometrics();

const LOCK_UNTIL_KEY = 'securex_lockout_until';
const USER_NAME_KEY = '@securex_user_name';

// Vector SVG Icons
const FingerprintIcon = ({ size = 68, color = '#FFFFFF', strokeWidth = 1.4 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="M14 13.12c0 2.38-.2 4.41-.44 6.88" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="M8 11a4 4 0 0 1 8 0c0 2.65-.29 5.38-.65 8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="M6 10a6 6 0 0 1 12 0c0 3.32-.38 6.64-.86 9.9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="M4 10a8 8 0 0 1 15.66-2.28" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

const LockIcon = ({ size = 20, color = 'rgba(255,255,255,0.42)' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EyeIcon = ({ size = 20, color = 'rgba(255,255,255,0.42)' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EyeOffIcon = ({ size = 20, color = 'rgba(255,255,255,0.42)' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M1 1l22 22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const UnlockScreen: React.FC = () => {
  const { verifyPassword, unlockWithBiometrics, isBiometricEnabled } = useVaultStore();

  const [userName, setUserName] = useState<string>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lockout state
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<any>(null);
  const isPromptingRef = useRef(false);

  // Time-based greeting helper
  const getGreeting = (name?: string) => {
    const hour = new Date().getHours();
    let timeStr = 'Good evening';
    if (hour >= 5 && hour < 12) timeStr = 'Good morning';
    else if (hour >= 12 && hour < 17) timeStr = 'Good afternoon';

    if (name && name.trim().length > 0) {
      const firstName = name.trim().split(' ')[0];
      return `${timeStr}, ${firstName}`;
    }
    return 'Welcome back';
  };

  // Exit app on Back press from UnlockScreen
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });
    return () => backHandler.remove();
  }, []);

  // Lockout countdown manager
  useEffect(() => {
    if (lockoutSeconds > 0) {
      timerRef.current = setInterval(() => {
        setLockoutSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            AsyncStorage.removeItem(LOCK_UNTIL_KEY);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lockoutSeconds]);

  const triggerBiometricUnlock = useCallback(async () => {
    if (lockoutSeconds > 0 || isPromptingRef.current) return;
    isPromptingRef.current = true;
    try {
      const success = await unlockWithBiometrics();
      if (success) {
        setPassword('');
        setErrorMessage(null);
      }
    } catch {
    } finally {
      isPromptingRef.current = false;
    }
  }, [unlockWithBiometrics, lockoutSeconds]);

  // Read stored user name, lockout state, and biometric preference on mount
  useEffect(() => {
    const initScreenState = async () => {
      try {
        const name = await AsyncStorage.getItem(USER_NAME_KEY);
        if (name) setUserName(name);

        let isCurrentlyLockedOut = false;
        const lockUntilStr = await AsyncStorage.getItem(LOCK_UNTIL_KEY);
        if (lockUntilStr) {
          const lockUntil = parseInt(lockUntilStr, 10);
          const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
          if (remaining > 0) {
            setLockoutSeconds(remaining);
            isCurrentlyLockedOut = true;
          } else {
            await AsyncStorage.removeItem(LOCK_UNTIL_KEY);
          }
        }

        const bioEnabled = await isBiometricEnabled();
        const sensor = await rnBiometrics.isSensorAvailable();
        if (bioEnabled && sensor.available) {
          setBiometricAvailable(true);
          if (!isCurrentlyLockedOut) {
            if (!isPromptingRef.current) {
              isPromptingRef.current = true;
              try {
                const success = await unlockWithBiometrics();
                if (success) {
                  setPassword('');
                  setErrorMessage(null);
                }
              } catch {
              } finally {
                isPromptingRef.current = false;
              }
            }
          }
        } else {
          setBiometricAvailable(false);
        }
      } catch {}
    };

    initScreenState();

    // Subtle pulsing animation for fingerprint orb
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [isBiometricEnabled, pulseAnim, unlockWithBiometrics]);

  // Clear memory when screen loses focus or backgrounds
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        setPassword('');
        setErrorMessage(null);
      }
    });
    return () => subscription.remove();
  }, []);

  const triggerShake = () => {
    Vibration.vibrate(50);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handlePasswordUnlock = async () => {
    if (lockoutSeconds > 0 || isAuthenticating || !password.trim()) return;

    setIsAuthenticating(true);
    setErrorMessage(null);

    // Run key derivation off UI thread using setTimeout to render ActivityIndicator first
    setTimeout(async () => {
      try {
        const isValid = await verifyPassword(password);
        if (isValid) {
          setPassword('');
          setIsAuthenticating(false);
        } else {
          triggerShake();
          setPassword('');
          setIsAuthenticating(false);

          const lockUntilStr = await AsyncStorage.getItem(LOCK_UNTIL_KEY);
          if (lockUntilStr) {
            const remaining = Math.ceil((parseInt(lockUntilStr, 10) - Date.now()) / 1000);
            if (remaining > 0) {
              setLockoutSeconds(remaining);
            }
          }
          const storeErr = useVaultStore.getState().error;
          setErrorMessage(storeErr || 'Wrong password. Try again.');
        }
      } catch {
        triggerShake();
        setPassword('');
        setIsAuthenticating(false);
        setErrorMessage('Verification failed. Try again.');
      }
    }, 20);
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isLockedOut = lockoutSeconds > 0;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080c10" />
      <AppBackground />

      <KeyboardAvoidingView
        style={s.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.content}>
          {/* Top Header Block */}
          <View style={s.topHeader}>
            <Text style={s.greetingText} maxFontSizeMultiplier={1.3}>
              {getGreeting(userName)}
            </Text>
            <Text style={s.heroTitle} maxFontSizeMultiplier={1.3}>
              Your vault is locked
            </Text>
          </View>

          {/* Middle Biometric Fingerprint Section */}
          {biometricAvailable ? (
            <View style={s.middleSection}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={triggerBiometricUnlock}
                accessibilityLabel="Unlock with fingerprint"
                accessibilityRole="button"
                disabled={isLockedOut}
              >
                <Animated.View style={[s.orbOuterContainer, { transform: [{ scale: pulseAnim }] }]}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.26)', 'rgba(255,255,255,0.06)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.orbInnerGlass}
                  >
                    <FingerprintIcon size={68} color="#FFFFFF" strokeWidth={1.4} />
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
              <Text style={s.orbCaption} maxFontSizeMultiplier={1.3}>
                Touch the sensor to unlock
              </Text>
            </View>
          ) : (
            <View style={s.middleFallback}>
              <Text style={s.fallbackNote} maxFontSizeMultiplier={1.3}>
                Biometrics unavailable. Enter master password.
              </Text>
            </View>
          )}

          {/* Bottom Password Block */}
          <View style={s.bottomBlock}>
            <Text style={s.inputLabel} maxFontSizeMultiplier={1.3}>
              MASTER PASSWORD
            </Text>

            <Animated.View
              style={[
                s.inputPillContainer,
                isFocused && s.inputPillFocused,
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              <View style={s.inputIconLeft}>
                <LockIcon size={20} color={isFocused ? T.cyan : 'rgba(255,255,255,0.42)'} />
              </View>

              <TextInput
                ref={inputRef}
                style={s.textInput}
                placeholder="Enter master password"
                placeholderTextColor="rgba(255,255,255,0.28)"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                importantForAutofill="no"
                contextMenuHidden={true}
                maxFontSizeMultiplier={1.3}
                returnKeyType="done"
                onSubmitEditing={handlePasswordUnlock}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                editable={!isLockedOut && !isAuthenticating}
              />

              <TouchableOpacity
                style={s.eyeButton}
                activeOpacity={0.7}
                onPress={() => setShowPassword(!showPassword)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                {showPassword ? (
                  <EyeOffIcon size={20} color="rgba(255,255,255,0.60)" />
                ) : (
                  <EyeIcon size={20} color="rgba(255,255,255,0.42)" />
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Error or Lockout Message */}
            {errorMessage ? (
              <Text
                style={s.errorText}
                maxFontSizeMultiplier={1.3}
                accessibilityLiveRegion="polite"
              >
                {errorMessage}
              </Text>
            ) : null}

            {/* Unlock Button */}
            <TouchableOpacity
              style={[
                s.unlockButton,
                (isLockedOut || isAuthenticating || !password.trim()) && s.buttonDisabled,
              ]}
              activeOpacity={0.85}
              onPress={handlePasswordUnlock}
              disabled={isLockedOut || isAuthenticating || !password.trim()}
              accessibilityLabel={isLockedOut ? `Try again in ${formatTime(lockoutSeconds)}` : 'Unlock vault'}
              accessibilityRole="button"
            >
              {isAuthenticating ? (
                <ActivityIndicator color="#080c10" size="small" />
              ) : (
                <Text style={s.unlockButtonText} maxFontSizeMultiplier={1.3}>
                  {isLockedOut ? `Try again in ${formatTime(lockoutSeconds)}` : 'Unlock vault'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Footer Text */}
            <Text style={s.footerText} maxFontSizeMultiplier={1.3}>
              5 wrong attempts add a delay. Your data never leaves this phone.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080c10',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },
  topHeader: {
    alignItems: 'center',
    marginTop: 64,
  },
  greetingText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.70)',
    marginBottom: 6,
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.96,
    textAlign: 'center',
  },
  middleSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  middleFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 32,
  },
  fallbackNote: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.50)',
    textAlign: 'center',
  },
  orbOuterContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0,229,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  orbInnerGlass: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  orbCaption: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
  },
  bottomBlock: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.42)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  inputPillContainer: {
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  inputPillFocused: {
    borderColor: 'rgba(0,229,255,0.60)',
    shadowColor: '#00e5ff',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  inputIconLeft: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 8,
    marginLeft: 8,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ff4d6d',
    marginBottom: 12,
    textAlign: 'center',
  },
  unlockButton: {
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  unlockButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#080c10',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.42)',
    textAlign: 'center',
    lineHeight: 18,
  },
});
