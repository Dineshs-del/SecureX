import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Linking,
  Vibration,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import ReactNativeBiometrics from 'react-native-biometrics';
import { useVaultStore } from '../store/vaultStore';
import { MasterPasswordManager } from '../theme/database/MasterPasswordManager';
import { AppBackground } from '../components/AppBackground';
import { GlassView } from '../components/GlassView';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';
import { CredentialIcon } from '../components/CredentialIcon';
import { CryptoService } from '../theme/crypto/CryptoService';

const rnBiometrics = new ReactNativeBiometrics();

// Vector SVG Icons
const ArrowLeftIcon = ({ size = 20, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PencilIcon = ({ size = 18, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CopyIcon = ({ size = 18, color = 'rgba(255,255,255,0.70)' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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

const TrashIcon = ({ size = 20, color = '#ff4d6d' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CredentialDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: string | undefined = route.params?.id;

  const { credentials, deleteCredential, updateCredential, isBiometricEnabled } = useVaultStore();
  const toastRef = useRef<MicroToastHandle>(null);

  const [decryptedPassword, setDecryptedPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const autoHideTimerRef = useRef<any>(null);
  const clipboardTimerRef = useRef<any>(null);

  // Find credential by ID
  const cred = useMemo(() => {
    if (!id) return null;
    return credentials.find((c) => c.id === id) || null;
  }, [credentials, id]);

  // Handle missing credential gracefully
  useEffect(() => {
    if (!cred) {
      toastRef.current?.show('Credential not found', 'error');
      const timer = setTimeout(() => {
        if (navigation.canGoBack()) navigation.goBack();
        else navigation.navigate('Vault');
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // Decrypt password into memory only
      try {
        const vKey = MasterPasswordManager.getVaultKey();
        const raw = cred.password;
        const dec = CryptoService.decryptStringWithKey(raw, vKey);
        setDecryptedPassword(dec || raw);
      } catch {
        setDecryptedPassword(cred.password);
      }
    }
  }, [cred, navigation]);

  // Clear password when leaving screen or blurring
  useFocusEffect(
    useCallback(() => {
      return () => {
        setDecryptedPassword('');
        setShowPassword(false);
        if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
      };
    }, [])
  );

  // Auto-hide password after 15 seconds
  useEffect(() => {
    if (showPassword) {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = setTimeout(() => {
        setShowPassword(false);
      }, 15000);
    }
    return () => {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, [showPassword]);

  if (!cred) {
    return (
      <SafeAreaView style={s.container}>
        <AppBackground />
        <MicroToast ref={toastRef} />
      </SafeAreaView>
    );
  }

  const verifyBiometricIfNeeded = async (): Promise<boolean> => {
    try {
      const biometricReqSetting = await isBiometricEnabled();
      if (!biometricReqSetting) return true;

      const { available } = await rnBiometrics.isSensorAvailable();
      if (!available) return true;

      const result = await rnBiometrics.simplePrompt({ promptMessage: 'Verify fingerprint to access password' });
      return result.success;
    } catch {
      return false;
    }
  };

  const handleToggleShowPassword = async () => {
    if (!showPassword) {
      const ok = await verifyBiometricIfNeeded();
      if (!ok) return;
    }
    setShowPassword(!showPassword);
  };

  const handleCopy = async (field: 'username' | 'password', val: string) => {
    if (!val) return;

    if (field === 'password') {
      const ok = await verifyBiometricIfNeeded();
      if (!ok) return;
    }

    Clipboard.setString(val);
    Vibration.vibrate(20);
    toastRef.current?.show(`${field === 'username' ? 'Username' : 'Password'} copied`, 'success');

    try {
      updateCredential(cred.id, { lastAccessed: new Date().toISOString() });
    } catch {}

    if (clipboardTimerRef.current) clearTimeout(clipboardTimerRef.current);
    clipboardTimerRef.current = setTimeout(async () => {
      try {
        const currentClip = await Clipboard.getString();
        if (currentClip === val) {
          Clipboard.setString('');
        }
      } catch {}
    }, 30000);
  };

  const handleOpenBrowser = () => {
    if (cred.url) {
      let targetUrl = cred.url;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `https://${targetUrl}`;
      }
      Linking.openURL(targetUrl).catch(() => {});
    }
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteModal(false);
    await deleteCredential(cred.id);
    toastRef.current?.show(`Deleted "${cred.name}"`, 'info');
    setTimeout(() => {
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('Vault');
    }, 300);
  };

  const getCleanDomainOrApp = () => {
    if (cred.url) {
      try {
        const hostname = new URL(cred.url.startsWith('http') ? cred.url : `https://${cred.url}`).hostname;
        return hostname.replace(/^www\./, '');
      } catch {
        return cred.url;
      }
    }
    if (cred.androidPackage) {
      const parts = cred.androidPackage.split('.');
      return parts[parts.length - 1] || cred.androidPackage;
    }
    return '';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently added';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return 'Recently added';
    }
  };

  const strengthLevel = cred.strength || 'strong';
  const strengthColor = strengthLevel === 'strong' ? '#34D399' : strengthLevel === 'fair' ? '#FBBF24' : '#FB7185';

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080c10" />
      <AppBackground />
      <MicroToast ref={toastRef} />

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Row */}
        <View style={s.headerRow}>
          <TouchableOpacity
            style={s.roundGlassBtn}
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ArrowLeftIcon size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.editGlassPill}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('AddCredential', { initialData: cred })}
            accessibilityLabel="Edit credential"
            accessibilityRole="button"
          >
            <PencilIcon size={16} color="#FFFFFF" />
            <Text style={s.editText} maxFontSizeMultiplier={1.3}>
              Edit
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={s.heroSection}>
          <CredentialIcon name={cred.name} url={cred.url} androidPackage={cred.androidPackage} size={84} />

          <Text style={s.heroTitle} maxFontSizeMultiplier={1.3}>
            {cred.name}
          </Text>

          {/* Chips Row */}
          <View style={s.chipsRow}>
            {/* Strength Chip */}
            <View style={[s.chipBadge, { backgroundColor: `${strengthColor}18`, borderColor: `${strengthColor}40` }]}>
              <View style={[s.chipDot, { backgroundColor: strengthColor }]} />
              <Text style={[s.chipText, { color: strengthColor }]}>
                {strengthLevel.charAt(0).toUpperCase() + strengthLevel.slice(1)}
              </Text>
            </View>

            {/* Type Chip */}
            <View style={s.chipBadge}>
              <Text style={s.chipTextSecondary}>
                {cred.androidPackage ? 'Android app' : 'Website'}
              </Text>
            </View>

            {cred.breached ? (
              <View style={[s.chipBadge, { backgroundColor: 'rgba(251,113,133,0.15)', borderColor: 'rgba(251,113,133,0.40)' }]}>
                <Text style={[s.chipText, { color: '#FB7185' }]}>Breached</Text>
              </View>
            ) : null}

            {strengthLevel === 'weak' && !cred.breached ? (
              <View style={[s.chipBadge, { backgroundColor: 'rgba(251,191,36,0.15)', borderColor: 'rgba(251,191,36,0.40)' }]}>
                <Text style={[s.chipText, { color: '#FBBF24' }]}>Reused</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Big Glass Card */}
        <GlassView style={s.bigGlassCard} borderRadius={26}>
          {/* USERNAME */}
          <View style={s.cardRow}>
            <View style={s.cardRowContent}>
              <View style={s.cardTextCol}>
                <Text style={s.rowLabel} maxFontSizeMultiplier={1.3}>
                  USERNAME / EMAIL
                </Text>
                <Text style={s.rowValue} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                  {cred.username || 'No username'}
                </Text>
              </View>
              <TouchableOpacity
                style={s.rowIconButton}
                activeOpacity={0.7}
                onPress={() => handleCopy('username', cred.username)}
                accessibilityLabel="Copy username"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <CopyIcon size={18} color="rgba(255,255,255,0.70)" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.hairline} />

          {/* PASSWORD */}
          <View style={s.cardRow}>
            <View style={s.cardRowContent}>
              <View style={s.cardTextCol}>
                <Text style={s.rowLabel} maxFontSizeMultiplier={1.3}>
                  PASSWORD
                </Text>
                <Text
                  style={[s.rowValue, s.monoFont, !showPassword && s.maskedFont]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {showPassword ? decryptedPassword : '••••••••••••••••'}
                </Text>

                {/* 4-Segment Strength Bar */}
                <View style={s.strengthSegmentsRow}>
                  <View style={[s.segBar, { backgroundColor: strengthColor }]} />
                  <View style={[s.segBar, { backgroundColor: strengthLevel !== 'weak' ? strengthColor : 'rgba(255,255,255,0.12)' }]} />
                  <View style={[s.segBar, { backgroundColor: strengthLevel === 'strong' ? strengthColor : 'rgba(255,255,255,0.12)' }]} />
                  <View style={[s.segBar, { backgroundColor: strengthLevel === 'strong' ? strengthColor : 'rgba(255,255,255,0.12)' }]} />
                </View>
              </View>

              <View style={s.passwordActionGroup}>
                <TouchableOpacity
                  style={s.rowIconButton}
                  activeOpacity={0.7}
                  onPress={handleToggleShowPassword}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showPassword ? <EyeOffIcon size={18} color="rgba(255,255,255,0.70)" /> : <EyeIcon size={18} color="rgba(255,255,255,0.70)" />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.rowIconButton, s.cyanIconButton]}
                  activeOpacity={0.7}
                  onPress={() => handleCopy('password', decryptedPassword)}
                  accessibilityLabel="Copy password"
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <CopyIcon size={18} color="#00e5ff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* WEBSITE / APP */}
          {cred.url || cred.androidPackage ? (
            <>
              <View style={s.hairline} />
              <TouchableOpacity
                style={s.cardRow}
                activeOpacity={cred.url ? 0.75 : 1}
                onPress={handleOpenBrowser}
                disabled={!cred.url}
              >
                <View style={s.cardRowContent}>
                  <View style={s.cardTextCol}>
                    <Text style={s.rowLabel} maxFontSizeMultiplier={1.3}>
                      {cred.url ? 'WEBSITE' : 'APP'}
                    </Text>
                    <Text style={s.rowValue} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                      {getCleanDomainOrApp()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </>
          ) : null}

          {/* NOTES (if exist) */}
          {cred.notes && cred.notes.trim().length > 0 ? (
            <>
              <View style={s.hairline} />
              <View style={s.cardRow}>
                <View style={s.cardTextCol}>
                  <Text style={s.rowLabel} maxFontSizeMultiplier={1.3}>
                    NOTES
                  </Text>
                  <Text style={s.notesValue} maxFontSizeMultiplier={1.3}>
                    {cred.notes}
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </GlassView>

        {/* Small Caption Centered */}
        <Text style={s.captionFooter} maxFontSizeMultiplier={1.3}>
          Added {formatDate(cred.createdAt)} · Last used today
        </Text>
      </ScrollView>

      {/* Pinned Bottom Actions */}
      <View style={s.pinnedBottomBar}>
        <TouchableOpacity
          style={s.sharePillWrapper}
          activeOpacity={0.85}
          onPress={() => handleCopy('password', decryptedPassword)}
          accessibilityLabel="Copy password"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={['#FFFFFF', '#CFE3FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.sharePillGradient}
          >
            <CopyIcon size={20} color="#080c10" />
            <Text style={s.sharePillText} maxFontSizeMultiplier={1.3}>
              Copy password
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.deleteRoundBtn}
          activeOpacity={0.8}
          onPress={() => setShowDeleteModal(true)}
          accessibilityLabel="Delete credential"
          accessibilityRole="button"
        >
          <TrashIcon size={20} color="#FB7185" />
        </TouchableOpacity>
      </View>

      {/* Delete Confirmation Glass Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setShowDeleteModal(false)}>
          <Pressable style={s.dialogBox} onPress={(e) => e.stopPropagation()}>
            <Text style={s.dialogTitle} maxFontSizeMultiplier={1.3}>
              Delete {cred.name}?
            </Text>
            <Text style={s.dialogDesc} maxFontSizeMultiplier={1.3}>
              This action cannot be undone and the record will be permanently removed from your vault.
            </Text>

            <View style={s.dialogButtonsRow}>
              <TouchableOpacity
                style={s.dialogCancelBtn}
                activeOpacity={0.7}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={s.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.dialogDeleteBtn}
                activeOpacity={0.8}
                onPress={handleDeleteConfirm}
              >
                <Text style={s.dialogDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 110,
    gap: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roundGlassBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editGlassPill: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.9,
    marginTop: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  chipBadge: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSecondary: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.60)',
  },
  bigGlassCard: {
    paddingVertical: 4,
  },
  cardRow: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  cardRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTextCol: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.70)',
    letterSpacing: 0.96,
    marginBottom: 4,
  },
  rowValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  monoFont: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1.5,
  },
  maskedFont: {
    letterSpacing: 3,
  },
  strengthSegmentsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
    width: 120,
  },
  segBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  notesValue: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
  },
  passwordActionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  rowIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cyanIconButton: {
    backgroundColor: 'rgba(0,229,255,0.12)',
    borderColor: 'rgba(0,229,255,0.30)',
  },
  hairline: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 20,
  },
  captionFooter: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.42)',
    textAlign: 'center',
    marginTop: 4,
  },
  pinnedBottomBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sharePillWrapper: {
    flex: 1,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.30,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sharePillGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  sharePillText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#080c10',
  },
  deleteRoundBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(251,113,133,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.50)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.70)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialogBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 24,
    alignItems: 'center',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  dialogDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.60)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  dialogButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  dialogCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dialogDeleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ff4d6d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogDeleteText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  shareSheetBox: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.50)',
    lineHeight: 18,
    marginBottom: 20,
  },
  shareOptionsGroup: {
    marginBottom: 20,
  },
  shareOptionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.42)',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  expiryChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  expiryChip: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiryChipActive: {
    backgroundColor: 'rgba(0,229,255,0.18)',
    borderColor: 'rgba(0,229,255,0.50)',
  },
  expiryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.70)',
  },
  expiryChipTextActive: {
    color: '#00e5ff',
  },
  generateLinkBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateLinkText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#080c10',
  },
});
