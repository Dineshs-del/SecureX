import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';
import { useVaultStore } from '../store/vaultStore';
import { AppHeader } from '../components/AppHeader';
import { AppBackground } from '../components/AppBackground';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';
import { MasterPasswordManager, MIN_MASTER_PASSWORD_LENGTH } from '../theme/database/MasterPasswordManager';
import { VaultImportExport } from '../utils/vaultImportExport';
import { IconCacheService } from '../services/IconCacheService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const rnBiometrics = new ReactNativeBiometrics();

const AUTO_LOCK_OPTIONS = [
  { label: 'Immediately', minutes: 0 },
  { label: '1 Minute', minutes: 1 },
  { label: '5 Minutes', minutes: 5 },
  { label: '15 Minutes', minutes: 15 },
  { label: '30 Minutes', minutes: 30 },
];

// Vector SVG Icons (20px line icons)
const KeyIcon = ({ size = 20, color = '#00e5ff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 2l-2 2m-3 3l2 2m-3-1l2 2m-8.5 2.5a5.5 5.5 0 1 1 7.78-7.78 5.5 5.5 0 0 1-7.78 7.78l-7 7v3h3l1.5-1.5V17h2v-2.5z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const FingerprintIcon = ({ size = 20, color = '#00e5ff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.81 3.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M15 5v0a8 8 0 0 0-12 7v3a2 2 0 0 0 2 2h1" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M18 9a9 9 0 0 1 .91 4.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M12 2v2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M17 17l.5.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M12 14v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ClockIcon = ({ size = 20, color = '#00e5ff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} />
    <Path d="M12 7v5l3 3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ShieldAlertIcon = ({ size = 20, color = '#00e5ff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1={12} y1={8} x2={12} y2={12} stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1={12} y1={16} x2={12.01} y2={16} stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const EyeOffIcon = ({ size = 20, color = '#00e5ff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1={1} y1={1} x2={23} y2={23} stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const SmartphoneIcon = ({ size = 20, color = '#00e5ff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={5} y={2} width={14} height={20} rx={2} ry={2} stroke={color} strokeWidth={2} />
    <Line x1={12} y1={18} x2={12.01} y2={18} stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const BanIcon = ({ size = 20, color = '#00e5ff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} />
    <Line x1={5.7} y1={5.7} x2={18.3} y2={18.3} stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const GlobeIcon = ({ size = 20, color = '#00e5ff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} />
    <Path d="M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const TrashCleanIcon = ({ size = 20, color = '#00e5ff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1={10} y1={11} x2={10} y2={17} stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1={14} y1={11} x2={14} y2={17} stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const PackageIcon = ({ size = 20, color = '#00e5ff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.78 0l-8-4A2 2 0 0 1 2 16.77V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1={12} y1={22.08} x2={12} y2={12} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const Trash2Icon = ({ size = 20, color = '#FB7185' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1={10} y1={11} x2={10} y2={17} stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1={14} y1={11} x2={14} y2={17} stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ChevronRightIcon = ({ size = 18, color = '#8696A8' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckIcon = ({ size = 16, color = '#00e5ff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Glass Toggle component (54x32)
const GlassToggle = ({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onValueChange(!value)}
      style={[
        {
          width: 54,
          height: 32,
          borderRadius: 16,
          padding: 3,
          justifyContent: 'center',
          backgroundColor: value ? '#00e5ff' : 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          borderColor: value ? 'rgba(0,229,255,0.6)' : 'rgba(255,255,255,0.15)',
        },
      ]}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: '#FFFFFF',
          transform: [{ translateX: value ? 22 : 0 }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
          elevation: 2,
        }}
      />
    </TouchableOpacity>
  );
};

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const {
    isBiometricEnabled,
    setBiometricEnabled,
    getAutoLockDuration,
    setAutoLockDuration,
    isBreachCheckEnabled,
    setBreachCheckEnabled,
    isSecureScreenEnabled,
    setSecureScreenEnabled,
    getNeverSaveDomains,
    setNeverSaveDomains,
    changeMasterPassword,
    autofillEnabled,
    checkAutofillStatus,
    resetVault,
  } = useVaultStore();

  const toastRef = useRef<MicroToastHandle>(null);

  const [biometricsOn, setBiometricsOn] = useState(true);
  const [biometryType, setBiometryType] = useState('Fingerprint');
  const [autoLockMins, setAutoLockMins] = useState(5);

  const [breachCheckOn, setBreachCheckOn] = useState(false);
  const [blockScreenshotsOn, setBlockScreenshotsOn] = useState(true);

  // Auto-lock bottom sheet modal
  const [autoLockModalVisible, setAutoLockModalVisible] = useState(false);

  // Never-Save Domains List (persisted in AsyncStorage + synced to Android AutofillService)
  const [neverSaveDomains, setNeverSaveDomainsState] = useState<string[]>([]);
  const [newDomainInput, setNewDomainInput] = useState('');
  const [showDomainModal, setShowDomainModal] = useState(false);

  // Change Master Password Modal
  const [changePwModal, setChangePwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [isChangingPw, setIsChangingPw] = useState(false);

  // Wipe Vault Modal with typed WIPE confirmation
  const [wipeModalVisible, setWipeModalVisible] = useState(false);
  const [wipePassword, setWipePassword] = useState('');
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isWipingVault, setIsWipingVault] = useState(false);

  // Export Encrypted Backup Modal
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExportBackup = async () => {
    if (!exportPassword) {
      toastRef.current?.show('Please enter your master password', 'error');
      return;
    }
    setIsExporting(true);
    try {
      const isValid = await MasterPasswordManager.verifyMasterPassword(exportPassword);
      if (!isValid) {
        toastRef.current?.show('Incorrect master password', 'error');
        setIsExporting(false);
        return;
      }
      const success = await VaultImportExport.exportVault(exportPassword);
      if (success) {
        setExportModalVisible(false);
        setExportPassword('');
        toastRef.current?.show('Encrypted backup exported successfully!', 'success');
      }
    } catch (err: any) {
      toastRef.current?.show(err.message || 'Export failed', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Online Icons Setting & Cache
  const [onlineIconsOn, setOnlineIconsOn] = useState(false);
  const [cachedIconCount, setCachedIconCount] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      checkAutofillStatus();
      IconCacheService.getCacheCount().then(setCachedIconCount);
    }, [checkAutofillStatus])
  );

  useEffect(() => {
    isBiometricEnabled().then(setBiometricsOn);
    getAutoLockDuration().then((d) => setAutoLockMins(d !== undefined ? d : 5));
    isBreachCheckEnabled().then(setBreachCheckOn);
    isSecureScreenEnabled().then(setBlockScreenshotsOn);
    getNeverSaveDomains().then(setNeverSaveDomainsState);
    IconCacheService.isOnlineIconsEnabled().then(setOnlineIconsOn);
    IconCacheService.getCacheCount().then(setCachedIconCount);
    checkAutofillStatus();

    rnBiometrics.isSensorAvailable().then((res) => {
      if (res.biometryType === BiometryTypes.TouchID || res.biometryType === BiometryTypes.Biometrics) {
        setBiometryType('Fingerprint');
      } else if (res.biometryType === BiometryTypes.FaceID) {
        setBiometryType('Face Unlock');
      }
    });
  }, [
    isBiometricEnabled,
    getAutoLockDuration,
    isBreachCheckEnabled,
    isSecureScreenEnabled,
    getNeverSaveDomains,
    checkAutofillStatus,
  ]);

  const handleToggleOnlineIcons = async (val: boolean) => {
    setOnlineIconsOn(val);
    await IconCacheService.setOnlineIconsEnabled(val);
    toastRef.current?.show(
      val ? 'Online icons enabled (domain-only queries)' : 'Online icons disabled',
      'success'
    );
  };

  const handleClearIconCache = async () => {
    const cleared = await IconCacheService.clearCache();
    setCachedIconCount(0);
    toastRef.current?.show(
      `Icon cache cleared (${cleared} domain${cleared === 1 ? '' : 's'} removed)`,
      'success'
    );
  };

  const handleToggleBiometrics = async (val: boolean) => {
    if (val) {
      const { available } = await rnBiometrics.isSensorAvailable();
      if (!available) {
        toastRef.current?.show('No biometric sensor enrolled on this device', 'error');
        return;
      }
    }
    setBiometricsOn(val);
    await setBiometricEnabled(val);
    toastRef.current?.show(
      val ? `${biometryType} enabled for vault unlock` : `${biometryType} disabled`,
      'success'
    );
  };

  const handleToggleBreachCheck = async (val: boolean) => {
    setBreachCheckOn(val);
    await setBreachCheckEnabled(val);
    toastRef.current?.show(
      val ? 'Breach check enabled & vault scanned' : 'Breach check disabled',
      'success'
    );
  };

  const handleToggleBlockScreenshots = async (val: boolean) => {
    setBlockScreenshotsOn(val);
    await setSecureScreenEnabled(val);
    toastRef.current?.show(
      val ? 'Screenshot protection enabled' : 'Screenshot protection disabled',
      'success'
    );
  };

  const handleSelectAutoLock = async (mins: number) => {
    setAutoLockMins(mins);
    await setAutoLockDuration(mins);
    setAutoLockModalVisible(false);
    toastRef.current?.show(
      `Auto-lock set to ${mins === 0 ? 'Immediately' : `${mins} minute${mins === 1 ? '' : 's'}`}`,
      'success'
    );
  };

  const handleAddNeverDomain = async () => {
    const clean = newDomainInput
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];
    if (!clean) return;
    if (!neverSaveDomains.includes(clean)) {
      const updated = [...neverSaveDomains, clean];
      setNeverSaveDomainsState(updated);
      await setNeverSaveDomains(updated);
      toastRef.current?.show(`Added ${clean} to Never-Save list`, 'success');
    }
    setNewDomainInput('');
  };

  const handleRemoveNeverDomain = async (domain: string) => {
    const updated = neverSaveDomains.filter((d) => d !== domain);
    setNeverSaveDomainsState(updated);
    await setNeverSaveDomains(updated);
    toastRef.current?.show(`Removed ${domain}`, 'info');
  };

  const handleChangeMasterPassword = async () => {
    if (!currentPw || !newPw || !confirmNewPw) {
      toastRef.current?.show('Please fill in all fields', 'error');
      return;
    }
    if (newPw !== confirmNewPw) {
      toastRef.current?.show('New passwords do not match', 'error');
      return;
    }
    if (newPw.length < MIN_MASTER_PASSWORD_LENGTH) {
      toastRef.current?.show(`Password must be at least ${MIN_MASTER_PASSWORD_LENGTH} characters`, 'error');
      return;
    }

    setIsChangingPw(true);
    try {
      const res = await changeMasterPassword(currentPw, newPw);
      if (!res.success) {
        toastRef.current?.show(res.error || 'Failed to update Master Password', 'error');
        return;
      }

      setChangePwModal(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmNewPw('');
      toastRef.current?.show('Master Password updated & vault re-encrypted!', 'success');
    } catch {
      toastRef.current?.show('Failed to update Master Password', 'error');
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleConfirmWipeVault = async () => {
    if (!wipePassword) {
      toastRef.current?.show('Please enter your Master Password', 'error');
      return;
    }
    if (wipeConfirmText !== 'WIPE') {
      toastRef.current?.show('Please type WIPE to confirm', 'error');
      return;
    }

    try {
      const isValid = await MasterPasswordManager.verifyMasterPassword(wipePassword);
      if (!isValid) {
        toastRef.current?.show('Incorrect Master Password', 'error');
        return;
      }

      setIsWipingVault(true);
      await resetVault();
      setWipeModalVisible(false);
      setWipePassword('');
      setWipeConfirmText('');
      toastRef.current?.show('Vault wiped and reset successfully', 'success');
    } catch (e: any) {
      toastRef.current?.show(e?.message || 'Wipe failed', 'error');
    } finally {
      setIsWipingVault(false);
    }
  };

  const getAutoLockLabel = () => {
    if (autoLockMins === 0) return 'Immediately';
    return `After ${autoLockMins} minute${autoLockMins === 1 ? '' : 's'} in the background`;
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E13" />
      <AppBackground />

      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title="Settings"
          subtitle="Security, autofill and data"
        />

        {/* SECURITY SECTION */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>SECURITY</Text>
        </View>

        <View style={s.card}>
          <View style={s.cardTopHighlight} />

          {/* Change master password */}
          <TouchableOpacity
            style={s.settingRow}
            activeOpacity={0.7}
            onPress={() => setChangePwModal(true)}
          >
            <View style={s.settingIconWrap}>
              <KeyIcon size={20} color="#00e5ff" />
            </View>
            <View style={s.settingInfo}>
              <Text style={s.settingTitle}>Change master password</Text>
              <Text style={s.settingDesc}>Re-encrypts your whole vault</Text>
            </View>
            <ChevronRightIcon size={18} color="#8696A8" />
          </TouchableOpacity>

          <View style={s.divider} />

          {/* Unlock with fingerprint */}
          <View style={s.settingRow}>
            <View style={s.settingIconWrap}>
              <FingerprintIcon size={20} color="#00e5ff" />
            </View>
            <View style={s.settingInfo}>
              <Text style={s.settingTitle}>Unlock with {biometryType.toLowerCase()}</Text>
              <Text style={s.settingDesc}>Prompts every single time</Text>
            </View>
            <GlassToggle value={biometricsOn} onValueChange={handleToggleBiometrics} />
          </View>

          <View style={s.divider} />

          {/* Auto-lock */}
          <TouchableOpacity
            style={s.settingRow}
            activeOpacity={0.7}
            onPress={() => setAutoLockModalVisible(true)}
          >
            <View style={s.settingIconWrap}>
              <ClockIcon size={20} color="#00e5ff" />
            </View>
            <View style={s.settingInfo}>
              <Text style={s.settingTitle}>Auto-lock</Text>
              <Text style={s.settingDesc}>{getAutoLockLabel()}</Text>
            </View>
            <ChevronRightIcon size={18} color="#8696A8" />
          </TouchableOpacity>

          <View style={s.divider} />

          {/* Check for known breaches */}
          <View style={s.settingRow}>
            <View style={s.settingIconWrap}>
              <ShieldAlertIcon size={20} color="#00e5ff" />
            </View>
            <View style={[s.settingInfo, { paddingRight: 8 }]}>
              <Text style={s.settingTitle}>Check for known breaches</Text>
              <Text style={s.settingDesc}>Sends only a 5-character hash prefix</Text>
            </View>
            <GlassToggle value={breachCheckOn} onValueChange={handleToggleBreachCheck} />
          </View>

          <View style={s.divider} />

          {/* Block screenshots */}
          <View style={s.settingRow}>
            <View style={s.settingIconWrap}>
              <EyeOffIcon size={20} color="#00e5ff" />
            </View>
            <View style={[s.settingInfo, { paddingRight: 8 }]}>
              <Text style={s.settingTitle}>Block screenshots</Text>
              <Text style={s.settingDesc}>Prevents screen capture of sensitive info</Text>
            </View>
            <GlassToggle value={blockScreenshotsOn} onValueChange={handleToggleBlockScreenshots} />
          </View>
        </View>

        {/* AUTOFILL SECTION */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>AUTOFILL</Text>
        </View>

        <View style={s.card}>
          <View style={s.cardTopHighlight} />

          {/* Android autofill */}
          <TouchableOpacity
            style={s.settingRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AutofillSetup')}
          >
            <View style={s.settingIconWrap}>
              <SmartphoneIcon size={20} color="#00e5ff" />
            </View>
            <View style={s.settingInfo}>
              <Text style={s.settingTitle}>Android autofill</Text>
              <Text style={[s.settingDesc, autofillEnabled && { color: '#34D399' }]}>
                {autofillEnabled ? 'Active • Autofill & autosave enabled' : 'Not active • Tap to enable'}
              </Text>
            </View>
            <ChevronRightIcon size={18} color="#8696A8" />
          </TouchableOpacity>

          <View style={s.divider} />

          {/* Never-save sites */}
          <TouchableOpacity
            style={s.settingRow}
            activeOpacity={0.7}
            onPress={() => setShowDomainModal(true)}
          >
            <View style={s.settingIconWrap}>
              <BanIcon size={20} color="#00e5ff" />
            </View>
            <View style={s.settingInfo}>
              <Text style={s.settingTitle}>Never-save sites</Text>
              <Text style={s.settingDesc}>{neverSaveDomains.length} site{neverSaveDomains.length === 1 ? '' : 's'} excluded</Text>
            </View>
            <ChevronRightIcon size={18} color="#8696A8" />
          </TouchableOpacity>

          <View style={s.divider} />

          {/* Load website icons online */}
          <View style={s.settingRow}>
            <View style={s.settingIconWrap}>
              <GlobeIcon size={20} color="#00e5ff" />
            </View>
            <View style={[s.settingInfo, { paddingRight: 8 }]}>
              <Text style={s.settingTitle}>Load website icons online</Text>
              <Text style={s.settingDesc}>Off keeps your site list private</Text>
            </View>
            <GlassToggle value={onlineIconsOn} onValueChange={handleToggleOnlineIcons} />
          </View>

          {onlineIconsOn && (
            <>
              <View style={s.divider} />
              <TouchableOpacity
                style={s.settingRow}
                activeOpacity={0.7}
                onPress={handleClearIconCache}
              >
                <View style={s.settingIconWrap}>
                  <TrashCleanIcon size={20} color="#00e5ff" />
                </View>
                <View style={s.settingInfo}>
                  <Text style={s.settingTitle}>Clear icon cache</Text>
                  <Text style={s.settingDesc}>
                    {cachedIconCount} icon{cachedIconCount === 1 ? '' : 's'} cached on disk
                  </Text>
                </View>
                <ChevronRightIcon size={18} color="#8696A8" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* DATA SECTION */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>DATA</Text>
        </View>

        <View style={s.card}>
          <View style={s.cardTopHighlight} />

          {/* Import passwords */}
          <TouchableOpacity
            style={s.settingRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ImportExport')}
          >
            <View style={s.settingIconWrap}>
              <PackageIcon size={20} color="#00e5ff" />
            </View>
            <View style={s.settingInfo}>
              <Text style={s.settingTitle}>Import passwords</Text>
              <Text style={s.settingDesc}>Chrome, Bitwarden, 1Password</Text>
            </View>
            <ChevronRightIcon size={18} color="#8696A8" />
          </TouchableOpacity>

          <View style={s.divider} />

          {/* Export encrypted backup */}
          <TouchableOpacity
            style={s.settingRow}
            activeOpacity={0.7}
            onPress={() => {
              setExportPassword('');
              setExportModalVisible(true);
            }}
          >
            <View style={s.settingIconWrap}>
              <PackageIcon size={20} color="#00e5ff" />
            </View>
            <View style={s.settingInfo}>
              <Text style={s.settingTitle}>Export encrypted backup</Text>
              <Text style={s.settingDesc}>Zero-knowledge encrypted .json file</Text>
            </View>
            <ChevronRightIcon size={18} color="#8696A8" />
          </TouchableOpacity>

          <View style={s.divider} />

          {/* Wipe vault */}
          <TouchableOpacity
            style={s.settingRow}
            activeOpacity={0.7}
            onPress={() => setWipeModalVisible(true)}
          >
            <View style={[s.settingIconWrap, s.redIconWrap]}>
              <Trash2Icon size={20} color="#FB7185" />
            </View>
            <View style={s.settingInfo}>
              <Text style={[s.settingTitle, s.redText]}>Wipe vault</Text>
              <Text style={s.settingDesc}>Permanently erases every login</Text>
            </View>
            <ChevronRightIcon size={18} color="#FB7185" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Auto-lock Bottom Sheet Modal */}
      <Modal visible={autoLockModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Auto-lock Inactivity Timer</Text>
            <Text style={s.modalSubtitle}>
              Choose how long SecureX remains unlocked in the background.
            </Text>

            {AUTO_LOCK_OPTIONS.map((opt) => {
              const isSelected = autoLockMins === opt.minutes;
              return (
                <TouchableOpacity
                  key={opt.minutes}
                  style={[s.sheetOptionRow, isSelected && s.sheetOptionSelected]}
                  onPress={() => handleSelectAutoLock(opt.minutes)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.sheetOptionText, isSelected && s.sheetOptionTextSelected]}>
                    {opt.label}
                  </Text>
                  {isSelected && <CheckIcon size={18} color="#00e5ff" />}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[s.modalCancelBtn, { marginTop: 16 }]}
              onPress={() => setAutoLockModalVisible(false)}
            >
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={changePwModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Change master password</Text>
            <Text style={s.modalSubtitle}>
              Re-encrypts your whole vault with a new zero-knowledge master key.
            </Text>

            <TextInput
              style={s.modalInput}
              secureTextEntry
              value={currentPw}
              onChangeText={setCurrentPw}
              placeholder="Current master password..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none"
            />

            <TextInput
              style={s.modalInput}
              secureTextEntry
              value={newPw}
              onChangeText={setNewPw}
              placeholder={`New master password (min ${MIN_MASTER_PASSWORD_LENGTH} chars)...`}
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none"
            />

            <TextInput
              style={s.modalInput}
              secureTextEntry
              value={confirmNewPw}
              onChangeText={setConfirmNewPw}
              placeholder="Confirm new password..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none"
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setChangePwModal(false)}
                disabled={isChangingPw}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.modalExportBtn}
                onPress={handleChangeMasterPassword}
                disabled={isChangingPw}
              >
                <Text style={s.modalExportText}>{isChangingPw ? 'RE-ENCRYPTING...' : 'UPDATE KEY'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Never-Save Blacklist Modal */}
      <Modal visible={showDomainModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Never-save sites</Text>
            <Text style={s.modalSubtitle}>
              SecureX will never prompt to auto-save credentials on these domains.
            </Text>

            <View style={s.addDomainRow}>
              <TextInput
                style={[s.modalInput, { flex: 1, marginBottom: 0 }]}
                value={newDomainInput}
                onChangeText={setNewDomainInput}
                placeholder="domain.com (e.g. internal.bank.com)"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="none"
              />
              <TouchableOpacity style={s.addDomainBtn} onPress={handleAddNeverDomain}>
                <Text style={s.addDomainBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s.domainListScroll} showsVerticalScrollIndicator={false}>
              {neverSaveDomains.length === 0 ? (
                <Text style={{ color: '#8696A8', fontSize: 13, textAlign: 'center', paddingVertical: 14 }}>
                  No excluded sites yet. Add a domain above.
                </Text>
              ) : (
                neverSaveDomains.map((d) => (
                  <View key={d} style={s.domainRow}>
                    <Text style={s.domainText}>{d}</Text>
                    <TouchableOpacity onPress={() => handleRemoveNeverDomain(d)}>
                      <Text style={s.removeDomainText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[s.modalCancelBtn, { marginTop: 14 }]}
              onPress={() => setShowDomainModal(false)}
            >
              <Text style={s.modalCancelText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Wipe Vault Confirmation Sheet */}
      <Modal visible={wipeModalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { borderColor: 'rgba(251,113,133,0.4)' }]}>
            <Text style={[s.modalTitle, { color: '#FB7185' }]}>⚠️ Wipe Vault Data</Text>
            <Text style={s.modalSubtitle}>
              Permanently erases every login and resets SecureX. Enter your master password and type WIPE below to confirm.
            </Text>

            <TextInput
              style={s.modalInput}
              secureTextEntry
              value={wipePassword}
              onChangeText={setWipePassword}
              placeholder="Enter master password..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none"
            />

            <TextInput
              style={s.modalInput}
              value={wipeConfirmText}
              onChangeText={setWipeConfirmText}
              placeholder="Type WIPE to confirm..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="characters"
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => {
                  setWipeModalVisible(false);
                  setWipePassword('');
                  setWipeConfirmText('');
                }}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalExportBtn, { backgroundColor: '#FB7185' }]}
                onPress={handleConfirmWipeVault}
                disabled={isWipingVault}
              >
                <Text style={[s.modalExportText, { color: '#0A0E13' }]}>
                  {isWipingVault ? 'WIPING...' : 'Wipe vault'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Encrypted Backup Modal */}
      <Modal visible={exportModalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Export Encrypted Backup</Text>
            <Text style={s.modalSubtitle}>
              Enter your master password to create an AES encrypted .json backup file of your vault.
            </Text>

            <TextInput
              style={s.modalInput}
              secureTextEntry
              value={exportPassword}
              onChangeText={setExportPassword}
              placeholder="Enter master password..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none"
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => {
                  setExportModalVisible(false);
                  setExportPassword('');
                }}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.modalExportBtn}
                onPress={handleExportBackup}
                disabled={isExporting}
              >
                <Text style={s.modalExportText}>
                  {isExporting ? 'EXPORTING...' : 'EXPORT BACKUP'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <MicroToast ref={toastRef} />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E13',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Section Headers
  sectionHeader: {
    marginBottom: 10,
    marginTop: 22,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8696A8',
    letterSpacing: 1.4, // 0.12em approx
  },

  // Card (C6 glass specification)
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    position: 'relative',
    overflow: 'hidden',
  },
  cardTopHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingVertical: 10,
  },
  settingIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0,229,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  redIconWrap: {
    backgroundColor: 'rgba(251,113,133,0.16)',
    borderColor: 'rgba(251,113,133,0.4)',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  redText: {
    color: '#FB7185',
  },
  settingDesc: {
    fontSize: 12,
    color: '#A3B1C2',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // Sheet Option Rows
  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sheetOptionSelected: {
    backgroundColor: 'rgba(0,229,255,0.1)',
    borderColor: 'rgba(0,229,255,0.3)',
  },
  sheetOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A3B1C2',
  },
  sheetOptionTextSelected: {
    color: '#00e5ff',
    fontWeight: '700',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#0c131d',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.3)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#A3B1C2',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: '#070b10',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    height: 48,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  modalExportBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
  },
  modalExportText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#080c10',
  },

  // Never Domain
  addDomainRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  addDomainBtn: {
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDomainBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#080c10',
  },
  domainListScroll: {
    maxHeight: 160,
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  domainText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'android' ? 'monospace' : undefined,
  },
  removeDomainText: {
    fontSize: 14,
    color: '#FB7185',
    padding: 6,
  },
});
