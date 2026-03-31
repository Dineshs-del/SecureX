import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, StatusBar,
  Animated, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useVaultStore, VaultCredential, getPasswordStrength } from '../store/vaultStore';
import { PasswordGenerator } from '../ai/PasswordGenerator';
import { AppBackground } from '../components/AppBackground';
import { T } from '../theme/tokens';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';

const CATEGORIES = [
  { label: 'Banking',  emoji: '🏦' },
  { label: 'Social',   emoji: '📱' },
  { label: 'Work',     emoji: '💼' },
  { label: 'Shopping', emoji: '🛍️' },
  { label: 'Gaming',   emoji: '🎮' },
  { label: 'Email',    emoji: '📧' },
  { label: 'Other',    emoji: '📁' }
];

// ─── Glass Input Component ──────────────────────────────
interface GlassInputProps {
  iconLeft?: string;
  iconRight?: React.ReactNode;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  multiline?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  error?: string;
  style?: any;
}

const GlassInput: React.FC<GlassInputProps> = ({
  iconLeft, iconRight, placeholder, value, onChangeText,
  secureTextEntry, multiline, keyboardType, autoCapitalize, error, style
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={s.inputContainer}>
      <View style={[
        s.inputWrapper,
        isFocused && s.inputWrapperFocused,
        error ? s.inputWrapperError : null,
        multiline && s.inputWrapperMultiline,
        style
      ]}>
        {iconLeft && <Text style={s.inputIconLeft}>{iconLeft}</Text>}
        <TextInput
          style={[
            s.inputField, 
            multiline && s.inputFieldMultiline,
            !iconLeft && { paddingLeft: 16 }
          ]}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          textAlignVertical={multiline ? 'top' : 'center'}
          
          // ── SECURITY: Disable External Autofill ──
          importantForAutofill="no"
          autoComplete={secureTextEntry ? (Platform.OS === 'web' ? 'new-password' : 'off') : 'off'}
          textContentType="none"
          {...(Platform.OS === 'web' ? {
            'data-lpignore': 'true',
            'data-form-type': 'other',
          } : {})}
        />
        {iconRight && <View style={s.inputIconRight}>{iconRight}</View>}
      </View>
      {error ? <Text style={s.errorMsg}>{error}</Text> : null}
    </View>
  );
};

