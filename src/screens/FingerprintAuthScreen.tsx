import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  Animated, Easing, ActivityIndicator, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { T } from '../theme/tokens';
import { useVaultStore } from '../store/vaultStore';
import { AppBackground } from '../components/AppBackground';
import { 
  connectToVaultGuard, 
  requestVaultGuardAuth, 
  disconnectVaultGuard, 
  VaultGuardAuthResult 
} from '../services/VaultGuardBLE';

export const FingerprintAuthScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { confirmUnlock, lock } = useVaultStore();

  const [status, setStatus] = useState<string>('Connecting to ESP32...');
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);

  const glowAnim = useRef(new Animated.Value(0.1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.2,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse scale
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Actual BLE connection
    let isMounted = true;
    const initBLE = async () => {
      const connected = await connectToVaultGuard();
      if (isMounted) {
        if (connected) {
          setStatus('ESP32 Connected. Ready.');
          setDeviceConnected(true);
        } else {
          setStatus('Failed to connect to VaultGuard.');
          Alert.alert('Connection Failed', 'Make sure your ESP32 is powered on and near the device.');
        }
      }
    };

    initBLE();

    return () => {
      isMounted = false;
      disconnectVaultGuard();
    };
  }, []);

  const sendScanRequest = async () => {
    if (!deviceConnected) return;
    setStatus('Scanning fingerprint...');
    setIsScanning(true);
    setLockMessage(null);

    const result: VaultGuardAuthResult = await requestVaultGuardAuth();
    
    if (result === 'GRANTED') {
      setStatus('Access Granted!');
      setTimeout(() => {
        confirmUnlock(); // Transitions to Dashboard
      }, 1000);
    } else if (result === 'DENIED') {
      setStatus('Access Denied! Fingerprint not recognized.');
      setIsScanning(false);
    } else if (result === 'LOCKED_TEMP') {
      setLockMessage("APP TEMPORARILY LOCKED\nToo many failed attempts.");
      setStatus('Device Locked');
      setIsScanning(false);
    } else if (result === 'LOCKED_PERM' || result === 'LOCKED') {
      setLockMessage("APP PERMANENTLY LOCKED\nPlease contact support or use Master Password.");
      setStatus('Device Locked');
      setIsScanning(false);
    } else if (result === 'TIMEOUT') {
      setStatus('Scan Timeout. Please try again.');
      setIsScanning(false);
    } else if (result === 'NOT_FOUND') {
      setStatus('Device disconnected or error occurred.');
      setDeviceConnected(false);
      setIsScanning(false);
    }
  };

  const handleCancel = () => {
    disconnectVaultGuard();
    lock(); // Completely lock vault again
    navigation.goBack();
  };

  const handleSkip = () => {
    disconnectVaultGuard();
    confirmUnlock(); // Unlock the vault and proceed to Dashboard
  };

  return (
    <SafeAreaView style={s.container}>
      <AppBackground />
      <View style={s.inner}>
        <View style={s.header}>
          <Text style={s.title}>Hardware Security</Text>
          <Text style={s.subtitle}>Place your finger on the ESP32 module</Text>
        </View>

        <View style={s.fingerprintContainer}>
          <Animated.View 
            style={[
              s.pulseRing, 
              { 
                opacity: glowAnim,
                transform: [{ scale: pulseAnim }],
                borderColor: status.includes('Granted') ? T.success : 
                             status.includes('Denied') || status.includes('Locked') ? T.danger : T.cyanA18,
              }
            ]} 
          />
          <View style={s.hexOuter}>
            <View style={[
              s.hexInner,
              {
                backgroundColor: status.includes('Granted') ? T.successA14 : 
                               status.includes('Denied') || status.includes('Locked') ? T.dangerA14 : T.cyanA08
              }
            ]}>
              <Text style={s.icon}>
                {status.includes('Granted') ? '✅' : 
                 status.includes('Denied') ? '❌' : 
                 status.includes('Locked') ? '🔒' : '👆'}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.statusBox}>
          {deviceConnected && !isScanning && !status.includes('Granted') && !lockMessage ? (
            <TouchableOpacity style={s.scanBtn} onPress={sendScanRequest}>
              <Text style={s.scanBtnText}>Request Scan</Text>
            </TouchableOpacity>
          ) : !deviceConnected && status.includes('Connecting') ? (
            <ActivityIndicator color={T.cyan} size="large" />
          ) : !deviceConnected && status.includes('Failed') ? (
            <TouchableOpacity style={s.scanBtn} onPress={() => {
              setStatus('Connecting to ESP32...');
              connectToVaultGuard().then(connected => {
                if (connected) {
                  setStatus('ESP32 Connected. Ready.');
                  setDeviceConnected(true);
                } else {
                  setStatus('Failed to connect to VaultGuard.');
                }
              });
            }}>
              <Text style={s.scanBtnText}>Retry Connection</Text>
            </TouchableOpacity>
          ) : null}

          {lockMessage ? (
            <Text style={s.lockText}>{lockMessage}</Text>
          ) : (
            <Text style={[
              s.statusText,
              status.includes('Granted') && { color: T.success },
              status.includes('Denied') && { color: T.danger }
            ]}>
              {status}
            </Text>
          )}
        </View>

        {/* Skip Hardware Auth — for when no fingerprint is enrolled */}
        <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
          <Text style={s.skipBtnText}>Skip → Use Password Only</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
          <Text style={s.cancelBtnText}>Cancel & Lock</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  inner: { flex: 1, padding: T.pad, alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 60 },
  title: { ...T.fontHero, fontSize: 28, marginBottom: 8, textAlign: 'center' },
  subtitle: { ...T.fontBody, color: T.muted, textAlign: 'center' },
  
  fingerprintContainer: { alignItems: 'center', justifyContent: 'center', width: 200, height: 200, marginBottom: 40 },
  pulseRing: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    borderWidth: 2,
    shadowRadius: 30, shadowOffset: { width: 0, height: 0 },
  },
  hexOuter: {
    width: 120, height: 120, borderRadius: 30,
    backgroundColor: T.glass, borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
    ...T.shadowCard,
  },
  hexInner: {
    width: 80, height: 80, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 40 },

  statusBox: { height: 80, alignItems: 'center', justifyContent: 'center', width: '100%' },
  statusText: { ...T.fontBody, color: T.cyan, fontSize: 16, marginTop: 16, textAlign: 'center' },
  lockText: { ...T.fontBody, color: T.danger, fontSize: 16, textAlign: 'center', fontWeight: 'bold' },

  scanBtn: {
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.4)',
    borderRadius: T.rPill,
    paddingHorizontal: 32, paddingVertical: 14,
  },
  scanBtnText: { ...T.fontBody, color: T.cyan, fontWeight: '800' },

  skipBtn: {
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: T.rPill,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  skipBtnText: { ...T.fontBody, color: T.muted, fontWeight: '600', fontSize: 14 },

  cancelBtn: { marginTop: 16, padding: 12 },
  cancelBtnText: { ...T.fontCaption, color: T.muted },
});
