import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useVaultStore, getPasswordStrength } from '../store/vaultStore';
import { AppBackground } from '../components/AppBackground';
import { GlassView } from '../components/GlassView';
import { CredentialIcon } from '../components/CredentialIcon';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';

const ArrowLeftIcon = ({ size = 20, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EyeIcon = ({ size = 18, color = 'rgba(255,255,255,0.70)' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EyeOffIcon = ({ size = 18, color = 'rgba(255,255,255,0.70)' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M1 1l22 22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CATEGORIES = ['Web', 'Apps', 'Work', 'Personal'];

function normalizeCategory(raw?: string): string {
  if (!raw) return 'Web';
  if (CATEGORIES.includes(raw)) return raw;
  const lower = raw.toLowerCase();
  if (lower.includes('app')) return 'Apps';
  if (lower.includes('work') || lower.includes('office')) return 'Work';
  if (lower.includes('personal')) return 'Personal';
  return 'Web';
}

export const AddEditCredentialScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { addCredential, updateCredential, credentials } = useVaultStore();
  const toastRef = useRef<MicroToastHandle>(null);

  const initialData = route.params?.initialData;
  const prefillPassword: string | undefined = route.params?.prefillPassword;
  const initialCategory = normalizeCategory(initialData?.category || route.params?.category);
  const isEdit = !!initialData;

  const [name, setName] = useState(initialData?.name || '');
  const [url, setUrl] = useState(initialData?.url || '');
  const [username, setUsername] = useState(initialData?.username || '');
  const [password, setPassword] = useState(initialData?.password || prefillPassword || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [category, setCategory] = useState(initialCategory);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; password?: string }>({});

  useEffect(() => {
    if (prefillPassword && !initialData) {
      setPassword(prefillPassword);
    }
  }, [prefillPassword, initialData]);

  const strength = getPasswordStrength(password);
  const strengthSegments = !password ? 0 : strength === 'strong' ? 4 : strength === 'fair' ? 2 : 1;
  const strengthColor =
    !password ? 'rgba(255,255,255,0.2)' : strength === 'strong' ? '#34D399' : strength === 'fair' ? '#FBBF24' : '#FB7185';
  const strengthLabel = !password ? 'Enter password' : strength.charAt(0).toUpperCase() + strength.slice(1);

  const validate = () => {
    let valid = true;
    const newErrors: { name?: string; password?: string } = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
      valid = false;
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required';
      valid = false;
    }
    setErrors(newErrors);
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const cleanName = name.trim();
    const cleanUrl = url.trim();
    const cleanUsername = username.trim();

    const isDuplicate = credentials.some(
      (c) =>
        c.id !== initialData?.id &&
        ((cleanUrl && c.url.toLowerCase() === cleanUrl.toLowerCase()) ||
          c.name.toLowerCase() === cleanName.toLowerCase()) &&
        c.username.toLowerCase() === cleanUsername.toLowerCase()
    );

    const performSave = async () => {
      const payload = {
        name: cleanName,
        url: cleanUrl,
        username: cleanUsername,
        password: password.trim(),
        category,
        notes: notes.trim(),
        strength: getPasswordStrength(password.trim()),
      };

      if (isEdit) {
        await updateCredential(initialData.id, payload);
      } else {
        await addCredential(payload);
      }
      toastRef.current?.show('Saved login', 'success');
      navigation.goBack();
    };

    if (isDuplicate) {
      Alert.alert('Duplicate Found', 'You already have this login. Save anyway?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save anyway', onPress: performSave },
      ]);
    } else {
      await performSave();
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E13" />
      <AppBackground />
      <MicroToast ref={toastRef} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeftIcon />
          </TouchableOpacity>
          <Text style={s.title}>{isEdit ? 'Edit login' : 'New login'}</Text>
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {/* Icon Preview */}
          <View style={s.iconRow}>
            <CredentialIcon name={name} url={url} size={60} />
            <View style={s.iconText}>
              <Text style={s.iconTitle}>Icon matched automatically</Text>
              <Text style={s.iconSub}>Generated from site or app name.</Text>
            </View>
          </View>

          {/* Input Card */}
          <GlassView style={s.inputCard} borderRadius={26}>
            {[
              { label: 'NAME', placeholder: 'e.g. GitHub, Gmail', value: name, onChange: setName, autoCap: 'words' as const },
              { label: 'WEBSITE OR APP', placeholder: 'e.g. https://github.com', value: url, onChange: setUrl, autoCap: 'none' as const },
              { label: 'USERNAME', placeholder: 'Email or username', value: username, onChange: setUsername, autoCap: 'none' as const },
              { label: 'PASSWORD', placeholder: 'Enter password', value: password, onChange: setPassword, autoCap: 'none' as const, isPassword: true },
            ].map((field, i) => (
              <View key={field.label} style={[s.inputRow, i > 0 && s.hairline]}>
                <Text style={s.rowLabel}>{field.label}</Text>
                <View style={s.rowValueRow}>
                  <TextInput
                    style={s.rowValue}
                    value={field.value}
                    onChangeText={field.onChange}
                    secureTextEntry={!!field.isPassword && !showPassword}
                    placeholder={field.placeholder}
                    placeholderTextColor="rgba(255,255,255,0.22)"
                    autoCapitalize={field.autoCap}
                    autoCorrect={false}
                  />
                  {field.isPassword && (
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </TouchableOpacity>
                  )}
                </View>
                {i === 0 && errors.name && <Text style={s.err}>{errors.name}</Text>}
                {i === 3 && errors.password && <Text style={s.err}>{errors.password}</Text>}
              </View>
            ))}
          </GlassView>

          {/* Live Strength & Generate */}
          <View style={s.strengthRow}>
            <View>
              <View style={s.strengthBars}>
                {[1, 2, 3, 4].map((segIdx) => (
                  <View
                    key={segIdx}
                    style={[
                      s.seg,
                      {
                        backgroundColor:
                          strengthSegments >= segIdx ? strengthColor : 'rgba(255,255,255,0.12)',
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={[s.strengthText, { color: strengthColor }]}>{strengthLabel}</Text>
            </View>
            <TouchableOpacity
              style={s.generateBtn}
              onPress={() =>
                navigation.navigate('AIPasswordGenerator', {
                  onUse: (generated: string) => setPassword(generated),
                })
              }
            >
              <Text style={s.genText}>↻ Generate</Text>
            </TouchableOpacity>
          </View>

          {/* Categories */}
          <View style={s.chipsRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat} style={[s.chip, category === cat && s.chipActive]} onPress={() => setCategory(cat)}>
                <Text style={[s.chipText, category === cat && s.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={s.sectionLabel}>NOTES</Text>
          <GlassView style={s.notesCard}>
            <TextInput
              style={s.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Recovery email, account hints..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
            />
          </GlassView>
        </ScrollView>

        {/* Save Button */}
        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveBtnText}>{isEdit ? 'Save changes' : 'Save login'}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E13' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40 },
  backBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginLeft: 16 },
  content: { padding: 20, paddingBottom: 40 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  iconText: { flex: 1 },
  iconTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  iconSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  inputCard: { paddingVertical: 4 },
  inputRow: { padding: 16 },
  hairline: { borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  rowLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8 },
  rowValueRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rowValue: { flex: 1, fontSize: 16, color: '#FFFFFF', padding: 0 },
  err: { fontSize: 12, color: '#ff4d6d', marginTop: 4 },
  strengthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 16 },
  strengthBars: { flexDirection: 'row', gap: 4 },
  seg: { width: 30, height: 4, borderRadius: 2 },
  strengthText: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  generateBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(0,229,255,0.12)', borderWidth: 1, borderColor: 'rgba(0,229,255,0.3)' },
  genText: { color: '#00e5ff', fontWeight: '700' },
  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chipActive: { backgroundColor: 'rgba(0,229,255,0.15)', borderColor: '#00e5ff' },
  chipText: { color: 'rgba(255,255,255,0.5)' },
  chipTextActive: { color: '#00e5ff' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8, marginBottom: 8 },
  notesCard: { padding: 16 },
  notesInput: { fontSize: 15, color: '#FFFFFF', minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { margin: 20, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 17, fontWeight: '800', color: '#080c10' },
});
