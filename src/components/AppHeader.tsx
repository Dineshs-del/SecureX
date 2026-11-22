import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useVaultStore } from '../store/vaultStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LockIcon = ({ size = 20, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const RefreshIcon = ({ size = 20, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.73-5.73" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  greeting?: string;
  showRefresh?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  greeting,
  showRefresh = false,
  onRefresh,
  isRefreshing = false,
}) => {
  const insets = useSafeAreaInsets();
  const { lock } = useVaultStore();

  const handleManualLock = () => {
    lock();
  };

  return (
    <View style={[s.headerRow, { paddingTop: 52 + insets.top }]}>
      <View style={s.titleWrap}>
        {greeting ? (
          <Text style={s.greetingLabel} maxFontSizeMultiplier={1.3}>
            {greeting}
          </Text>
        ) : null}
        <Text style={s.headerTitle} maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={s.headerSubtitle} maxFontSizeMultiplier={1.3}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={s.buttonsRow}>
        {showRefresh && (
          <TouchableOpacity
            style={s.roundButton}
            activeOpacity={0.8}
            onPress={onRefresh}
            disabled={isRefreshing}
            accessibilityLabel="Refresh audit"
            accessibilityRole="button"
          >
            {isRefreshing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <RefreshIcon size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={s.roundButton}
          activeOpacity={0.8}
          onPress={handleManualLock}
          accessibilityLabel="Lock vault"
          accessibilityRole="button"
        >
          <LockIcon size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  titleWrap: {
    flex: 1,
    marginRight: 12,
  },
  greetingLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.42)',
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.02,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A3B1C2',
    marginTop: 2,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roundButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
