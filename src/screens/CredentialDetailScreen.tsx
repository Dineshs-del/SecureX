import React, { useMemo, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Alert, ScrollView, StatusBar,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useVaultStore } from '../store/vaultStore';
import { AppBackground } from '../components/AppBackground';
import { T, getBrandColor } from '../theme/tokens';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';
import { getPasswordStrength } from '../store/vaultStore';

export const CredentialDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: string | undefined = route.params?.id;
  const { credentials, deleteCredential } = useVaultStore();
  const [showPassword, setShowPassword] = useState(false);
  const toastRef = useRef<MicroToastHandle>(null);

  const cred = useMemo(() => credentials.find(c => c.id === id), [credentials, id]);

  if (!cred) {
    return (
      <SafeAreaView style={s.container}>
        <AppBackground />
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Not Found</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={s.empty}>
          <Text style={s.emptyText}>Credential not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const brandColor = getBrandColor(cred.name || '');
  const initial = (cred.name || '?').charAt(0).toUpperCase();

  const handleCopy = (val: string, label: string) => {
    Clipboard.setString(val);
    toastRef.current?.show(`✓ ${label} copied`);
  };

  const handleDelete = () => {
    Alert.alert('Delete credential?', 'This action cannot be undone and the record will be permanently removed from your vault.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Permanently',
        style: 'destructive',
        onPress: async () => {
          await deleteCredential(cred.id);
          navigation.navigate('Dashboard');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AppBackground />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Credential Details</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddCredential', { id: cred.id })} style={s.editBtn}>
            <Text style={s.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* ── Main Brand Card ── */}
        <View style={s.brandCard}>
          <View style={s.topHL} />
          <View style={[s.logoCircle, { backgroundColor: brandColor + '18' }]}>
            <Text style={[s.logoLetter, { color: brandColor }]}>{initial}</Text>
          </View>
          <Text style={s.siteName}>{cred.name}</Text>
          {cred.url ? <Text style={s.siteUrl}>{cred.url}</Text> : null}
          <View style={s.siteRow}>
            <View style={s.catBadge}>
              <Text style={s.catText}>{cred.category || 'Other'}</Text>
            </View>
            {cred.strength !== 'strong' ? (
              <View style={[s.catBadge, { backgroundColor: T.warningA14, borderColor: T.warning }]}>
                <Text style={[s.catText, { color: T.warning }]}>{cred.strength?.toUpperCase() || 'WEAK'}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Credential Info ── */}
        <View style={s.infoSection}>
          <Text style={s.sectionLabel}>ACCOUNT INFORMATION</Text>
          
          {/* Username */}
          <View style={s.glassCard}>
            <View style={s.topHL} />
            <Text style={s.label}>USERNAME / EMAIL</Text>
            <View style={s.valRow}>
              <Text style={s.value} numberOfLines={1}>{cred.username}</Text>
              <TouchableOpacity onPress={() => handleCopy(cred.username, 'Username')}>
                <Text style={s.copyIcon}>⎘</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Password */}
          <View style={s.glassCard}>
            <View style={s.topHL} />
            <View style={s.labelRow}>
              <Text style={s.label}>PASSWORD</Text>
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={s.toggleText}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
              </TouchableOpacity>
            </View>
            <View style={s.valRow}>
              <Text style={[s.value, s.mono, !showPassword && s.masked]}>
                {showPassword ? cred.password : '••••••••••••'}
              </Text>
              <TouchableOpacity onPress={() => handleCopy(cred.password, 'Password')}>
                <Text style={s.copyIcon}>⎘</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2FA Section */}
          {cred.totp ? (
            <View style={s.glassCard}>
              <View style={s.topHL} />
              <Text style={s.label}>TWO-FACTOR AUTH (TOTP)</Text>
              <View style={s.valRow}>
                <Text style={[s.value, s.mono]} numberOfLines={1}>{cred.totp}</Text>
                <TouchableOpacity onPress={() => handleCopy(cred.totp, '2FA Secret')}>
                  <Text style={s.copyIcon}>⎘</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* Notes */}
          {cred.notes ? (
            <View style={s.glassCard}>
              <View style={s.topHL} />
              <Text style={s.label}>NOTES</Text>
              <Text style={s.notesVal}>{cred.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Danger Zone ── */}
        <View style={s.dangerZone}>
          <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
            <Text style={s.deleteText}>🗑️ Delete from Vault</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
      <MicroToast ref={toastRef} />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll:    { paddingTop: 50, paddingBottom: 40, paddingHorizontal: T.pad },
  
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 32,
  },
  backBtn:  { width: 44, height: 44, borderRadius: 12, backgroundColor: T.glass, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  backIcon: { fontSize: 20, color: T.white },
  headerTitle: { ...T.fontCardTitle, fontSize: 16, color: T.white },
  editBtn:  { paddingHorizontal: 16, paddingVertical: 8 },
  editText: { ...T.fontCaption, color: T.cyan, fontWeight: '700' },

  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { ...T.fontBody, color: T.muted },

  // Brand Card
  brandCard: {
    alignItems: 'center',
    backgroundColor: T.glass,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderWidth: 1, borderColor: T.border,
    marginBottom: 32,
    overflow: 'hidden',
    ...T.shadowCard,
  },
  topHL: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: T.borderTop },
  logoCircle: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  logoLetter: { fontSize: 32, fontWeight: '800' },
  siteName:   { ...T.fontHero, fontSize: 24, textAlign: 'center' },
  siteUrl:    { ...T.fontCaption, color: T.muted, marginTop: 4, letterSpacing: 0.5 },
  siteRow:    { flexDirection: 'row', marginTop: 16, gap: 8 },
  catBadge:   { backgroundColor: T.cyanA12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 50, borderWidth: 1, borderColor: T.cyanA18 },
  catText:    { ...T.fontCaption, color: T.cyan, fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },

  // Info Section
  infoSection:  { marginBottom: 32 },
  sectionLabel: { ...T.fontLabel, color: T.muted, fontSize: 10, marginBottom: 12, marginLeft: 4 },
  glassCard:    {
    backgroundColor: T.glass,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1, borderColor: T.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  label:    { ...T.fontLabel, color: 'rgba(255,255,255,0.35)', fontSize: 10, marginBottom: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  toggleText:{ ...T.fontCaption, color: T.cyan, fontWeight: '800', fontSize: 10 },
  valRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value:    { ...T.fontBody, color: T.white, fontSize: 16, flex: 1, marginRight: 10 },
  mono:     { ...T.fontMono, fontSize: 15 },
  masked:   { letterSpacing: 2 },
  copyIcon: { fontSize: 18, color: T.muted },
  notesVal: { ...T.fontBody, color: 'rgba(255,255,255,0.7)', lineHeight: 22 },

  // Danger Zone
  dangerZone: { marginTop: 8 },
  deleteBtn:  {
    height: 54, borderRadius: 16,
    backgroundColor: 'rgba(255,77,109,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,77,109,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteText: { ...T.fontBody, color: T.danger, fontWeight: '700' },
});
