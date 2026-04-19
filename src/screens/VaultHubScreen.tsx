import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomNav } from '../components/BottomNav';
import { AppBackground } from '../components/AppBackground';
import { T } from '../theme/tokens';
import { useBankCardStore } from '../store/BankCardVault';
import { useIdentityStore } from '../store/Identityvault';
import { useSecureNotesStore } from '../store/OtherVaults';

interface VaultSectionCardProps {
  icon: string;
  title: string;
  desc: string;
  accentColor: string;
  count: number;
  onPress: () => void;
}

const VaultSectionCard: React.FC<VaultSectionCardProps> = ({ icon, title, desc, accentColor, count, onPress }) => (
  <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.82}>
    <View style={[s.accent, { backgroundColor: accentColor }]} />
    <View style={[s.iconWrap, { backgroundColor: accentColor + '22' }]}>
      <Text style={s.icon}>{icon}</Text>
    </View>
    <View style={s.textContainer}>
      <Text style={s.title}>{title}</Text>
      <Text style={s.desc}>{desc}</Text>
      <Text style={[s.countBadge, { color: accentColor }]}>{count} item{count !== 1 ? 's' : ''}</Text>
    </View>
    <Text style={[s.arrow, { color: accentColor }]}>→</Text>
  </TouchableOpacity>
);

export const VaultHubScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { cards, loadCards } = useBankCardStore();
  const { docs, loadDocs } = useIdentityStore();
  const { notes, loadNotes } = useSecureNotesStore();

  useEffect(() => {
    loadCards();
    loadDocs();
    loadNotes();
  }, [loadCards, loadDocs, loadNotes]);

  return (
    <SafeAreaView style={s.container}>
      <AppBackground />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.brand}>SECUREX</Text>
          <Text style={s.heading}>Vault</Text>
        </View>

        <Text style={s.sectionLabel}>CATEGORIES</Text>
        
        <VaultSectionCard
          icon="💳"
          title="Bank Cards"
          desc="Saved debit & credit cards"
          accentColor={T.amber}
          count={cards.length}
          onPress={() => navigation.navigate('BankCards')}
        />
        <VaultSectionCard
          icon="🪪"
          title="Identity"
          desc="IDs, passports, licenses"
          accentColor={T.purple}
          count={docs.length}
          onPress={() => navigation.navigate('Identity')}
        />
        <VaultSectionCard
          icon="📝"
          title="Secure Notes"
          desc="Encrypted private notes"
          accentColor={T.success}
          count={notes.length}
          onPress={() => navigation.navigate('SecureNotes')}
        />

      </ScrollView>
      <BottomNav activeTab="Vault" />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: T.pad, marginBottom: 24, marginTop: 10 },
  brand: { ...T.fontLabel, color: T.muted, marginBottom: 6 },
  heading: { fontSize: 26, fontWeight: '800', color: T.white, letterSpacing: 0.5 },
  content: { paddingTop: 20, paddingBottom: 120 },
  sectionLabel: { ...T.fontLabel, color: T.muted, marginHorizontal: T.pad, marginBottom: 12 },
  
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: T.pad,
    marginBottom: 12,
    backgroundColor: T.glass,
    borderRadius: T.rCard,
    padding: T.cardPadV,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.25,
    shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  accent: {
    position: 'absolute', left: 0, top: 10, bottom: 10,
    width: 3, borderRadius: 2,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 8, marginRight: 16,
  },
  icon: { fontSize: 24 },
  textContainer: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: T.white, marginBottom: 2 },
  desc: { ...T.fontCaption, color: T.muted, marginBottom: 6 },
  countBadge: { ...T.fontMono, fontSize: 11, fontWeight: '700' },
  arrow: { fontSize: 22, fontWeight: '800', marginLeft: 8 },
});
