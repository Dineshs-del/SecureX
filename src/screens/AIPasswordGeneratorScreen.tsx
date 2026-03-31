import React, { useMemo, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, ScrollView, Switch, Alert, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PasswordGenerator } from '../ai/PasswordGenerator';
import { getPasswordStrength } from '../store/vaultStore';
import { AppBackground } from '../components/AppBackground';
import { T } from '../theme/tokens';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';
import Clipboard from '@react-native-clipboard/clipboard';

const StrengthBar: React.FC<{ password: string }> = ({ password }) => {
  if (!password) return null;
  const sTag = getPasswordStrength(password);
  const color = sTag === 'strong' ? T.success : T.warning;
  const label = sTag.charAt(0).toUpperCase() + sTag.slice(1);
  const pct = sTag === 'strong' ? 0.95 : sTag === 'fair' ? 0.6 : 0.25;
  return (
    <View style={sb.wrap}>
      <View style={sb.track}>
        <View style={[sb.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[sb.label, { color }]}>{label}</Text>
    </View>
  );
};
const sb = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 },
  track: { flex: 1, height: 4, backgroundColor: T.border, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  label: { ...T.fontCaption, fontWeight: '700', minWidth: 36 },
});

export const AIPasswordGeneratorScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [length, setLength] = useState(16);
  const [useSymbols, setUseSymbols] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [pronounceable, setPronounceable] = useState(false);
  const [password, setPassword] = useState('');
  const toastRef = useRef<MicroToastHandle>(null);

  const analysis = useMemo(() => {
    if (!password) return '';
    const sTag = getPasswordStrength(password);
    return sTag.charAt(0).toUpperCase() + sTag.slice(1);
  }, [password]);

  const handleGenerate = () => {
    const out = PasswordGenerator.generate({
      length,
      includeSymbols: useSymbols,
      includeNumbers: useNumbers,
      mode: pronounceable ? 'passphrase' : 'password',
    });
    setPassword(out);
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AppBackground />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.heading}>Password Generator</Text>
        </View>

        <View style={s.card}>
          <View style={s.topHL} />

          <Text style={s.label}>Length: {length}</Text>
          <TextInput
            style={s.input}
            keyboardType="number-pad"
            value={String(length)}
            onChangeText={t => { const v = Number(t || 0); if (v >= 8 && v <= 128) setLength(v); }}
            placeholder="8–128"
            placeholderTextColor={T.faint}
          />

          {[
            { label: 'Include Symbols', val: useSymbols, set: setUseSymbols },
            { label: 'Include Numbers', val: useNumbers, set: setUseNumbers },
            { label: 'Pronounceable', val: pronounceable, set: setPronounceable },
          ].map(({ label, val, set }) => (
            <View key={label} style={s.switchRow}>
              <Text style={s.switchLabel}>{label}</Text>
              <Switch
                value={val}
                onValueChange={set}
                thumbColor={val ? T.cyan : 'rgba(255,255,255,0.35)'}
                trackColor={{ false: T.border, true: T.cyanA70 }}
              />
            </View>
          ))}

          <TouchableOpacity style={s.generateBtn} onPress={handleGenerate} activeOpacity={0.8}>
            <View style={s.btnTopHL} />
            <Text style={s.generateBtnText}>✨ Generate Password</Text>
          </TouchableOpacity>

          {password ? (
            <View style={s.resultCard}>
              <View style={s.topHL} />
              <Text style={s.resultLabel}>Generated Password</Text>
              <Text style={s.resultValue}>{password}</Text>
              <StrengthBar password={password} />
              <Text style={s.resultAnalysis}>AI: {analysis}</Text>
              <TouchableOpacity
                style={s.copyBtn}
                onPress={() => {
                  Clipboard.setString(password);
                  toastRef.current?.show('✓ Password copied');
                }}
                activeOpacity={0.8}
              >
                <View style={s.btnTopHL} />
                <Text style={s.copyBtnText}>📋 Copy Password</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <MicroToast ref={toastRef} />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingTop: 50, paddingBottom: 40, paddingHorizontal: T.pad },

  header: { marginBottom: 20 },
  back: { ...T.fontCaption, color: T.cyan, fontWeight: '700', marginBottom: 12 },
  heading: { ...T.fontHero, fontSize: 24 },

  card: {
    backgroundColor: T.glass, borderRadius: T.rCard,
    padding: T.cardPadH, borderWidth: 1, borderColor: T.border,
    borderTopWidth: 1, borderTopColor: T.borderTop,
    overflow: 'hidden', ...T.shadowCard,
  },
  topHL: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: T.borderTop },

  label: { ...T.fontLabel, color: T.muted, marginBottom: T.sectionGap, marginTop: T.cardPadV },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: T.rChip,
    borderWidth: 1, borderColor: T.border,
    paddingHorizontal: T.cardPadH, paddingVertical: T.cardPadV,
    ...T.fontBody, color: T.white, marginBottom: T.gap,
  },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginVertical: 6,
  },
  switchLabel: { ...T.fontBody, color: T.muted, fontSize: 14 },

  generateBtn: {
    marginTop: 20, height: 54, borderRadius: T.rPill,
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  btnTopHL: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  generateBtnText: { ...T.fontBody, color: T.cyan, fontWeight: '800', fontSize: 16 },

  resultCard: {
    marginTop: 24, backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: T.rCard, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  resultLabel: { ...T.fontLabel, color: T.faint, fontSize: 10 },
  resultValue: { ...T.fontMono, color: T.white, fontSize: 18, marginTop: 8, marginBottom: 12 },
  resultAnalysis: { ...T.fontCaption, color: T.cyan, fontWeight: '700', marginBottom: 20, marginTop: 4 },
  copyBtn: {
    height: 50, borderRadius: T.rPill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  copyBtnText: { ...T.fontBody, color: T.white, fontWeight: '700', fontSize: 14 },
});