// ─── Main Screen ────────────────────────────────────────
export const AddEditCredentialScreen: React.FC = () => {
  const insets      = useSafeAreaInsets();
  const navigation  = useNavigation<any>();
  const route       = useRoute<any>();
  const editId      = route.params?.id;
  const isEditing   = !!editId;

  const { addCredential, updateCredential, credentials } = useVaultStore();
  const existing = credentials.find(c => c.id === editId);

  const [websiteName, setWebsiteName] = useState(existing?.name || '');
  const [url,         setUrl]         = useState(existing?.url  || '');
  const [username,    setUsername]    = useState(existing?.username || '');
  const [password,    setPassword]    = useState(existing?.password || '');
  const [notes,       setNotes]       = useState(existing?.notes || '');
  const [category,    setCategory]    = useState(existing?.category || 'Other');
  const [totpSecret,  setTotpSecret]  = useState(existing?.totp || '');
  
  const [showPass,    setShowPass]    = useState(false);
  const [isSaving,    setIsSaving]    = useState(false);
  const [show2FA,     setShow2FA]     = useState(!!(existing?.totp));

  // Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toastRef = useRef<MicroToastHandle>(null);

  const generatePassword = () => {
    const accountType = PasswordGenerator.detectAccountType(websiteName);
    setPassword(PasswordGenerator.generate({ accountType, length: 16, includeSymbols: true, includeNumbers: true }));
    setShowPass(true);
    if (errors.password) setErrors({ ...errors, password: '' });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!websiteName.trim()) newErrors.websiteName = 'This field is required';
    if (!username.trim())    newErrors.username = 'This field is required';
    if (!password.trim())    newErrors.password = 'This field is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      if (isEditing) {
        await updateCredential(editId, { name: websiteName, url, username, password, notes, category, totp: totpSecret });
      } else {
        await addCredential({ name: websiteName, url, username, password, notes, category, totp: totpSecret, favicon: '' });
      }
      toastRef.current?.show('✓ Saved to vault');
      setTimeout(() => {
        navigation.navigate('Dashboard');
      }, 1200);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const sTag = getPasswordStrength(password);
  const strengthColor = password ? (sTag === 'strong' ? T.success : T.warning) : T.faint;
  const strengthLabel = password ? sTag.charAt(0).toUpperCase() + sTag.slice(1) : '';
  
  // Bar score for UI 1-100
  const strengthScore = password ? (sTag === 'strong' ? 95 : sTag === 'fair' ? 60 : 25) : 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AppBackground />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        <View style={s.headerBar}>
          <TouchableOpacity 
            style={s.closeWrapper} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={s.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>{isEditing ? 'Edit Credential' : 'New Credential'}</Text>
          <View style={{ flex: 1 }} />
        </View>

        {/* ── Scrollable Form Area ── */}
        {/* Wrap in View to block autofill via descendants (Android) */}
        <View style={{ flex: 1 }} {...({ importantForAutofill: 'noExcludeDescendants' } as any)}>
          <ScrollView
            contentContainerStyle={[s.scrollContent, { paddingBottom: 140 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Website Name */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>🌐  WEBSITE NAME  <Text style={s.cyanDot}>•</Text></Text>
              <GlassInput
                iconLeft="🌐"
                placeholder="e.g. Google, Netflix, Bank"
                value={websiteName}
                onChangeText={(t) => { setWebsiteName(t); if(errors.websiteName) setErrors({...errors, websiteName:''}); }}
                error={errors.websiteName}
              />
            </View>

            {/* URL */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>🔗  URL</Text>
              <GlassInput
                iconLeft="🔗"
                placeholder="https://example.com"
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            {/* Username / Email */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>👤  USERNAME / EMAIL  <Text style={s.cyanDot}>•</Text></Text>
              <GlassInput
                iconLeft="👤"
                placeholder="username@email.com"
                value={username}
                onChangeText={(t) => { setUsername(t); if(errors.username) setErrors({...errors, username:''}); }}
                autoCapitalize="none"
                keyboardType="email-address"
                error={errors.username}
              />
            </View>

            {/* Password */}
            <View style={s.fieldGroup}>
              <View style={s.passwordLabelRow}>
                <Text style={s.fieldLabel}>🔑  PASSWORD  <Text style={s.cyanDot}>•</Text></Text>
                <TouchableOpacity style={s.genPill} onPress={generatePassword} activeOpacity={0.7}>
                  <Text style={s.genPillText}>✦ AI Generate</Text>
                </TouchableOpacity>
              </View>
              <GlassInput
                placeholder="Enter or generate password"
                value={password}
                onChangeText={(t) => { setPassword(t); if(errors.password) setErrors({...errors, password:''}); }}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                error={errors.password}
                iconRight={
                  <TouchableOpacity onPress={() => setShowPass(!showPass)} style={s.eyeBtn} activeOpacity={0.7}>
                    <Text style={s.eyeEmoji}>{showPass ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                }
              />
              {password ? (
                <View style={s.strengthRow}>
                  <View style={s.strengthTrack}><View style={[s.strengthFill, { width: `${strengthScore}%`, backgroundColor: strengthColor }]} /></View>
                  <Text style={[s.strengthText, { color: strengthColor }]}>{strengthLabel}</Text>
                </View>
              ) : null}
            </View>

            {/* Category */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>🏷️  CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsScroll}>
                {CATEGORIES.map(cat => {
                  const isActive = category === cat.label;
                  return (
                    <TouchableOpacity
                      key={cat.label}
                      style={[s.chip, isActive && s.chipActive]}
                      onPress={() => setCategory(cat.label)}
                      activeOpacity={0.8}
                    >
                      <Text style={s.chipEmoji}>{cat.emoji}</Text>
                      <Text style={[s.chipText, isActive && s.chipTextActive]}>{cat.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Notes */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>📝  NOTES  (OPTIONAL)</Text>
              <GlassInput
                placeholder="Recovery codes, hints, security questions..."
                value={notes}
                onChangeText={setNotes}
                multiline={true}
                style={s.notesInput}
              />
            </View>

            {/* 2FA / TOTP Section */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>🔐  TWO-FACTOR AUTH</Text>
              {!show2FA ? (
                <TouchableOpacity style={s.twofaCollapsedRow} onPress={() => setShow2FA(true)} activeOpacity={0.82}>
                  <View style={s.twofaIconWrapper}><Text style={s.twofaIcon}>🔐</Text></View>
                  <View style={s.twofaTextWrapper}>
                    <Text style={s.twofaTitle}>Add 2FA Secret Key</Text>
                    <Text style={s.twofaDesc}>Enables TOTP code generation</Text>
                  </View>
                  <Text style={s.twofaAddIcon}>+</Text>
                </TouchableOpacity>
              ) : (
                <GlassInput
                  placeholder="TOTP Secret (e.g. JBSWY3DP...)"
                  value={totpSecret}
                  onChangeText={setTotpSecret}
                  autoCapitalize="characters"
                />
              )}
            </View>
          </ScrollView>
        </View>

        {/* ── Bottom Bar ── */}
        <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={isSaving} activeOpacity={0.8}>
            {isSaving ? <ActivityIndicator color={T.cyan} size="small" /> : <Text style={s.saveText}>🛡️ Save</Text>}
          </TouchableOpacity>
        </View>

        <MicroToast ref={toastRef} />

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  closeWrapper: { position: 'absolute', left: 20, width: 40, alignItems: 'flex-start' },
  closeIcon: { fontSize: 20, color: 'rgba(255,255,255,0.35)' },
  headerTitle: { fontFamily: 'Syne', fontWeight: '700', fontSize: 17, color: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: {
    fontFamily: 'Syne', fontWeight: '600', fontSize: 11,
    letterSpacing: 3, textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)', marginBottom: 6,
  },
  cyanDot: { color: '#00e5ff', fontWeight: '800' },

  inputContainer: { width: '100%' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 14, overflow: 'hidden',
  },
  inputWrapperFocused: { backgroundColor: 'rgba(0,229,255,0.04)', borderColor: 'rgba(0,229,255,0.35)' },
  inputWrapperError: { borderColor: '#ff4d6d' },
  inputWrapperMultiline: { alignItems: 'flex-start' },
  inputIconLeft: { fontSize: 16, opacity: 0.6, marginHorizontal: 14 },
  inputIconRight: { marginHorizontal: 8 },
  inputField: { flex: 1, paddingVertical: 14, paddingHorizontal: 16, ...T.fontMono, fontSize: 14, color: '#FFFFFF', paddingLeft: 0 },
  inputFieldMultiline: { minHeight: 90 },
  notesInput: { paddingLeft: 16 },
  errorMsg: { fontFamily: 'DM Mono', fontSize: 12, color: '#ff4d6d', marginTop: 6, marginLeft: 4 },

  passwordLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 },
  genPill: { backgroundColor: 'rgba(0,229,255,0.08)', borderWidth: 1, borderColor: 'rgba(0,229,255,0.25)', borderRadius: 50, paddingVertical: 4, paddingHorizontal: 10, marginBottom: 2 },
  genPillText: { fontFamily: 'Syne', fontWeight: '600', fontSize: 11, color: '#00e5ff' },
  eyeEmoji: { fontSize: 18, opacity: 0.6, padding: 6 },
  eyeBtn: { padding: 4 },

  strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 12 },
  strengthTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 4, overflow: 'hidden' },
  strengthFill: { height: 4, borderRadius: 4 },
  strengthText: { fontFamily: 'DM Mono', fontSize: 11, fontWeight: '700', width: 44, textAlign: 'right' },

  chipsScroll: { gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 50, paddingVertical: 8, paddingHorizontal: 16 },
  chipActive: { backgroundColor: 'rgba(0,229,255,0.1)', borderColor: 'rgba(0,229,255,0.35)' },
  chipEmoji: { fontSize: 14, marginRight: 6 },
  chipText: { fontFamily: 'Syne', fontWeight: '600', fontSize: 13, color: 'rgba(255,255,255,0.45)' },
  chipTextActive: { color: '#00e5ff' },

  twofaCollapsedRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', borderRadius: 14, padding: 12 },
  twofaIconWrapper: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(0,229,255,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  twofaIcon: { fontSize: 14 },
  twofaTextWrapper: { flex: 1 },
  twofaTitle: { fontFamily: 'Syne', fontWeight: '600', fontSize: 14, color: '#FFFFFF' },
  twofaDesc: { ...T.fontCaption, fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  twofaAddIcon: { fontFamily: 'Syne', fontSize: 24, color: 'rgba(255,255,255,0.45)', paddingRight: 8 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'rgba(8,12,16,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  cancelBtn: { flex: 1, height: 50, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cancelText: { fontFamily: 'Syne', fontWeight: '600', fontSize: 15, color: 'rgba(255,255,255,0.6)' },
  saveBtn: { flex: 1, height: 50, backgroundColor: 'rgba(0,229,255,0.08)', borderWidth: 1, borderColor: 'rgba(0,229,255,0.35)', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontFamily: 'Syne', fontWeight: '700', fontSize: 15, color: '#00e5ff' },

  toast: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: '#06d6a0', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  toastText: { fontFamily: 'Syne', fontWeight: '700', fontSize: 14, color: '#080c10' },
});
