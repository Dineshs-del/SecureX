import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, StatusBar, Animated, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { MasterPasswordManager } from '../theme/database/MasterPasswordManager';
import { CryptoService } from '../theme/crypto/CryptoService';
import { useVaultStore, getPasswordStrength } from '../store/vaultStore';
import { AppBackground } from '../components/AppBackground';
import { T } from '../theme/tokens';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';

// Modified GlassInput with emoji support & custom styling
const LocalGlassInput = ({ emoji, label, placeholder, value, onChangeText, error, showPass, setShowPass, isPassword = true, style, children }: any) => (
  <View style={[s.fieldGroup, style]}>
    <View style={s.labelRow}>
      <Text style={s.labelEmoji}>{emoji}</Text>
      <Text style={s.fieldLabel}>{label}</Text>
    </View>
    <View style={[s.inputWrapper, error && s.inputError]}>
      <View style={s.inputTopHL} />
      <TextInput
        style={s.input}
        placeholder={placeholder}
        placeholderTextColor={T.faint}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={isPassword && !showPass}
        autoCapitalize="none"
      />
      {isPassword && (
        <TouchableOpacity onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
          <Text style={s.eyeEmoji}>{showPass ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      )}
    </View>
    {children}
    {error ? <Text style={s.errorMsg}>{error}</Text> : null}
  </View>
);

export const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { lock } = useVaultStore();
  const toastRef = useRef<MicroToastHandle>(null);

  const [currentPass, setCurrentPass] = useState('');
  const [newPass,     setNewPass]     = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const sTag = getPasswordStrength(newPass);
  const strengthColor = newPass ? (sTag === 'strong' ? T.success : T.warning) : T.faint;
  const strengthScore = newPass ? (sTag === 'strong' ? 95 : sTag === 'fair' ? 60 : 25) : 0;

  const handleUpdate = async () => {
    const newErrors: Record<string, string> = {};
    if (!currentPass) newErrors.current = 'Required';
    if (newPass.length < 8) newErrors.new = 'Password must be at least 8 characters';
    if (newPass !== confirmPass) newErrors.confirm = 'Passwords do not match';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsUpdating(true);
    setErrors({});

    try {
      // 1. Verify current password
      const unlockResult = await MasterPasswordManager.unlockVault(currentPass);
      if (!unlockResult.success) {
        setErrors({ current: 'Incorrect current password' });
        setIsUpdating(false);
        return;
      }

      const oldVaultKey = MasterPasswordManager.getVaultKey();

      // 2. Perform Re-encryption Loop
      // Load raw credentials
      const STORAGE_KEY = 'securex_credentials';
      const rawData = await AsyncStorage.getItem(STORAGE_KEY);
      const credentials = rawData ? JSON.parse(rawData) : [];

      // Decrypt all using OLD key
      const decryptedData = credentials.map((c: any) => {
        let plain = c.password;
        if (c.password.startsWith('{')) {
          const enc = CryptoService.stringToEncryptedData(c.password);
          if (enc) {
            const dec = CryptoService.decryptWithKey(enc, oldVaultKey);
            if (dec) plain = dec;
          }
        }
        return { ...c, password: plain };
      });

      // 3. Update Master Password
      // This changes the key in MasterPasswordManager and AsyncStorage
      const updateResult = await MasterPasswordManager.changeMasterPassword(currentPass, newPass);
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update master password');
      }

      const newVaultKey = MasterPasswordManager.getVaultKey();

      // 4. Re-encrypt using NEW key
      const reEncryptedData = decryptedData.map((c: any) => ({
        ...c,
        password: CryptoService.encryptedDataToString(CryptoService.encryptWithKey(c.password, newVaultKey))
      }));

      // 5. Save back to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reEncryptedData));

      // 6. Success Flow
      toastRef.current?.show('✓ Master password updated');
      
      setTimeout(() => {
        lock(); // Clear memory
        navigation.navigate('Unlock', { message: 'Password updated — please sign in again' });
      }, 1500);

    } catch (e: any) {
      console.error('Update failed:', e);
      // Rollback attempt (Simplified for this version - ideally we'd restore old hash/salt)
      // For now, inform user of the serious error
      toastRef.current?.show('❌ Failed to update — please try again');
      setIsUpdating(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AppBackground />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Change Password</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        contentContainerStyle={s.scroll} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Section */}
        <View style={s.topSection}>
          <View style={s.lockCircle}>
            <Text style={{ fontSize: 32 }}>🔑</Text>
          </View>
          <Text style={s.topTitle}>Update Master Password</Text>
          <Text style={s.topDesc}>Your vault will be re-encrypted with the new key</Text>
        </View>

        {/* Current Password */}
        <LocalGlassInput
          emoji="🔓"
          label="CURRENT PASSWORD"
          placeholder="Enter current master password"
          value={currentPass}
          onChangeText={setCurrentPass}
          error={errors.current}
          showPass={showCurrent}
          setShowPass={setShowCurrent}
          style={{ marginTop: 8 }}
        />

        {/* New Password */}
        <LocalGlassInput
          emoji="🔑"
          label="NEW PASSWORD"
          placeholder="Enter new master password"
          value={newPass}
          onChangeText={setNewPass}
          error={errors.new}
          showPass={showNew}
          setShowPass={setShowNew}
        >
          {newPass ? (
            <View style={s.strengthRow}>
              <View style={s.strengthTrack}>
                <View style={[s.strengthFill, { width: `${strengthScore}%`, backgroundColor: strengthColor }]} />
              </View>
              <Text style={[s.strengthText, { color: strengthColor }]}>
                {sTag.charAt(0).toUpperCase() + sTag.slice(1)}
              </Text>
            </View>
          ) : null}
        </LocalGlassInput>

        {/* Confirm Password */}
        <LocalGlassInput
          emoji="✅"
          label="CONFIRM PASSWORD"
          placeholder="Re-enter new master password"
          value={confirmPass}
          onChangeText={setConfirmPass}
          error={errors.confirm}
          showPass={showConfirm}
          setShowPass={setShowConfirm}
        />
        
        {/* Fill bottom space for fixed buttons */}
        <View style={{ height: 40 }} />

        {/* Bottom Bar (Inside Scroll) */}
        <View style={[s.bottomBar, { marginBottom: Math.max(insets.bottom, 24) }]}>
          <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={s.saveBtn} onPress={handleUpdate} disabled={isUpdating} activeOpacity={0.8}>
            {isUpdating ? (
              <ActivityIndicator color={T.cyan} size="small" />
            ) : (
              <Text style={s.saveText}>🔑 Update Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Re-encrypt success toast */}

      </KeyboardAvoidingView>

      <MicroToast ref={toastRef} />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, paddingTop: 16 },
  
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 60,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 24, color: T.muted },
  headerTitle: { fontSize: 17, fontWeight: '700', color: T.white, letterSpacing: 0.1, fontFamily: 'Syne-Bold' },

  scroll: { padding: 24, paddingTop: 20 },

  // Top Section
  topSection: { alignItems: 'center', marginBottom: 28 },
  lockCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 32, marginBottom: 16,
    shadowColor: T.cyan, shadowOpacity: 0.2, shadowRadius: 12,
  },
  topTitle: { fontSize: 18, fontWeight: '700', color: T.white, marginTop: 16, marginBottom: 8 },
  topDesc: { ...T.fontBody, color: T.muted, fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 18, marginTop: 6, marginBottom: 32 },

  fieldGroup: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  labelEmoji: { fontSize: 14, color: T.muted, marginRight: 8 },
  fieldLabel: { ...T.fontLabel, color: T.muted, fontSize: 11, letterSpacing: 1.5 },
  
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.glass, borderRadius: T.rChip,
    borderWidth: 1, borderColor: T.border, height: 56,
    overflow: 'hidden',
  },
  inputTopHL: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: T.borderTop },
  input: { flex: 1, height: '100%', paddingHorizontal: 16, ...T.fontMono, color: T.white, fontSize: 14 },
  inputError: { borderColor: T.danger },
  
  eyeBtn: { padding: 12 },
  eyeEmoji: { fontSize: 18, opacity: 0.6 },
  
  errorMsg: { ...T.fontCaption, color: T.danger, marginTop: 6, marginLeft: 4, fontFamily: 'DM-Mono' },

  strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingHorizontal: 4 },
  strengthTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, marginRight: 10, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 4 },
  strengthText: { fontSize: 11, fontWeight: '600', width: 44, textAlign: 'right', fontFamily: 'DM-Mono' },

  bottomBar: {
    paddingHorizontal: 0,
    flexDirection: 'row', gap: 10,
    backgroundColor: 'transparent',
  },
  cancelBtn: {
    width: '48%', height: 54, borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  
  saveBtn: {
    width: '48%', height: 54, borderRadius: 14,
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  saveText: { fontSize: 15, fontWeight: '700', color: T.cyan },
});
