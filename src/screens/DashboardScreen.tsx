import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Vibration,
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
const ChevronRightIcon = ({ size = 18, color = 'rgba(255,255,255,0.40)' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const DownloadIcon = ({ size = 22, color = '#22d3ee' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const KeyIcon = ({ size = 20, color = '#00e5ff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 2l-2 2m-3 3l2 2m-3-1l2 2m-8.5 2.5a5.5 5.5 0 1 1 7.78-7.78 5.5 5.5 0 0 1-7.78 7.78l-7 7v3h3l1.5-1.5V17h2v-2.5z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BoltIcon = ({ size = 20, color = '#34D399' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PersonIcon = ({ size = 18, color = 'rgba(255,255,255,0.70)' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const toastRef = useRef<MicroToastHandle>(null);
  const clipboardTimerRef = useRef<any>(null);

  const { credentials, loadCredentials, stats, loadStats, updateCredential, autofillEnabled, checkAutofillStatus } = useVaultStore();

  useFocusEffect(
    useCallback(() => {
      loadCredentials();
      loadStats();
      checkAutofillStatus();
    }, [loadCredentials, loadStats, checkAutofillStatus])
  );

  const getGreetingLabel = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'GOOD MORNING';
    if (hour >= 12 && hour < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  // Clipboard copy helper with 30s auto-clear timer and lastAccessed timestamp update
  const copyToClipboard = async (cred: VaultCredential, field: 'username' | 'password', value: string) => {
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

    // Update credential lastAccessed timestamp
    try {
      updateCredential(cred.id, { lastAccessed: new Date().toISOString() });
    } catch {}

    // Auto-clear clipboard after 30 seconds if content matches
    if (clipboardTimerRef.current) clearTimeout(clipboardTimerRef.current);
    clipboardTimerRef.current = setTimeout(async () => {
      try {
        const currentClip = await Clipboard.getString();
        if (currentClip === textToCopy) {
          Clipboard.setString('');
        }
      } catch {}
    }, 30000);
  };

  // Health score values
  const isVaultEmpty = credentials.length === 0;
  const securityScore = isVaultEmpty ? 100 : (stats.securityScore || 100);
  const ringColor = securityScore >= 80 ? '#34D399' : securityScore >= 50 ? '#FBBF24' : '#FB7185';
  const healthStatus = securityScore >= 80 ? 'Looking good.' : 'Action required. Weak credentials found.';

  // SVG Health Progress Ring calculation
  const ringRadius = 28;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (securityScore / 100) * ringCircumference;

  // Quick-access core tiles
  const categoryTiles = [
    {
      title: 'Logins & Apps',
      subtitle: `${credentials.length} ${credentials.length === 1 ? 'login' : 'logins'}`,
      subtitleColor: 'rgba(255,255,255,0.50)',
      Icon: KeyIcon,
      iconColor: '#00e5ff',
      bgColor: 'rgba(0,229,255,0.12)',
      onPress: () => navigation.navigate('Vault'),
    },
    {
      title: 'Android Autofill',
      subtitle: autofillEnabled ? 'Active • Fingerprint' : 'Tap to enable',
      subtitleColor: autofillEnabled ? '#34D399' : '#FBBF24',
      Icon: BoltIcon,
      iconColor: autofillEnabled ? '#34D399' : '#FBBF24',
      bgColor: autofillEnabled ? 'rgba(52,211,153,0.14)' : 'rgba(251,191,36,0.14)',
      onPress: () => navigation.navigate('AutofillSetup'),
    },
  ];

  const recentLogins = credentials.slice(0, 3);

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080c10" />
      <AppBackground />
      <MicroToast ref={toastRef} />

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* AppHeader */}
        <AppHeader
          greeting={getGreetingLabel()}
          title="SecureX Vault"
        />

        {/* Vault Security Health Card */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Security')}
          accessibilityLabel="Vault Security Health"
          accessibilityRole="button"
        >
          <GlassView style={s.healthCard} borderRadius={28}>
            <View style={s.healthTopRow}>
              {/* Ring Progress */}
              <View style={s.ringWrapper}>
                <Svg width={68} height={68} viewBox="0 0 68 68">
                  <Circle
                    cx={34}
                    cy={34}
                    r={ringRadius}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth={5}
                    fill="none"
                  />
                  <Circle
                    cx={34}
                    cy={34}
                    r={ringRadius}
                    stroke={ringColor}
                    strokeWidth={5}
                    strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    fill="none"
                    transform="rotate(-90 34 34)"
                  />
                </Svg>
                <View style={s.ringTextContainer}>
                  <Text style={s.ringPercentText} maxFontSizeMultiplier={1.3}>
                    {securityScore}%
                  </Text>
                </View>
              </View>

              {/* Status Info */}
              <View style={s.healthTextContainer}>
                <Text style={s.healthCardTitle} maxFontSizeMultiplier={1.3}>
                  Vault Security Health
                </Text>
                <Text style={s.healthStatusSub} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                  {healthStatus}
                </Text>
              </View>

              <ChevronRightIcon size={18} color="rgba(255,255,255,0.40)" />
            </View>

            {/* Inner Stats Panel */}
            <View style={s.healthInnerPanel}>
              <View style={s.statCol}>
                <Text style={s.statValWhite}>{stats.total || credentials.length}</Text>
                <Text style={s.statLbl}>Total items</Text>
              </View>

              <View style={s.statHairline} />

              <View style={s.statCol}>
                <Text style={s.statValAmber}>{stats.weak || 0}</Text>
                <Text style={s.statLbl}>Weak</Text>
              </View>

              <View style={s.statHairline} />

              <View style={s.statCol}>
                <Text style={s.statValRed}>{stats.breached || 0}</Text>
                <Text style={s.statLbl}>Breached</Text>
              </View>
            </View>
          </GlassView>
        </TouchableOpacity>

        {/* Import Banner */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate('ImportExport')}
          accessibilityLabel="Import passwords"
          accessibilityRole="button"
        >
          <GlassView style={s.importCard} borderRadius={24}>
            <View style={s.importIconTile}>
              <DownloadIcon size={22} color="#22d3ee" />
            </View>

            <View style={s.importTextContainer}>
              <Text style={s.importTitle} maxFontSizeMultiplier={1.3}>
                Import your passwords
              </Text>
              <Text style={s.importSub} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                Chrome, Bitwarden, 1Password or a file
              </Text>
            </View>

            <ChevronRightIcon size={18} color="rgba(34,211,238,0.70)" />
          </GlassView>
        </TouchableOpacity>

        {/* Vault Categories Grid */}
        <View style={s.sectionHeaderContainer}>
          <Text style={s.sectionLabel} maxFontSizeMultiplier={1.3}>
            VAULT CATEGORIES
          </Text>
        </View>

        <View style={s.categoryGrid}>
          {categoryTiles.map((tile) => {
            const TileIcon = tile.Icon;
            return (
              <TouchableOpacity
                key={tile.title}
                style={s.gridCol}
                activeOpacity={0.85}
                onPress={tile.onPress}
                accessibilityLabel={`${tile.title}, ${tile.subtitle}`}
                accessibilityRole="button"
              >
                <GlassView style={s.categoryCard} borderRadius={22}>
                  <View style={[s.categoryIconTile, { backgroundColor: tile.bgColor }]}>
                    <TileIcon size={20} color={tile.iconColor} />
                  </View>
                  <Text style={s.categoryTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                    {tile.title}
                  </Text>
                  <Text style={[s.categoryCount, { color: tile.subtitleColor }]} maxFontSizeMultiplier={1.3}>
                    {tile.subtitle}
                  </Text>
                </GlassView>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recent Credentials List */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionLabel} maxFontSizeMultiplier={1.3}>
            RECENT CREDENTIALS
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Vault')}
            accessibilityLabel={`View all ${credentials.length} items`}
            accessibilityRole="button"
          >
            <Text style={s.viewAllText} maxFontSizeMultiplier={1.3}>
              View all ({credentials.length})
            </Text>
          </TouchableOpacity>
        </View>

        {recentLogins.length > 0 ? (
          <GlassView style={s.recentGroupCard} borderRadius={24}>
            {recentLogins.map((cred, idx) => (
              <View key={cred.id}>
                {idx > 0 ? <View style={s.rowSeparator} /> : null}
                <TouchableOpacity
                  style={s.recentRow}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate('CredentialDetail', { id: cred.id })}
                  accessibilityLabel={`Credential ${cred.name}`}
                  accessibilityRole="button"
                >
                  <View style={s.recentIconWrapper}>
                    <CredentialIcon name={cred.name} size={46} />
                  </View>

                  <View style={s.recentInfo}>
                    <Text style={s.recentName} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                      {cred.name}
                    </Text>
                    <Text style={s.recentUsername} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                      {cred.username || 'No username'}
                    </Text>
                  </View>

                  <View style={s.actionButtonsGroup}>
                    {/* Copy Username */}
                    <TouchableOpacity
                      style={s.roundGlassActionBtn}
                      activeOpacity={0.7}
                      onPress={() => copyToClipboard(cred, 'username', cred.username)}
                      accessibilityLabel="Copy username"
                      accessibilityRole="button"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <PersonIcon size={18} color="rgba(255,255,255,0.70)" />
                    </TouchableOpacity>

                    {/* Copy Password */}
                    <TouchableOpacity
                      style={[s.roundGlassActionBtn, s.cyanTintActionBtn]}
                      activeOpacity={0.7}
                      onPress={() => copyToClipboard(cred, 'password', cred.password)}
                      accessibilityLabel="Copy password"
                      accessibilityRole="button"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <KeyIcon size={18} color="#00e5ff" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </GlassView>
        ) : (
          <GlassView style={s.emptyStateCard} borderRadius={24}>
            <Text style={s.emptyTitle} maxFontSizeMultiplier={1.3}>
              Your vault is empty
            </Text>
            <Text style={s.emptySub} maxFontSizeMultiplier={1.3}>
              Add your first login account to enable instant 1-tap autofill.
            </Text>
            <TouchableOpacity
              style={s.emptyAddBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AddCredential', { category: 'Web' })}
              accessibilityLabel="Add your first login"
              accessibilityRole="button"
            >
              <Text style={s.emptyAddBtnText} maxFontSizeMultiplier={1.3}>
                Add your first login
              </Text>
            </TouchableOpacity>
          </GlassView>
        )}
      </ScrollView>


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
    paddingTop: 52,
    paddingBottom: 110,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  subHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.42)',
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.9,
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
  healthCard: {
    padding: 18,
  },
  healthTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ringWrapper: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  ringTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercentText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  healthTextContainer: {
    flex: 1,
  },
  healthCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  healthStatusSub: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.60)',
  },
  healthInnerPanel: {
    backgroundColor: 'rgba(10,14,19,0.38)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValWhite: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statValAmber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FBBF24',
    marginBottom: 2,
  },
  statValRed: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FB7185',
    marginBottom: 2,
  },
  statLbl: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.42)',
  },
  statHairline: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  importCard: {
    padding: 14,
    backgroundColor: 'rgba(34,211,238,0.09)',
    borderColor: 'rgba(103,232,249,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  importIconTile: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(34,211,238,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  importTextContainer: {
    flex: 1,
  },
  importTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  importSub: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.60)',
  },
  sectionHeaderContainer: {
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.42)',
    letterSpacing: 1.2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00e5ff',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCol: {
    width: '48.5%',
  },
  categoryCard: {
    padding: 14,
  },
  categoryIconTile: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.50)',
  },
  recentGroupCard: {
    padding: 6,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  rowSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 12,
  },
  recentIconWrapper: {
    marginRight: 12,
  },
  recentInfo: {
    flex: 1,
    marginRight: 8,
  },
  recentName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  recentUsername: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.50)',
  },
  actionButtonsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  roundGlassActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cyanTintActionBtn: {
    backgroundColor: 'rgba(0,229,255,0.12)',
    borderColor: 'rgba(0,229,255,0.30)',
  },
  emptyStateCard: {
    padding: 24,
    alignItems: 'center',
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
    lineHeight: 20,
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
});
