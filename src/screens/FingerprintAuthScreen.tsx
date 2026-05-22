import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  Animated, Easing, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { T } from '../theme/tokens';
import { useVaultStore } from '../store/vaultStore';
import { AppBackground } from '../components/AppBackground';

// In a real app, import 'react-native-ble-plx' or 'react-native-ble-manager'
// import { BleManager, Device } from 'react-native-ble-plx';
// const bleManager = new BleManager();

export const FingerprintAuthScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { confirmUnlock, lock } = useVaultStore();

  const [status, setStatus] = useState<string>('Connecting to ESP32...');
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);

  // For Demo simulation
  const [demoFailedAttempts, setDemoFailedAttempts] = useState(0);

  const glowAnim = useRef(new Animated.Value(0.1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
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

    // Mock connection
    const connectTimer = setTimeout(() => {
      setStatus('ESP32 Connected. Ready.');
      setDeviceConnected(true);
    }, 2000);

    return () => clearTimeout(connectTimer);
  }, []);

  const sendScanRequest = () => {
    if (!deviceConnected) return;
    setStatus('Scanning fingerprint...');
    setIsScanning(true);

    // MOCK BLE COMMUNICATION (Simulating ESP32 response for demo presentation)
    // In actual implementation: bleManager.writeCharacteristicWithResponseForDevice(...)
  };

  // Demo Handlers (Simulate Hardware Responses)
  const simulateEsp32Response = (responseType: 'GRANTED' | 'DENIED' | 'TEMP_LOCK' | 'PERM_LOCK') => {
    if (responseType === 'GRANTED') {
      setStatus('Access Granted!');
      setTimeout(() => {
        confirmUnlock(); // This transitions to Dashboard
      }, 1000);
    } else if (responseType === 'DENIED') {
      const newAttempts = demoFailedAttempts + 1;
      setDemoFailedAttempts(newAttempts);
      setStatus(`Access Denied! Attempt ${newAttempts}`);
      setIsScanning(false);
      
      if (newAttempts === 3) {
        simulateEsp32Response('TEMP_LOCK');
      } else if (newAttempts >= 6) {
        simulateEsp32Response('PERM_LOCK');
      }
    } else if (responseType === 'TEMP_LOCK') {
      setLockMessage("APP TEMPORARILY LOCKED\nLocked for 5 hours (10s demo)");
      setStatus('Device Locked');
      setIsScanning(false);
      setTimeout(() => {
        setLockMessage(null);
        setStatus('ESP32 Connected. Ready.');
      }, 10000); // 10 sec demo lock
    } else if (responseType === 'PERM_LOCK') {
      setLockMessage("APP PERMANENTLY LOCKED\nPlease contact support.");
      setStatus('Device Locked');
      setIsScanning(false);
      setTimeout(() => {
        setLockMessage(null);
        setStatus('ESP32 Connected. Ready.');
        setDemoFailedAttempts(0);
      }, 5000); // 5 sec demo reset
    }
  };

  const handleCancel = () => {
    lock(); // Completely lock vault again
    navigation.goBack();
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
                shadowOpacity: glowAnim,
                transform: [{ scale: pulseAnim }],
                borderColor: status.includes('Granted') ? T.success : 
                             status.includes('Denied') || status.includes('Locked') ? T.danger : T.cyanA18,
                shadowColor: status.includes('Granted') ? T.success : 
                             status.includes('Denied') || status.includes('Locked') ? T.danger : T.cyan,
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
          ) : !deviceConnected ? (
            <ActivityIndicator color={T.cyan} size="large" />
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

        {/* DEMO CONTROLS (Simulating ESP32 responses directly for presentation) */}
        {isScanning && !lockMessage && (
           <View style={s.demoControls}>
             <Text style={s.demoTitle}>Hardware Simulation (Demo)</Text>
             <View style={s.demoRow}>
               <TouchableOpacity style={[s.demoBtn, { borderColor: T.success }]} onPress={() => simulateEsp32Response('GRANTED')}>
                 <Text style={[s.demoBtnText, { color: T.success }]}>Match</Text>
               </TouchableOpacity>
               <TouchableOpacity style={[s.demoBtn, { borderColor: T.danger }]} onPress={() => simulateEsp32Response('DENIED')}>
                 <Text style={[s.demoBtnText, { color: T.danger }]}>Mismatch</Text>
               </TouchableOpacity>
             </View>
           </View>
        )}

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

  cancelBtn: { marginTop: 40, padding: 12 },
  cancelBtnText: { ...T.fontCaption, color: T.muted },

  demoControls: {
    marginTop: 20, padding: 16, borderRadius: T.rCard,
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: T.border,
    width: '100%', alignItems: 'center'
  },
  demoTitle: { ...T.fontCaption, color: T.faint, marginBottom: 12 },
  demoRow: { flexDirection: 'row', gap: 16 },
  demoBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: T.rPill, borderWidth: 1 },
  demoBtnText: { ...T.fontBody, fontWeight: '700' }
});
