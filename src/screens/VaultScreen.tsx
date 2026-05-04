// eslint-disable-next-line @typescript-eslint/no-var-requires
import React, { useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, Alert, ScrollView,
  Animated, Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useVaultStore } from '../store/vaultStore';
import { CredentialCard } from '../components/CredentialCard';
import { CredentialBottomSheet } from '../components/CredentialBottomSheet';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';
import { BottomNav } from '../components/BottomNav';
import { AppBackground } from '../components/AppBackground';
import { T } from '../theme/tokens';
import Clipboard from '@react-native-clipboard/clipboard';

// ─── Local Types ───────────────────────────────────────────────────────────────
interface Credential {
  id: string;
  name?: string;
  username?: string;
  password?: string;
  category?: string;
  [key: string]: unknown;
}

const CATEGORIES = ['All', 'Banking', 'Social', 'Work', 'Shopping', 'Gaming', 'Other'];

// ─── Empty State ───────────────────────────────────────────────────────────────
const VaultEmpty: React.FC<{ onAdd: () => void }> = ({ onAdd }) => {
  const bob = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: -7, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, [bob, fade]);

  return (
    <Animated.View style={[ev.wrap, { opacity: fade }]}>
      <Animated.View style={[ev.iconRing, { transform: [{ translateY: bob }] }]}>
        <Text style={ev.icon}>🔒</Text>
      </Animated.View>
      <Text style={ev.title}>Your vault is empty</Text>
      <Text style={ev.desc}>Add your first credential to get started.</Text>
      <TouchableOpacity style={ev.btn} onPress={onAdd} activeOpacity={0.82}>
        <Text style={ev.btnText}>Add your first credential →</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ev = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 72, paddingHorizontal: T.pad },
  iconRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: T.cyanA12, borderWidth: 1, borderColor: T.cyanA18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    shadowColor: T.cyan, shadowOpacity: 0.35, shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 }, elevation: 10,
  },
  icon: { fontSize: 30 },
  title: { fontSize: 20, fontWeight: '800', color: T.white, marginBottom: 8 },
  desc: { ...T.fontCaption, color: T.muted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  btn: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: T.rPill, borderWidth: 1, borderColor: T.cyanA18, backgroundColor: 'transparent' },
  btnText: { ...T.fontCaption, color: T.cyan, fontWeight: '700' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export const VaultScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    filteredCredentials, searchQuery, selectedCategory, error,
    setSearchQuery, setCategory, deleteCredential, loadCredentials, loadStats,
  } = useVaultStore();


  const [selectedCred, setSelectedCred] = React.useState<Credential | null>(null);
  const [isSheetVisible, setIsSheetVisible] = React.useState(false);
  const toastRef = React.useRef<MicroToastHandle>(null);

  useEffect(() => { loadCredentials(); loadStats(); }, [loadCredentials, loadStats]);

  const handleCopy = (text: string, label: string) => {
    Clipboard.setString(text);
    toastRef.current?.show(`✔ ${label} copied`);
  };

  const handleOpenSheet = (cred: Credential) => {
    setSelectedCred(cred);
    setIsSheetVisible(true);
    useVaultStore.getState().updateLastAccessed(cred.id);
  };

  const handleEdit = (id: string) => {
    setIsSheetVisible(false);
    navigation.navigate('AddCredential', { id });
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete credential?', 'This action cannot be undone and you will lose access to this account if no backup exists.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Permanently',
        style: 'destructive',
        onPress: async () => {
          await deleteCredential(id);
          setIsSheetVisible(false);
          toastRef.current?.show('✔ Deleted from vault');
        }
      }
    ]);
  };

  // Header animation
  const aH = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(aH, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [aH]);

  const headerStyle = {
    opacity: aH,
    transform: [{ translateY: aH.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AppBackground />

      <FlatList
        data={filteredCredentials}
        keyExtractor={item => item.id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ── 1. HEADER ── */}
            <Animated.View style={[s.header, headerStyle]}>
              <View style={s.headerTop}>
                <View style={s.headerLeft}>
                  <Text style={s.brand}>SECUREX</Text>
                  <Text style={s.heading}>Your Vault</Text>
                  <Text style={s.credCount}>{filteredCredentials.length} saved credentials</Text>
                </View>
                <TouchableOpacity
                  style={s.addBtn}
                  onPress={() => navigation.navigate('AddCredential')}
                  activeOpacity={0.8}
                >
                  <Text style={s.addBtnText}>+ Add New</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* ── Error banner ── */}
            {error ? (
              <View style={s.errorBanner}><Text style={s.errorText}>⚠ {error}</Text></View>
            ) : null}



            {/* ── 4. SEARCH BAR ── */}
            <Text style={[s.sectionLabel, { marginTop: 20 }]}>PASSWORDS</Text>
            <View style={s.searchPill}>
              <Text style={s.searchIconText}>⌕</Text>
              <TextInput
                style={s.searchInput}
                placeholder="Search account, name..."
                placeholderTextColor={T.faint}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery
                ? <TouchableOpacity onPress={() => setSearchQuery('')}><Text style={s.searchClear}>✕</Text></TouchableOpacity>
                : <Text style={s.filterLines}>≡</Text>
              }
            </View>

            {/* ── 5. AUTOFILL BANNER ── */}
            <TouchableOpacity
              style={s.autofillBanner}
              activeOpacity={0.87}
              onPress={() => navigation.navigate('AutofillSetup')}
            >
              <View style={s.autofillAccent} />
              <View style={s.autofillIcon}>
                <Text style={{ fontSize: 18 }}>⚡</Text>
              </View>
              <View style={s.autofillText}>
                <Text style={s.autofillTitle}>Try Autofill for faster logins</Text>
                <Text style={s.autofillDesc}>Enable secure auto-completion</Text>
              </View>
              <Text style={s.autofillArrow}>→</Text>
            </TouchableOpacity>

            {/* ── 6. CATEGORY CHIPS ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipsRow}
            >
              {CATEGORIES.map(cat => {
                const active = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[s.chip, active && s.chipActive]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        }
        ListEmptyComponent={
          <VaultEmpty onAdd={() => navigation.navigate('AddCredential')} />
        }
        renderItem={({ item }: { item: any }) => (
          <CredentialCard
            credential={item}
            onPress={() => navigation.navigate('CredentialDetail', { id: item.id })}
            onPressIcon={() => handleOpenSheet(item)}
            onCopy={handleCopy}
          />
        )}
      />

      <CredentialBottomSheet
        isVisible={isSheetVisible}
        credential={selectedCred}
        onClose={() => setIsSheetVisible(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCopy={handleCopy}
      />

      <MicroToast ref={toastRef} />
      <BottomNav activeTab="Passwords" />
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  listContent: { paddingTop: 50, paddingBottom: 110 },

  // ── 1. Header ──
  header: { paddingHorizontal: T.pad, marginBottom: 18 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerLeft: { flex: 1, marginRight: 12 },
  brand: { ...T.fontLabel, color: T.muted, marginBottom: 6 },
  heading: { fontSize: 22, fontWeight: '800', color: T.white, lineHeight: 28 },
  credCount: { fontSize: 13, fontWeight: '600', color: T.cyan, marginTop: 4, letterSpacing: 0.5 },

  addBtn: {
    marginTop: 6,
    borderWidth: 1, borderColor: T.cyanA18,
    borderRadius: T.rPill,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: 'transparent',
    shadowColor: T.cyan, shadowOpacity: 0.22,
    shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 4,
  },
  addBtnText: { ...T.fontCaption, color: T.cyan, fontWeight: '800', fontSize: 12 },

  // Error
  errorBanner: {
    marginHorizontal: T.pad, marginBottom: 12, padding: 14,
    borderRadius: T.rChip, backgroundColor: T.dangerA14,
    borderWidth: 1, borderColor: T.danger,
  },
  errorText: { fontSize: 12, color: T.danger, fontWeight: '700' },

  // Section label
  sectionLabel: {
    ...T.fontLabel,
    color: T.muted,
    marginHorizontal: T.pad,
    marginBottom: 10,
    marginTop: 4,
  },

  // ── Search pill ──
  searchPill: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: T.pad, marginBottom: 14,
    backgroundColor: T.glass,
    borderRadius: T.rPill,
    paddingHorizontal: 18,
    borderWidth: 1, borderColor: T.border,
    shadowColor: '#000', shadowOpacity: 0.2,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  searchIconText: { fontSize: 18, color: T.faint, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: T.white, paddingVertical: 13 },
  searchClear: { fontSize: 14, color: T.faint, padding: 4 },
  filterLines: { fontSize: 18, color: T.faint },

  // ── Autofill Banner ──
  autofillBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: T.pad, marginBottom: 16,
    backgroundColor: T.glass, borderRadius: T.rCard,
    padding: T.cardPadV, borderWidth: 1, borderColor: T.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.25,
    shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  autofillAccent: { position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: 2, backgroundColor: T.amber },
  autofillIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: T.amberA14,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 8, marginRight: 14,
  },
  autofillText: { flex: 1 },
  autofillTitle: { fontSize: 14, fontWeight: '700', color: T.white },
  autofillDesc: { ...T.fontCaption, color: T.muted, marginTop: 2 },
  autofillArrow: { fontSize: 18, fontWeight: '800', color: T.cyan, marginLeft: 8 },

  // ── Category chips ──
  chipsRow: { paddingHorizontal: T.pad, gap: 8, marginBottom: 18 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: T.rPill,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    backgroundColor: T.cyanA12,
    borderColor: 'rgba(0,229,255,0.4)',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: T.muted },
  chipTextActive: { color: T.cyan, fontWeight: '700' },
});