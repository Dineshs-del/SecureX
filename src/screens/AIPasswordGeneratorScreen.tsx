import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { PasswordGenerator } from '../ai/PasswordGenerator';
import { getPasswordStrength } from '../store/vaultStore';
import { AppBackground } from '../components/AppBackground';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';
import Clipboard from '@react-native-clipboard/clipboard';

export const AIPasswordGeneratorScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const onUseCallback: ((p: string) => void) | undefined = route.params?.onUse;
  const toastRef = useRef<MicroToastHandle>(null);

  const [genMode, setGenMode] = useState<'password' | 'passphrase' | 'pin'>('password');
  const [length, setLength] = useState(18);
  const [wordCount, setWordCount] = useState(4);
  const [pinLength, setPinLength] = useState(6);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [separator, setSeparator] = useState('-');
  const [password, setPassword] = useState('');

  const generate = useCallback(() => {
    let out = '';
    if (genMode === 'password') {
      out = PasswordGenerator.generate({
        length,
        includeSymbols,
        includeNumbers,
        includeUppercase,
        includeLowercase,
        mode: 'password',
      });
    } else if (genMode === 'passphrase') {
      out = PasswordGenerator.generate({
        wordCount,
        separator,
        mode: 'passphrase',
      });
    } else {
      // PIN Mode
      const digits = '0123456789';
      for (let i = 0; i < pinLength; i++) {
        out += digits.charAt(Math.floor(Math.random() * digits.length));
      }
    }
    setPassword(out);
  }, [genMode, length, wordCount, pinLength, includeUppercase, includeLowercase, includeNumbers, includeSymbols, separator]);

  useEffect(() => {
    generate();
  }, [generate]);

  const strengthTag = getPasswordStrength(password);
  const strengthColor =
    strengthTag === 'strong' ? '#06d6a0' : strengthTag === 'fair' ? '#f5a623' : '#ff4d6d';

  const handleCopy = () => {
    if (!password) return;
    Clipboard.setString(password);
    toastRef.current?.show('Password copied to clipboard', 'success');
  };

  const handleSaveToVault = () => {
    if (onUseCallback) {
      onUseCallback(password);
      navigation.goBack();
      return;
    }
    navigation.navigate('AddCredential', {
      prefillPassword: password,
      category: 'Web',
    });
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080c10" />
      <AppBackground />

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[s.header, { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 24 }]}>
          <TouchableOpacity
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 20 }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Password Generator</Text>
            <Text style={s.headerSubtitle}>High-Entropy Zero-Knowledge Secret Engine</Text>
          </View>
        </View>

        {/* Generator Output Display Card */}
        <View style={s.displayCard}>
          <View style={s.cardTopHighlight} />

          <View style={s.passwordBox}>
            <Text style={s.passwordText} selectable>
              {password || 'Generating...'}
            </Text>
          </View>

          {/* Strength & Entropy Row */}
          <View style={s.strengthRow}>
            <View style={s.strengthLeft}>
              <View style={[s.strengthDot, { backgroundColor: strengthColor }]} />
              <Text style={[s.strengthLabel, { color: strengthColor }]}>
                {strengthTag.toUpperCase()} STRENGTH
              </Text>
            </View>
            <Text style={s.entropyText}>
              {password.length * 5} bits of entropy
            </Text>
          </View>

          {/* Action Row */}
          <View style={s.actionBtnRow}>
            <TouchableOpacity style={s.actionBtn} activeOpacity={0.8} onPress={generate}>
              <Text style={s.actionBtnText}>🔄 Re-generate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnPrimary]} activeOpacity={0.8} onPress={handleCopy}>
              <Text style={s.actionBtnPrimaryText}>📋 Copy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mode Selector Tabs */}
        <View style={s.modeTabs}>
          <TouchableOpacity
            style={[s.modeTab, genMode === 'password' && s.activeModeTab]}
            onPress={() => setGenMode('password')}
          >
            <Text style={[s.modeTabText, genMode === 'password' && s.activeModeTabText]}>
              Password
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.modeTab, genMode === 'passphrase' && s.activeModeTab]}
            onPress={() => setGenMode('passphrase')}
          >
            <Text style={[s.modeTabText, genMode === 'passphrase' && s.activeModeTabText]}>
              Passphrase
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.modeTab, genMode === 'pin' && s.activeModeTab]}
            onPress={() => setGenMode('pin')}
          >
            <Text style={[s.modeTabText, genMode === 'pin' && s.activeModeTabText]}>
              PIN Code
            </Text>
          </TouchableOpacity>
        </View>

        {/* Settings Controls Card */}
        <View style={s.controlsCard}>
          <View style={s.cardTopHighlight} />

          {/* Mode 1: Random Password Controls */}
          {genMode === 'password' && (
            <View style={s.controlsSection}>
              {/* Length Stepper */}
              <View style={s.controlRow}>
                <View>
                  <Text style={s.controlTitle}>Password Length</Text>
                  <Text style={s.controlSubtitle}>{length} characters</Text>
                </View>

                <View style={s.stepperRow}>
                  <TouchableOpacity
                    style={s.stepperBtn}
                    onPress={() => setLength((l) => Math.max(8, l - 1))}
                  >
                    <Text style={s.stepperText}>-</Text>
                  </TouchableOpacity>
                  <Text style={s.stepperVal}>{length}</Text>
                  <TouchableOpacity
                    style={s.stepperBtn}
                    onPress={() => setLength((l) => Math.min(64, l + 1))}
                  >
                    <Text style={s.stepperText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Toggles */}
              <TouchableOpacity
                style={s.toggleRow}
                onPress={() => setIncludeUppercase((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={s.toggleLabel}>Uppercase Letters (A-Z)</Text>
                <View style={[s.toggleBox, includeUppercase && s.toggleBoxOn]}>
                  {includeUppercase && <Text style={s.toggleCheck}>✓</Text>}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.toggleRow}
                onPress={() => setIncludeLowercase((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={s.toggleLabel}>Lowercase Letters (a-z)</Text>
                <View style={[s.toggleBox, includeLowercase && s.toggleBoxOn]}>
                  {includeLowercase && <Text style={s.toggleCheck}>✓</Text>}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.toggleRow}
                onPress={() => setIncludeNumbers((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={s.toggleLabel}>Numbers (0-9)</Text>
                <View style={[s.toggleBox, includeNumbers && s.toggleBoxOn]}>
                  {includeNumbers && <Text style={s.toggleCheck}>✓</Text>}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.toggleRow}
                onPress={() => setIncludeSymbols((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={s.toggleLabel}>Special Symbols (!@#$)</Text>
                <View style={[s.toggleBox, includeSymbols && s.toggleBoxOn]}>
                  {includeSymbols && <Text style={s.toggleCheck}>✓</Text>}
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Mode 2: Passphrase Controls */}
          {genMode === 'passphrase' && (
            <View style={s.controlsSection}>
              <View style={s.controlRow}>
                <View>
                  <Text style={s.controlTitle}>Word Count</Text>
                  <Text style={s.controlSubtitle}>{wordCount} words</Text>
                </View>
                <View style={s.stepperRow}>
                  <TouchableOpacity
                    style={s.stepperBtn}
                    onPress={() => setWordCount((w) => Math.max(3, w - 1))}
                  >
                    <Text style={s.stepperText}>-</Text>
                  </TouchableOpacity>
                  <Text style={s.stepperVal}>{wordCount}</Text>
                  <TouchableOpacity
                    style={s.stepperBtn}
                    onPress={() => setWordCount((w) => Math.min(8, w + 1))}
                  >
                    <Text style={s.stepperText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Separators */}
              <View style={s.separatorRow}>
                <Text style={s.toggleLabel}>Word Separator:</Text>
                <View style={s.sepPills}>
                  {['-', '.', '_', ' '].map((sep) => (
                    <TouchableOpacity
                      key={sep}
                      style={[s.sepPill, separator === sep && s.activeSepPill]}
                      onPress={() => setSeparator(sep)}
                    >
                      <Text style={[s.sepPillText, separator === sep && s.activeSepPillText]}>
                        {sep === ' ' ? 'space' : sep}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Mode 3: PIN Controls */}
          {genMode === 'pin' && (
            <View style={s.controlsSection}>
              <View style={s.controlRow}>
                <View>
                  <Text style={s.controlTitle}>PIN Length</Text>
                  <Text style={s.controlSubtitle}>{pinLength} numeric digits</Text>
                </View>
                <View style={s.stepperRow}>
                  <TouchableOpacity
                    style={s.stepperBtn}
                    onPress={() => setPinLength((l) => Math.max(4, l - 1))}
                  >
                    <Text style={s.stepperText}>-</Text>
                  </TouchableOpacity>
                  <Text style={s.stepperVal}>{pinLength}</Text>
                  <TouchableOpacity
                    style={s.stepperBtn}
                    onPress={() => setPinLength((l) => Math.min(12, l + 1))}
                  >
                    <Text style={s.stepperText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Save / Use CTA */}
        <TouchableOpacity
          style={s.saveVaultBtn}
          activeOpacity={0.85}
          onPress={handleSaveToVault}
        >
          <Text style={s.saveVaultBtnText}>
            {onUseCallback ? '✓ USE THIS PASSWORD' : '＋ SAVE TO VAULT CREDENTIAL'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <MicroToast ref={toastRef} />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080c10',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },

  // Display Card
  displayCard: {
    backgroundColor: '#0c131d',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.25)',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  cardTopHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  passwordBox: {
    backgroundColor: '#070b10',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
    minHeight: 60,
    justifyContent: 'center',
  },
  passwordText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00e5ff',
    fontFamily: Platform.OS === 'android' ? 'monospace' : undefined,
    textAlign: 'center',
    letterSpacing: 1,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  strengthLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  strengthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  entropyText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnPrimary: {
    backgroundColor: 'rgba(0,229,255,0.12)',
    borderColor: 'rgba(0,229,255,0.3)',
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00e5ff',
  },

  // Mode Tabs
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 11,
  },
  activeModeTab: {
    backgroundColor: 'rgba(0,229,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.3)',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  activeModeTabText: {
    color: '#00e5ff',
    fontWeight: '700',
  },

  // Controls Card
  controlsCard: {
    backgroundColor: '#0c1219',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  controlsSection: {
    gap: 14,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  controlTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  controlSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: -2,
  },
  stepperVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00e5ff',
    minWidth: 22,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  toggleBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBoxOn: {
    backgroundColor: '#00e5ff',
    borderColor: '#00e5ff',
  },
  toggleCheck: {
    fontSize: 12,
    fontWeight: '900',
    color: '#080c10',
  },

  // Separator
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sepPills: {
    flexDirection: 'row',
    gap: 6,
  },
  sepPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  activeSepPill: {
    backgroundColor: 'rgba(0,229,255,0.2)',
    borderWidth: 1,
    borderColor: '#00e5ff',
  },
  sepPillText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
  },
  activeSepPillText: {
    color: '#00e5ff',
  },

  // Save CTA
  saveVaultBtn: {
    backgroundColor: '#00e5ff',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  saveVaultBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#080c10',
    letterSpacing: 1.2,
  },
});
