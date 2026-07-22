import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Animated, Easing, StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useVaultStore } from '../store/vaultStore';
import { BottomNav } from '../components/BottomNav';
import { AppBackground } from '../components/AppBackground';
import { T } from '../theme/tokens';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';

// ── Greeting by time of day ──
const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { 
    stats, credentials, loadStats, loadCredentials, 
    autofillEnabled, checkAutofillStatus 
  } = useVaultStore();
  const toastRef = useRef<MicroToastHandle>(null);

  useFocusEffect(
    useCallback(() => {
      loadCredentials();
      loadStats();
      checkAutofillStatus();
    }, [loadCredentials, loadStats, checkAutofillStatus])
  );

  // ── Staggered entrance: 60ms per section ──
  const a0 = useRef(new Animated.Value(0)).current; // header
  const a1 = useRef(new Animated.Value(0)).current; // vault stats
  const a2 = useRef(new Animated.Value(0)).current; // quick add
  const a3 = useRef(new Animated.Value(0)).current; // quick access
  const a4 = useRef(new Animated.Value(0)).current; // recent

  useEffect(() => {
    const f = (a: Animated.Value, d: number) =>
      Animated.timing(a, { toValue: 1, duration: 440, delay: d, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    Animated.parallel([f(a0, 0), f(a1, 60), f(a2, 120), f(a3, 180), f(a4, 240)]).start();
  }, [a0, a1, a2, a3, a4]);

  const ent = (a: Animated.Value) => ({
    opacity: a,
    transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  });

  const total    = stats.total ?? 0;
  const weak     = stats.weak ?? 0;
  const breached = stats.breached ?? 0;
  const strong   = credentials.filter(c => c.strength === 'strong').length;
  const score    = total > 0 ? Math.round((strong / total) * 100) : 100;

  // Header accent bar: red if breached > 0, else amber if weak > 0, else green
  const accentColor = breached > 0 ? T.danger : (weak > 0 ? T.warning : T.success);

  // Recent 3 credentials
  const recent = [...credentials].sort((a, b) => b.lastAccessed.localeCompare(a.lastAccessed)).slice(0, 3);

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AppBackground />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 1. HEADER ── */}
        <Animated.View style={[s.section, ent(a0)]}>
          <Text style={s.brand}>SECUREX</Text>
          <Text style={s.greeting}>{getGreeting()} 👋</Text>
        </Animated.View>

        {/* ── 2. VAULT STATS CARD ── */}
        <Animated.View style={[ent(a1)]}>
          <View style={s.card}>
            <View style={s.cardTopHL} />
            {/* Left accent bar */}
            <View style={[s.accentBar, { backgroundColor: accentColor }]} />

            <View style={s.statsHeader}>
              <Text style={s.statsLabel}>VAULT OVERVIEW</Text>
              <Text style={s.shieldIcon}>🛡️</Text>
            </View>

            <View style={s.statsRow}>
              <View style={s.statCol}>
                <Text style={[s.statNum, s.statNumGlow]}>{score}%</Text>
                <Text style={s.statName}>Score</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCol}>
                <Text style={[s.statNum, weak > 0 && { color: T.warning, textShadowColor: 'rgba(255,166,35,0.35)', textShadowRadius: 8 }]}>{total}</Text>
                <Text style={s.statName}>Total</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCol}>
                <Text style={[s.statNum, breached > 0 && { color: T.danger, textShadowColor: 'rgba(255,51,102,0.35)', textShadowRadius: 10 }]}>{breached}</Text>
                <Text style={s.statName}>Breached</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── 3. QUICK ADD SHORTCUT ── */}
        <Animated.View style={[ent(a2)]}>
          <TouchableOpacity
            style={s.quickAddCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AddCredential')}
          >
            <View style={s.cardTopHL} />
            <View style={s.quickAddIcon}>
              <Text style={{ fontSize: 20, color: T.cyan }}>+</Text>
            </View>
            <View style={s.quickAddText}>
              <Text style={s.quickAddTitle}>Add Credential</Text>
              <Text style={s.quickAddSub}>Save a new password</Text>
            </View>
            <Text style={s.quickAddArrow}>→</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── 4. QUICK ACCESS ── */}
        <Animated.View style={[ent(a3)]}>
          <Text style={s.sectionLabel}>Quick Access</Text>
          <View style={s.quickGrid}>
            {/* Password Generator */}
            <TouchableOpacity
              style={[s.quickCard, { flex: 1, marginRight: 5 }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AIPasswordGenerator')}
            >
              <View style={s.cardTopHL} />
              <View style={[s.qIcon, { backgroundColor: T.purpleA14 }]}>
                <Text style={s.qEmoji}>✨</Text>
              </View>
              <Text style={s.qTitle}>Password Generator</Text>
              <Text style={s.qDesc}>Create strong passwords</Text>
              <View style={s.qPill}>
                <Text style={s.qPillText}>Generate</Text>
              </View>
            </TouchableOpacity>

            {/* Autofill */}
            <TouchableOpacity
              style={[s.quickCard, { flex: 1, marginLeft: 5 }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AutofillSetup')}
            >
              <View style={s.cardTopHL} />
              <View style={[s.qIcon, { backgroundColor: autofillEnabled ? 'rgba(6,214,160,0.14)' : T.warningA14 }]}>
                <Text style={s.qEmoji}>⚡</Text>
              </View>
              <Text style={s.qTitle}>Autofill Setup</Text>
              <Text style={[s.qDesc, autofillEnabled && { color: '#06d6a0', fontWeight: '600' }]}>
                {autofillEnabled ? 'Autofill is active ✓' : 'Enable quick login'}
              </Text>
              <View style={[
                s.qPill, 
                autofillEnabled 
                   ? { borderColor: 'rgba(6,214,160,0.25)', backgroundColor: 'rgba(6,214,160,0.06)' }
                   : { borderColor: 'rgba(245,166,35,0.25)', backgroundColor: 'rgba(245,166,35,0.06)' }
              ]}>
                <Text style={[s.qPillText, { color: autofillEnabled ? '#06d6a0' : T.warning }]}>
                  {autofillEnabled ? 'Active' : 'Set up'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── 5. RECENT ACTIVITY ── */}
        <Animated.View style={[ent(a4)]}>
          <Text style={s.sectionLabel}>Recent Activity</Text>
          <View style={s.recentCard}>
            <View style={s.cardTopHL} />
            {recent.length === 0 ? (
              <Text style={s.recentEmpty}>No recent activity yet</Text>
            ) : (
              recent.map((cred, i) => {
                const initial = (cred.name || '?').charAt(0).toUpperCase();
                const isLast = i === recent.length - 1;
                return (
                  <TouchableOpacity 
                    key={cred.id} 
                    style={[s.recentRow, !isLast && s.recentRowBorder]}
                    onPress={() => navigation.navigate('CredentialDetail', { id: cred.id })}
                  >
                    <View style={s.recentAvatar}>
                      <Text style={s.recentAvatarText}>{initial}</Text>
                    </View>
                    <View style={s.recentInfo}>
                      <Text style={s.recentName} numberOfLines={1}>{cred.name}</Text>
                      <Text style={s.recentSub}>Saved credential</Text>
                    </View>
                    <Text style={s.recentLock}>🔒</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </Animated.View>

      </ScrollView>
      <BottomNav activeTab="Home" />
      <MicroToast ref={toastRef} />
    </SafeAreaView>
  );
};

// ─── Styles ─────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  scroll: { paddingTop: 50, paddingBottom: 110 },
  section: { paddingHorizontal: T.pad, marginBottom: 20 },

  // Header
  brand: {
    ...T.fontLabel, color: T.muted, marginBottom: 10,
  },
  greeting: { ...T.fontHero },

  // Section label
  sectionLabel: {
    ...T.fontLabel, color: T.muted,
    paddingHorizontal: T.pad, marginBottom: T.sectionGap,
  },

  // ── Glass Card base ──
  card: {
    marginHorizontal: T.pad, marginBottom: T.gap,
    backgroundColor: T.glass, borderRadius: T.rCard,
    padding: T.cardPadH,
    borderWidth: 1, borderColor: T.border,
    overflow: 'hidden',
    ...T.shadowCard,
  },
  cardTopHL: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 1, backgroundColor: T.borderTop,
  },

  // Accent bar (left side)
  accentBar: {
    position: 'absolute', left: 0, top: 12, bottom: 12,
    width: 3, borderRadius: 2,
  },

  // ── Vault Stats ──
  statsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14, paddingLeft: 8,
  },
  statsLabel: { ...T.fontLabel, fontSize: 10, color: T.muted },
  shieldIcon: { fontSize: 18, opacity: 0.7 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 8,
  },
  statCol: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 26, fontWeight: '800', color: T.white, letterSpacing: -0.5 },
  statNumGlow: { textShadowColor: 'rgba(255,255,255,0.2)', textShadowRadius: 8 },
  statName: { ...T.fontCaption, color: T.muted, marginTop: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: T.border },

  // ── Quick Add ──
  quickAddCard: {
    marginHorizontal: T.pad, marginBottom: T.gap,
    backgroundColor: T.glass, borderRadius: T.rCard,
    paddingVertical: T.cardPadV, paddingHorizontal: T.cardPadH,
    borderWidth: 1, borderColor: T.border,
    flexDirection: 'row', alignItems: 'center',
    overflow: 'hidden',
    ...T.shadowCard,
  },
  quickAddIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.cyanA12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
    shadowColor: T.cyan, shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 }, elevation: 6,
  },
  quickAddText: { flex: 1 },
  quickAddTitle: { ...T.fontBody, fontWeight: '700' },
  quickAddSub: { ...T.fontCaption, color: T.muted, marginTop: 2 },
  quickAddArrow: { fontSize: 20, fontWeight: '700', color: T.cyan },

  // ── Quick Access grid ──
  quickGrid: {
    flexDirection: 'row', paddingHorizontal: T.pad,
    marginBottom: T.gap,
  },
  quickCard: {
    backgroundColor: T.glass, borderRadius: T.rCard,
    padding: T.cardPadV, borderWidth: 1, borderColor: T.border,
    overflow: 'hidden',
    ...T.shadowCard,
  },
  qIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  qEmoji: { fontSize: 20 },
  qTitle: { ...T.fontBody, fontWeight: '700', fontSize: 14, marginBottom: 4 },
  qDesc: { ...T.fontCaption, color: T.muted, marginBottom: 14 },
  qPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: T.rPill,
    borderWidth: 1, borderColor: T.cyanA18,
    backgroundColor: T.cyanA04,
  },
  qPillText: { ...T.fontCaption, color: T.cyan, fontWeight: '700', fontSize: 11 },

  // ── Recent Activity ──
  recentCard: {
    marginHorizontal: T.pad,
    backgroundColor: T.glass, borderRadius: T.rCard,
    paddingVertical: 6, paddingHorizontal: T.cardPadH,
    borderWidth: 1, borderColor: T.border,
    overflow: 'hidden',
    ...T.shadowCard,
  },
  recentEmpty: {
    ...T.fontCaption, color: T.muted, textAlign: 'center',
    paddingVertical: 24,
  },
  recentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14,
  },
  recentRowBorder: {
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  recentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: T.cyanA12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  recentAvatarText: { fontSize: 13, fontWeight: '800', color: T.cyan },
  recentInfo: { flex: 1 },
  recentName: { ...T.fontBody, fontWeight: '700', fontSize: 14 },
  recentSub: { ...T.fontCaption, color: T.muted, marginTop: 2 },
  recentLock: { fontSize: 14, opacity: 0.4 },
});
