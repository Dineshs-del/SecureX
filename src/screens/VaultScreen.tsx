import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Vibration,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import Svg, { Path, Circle } from 'react-native-svg';
import { useVaultStore, VaultCredential } from '../store/vaultStore';
import { MasterPasswordManager } from '../theme/database/MasterPasswordManager';
import { AppBackground } from '../components/AppBackground';
import { GlassView } from '../components/GlassView';
import { AppHeader } from '../components/AppHeader';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';
import { CredentialIcon } from '../components/CredentialIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CryptoService } from '../theme/crypto/CryptoService';

// Vector SVG Icons
const SearchIcon = ({ size = 20, color = 'rgba(255,255,255,0.42)' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={11} cy={11} r={8} stroke={color} strokeWidth={2} />
    <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const KeyIcon = ({ size = 18, color = '#00e5ff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 2l-2 2m-3 3l2 2m-3-1l2 2m-8.5 2.5a5.5 5.5 0 1 1 7.78-7.78 5.5 5.5 0 0 1-7.78 7.78l-7 7v3h3l1.5-1.5V17h2v-2.5z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CHIPS = ['All', 'Web', 'Apps', 'Work', 'Personal'];

export const VaultScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const toastRef = useRef<MicroToastHandle>(null);
  const clipboardTimerRef = useRef<any>(null);

  const { credentials, loadCredentials, deleteCredential, updateCredential } = useVaultStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeChip, setActiveChip] = useState('All');
  const [selectedLongPressCred, setSelectedLongPressCred] = useState<VaultCredential | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadCredentials();
    }, [loadCredentials])
  );

  // Debounce search query ~150ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const copyToClipboard = useCallback(async (cred: VaultCredential, field: 'username' | 'password', value: string) => {
    if (!value) return;

    let textToCopy = value;
    if (field === 'password') {
      try {
        const vKey = MasterPasswordManager.getVaultKey();
        const decrypted = CryptoService.decryptStringWithKey(value, vKey);
        if (decrypted) textToCopy = decrypted;
      } catch {}
    }

    Clipboard.setString(textToCopy);
    Vibration.vibrate(20);
    toastRef.current?.show(`${field === 'username' ? 'Username' : 'Password'} copied`, 'success');

    try {
      updateCredential(cred.id, { lastAccessed: new Date().toISOString() });
    } catch {}

    if (clipboardTimerRef.current) clearTimeout(clipboardTimerRef.current);
    clipboardTimerRef.current = setTimeout(async () => {
      try {
        const currentClip = await Clipboard.getString();
        if (currentClip === textToCopy) {
          Clipboard.setString('');
        }
      } catch {}
    }, 30000);
  }, [updateCredential]);

  const handleDeletePrompt = (cred: VaultCredential) => {
    setSelectedLongPressCred(null);
    Alert.alert(
      'Delete Login',
      `Are you sure you want to delete "${cred.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCredential(cred.id);
            toastRef.current?.show('Login deleted', 'info');
          },
        },
      ]
    );
  };

  // Filter list by search query and category chips
  const filteredCredentials = useMemo(() => {
    return credentials.filter((cred) => {
      // Category filter
      if (activeChip !== 'All') {
        const cat = (cred.category || '').toLowerCase();
        const url = (cred.url || '').toLowerCase();
        const pkg = (cred.androidPackage || '').toLowerCase();

        if (activeChip === 'Web') {
          const isWeb = cat === 'web' || cat.includes('web') || url.startsWith('http://') || url.startsWith('https://');
          if (!isWeb) return false;
        } else if (activeChip === 'Apps') {
          const isApp = cat === 'apps' || cat.includes('app') || pkg.length > 0;
          if (!isApp) return false;
        } else if (activeChip === 'Work' && !cat.includes('work') && !cat.includes('office')) {
          return false;
        } else if (activeChip === 'Personal' && !cat.includes('personal')) {
          return false;
        }
      }

      // Search query
      if (debouncedQuery.trim().length > 0) {
        const q = debouncedQuery.toLowerCase().trim();
        const nameMatch = cred.name.toLowerCase().includes(q);
        const userMatch = cred.username.toLowerCase().includes(q);
        const urlMatch = (cred.url || '').toLowerCase().includes(q);
        return nameMatch || userMatch || urlMatch;
      }

      return true;
    });
  }, [credentials, debouncedQuery, activeChip]);

  const renderItem = useCallback(({ item }: { item: VaultCredential }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => navigation.navigate('CredentialDetail', { id: item.id })}
      onLongPress={() => setSelectedLongPressCred(item)}
      accessibilityLabel={`Item ${item.name}`}
      accessibilityRole="button"
    >
      <GlassView style={s.itemRowCard} borderRadius={20}>
        <View style={s.itemRowContent}>
          <CredentialIcon name={item.name} size={46} />

          <View style={s.itemInfo}>
            <Text style={s.itemName} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {item.name}
            </Text>
            <Text style={s.itemUsername} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {item.username || 'No username'}
            </Text>
          </View>

          <TouchableOpacity
            style={s.copyPassButton}
            activeOpacity={0.7}
            onPress={() => copyToClipboard(item, 'password', item.password)}
            accessibilityLabel="Copy password"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <KeyIcon size={18} color="#00e5ff" />
          </TouchableOpacity>
        </View>
      </GlassView>
    </TouchableOpacity>
  ), [navigation, copyToClipboard]);

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080c10" />
      <AppBackground />
      <MicroToast ref={toastRef} />

      <AppHeader
        title="Items"
        subtitle={`${credentials.length} ${credentials.length === 1 ? 'login' : 'logins'}, all encrypted`}
      />

      <View style={s.searchFilterBlock}>
        {/* Search Bar */}
        <View style={s.searchPill}>
          <SearchIcon size={20} color="rgba(255,255,255,0.42)" />
          <TextInput
            style={s.searchInput}
            placeholder="Search name, username or site"
            placeholderTextColor="rgba(255,255,255,0.30)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            maxFontSizeMultiplier={1.3}
          />
        </View>

        {/* Filter Chips Horizontal Row */}
        <View style={s.chipsRow}>
          {CHIPS.map((chip) => {
            const isActive = activeChip === chip;
            return (
              <TouchableOpacity
                key={chip}
                activeOpacity={0.75}
                onPress={() => setActiveChip(chip)}
                style={[s.chipPill, isActive ? s.chipActive : s.chipInactive]}
                accessibilityLabel={`Filter ${chip}`}
                accessibilityRole="button"
              >
                <Text
                  style={[s.chipText, isActive ? s.chipTextActive : s.chipTextInactive]}
                  maxFontSizeMultiplier={1.3}
                >
                  {chip}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Main FlatList of Vault Credentials */}
      <FlatList
        data={filteredCredentials}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[s.listContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <GlassView style={s.emptyCard} borderRadius={20}>
            {debouncedQuery.trim().length > 0 ? (
              <Text style={s.emptyTitle} maxFontSizeMultiplier={1.3}>
                No matches for "{debouncedQuery}"
              </Text>
            ) : (
              <>
                <Text style={s.emptyTitle} maxFontSizeMultiplier={1.3}>
                  Your vault is empty
                </Text>
                <Text style={s.emptySub} maxFontSizeMultiplier={1.3}>
                  Add your first login account to enable 1-tap autofill.
                </Text>
                <TouchableOpacity
                  style={s.emptyAddBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('AddCredential', { category: 'Web' })}
                  accessibilityLabel="Add login"
                  accessibilityRole="button"
                >
                  <Text style={s.emptyAddBtnText} maxFontSizeMultiplier={1.3}>
                    Add login
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </GlassView>
        }
      />

      {/* Long Press Action Modal */}
      <Modal
        visible={selectedLongPressCred !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedLongPressCred(null)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setSelectedLongPressCred(null)}>
          <View style={s.longPressMenu}>
            <Text style={s.longPressTitle} numberOfLines={1}>
              {selectedLongPressCred?.name}
            </Text>

            <TouchableOpacity
              style={s.menuItem}
              onPress={() => {
                if (selectedLongPressCred) copyToClipboard(selectedLongPressCred, 'username', selectedLongPressCred.username);
                setSelectedLongPressCred(null);
              }}
            >
              <Text style={s.menuItemText}>Copy username</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.menuItem}
              onPress={() => {
                if (selectedLongPressCred) copyToClipboard(selectedLongPressCred, 'password', selectedLongPressCred.password);
                setSelectedLongPressCred(null);
              }}
            >
              <Text style={s.menuItemText}>Copy password</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.menuItem}
              onPress={() => {
                if (selectedLongPressCred) {
                  const cred = selectedLongPressCred;
                  setSelectedLongPressCred(null);
                  navigation.navigate('AddCredential', { initialData: cred });
                }
              }}
            >
              <Text style={s.menuItemText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.menuItem, s.menuItemDelete]}
              onPress={() => {
                if (selectedLongPressCred) handleDeletePrompt(selectedLongPressCred);
              }}
            >
              <Text style={s.menuItemDeleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>


    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080c10',
  },
  headerBlock: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.9,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.50)',
    marginTop: 2,
  },
  lockButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPill: {
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 10,
    paddingVertical: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipPill: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: 'rgba(34,211,238,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(103,232,249,0.55)',
  },
  chipInactive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#CFFAFE',
  },
  chipTextInactive: {
    color: 'rgba(255,255,255,0.60)',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110,
    gap: 10,
  },
  itemRowCard: {
    minHeight: 70,
    padding: 12,
  },
  itemRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  itemUsername: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.50)',
  },
  copyPassButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,229,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.50)',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyAddBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAddBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#080c10',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  longPressMenu: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 16,
    gap: 4,
  },
  longPressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuItemDelete: {
    backgroundColor: 'rgba(255,77,109,0.12)',
    marginTop: 8,
  },
  menuItemDeleteText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ff4d6d',
  },
  searchFilterBlock: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
});
