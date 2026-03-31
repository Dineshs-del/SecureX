import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Animated, Easing, StatusBar, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { BottomNav } from '../components/BottomNav';
import { T } from '../theme/tokens';
import { AppBackground } from '../components/AppBackground';
import { useVaultStore } from '../store/vaultStore';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';

// Custom toggle switch for Settings
const CustomToggle: React.FC<{ value: boolean; onValueChange: () => void; activeColor: string }> = ({ value, onValueChange, activeColor }) => {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const thumbPos = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });
  const trackBg  = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.15)', T.cyanA70] // T.cyanA70 per spec for ON state
  });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onValueChange}>
      <Animated.View style={[ts.track, { backgroundColor: trackBg }]}>
        <Animated.View style={[
          ts.thumb,
          { transform: [{ translateX: thumbPos }] },
          value && { shadowColor: activeColor, shadowOpacity: 0.6, shadowRadius: 6 },
        ]} />
      </Animated.View>
    </TouchableOpacity>
  );
};
const ts = StyleSheet.create({
  track: { width: 44, height: 24, borderRadius: 12, justifyContent: 'center' },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: T.white, position: 'absolute' },
});

// Row types
interface SettingRow {
  emoji: string;
  iconBg: string;
  accentColor: string;
  title: string;
  desc: string;
  type: 'nav' | 'toggle';
  toggleKey?: string;
}

const VAULT_ROWS: SettingRow[] = [
  { emoji: '📤', iconBg: T.successA14,       accentColor: T.success,   title: 'Export Vault',           desc: 'Download an encrypted backup',      type: 'nav' },
  { emoji: '🌙', iconBg: 'rgba(0,229,255,0.12)', accentColor: T.cyan, title: 'Dark Mode', desc: 'Always on — pure dark theme', type: 'toggle', toggleKey: 'darkmode' },
];

const ABOUT_ROWS: SettingRow[] = [
  { emoji: 'ℹ️', iconBg: T.glass,            accentColor: T.faint,     title: 'User Guide',             desc: 'Learn how to use SecureX safely',   type: 'nav' },
];

const Row: React.FC<{
  row: SettingRow;
  toggleValue?: boolean;
  onToggle?: () => void;
  onPress?: () => void;
}> = ({ row, toggleValue, onToggle, onPress }) => (
  <View style={s.cardWrap}>
    <TouchableOpacity
      style={s.card}
      onPress={row.type === 'nav' ? onPress : undefined}
      activeOpacity={0.82}
    >
      <View style={s.topHL} />
      <View style={[s.accentBar, { backgroundColor: row.accentColor }]} />
      <View style={[s.cardIcon, { backgroundColor: row.iconBg }]}>
        <Text style={s.cardEmoji}>{row.emoji}</Text>
      </View>
      <View style={s.cardText}>
        <Text style={s.cardTitle}>{row.title}</Text>
        <Text style={s.cardDesc}>{row.desc}</Text>
      </View>

      {row.type === 'toggle' ? (
        <CustomToggle value={!!toggleValue} onValueChange={onToggle!} activeColor={row.accentColor} />
      ) : (
        <Text style={s.chevron}>›</Text>
      )}
    </TouchableOpacity>
  </View>
);

const rnBiometrics = new ReactNativeBiometrics();

