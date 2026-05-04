import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  StatusBar, TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useVaultStore } from '../store/vaultStore';
import { BottomNav } from '../components/BottomNav';
import { T } from '../theme/tokens';
import { AppBackground } from '../components/AppBackground';

// ─── Score Arc Ring ───────────────────────────────────────
// Simulated with border rotation technique
const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 80 ? T.success : score >= 50 ? T.warning : T.danger;
  const rotation = `${(score / 100) * 360}deg`;
  return (
    <View style={ring.outer}>
      {/* Full dark track */}
      <View style={ring.track} />
      {/* Filled arc — clipped left and right halves */}
      <View style={[ring.arc, { borderColor: color, transform: [{ rotate: rotation }] }]} />
      {/* Center score */}
      <View style={ring.center}>
        <Text style={[ring.num, { color }]}>{score}</Text>
      </View>
    </View>
  );
};
const ring = StyleSheet.create({
  outer:  { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  track:  { position: 'absolute', width: 52, height: 52, borderRadius: 26, borderWidth: 4, borderColor: 'rgba(255,255,255,0.08)' },
  arc:    { position: 'absolute', width: 52, height: 52, borderRadius: 26, borderWidth: 4, borderColor: T.success, borderRightColor: 'transparent', borderBottomColor: 'transparent' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  num:    { fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
});

// ─── All Secure State ─────────────────────────────────────
const AllSecure: React.FC = () => {
  return (
    <View style={as.wrap}>
      {/* Subtle radial green glow behind icon */}
      <View style={as.glow} />
      <View style={as.iconRing}>
        <Text style={{ fontSize: 28 }}>🛡️</Text>
      </View>
      <Text style={as.title}>All passwords are secure</Text>
      <Text style={as.desc}>No weak, breached, or reused credentials found.</Text>
    </View>
  );
};
const as = StyleSheet.create({
  wrap:    { alignItems: 'center', paddingVertical: 32 },
  glow:    { position: 'absolute', top: 20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(6,214,160,0.08)' },
  iconRing:{
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: T.successA14, borderWidth: 1, borderColor: T.success,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    shadowColor: T.success, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
  title:   { fontSize: 20, fontWeight: '700', color: T.success, marginBottom: 8 },
  desc:    { ...T.fontCaption, color: T.muted, textAlign: 'center', paddingHorizontal: T.pad, lineHeight: 20 },
});

// ─── Threat Metric Cards ──────────────────────────────────
const MetricCards: React.FC<{ weak: number; breached: number }> = ({ weak, breached }) => (
  <View style={mc.row}>
    {/* Weak */}
    <View style={[mc.card, { borderColor: T.warning, shadowColor: T.warning }]}>
      <View style={mc.innerGlow} />
      <View style={[mc.iconWrap, { backgroundColor: T.warningA14 }]}>
        <Text style={{ fontSize: 20 }}>⚠️</Text>
      </View>
      <Text style={[mc.count, { color: T.warning }]}>{weak}</Text>
      <Text style={mc.label}>Weak</Text>
      <Text style={mc.sub}>accounts</Text>
    </View>

    {/* Breached */}
    <View style={[mc.card, { borderColor: T.danger, shadowColor: T.danger }]}>
      <View style={[mc.innerGlow, { backgroundColor: T.dangerA14 }]} />
      <View style={[mc.iconWrap, { backgroundColor: T.dangerA14 }]}>
        <Text style={{ fontSize: 20 }}>🚨</Text>
      </View>
      <Text style={[mc.count, { color: T.danger }]}>{breached}</Text>
      <Text style={mc.label}>Breached</Text>
      <Text style={mc.sub}>accounts</Text>
    </View>
  </View>
);
const mc = StyleSheet.create({
  row:      { flexDirection: 'row', marginHorizontal: T.pad, gap: T.gap, marginBottom: T.gap },
  card:     {
    flex: 1, backgroundColor: T.glass, borderRadius: 18, padding: T.cardPadV,
    borderWidth: 1, alignItems: 'center', overflow: 'hidden',
    shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
  innerGlow: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 56,
    backgroundColor: T.warningA14, opacity: 0.6,
  },
  iconWrap:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  count:     { fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  label:     { ...T.fontCaption, color: T.muted, fontWeight: '700', marginTop: 3 },
  sub:       { ...T.fontCaption, color: T.faint, marginTop: 1 },
});

const TIPS = [
  'Use unique passwords for every account',
  'Enable 2FA wherever possible',
  'Update weak passwords immediately',
  'Never share your master password',
];

// ─── Main Screen ─────────────────────────────────────────
export const SecurityScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { stats, credentials, loadStats, loadCredentials } = useVaultStore();

  useFocusEffect(
    React.useCallback(() => {
      loadCredentials();
      loadStats();
    }, [loadCredentials, loadStats])
  );

  const total = credentials.length;
  const weakList = credentials.filter(c => c.strength === 'weak');
  const breachedList = credentials.filter(c => c.breached === true);
  const strongCount = credentials.filter(c => c.strength === 'strong').length;
  
  const avgScore = total > 0 ? Math.round((strongCount / total) * 100) : 100;
  const weak     = weakList.length;
  const breached = breachedList.length;
  const reused   = stats.reused ?? 0;
  const allClean = weak === 0 && breached === 0;

  const scoreColor  = avgScore >= 80 ? T.success : avgScore >= 50 ? T.warning : T.danger;
  const scoreLabel  = avgScore >= 80 ? 'All secure' : avgScore >= 50 ? 'Fair' : 'Critical';

  const handleFix = (id: string) => {
    navigation.navigate('AddCredential', { id });
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AppBackground />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 1. HEADER ── */}
        <View style={s.header}>
          <Text style={s.brand}>SECUREX</Text>
          <Text style={s.heading}>Security Center</Text>
          <Text style={s.subtitle}>Monitor your vault health</Text>
        </View>

        {/* ── 2. AI INSIGHTS CARD ── */}
        <View style={s.aiCard}>
          {/* 1px top highlight */}
          <View style={s.topHL} />
          <View style={s.aiRow}>
            {/* Shield icon circle */}
            <View style={s.shieldCircle}>
              <Text style={{ fontSize: 22 }}>🛡️</Text>
            </View>

            {/* Text block */}
            <View style={s.aiText}>
              <Text style={s.aiTitle}>AI Security Insights</Text>
              <Text style={s.aiStats}>
                {`Weak: ${weak} • Breached: ${breached} • Reused: ${reused}`}
              </Text>
              <Text style={[s.aiStatusTag, { color: scoreColor }]}>
                {scoreLabel} · {total} {total === 1 ? 'credential' : 'credentials'}
              </Text>
            </View>

            {/* Score ring */}
            <ScoreRing score={avgScore} />
          </View>
        </View>

        {/* ── 3. All Secure / Threat Cards ── */}
        {allClean ? <AllSecure /> : <MetricCards weak={weak} breached={breached} />}

        {/* ── 4. WEAK PASSWORDS LIST ── */}
        {weak > 0 && (
          <View style={s.weakListCard}>
            <View style={s.topHL} />
            <Text style={s.weakListTitle}>⚠️ Vulnerable Accounts</Text>
            {weakList.map((cred, i) => (
              <View key={cred.id} style={s.weakItem}>
                <View style={s.weakItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.weakItemName}>{cred.name}</Text>
                    <Text style={s.weakItemReason}>Weak password detected</Text>
                  </View>
                  <TouchableOpacity style={s.fixBtn} onPress={() => handleFix(cred.id)}>
                    <Text style={s.fixBtnText}>Fix Now</Text>
                  </TouchableOpacity>
                </View>
                {i < weakList.length - 1 && <View style={s.weakSep} />}
              </View>
            ))}
          </View>
        )}

        {/* ── 4b. BREACHED LIST ── */}
        {breached > 0 && (
          <View style={[s.weakListCard, { borderColor: T.danger, backgroundColor: 'rgba(255,77,109,0.05)' }]}>
            <View style={s.topHL} />
            <Text style={[s.weakListTitle, { color: T.danger }]}>🚨 Data Breaches Found</Text>
            {breachedList.map((cred, i) => (
              <View key={cred.id} style={s.weakItem}>
                <View style={s.weakItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.weakItemName}>{cred.name}</Text>
                    <Text style={[s.weakItemReason, { color: 'rgba(255,77,109,0.7)' }]}>Password found in data breach</Text>
                  </View>
                  <TouchableOpacity style={[s.fixBtn, { borderColor: T.danger }]} onPress={() => handleFix(cred.id)}>
                    <Text style={[s.fixBtnText, { color: T.danger }]}>Fix Now</Text>
                  </TouchableOpacity>
                </View>
                {i < breachedList.length - 1 && <View style={s.weakSep} />}
              </View>
            ))}
          </View>
        )}

        {/* ── 5. SECURITY TIPS CARD ── */}
        <View style={s.tipsCard}>
          <View style={s.topHL} />
          {/* Amber left accent bar */}
          <View style={s.tipsAccent} />
          <Text style={s.tipsTitle}>💡 Security Tips</Text>
          {TIPS.map((tip, i) => (
            <View key={i}>
              <Text style={s.tipRow}>• {tip}</Text>
              {i < TIPS.length - 1 && <View style={s.tipSep} />}
            </View>
          ))}
        </View>

      </ScrollView>
      <BottomNav activeTab="Security" />
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll:    { paddingTop: 50, paddingBottom: 110 },

  // Header
  header:   { paddingHorizontal: T.pad, marginBottom: 20 },
  brand:    { ...T.fontLabel, color: T.muted, marginBottom: 8 },
  heading:  { ...T.fontHero },
  subtitle: { ...T.fontCaption, color: T.cyan, fontWeight: '700', marginTop: 4 },

  // AI Card — faint cyan tint border, NOT bright
  aiCard: {
    marginHorizontal: T.pad, marginBottom: T.gap,
    backgroundColor: T.glass,
    borderRadius: T.rCard,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 1, borderColor: T.border,
    borderTopWidth: 1, borderTopColor: T.borderTop,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.30,
    shadowRadius: 24, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  topHL: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 1, backgroundColor: T.borderTop,
  },
  aiRow:         { flexDirection: 'row', alignItems: 'center' },
  shieldCircle:  {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(0,180,180,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
    // NOT bright glow — just a soft teal tint
    shadowColor: T.cyan, shadowOpacity: 0.18,
    shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 4,
  },
  aiText:        { flex: 1 },
  aiTitle:       { fontSize: 16, fontWeight: '700', color: T.white },
  aiStats:       { ...T.fontCaption, color: T.muted, marginTop: 4, letterSpacing: 0.3 },
  aiStatusTag:   { ...T.fontCaption, fontWeight: '700', marginTop: 6 },

  // Tips card
  tipsCard: {
    marginHorizontal: T.pad,
    backgroundColor: T.glass, borderRadius: T.rCard,
    paddingVertical: 20, paddingHorizontal: 20,
    borderWidth: 1, borderColor: T.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.25,
    shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  tipsAccent: {
    position: 'absolute', left: 0, top: 12, bottom: 12,
    width: 3, borderRadius: 2, backgroundColor: T.amber,
  },
  tipsTitle: { fontSize: 15, fontWeight: '800', color: T.white, marginBottom: 14, paddingLeft: 8 },
  tipRow:    { ...T.fontCaption, color: T.muted, lineHeight: 22, paddingLeft: 8, paddingVertical: 6 },
  tipSep:    { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 8 },

  // Weak List
  weakListCard: {
    marginHorizontal: T.pad, marginBottom: T.gap,
    backgroundColor: 'rgba(255,166,35,0.05)', borderRadius: 18,
    paddingVertical: 18, paddingHorizontal: 20,
    borderWidth: 1, borderColor: 'rgba(245,166,35,0.2)',
  },
  weakListTitle: { ...T.fontLabel, color: T.warning, fontSize: 11, marginBottom: 14 },
  weakItem:      { paddingVertical: 8 },
  weakItemName:  { ...T.fontBody, fontWeight: '700', color: T.white },
  weakItemReason:{ ...T.fontCaption, color: 'rgba(245,166,35,0.7)', fontSize: 11, marginTop: 2 },
  weakSep:       { height: 1, backgroundColor: 'rgba(245,166,35,0.1)', marginTop: 8 },
  weakItemRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fixBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: T.warning,
  },
  fixBtnText: { ...T.fontMono, fontSize: 10, fontWeight: '800', color: T.warning },
});
