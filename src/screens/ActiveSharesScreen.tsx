import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useShareStore } from '../store/shareStore';
import { AppBackground } from '../components/AppBackground';
import { BottomNav } from '../components/BottomNav';
import { T } from '../theme/tokens';

export const ActiveSharesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { activeShares, loadShares, removeShare } = useShareStore();

  useEffect(() => {
    loadShares();
  }, []);

  const handleRevoke = (id: string, name: string) => {
    Alert.alert(
      'Remove from your list',
      `This removes "${name}" from your active shares list. Since sharing is offline, recipients who already have the PIN can still open the link until the expiry time is reached.\n\nAre you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeShare(id) }
      ]
    );
  };

  const getTimeRemaining = (expiresAt: number) => {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) return `${Math.floor(hours / 24)} days left`;
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins} mins left`;
  };

  return (
    <SafeAreaView style={s.container}>
      <AppBackground />
      
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.heading}>Active Shares</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        contentContainerStyle={s.listContent}
        data={activeShares}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>🔗</Text>
            <Text style={s.emptyTitle}>No active shares</Text>
            <Text style={s.emptyDesc}>Links you securely share will appear here until they expire.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardTop}>
              <View style={s.cardLeft}>
                <Text style={s.credName}>{item.credentialName}</Text>
                <Text style={s.timeLeft}>⏱ {getTimeRemaining(item.expiresAt)}</Text>
              </View>
              <TouchableOpacity style={s.revokeBtn} onPress={() => handleRevoke(item.id, item.credentialName)}>
                <Text style={s.revokeText}>Remove</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.infoText}>Shared on {new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        )}
      />

      <BottomNav activeTab="Settings" />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: T.pad, paddingTop: 10, paddingBottom: 20 },
  backBtn: { padding: 8, marginLeft: -8 },
  backIcon: { fontSize: 24, color: T.white, fontWeight: '800' },
  heading: { fontSize: 20, fontWeight: '800', color: T.white },
  
  listContent: { paddingHorizontal: T.pad, paddingBottom: 100 },

  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyEmoji: { fontSize: 50, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: T.white, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: T.muted, textAlign: 'center', maxWidth: 250 },

  card: { backgroundColor: T.glass, borderRadius: T.rCard, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: T.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardLeft: { flex: 1, paddingRight: 10 },
  credName: { fontSize: 18, fontWeight: '800', color: T.white, marginBottom: 4 },
  timeLeft: { fontSize: 13, color: T.amber, fontWeight: '700' },
  
  revokeBtn: { backgroundColor: 'rgba(255,77,109,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,77,109,0.3)' },
  revokeText: { color: T.danger, fontSize: 12, fontWeight: '700' },

  infoText: { fontSize: 12, color: T.faint },
});
