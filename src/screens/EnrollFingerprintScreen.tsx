import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  Animated, Easing, ActivityIndicator, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { T } from '../theme/tokens';
import { AppBackground } from '../components/AppBackground';
import { 
  connectToVaultGuard, 
  enrollNewFingerprint, 
  disconnectVaultGuard, 
  VaultGuardEnrollResult 
} from '../services/VaultGuardBLE';

export const EnrollFingerprintScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [status, setStatus] = useState<string>('Connecting to ESP32...');
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

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
          setStatus('ESP32 Connected. Ready to enroll.');
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

  const sendEnrollRequest = async () => {
    if (!deviceConnected) return;
    setStatus('Place your finger on the sensor...');
    setIsEnrolling(true);

    const result: VaultGuardEnrollResult = await enrollNewFingerprint((progress: string) => {
      // Show live progress from ESP32 on screen
      setStatus(progress);
    });
    
    if (result === 'ENROLLED') {
      setStatus('Enrollment Successful! ✅');
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } else if (result === 'ENROLL_FAIL') {
      setStatus('Enrollment Failed. Try again.');
      setIsEnrolling(false);
    } else if (result === 'TIMEOUT') {
      setStatus('Enrollment Timeout. Please try again.');
      setIsEnrolling(false);
    } else {
      setStatus('Error occurred during enrollment.');
      setIsEnrolling(false);
    }
  };

  const handleCancel = () => {
    disconnectVaultGuard();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={s.container}>
      <AppBackground />
      <View style={s.inner}>
        <View style={s.header}>
          <Text style={s.title}>Register Fingerprint</Text>
          <Text style={s.subtitle}>Add a new fingerprint to your hardware module</Text>
        </View>

        <View style={s.fingerprintContainer}>
          <Animated.View 
            style={[
              s.pulseRing, 
              { 
                opacity: glowAnim,
                transform: [{ scale: pulseAnim }],
                borderColor: status.includes('Successful') ? T.success : 
                             status.includes('Failed') || status.includes('Timeout') ? T.danger : T.cyanA18,
              }
            ]} 
          />
          <View style={s.hexOuter}>
            <View style={[
              s.hexInner,
              {
                backgroundColor: status.includes('Successful') ? T.successA14 : 
                               status.includes('Failed') || status.includes('Timeout') ? T.dangerA14 : T.cyanA08
              }
            ]}>
              <Text style={s.icon}>
                {status.includes('Successful') ? '✅' : 
                 status.includes('Failed') ? '❌' : '👆'}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.statusBox}>
          {deviceConnected && !isEnrolling && !status.includes('Successful') ? (
            <TouchableOpacity style={s.scanBtn} onPress={sendEnrollRequest}>
              <Text style={s.scanBtnText}>Start Enrollment</Text>
            </TouchableOpacity>
          ) : !deviceConnected && status.includes('Connecting') ? (
            <ActivityIndicator color={T.cyan} size="large" />
          ) : !deviceConnected && status.includes('Failed') ? (
            <TouchableOpacity style={s.scanBtn} onPress={() => {
              setStatus('Connecting to ESP32...');
              connectToVaultGuard().then(connected => {
                if (connected) {
                  setStatus('ESP32 Connected. Ready to enroll.');
                  setDeviceConnected(true);
                } else {
                  setStatus('Failed to connect to VaultGuard.');
                }
              });
            }}>
              <Text style={s.scanBtnText}>Retry Connection</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={[
            s.statusText,
            status.includes('Successful') && { color: T.success },
            (status.includes('Failed') || status.includes('Timeout')) && { color: T.danger }
          ]}>
            {status}
          </Text>
        </View>

        <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
          <Text style={s.cancelBtnText}>{isEnrolling ? 'Cancel Enrollment' : 'Back'}</Text>
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
  subtitle: { ...T.fontBody, color: T.muted, textAlign: 'center', paddingHorizontal: 20 },
  
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

  statusBox: { height: 80, alignItems: 'center', justifyContent: 'center', width: '100%', paddingHorizontal: 20 },
  statusText: { ...T.fontBody, color: T.cyan, fontSize: 16, marginTop: 16, textAlign: 'center' },

  scanBtn: {
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.4)',
    borderRadius: T.rPill,
    paddingHorizontal: 32, paddingVertical: 14,
  },
  scanBtnText: { ...T.fontBody, color: T.cyan, fontWeight: '800' },

  cancelBtn: { marginTop: 40, padding: 12 },
  cancelBtnText: { ...T.fontCaption, color: T.muted },
});
