import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { T } from '../theme/tokens';

interface Props { activeTab: 'Home' | 'Passwords' | 'Vault' | 'Security' | 'Settings'; }

const TABS = [
  { id: 'Home',      screen: 'Dashboard', icon: '🏠' },
  { id: 'Passwords', screen: 'Vault',     icon: '🔑' },
  { id: 'Vault',     screen: 'VaultHub',  icon: '💳' },
  { id: 'Security',  screen: 'Security',  icon: '🛡️' },
  { id: 'Settings',  screen: 'Settings',  icon: '⚙️' },
] as const;

export const BottomNav: React.FC<Props> = ({ activeTab }) => {
  const navigation = useNavigation<any>();
  return (
    <View style={s.pill}>
      {TABS.map(tab => {
        const active = activeTab === tab.id;
        return (
          <TouchableOpacity key={tab.id} style={s.item}
            onPress={() => { if (!active) navigation.navigate(tab.screen); }}
            activeOpacity={0.6}>
            {active && <View style={s.dot} />}
            <Text style={[s.icon, active && s.iconActive]}>{tab.icon}</Text>
            {active && <Text style={s.label}>{tab.id}</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const s = StyleSheet.create({
  pill: {
    position: 'absolute', left: 20, right: 20, bottom: 16,
    borderRadius: T.rPill,
    backgroundColor: 'rgba(8,12,16,0.92)',
    borderWidth: 1, borderColor: T.border,
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    height: 72,
    paddingHorizontal: 10,
    shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 }, elevation: 22,
  },
  item: { alignItems: 'center', justifyContent: 'center', minWidth: 56, paddingVertical: 4, position: 'relative' },
  dot: {
    position: 'absolute', top: -6, width: 5, height: 5, borderRadius: 3,
    backgroundColor: T.cyan,
    shadowColor: T.cyan, shadowOpacity: 0.9, shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 }, elevation: 6,
  },
  icon: { fontSize: 26, opacity: 0.4 },
  iconActive: { opacity: 1 },
  label: { ...T.fontCaption, color: T.cyan, fontSize: 12, marginTop: 3, fontWeight: '600' },
});