// ─── Main Screen ────────────────────────────────────────
export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { 
    isBiometricEnabled, setBiometricEnabled,
    isAutoLockEnabled, setAutoLockEnabled,
    getAutoLockDuration, setAutoLockDuration,
  } = useVaultStore();
  const toastRef = useRef<MicroToastHandle>(null);

  const [toggles, setToggles] = useState({ biometric: false, autolock: true, darkmode: true });
  const [autolockDuration, setAutolockDuration] = useState(5);
  const [biometryTypeLabel, setBiometryTypeLabel] = useState('Biometric');

  useEffect(() => {
    const loadState = async () => {
      const bio = await isBiometricEnabled();
      const lock = await isAutoLockEnabled();
      const dur = await getAutoLockDuration();
      setToggles(p => ({ ...p, biometric: bio, autolock: lock }));
      setAutolockDuration(dur);

      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      if (available) {
        if (biometryType === BiometryTypes.TouchID) setBiometryTypeLabel('Fingerprint');
        else if (biometryType === BiometryTypes.FaceID) setBiometryTypeLabel('Face ID');
        else setBiometryTypeLabel('Biometric Unlock');
      }
    };
    loadState();
  }, [isBiometricEnabled, isAutoLockEnabled, getAutoLockDuration]);

  const securityRows: SettingRow[] = [
    { emoji: '🔑', iconBg: T.warningA14,       accentColor: T.warning,   title: 'Change Master Password', desc: 'Update your vault encryption key',  type: 'nav' },
    { 
      emoji: '👆', iconBg: T.cyanA12,          accentColor: T.cyan,      title: 'Biometric Unlock',       
      desc: toggles.biometric ? `${biometryTypeLabel} active ✓` : biometryTypeLabel,             
      type: 'toggle', toggleKey: 'biometric' 
    },
    { 
      emoji: '⏱️', iconBg: 'rgba(139,92,246,0.14)', accentColor: '#8b5cf6', 
      title: 'Auto-Lock Timeout',      
      desc: toggles.autolock ? `Locks after ${autolockDuration}m of inactivity` : 'Vault stays unlocked',             
      type: 'toggle', toggleKey: 'autolock' 
    },
  ];

  const handleToggle = async (key: string) => {
    if (key === 'biometric') {
      const currentVal = toggles.biometric;
      const newVal = !currentVal;

      if (newVal) {
        // Turning ON
        const { available } = await rnBiometrics.isSensorAvailable();

        if (!available) {
          toastRef.current?.show('⚠️ No biometric hardware found');
          return;
        }

        const { success } = await rnBiometrics.simplePrompt({
          promptMessage: 'Confirm your identity to enable biometric unlock',
          cancelButtonText: 'Use password',
        });

        if (success) {
          await setBiometricEnabled(true);
          setToggles(p => ({ ...p, biometric: true }));
          toastRef.current?.show(`✓ ${biometryTypeLabel} enabled`);
        } else {
          toastRef.current?.show('Biometric setup cancelled');
        }
      } else {
        // Turning OFF
        await setBiometricEnabled(false);
        setToggles(p => ({ ...p, biometric: false }));
        toastRef.current?.show('Biometric unlock disabled');
      }
    } else if (key === 'autolock') {
      const newVal = !toggles.autolock;
      await setAutoLockEnabled(newVal);
      setToggles(p => ({ ...p, autolock: newVal }));
      toastRef.current?.show(newVal ? 'Auto-lock enabled' : 'Auto-lock disabled');
    } else if (key === 'darkmode') {
      toastRef.current?.show('SecureX runs in pure dark mode 🌙');
    } else {
      setToggles(p => ({ ...p, [key]: !p[key as keyof typeof p] }));
    }
  };

  const updateDuration = async (mins: number) => {
    await setAutoLockDuration(mins);
    setAutolockDuration(mins);
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AppBackground />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.brand}>SECUREX</Text>
          <Text style={s.heading}>Settings</Text>
        </View>

        {/* Security Section */}
        <Text style={s.sectionLabel}>SECURITY SETTINGS</Text>
        {securityRows.map((row) => (
          <View key={row.title}>
            <Row row={row}
              toggleValue={row.toggleKey ? toggles[row.toggleKey as keyof typeof toggles] : false}
              onToggle={row.toggleKey ? () => handleToggle(row.toggleKey!) : undefined}
              onPress={row.type === 'nav' ? () => {
                if (row.title === 'Change Master Password') {
                  navigation.navigate('ChangePassword');
                } else {
                  Alert.alert(row.title, `${row.title} coming soon.`);
                }
              } : undefined}
            />
            {row.toggleKey === 'autolock' && toggles.autolock && (
              <View style={s.pickerWrap}>
                {[1, 5, 15, 30, 60].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[s.chip, autolockDuration === d && s.chipActive]}
                    onPress={() => updateDuration(d)}
                  >
                    <Text style={[s.chipText, autolockDuration === d && s.chipTextActive]}>
                      {d < 60 ? `${d} min` : '1 hr'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Vault & Appearance Section */}
        <Text style={s.sectionLabel}>VAULT & APPEARANCE</Text>
        {VAULT_ROWS.map((row) => (
          <Row key={row.title} row={row}
            toggleValue={row.toggleKey === 'darkmode' ? true : (row.toggleKey ? toggles[row.toggleKey as keyof typeof toggles] : false)}
            onToggle={row.toggleKey ? () => handleToggle(row.toggleKey!) : undefined}
            onPress={row.type === 'nav' ? () => Alert.alert(row.title, 'Coming soon.') : undefined}
          />
        ))}

        {/* About Section */}
        <Text style={s.sectionLabel}>ABOUT</Text>
        {ABOUT_ROWS.map((row) => (
          <Row key={row.title} row={row}
            onPress={() => navigation.navigate('UserGuide')}
          />
        ))}

      </ScrollView>
      <BottomNav activeTab="Settings" />
      <MicroToast ref={toastRef} />
    </SafeAreaView>
  );
};

// ─── Styles ─────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll:    { paddingTop: 50, paddingBottom: 110 },

  header:  { paddingHorizontal: T.pad, marginBottom: 24 },
  brand:   { ...T.fontLabel, color: T.muted, marginBottom: 6 },
  heading: { ...T.fontHero },

  sectionLabel: {
    ...T.fontLabel,
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    marginHorizontal: T.pad,
    marginTop: 28,
    marginBottom: 12,
  },

  cardWrap: { marginHorizontal: T.pad, marginBottom: T.gap },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.glass, borderRadius: T.rCard,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 1, borderColor: T.border,
    overflow: 'hidden', ...T.shadowCard,
  },
  topHL:     { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: T.borderTop },
  accentBar: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2 },
  cardIcon: {
    width: 40, height: 40, borderRadius: 12, // rounded square
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14, marginLeft: 10,
  },
  cardEmoji: { fontSize: 18 },
  cardText:  { flex: 1 },
  cardTitle: { ...T.fontCardTitle },
  cardDesc:  { ...T.fontBody, color: T.muted, marginTop: 2, letterSpacing: 0.3 },
  chevron:   { fontSize: 24, color: T.muted, fontWeight: '300' },

  pickerWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginHorizontal: T.pad, marginTop: -4, marginBottom: 16,
    paddingLeft: 64, // align under text
  },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: {
    borderColor: 'rgba(0,229,255,0.4)',
    backgroundColor: 'rgba(0,229,255,0.08)',
  },
  chipText: { ...T.fontCaption, fontSize: 11, color: T.muted },
  chipTextActive: { color: T.cyan, fontWeight: '700' },
});
