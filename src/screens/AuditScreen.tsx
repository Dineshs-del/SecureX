import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useVaultStore } from '../store/vaultStore';
import { AppHeader } from '../components/AppHeader';
import { AppBackground } from '../components/AppBackground';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';
import { CredentialIcon } from '../components/CredentialIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyzeVaultSecurity } from '../utils/securityAudit';

const ShieldAlertIcon = ({ size = 22, color = '#FB7185' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 8v4M12 16h.01" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LockWarningIcon = ({ size = 22, color = '#FBBF24' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ReusedIcon = ({ size = 22, color = '#FBBF24' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ClockIcon = ({ size = 22, color = '#5EEAD4' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 6v6l4 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronRightIcon = ({ size = 18, color = 'rgba(255,255,255,0.40)' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const AuditScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { credentials, loadCredentials, loadStats, recalculateAllStrengths } = useVaultStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const toastRef = useRef<MicroToastHandle>(null);

  useFocusEffect(
    useCallback(() => {
      loadCredentials();
      loadStats();
    }, [loadCredentials, loadStats])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadCredentials();
      await recalculateAllStrengths();
      toastRef.current?.show('Audit refreshed • Vault scanned', 'success');
    } finally {
      setIsRefreshing(false);
    }
  };

  const audit = analyzeVaultSecurity(credentials);
  const { score, breachedCount, weakCount, reusedCount, oldCount, issues, totalProblems } = audit;

  let statusTitle = 'Healthy';
  let ringColor = '#5EEAD4';
  let titleColor = '#99F6E4';
  if (score < 60) {
    statusTitle = 'Needs attention';
    ringColor = '#FB7185';
    titleColor = '#FDA4AF';
  } else if (score < 85) {
    statusTitle = 'Fair';
    ringColor = '#FBBF24';
    titleColor = '#FCD34D';
  }

  const ringRadius = 34;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (score / 100) * ringCircumference;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E13" />
      <AppBackground />
      <MicroToast ref={toastRef} />

      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title="Audit"
          subtitle="Checked on this phone, just now"
          showRefresh={true}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Score Card */}
        <View style={s.scoreCard}>
          <View style={s.cardTopHighlight} />
          <View style={s.scoreRow}>
            <View style={s.ringWrapper}>
              <Svg width={88} height={88} viewBox="0 0 88 88">
                <Circle
                  cx={44}
                  cy={44}
                  r={ringRadius}
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={9}
                  fill="none"
                />
                <Circle
                  cx={44}
                  cy={44}
                  r={ringRadius}
                  stroke={ringColor}
                  strokeWidth={9}
                  strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  fill="none"
                  transform="rotate(-90 44 44)"
                />
              </Svg>
              <View style={s.ringTextContainer}>
                <Text style={[s.ringPercentText, { color: ringColor }]} maxFontSizeMultiplier={1.3}>
                  {score}%
                </Text>
              </View>
            </View>

            <View style={s.scoreTextWrap}>
              <Text style={[s.statusTitleText, { color: titleColor }]} maxFontSizeMultiplier={1.3}>
                {statusTitle}
              </Text>
              <Text style={s.scoreSummaryText} maxFontSizeMultiplier={1.3}>
                {totalProblems === 0
                  ? 'No problems found.'
                  : `${totalProblems} problem${totalProblems === 1 ? '' : 's'} across ${credentials.length} login${credentials.length === 1 ? '' : 's'}. Fix the red one first.`}
              </Text>
            </View>
          </View>
        </View>

        {/* 2x2 Grid of Count Tiles */}
        <View style={s.grid2x2}>
          {/* Breached (red) */}
          <View style={s.tileCard}>
            <View style={s.tileContent}>
              <View style={[s.tileIconBox, { backgroundColor: 'rgba(251,113,133,0.16)', borderColor: 'rgba(251,113,133,0.40)' }]}>
                <ShieldAlertIcon size={22} color="#FB7185" />
              </View>
              <View style={s.tileTextWrap}>
                <Text style={[s.tileNumber, { color: '#FB7185' }]} maxFontSizeMultiplier={1.3}>
                  {breachedCount}
                </Text>
                <Text style={s.tileLabel} maxFontSizeMultiplier={1.3}>Breached</Text>
              </View>
            </View>
          </View>

          {/* Weak (amber) */}
          <View style={s.tileCard}>
            <View style={s.tileContent}>
              <View style={[s.tileIconBox, { backgroundColor: 'rgba(251,191,36,0.16)', borderColor: 'rgba(251,191,36,0.40)' }]}>
                <LockWarningIcon size={22} color="#FBBF24" />
              </View>
              <View style={s.tileTextWrap}>
                <Text style={[s.tileNumber, { color: '#FBBF24' }]} maxFontSizeMultiplier={1.3}>
                  {weakCount}
                </Text>
                <Text style={s.tileLabel} maxFontSizeMultiplier={1.3}>Weak</Text>
              </View>
            </View>
          </View>

          {/* Reused (amber) */}
          <View style={s.tileCard}>
            <View style={s.tileContent}>
              <View style={[s.tileIconBox, { backgroundColor: 'rgba(251,191,36,0.16)', borderColor: 'rgba(251,191,36,0.40)' }]}>
                <ReusedIcon size={22} color="#FBBF24" />
              </View>
              <View style={s.tileTextWrap}>
                <Text style={[s.tileNumber, { color: '#FBBF24' }]} maxFontSizeMultiplier={1.3}>
                  {reusedCount}
                </Text>
                <Text style={s.tileLabel} maxFontSizeMultiplier={1.3}>Reused</Text>
              </View>
            </View>
          </View>

          {/* Old, 1 yr+ (teal when 0) */}
          <View style={s.tileCard}>
            <View style={s.tileContent}>
              <View style={[s.tileIconBox, {
                backgroundColor: oldCount === 0 ? 'rgba(94,234,212,0.16)' : 'rgba(251,191,36,0.16)',
                borderColor: oldCount === 0 ? 'rgba(94,234,212,0.40)' : 'rgba(251,191,36,0.40)',
              }]}>
                <ClockIcon size={22} color={oldCount === 0 ? '#5EEAD4' : '#FBBF24'} />
              </View>
              <View style={s.tileTextWrap}>
                <Text style={[s.tileNumber, { color: oldCount === 0 ? '#5EEAD4' : '#FBBF24' }]} maxFontSizeMultiplier={1.3}>
                  {oldCount}
                </Text>
                <Text style={s.tileLabel} maxFontSizeMultiplier={1.3}>Old, 1 yr+</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Fix These Section */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel} maxFontSizeMultiplier={1.3}>FIX THESE</Text>
        </View>

        {issues.length === 0 ? (
          <View style={s.allClearCard}>
            <View style={s.cardTopHighlight} />
            <Text style={s.allClearEmoji}>🛡️</Text>
            <Text style={s.allClearTitle} maxFontSizeMultiplier={1.3}>All clear</Text>
            <Text style={s.allClearDesc} maxFontSizeMultiplier={1.3}>
              No weak, breached, reused, or outdated passwords found in your vault.
            </Text>
          </View>
        ) : (
          <View style={s.issuesList}>
            {issues.map((issue) => {
              const { credential: item, reason, tagText, tagColor } = issue;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={s.issueCard}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('CredentialDetail', { id: item.id })}
                  accessibilityLabel={`Credential ${item.name}, ${tagText}`}
                  accessibilityRole="button"
                >
                  <View style={s.cardTopHighlight} />
                  <View style={s.issueRow}>
                    <View style={s.iconWrapper}>
                      <CredentialIcon
                        name={item.name}
                        url={item.url}
                        androidPackage={item.androidPackage}
                        size={42}
                      />
                    </View>

                    <View style={s.issueDetails}>
                      <Text style={s.issueName} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                        {item.name}
                      </Text>
                      <Text style={s.issueReason} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                        {reason}
                      </Text>
                    </View>

                    <View style={[s.tagBadge, { backgroundColor: `${tagColor}28`, borderColor: `${tagColor}66` }]}>
                      <Text style={[s.tagText, { color: tagColor }]} maxFontSizeMultiplier={1.3}>
                        {tagText}
                      </Text>
                    </View>

                    <ChevronRightIcon size={18} color="rgba(255,255,255,0.4)" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>


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
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#A3B1C2',
    marginTop: 2,
    fontWeight: '500',
  },
  refreshBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.30,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  cardTopHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ringWrapper: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercentText: {
    fontSize: 24,
    fontWeight: '800',
  },
  scoreTextWrap: {
    flex: 1,
  },
  statusTitleText: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 4,
  },
  scoreSummaryText: {
    fontSize: 14,
    color: '#C3CEDB',
    lineHeight: 20,
    fontWeight: '500',
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  tileCard: {
    width: '48.5%',
    height: 84,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  tileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tileIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  tileTextWrap: {
    flex: 1,
  },
  tileNumber: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A3B1C2',
    marginTop: 1,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8696A8',
    letterSpacing: 1.4,
  },
  issuesList: {
    gap: 8,
  },
  issueCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 14,
    minHeight: 62,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    marginRight: 12,
  },
  issueDetails: {
    flex: 1,
    marginRight: 12,
  },
  issueName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  issueReason: {
    fontSize: 13,
    color: '#A3B1C2',
    fontWeight: '500',
  },
  tagBadge: {
    borderWidth: 1,
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  allClearCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    position: 'relative',
    overflow: 'hidden',
  },
  allClearEmoji: {
    fontSize: 38,
    marginBottom: 10,
  },
  allClearTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#5EEAD4',
    marginBottom: 4,
  },
  allClearDesc: {
    fontSize: 13,
    color: '#A3B1C2',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
});
