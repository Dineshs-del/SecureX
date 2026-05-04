import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
  ScrollView, Image, Linking, Alert, Modal, Platform,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { T, getCategoryColor } from '../theme/tokens';

interface Props {
  credential: any;
  onPress: () => void;
  onPressIcon: () => void;
  onCopy: (text: string, label: string) => void;
}

const getFakeTOTP = (id: string): string => {
  const n = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const time = Math.floor(Date.now() / 30000);
  const code = (n * time) % 1000000;
  return String(code).padStart(6, '0');
};

// Known app name → icon mapping
const KNOWN_ICONS: Record<string, string> = {
  instagram: 'https://www.google.com/s2/favicons?domain=instagram.com&sz=64',
  facebook: 'https://www.google.com/s2/favicons?domain=facebook.com&sz=64',
  google: 'https://www.google.com/s2/favicons?domain=google.com&sz=64',
  twitter: 'https://www.google.com/s2/favicons?domain=twitter.com&sz=64',
  x: 'https://www.google.com/s2/favicons?domain=x.com&sz=64',
  github: 'https://www.google.com/s2/favicons?domain=github.com&sz=64',
  linkedin: 'https://www.google.com/s2/favicons?domain=linkedin.com&sz=64',
  netflix: 'https://www.google.com/s2/favicons?domain=netflix.com&sz=64',
  amazon: 'https://www.google.com/s2/favicons?domain=amazon.com&sz=64',
  apple: 'https://www.google.com/s2/favicons?domain=apple.com&sz=64',
  microsoft: 'https://www.google.com/s2/favicons?domain=microsoft.com&sz=64',
  youtube: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64',
  whatsapp: 'https://www.google.com/s2/favicons?domain=whatsapp.com&sz=64',
  snapchat: 'https://www.google.com/s2/favicons?domain=snapchat.com&sz=64',
  spotify: 'https://www.google.com/s2/favicons?domain=spotify.com&sz=64',
  discord: 'https://www.google.com/s2/favicons?domain=discord.com&sz=64',
  reddit: 'https://www.google.com/s2/favicons?domain=reddit.com&sz=64',
  tiktok: 'https://www.google.com/s2/favicons?domain=tiktok.com&sz=64',
  telegram: 'https://www.google.com/s2/favicons?domain=telegram.org&sz=64',
  paypal: 'https://www.google.com/s2/favicons?domain=paypal.com&sz=64',
};

const getIconUrl = (name: string, url: string): string | null => {
  // 1. Check known app names
  const key = (name || '').toLowerCase().trim();
  if (KNOWN_ICONS[key]) return KNOWN_ICONS[key];

  // 2. Try from URL if provided
  if (url) {
    try {
      const domain = url.replace('https://', '').replace('http://', '').split('/')[0];
      if (domain) return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return null;
    }
  }

  // 3. Try guessing domain from name
  return `https://www.google.com/s2/favicons?domain=${key}.com&sz=64`;
};

export const CredentialCard: React.FC<Props> = ({
  credential, onPressIcon, onCopy,
}) => {
  const [seconds, setSeconds] = useState(30 - (Math.floor(Date.now() / 1000) % 30));
  const catColor = getCategoryColor(credential.category);
  const initial = (credential.name || '?').charAt(0).toUpperCase();
  const iconUrl = getIconUrl(credential.name || '', credential.url || '');
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(30 - (Math.floor(Date.now() / 1000) % 30));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const totp = credential.totp ? getFakeTOTP(credential.id) : null;

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.9} onPress={onPressIcon}>
      <View style={s.topHL} />

      {/* LEFT: Brand Icon */}
      <TouchableOpacity
        style={[s.logoContainer, { shadowColor: catColor }]}
        onPress={onPressIcon}
        activeOpacity={0.8}
      >
        <View style={[s.logoInner, { backgroundColor: catColor + '18' }]}>
          {iconUrl && !imgError ? (
            <Image
              source={{ uri: iconUrl }}
              style={s.favicon}
              onError={() => setImgError(true)}
            />
          ) : (
            <Text style={[s.logoLetter, { color: catColor }]}>{initial}</Text>
          )}
        </View>
      </TouchableOpacity>

      {/* CENTER: Info */}
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{credential.name}</Text>
        <Text style={s.username} numberOfLines={1}>{credential.username}</Text>

        <View style={s.badgeRow}>
          {credential.strength !== 'strong' ? (
            <View style={s.strengthBadge}>
              <Text style={s.strengthText}>{credential.strength === 'weak' ? 'WEAK' : 'FAIR'}</Text>
            </View>
          ) : null}
          {credential.breached ? (
            <View style={s.breachBadge}>
              <Text style={s.breachText}>BREACHED</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* RIGHT: Actions */}
      <View style={s.right}>
        <View style={s.passRow}>
          <Text style={s.dots}>······</Text>
          <TouchableOpacity onPress={() => onCopy(credential.password, 'Password')} hitSlop={12}>
            <Text style={s.copyIcon}>📋</Text>
          </TouchableOpacity>
        </View>

        {totp ? (
          <View style={s.totpRow}>
            <Text style={s.totpCode}>{totp}</Text>
            <View style={s.ringWrap}>
              <View style={[s.ringBase, { borderColor: T.cyanA12 }]} />
              <View style={[s.ringActive, {
                borderColor: T.cyan,
                borderRightColor: 'transparent',
                borderBottomColor: 'transparent',
                transform: [{ rotate: `${(seconds / 30) * 360}deg` }]
              }]} />
            </View>
          </View>
        ) : null}

        <View style={[s.catPill, { backgroundColor: catColor + '18' }]}>
          <Text style={[s.catText, { color: catColor }]}>{credential.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.glass,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    marginHorizontal: 20,
  },
  topHL: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    backgroundColor: T.borderTop,
  },
  logoContainer: {
    width: 46, height: 46,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  logoInner: {
    width: 46, height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  favicon: { width: 32, height: 32, borderRadius: 6 },
  logoLetter: { fontSize: 20, fontWeight: '800' },
  info: { flex: 1, paddingHorizontal: 16 },
  name: { fontFamily: 'Syne', fontWeight: '600', fontSize: 15, color: '#FFFFFF' },
  username: { ...T.fontMono, fontSize: 12, color: T.muted, marginTop: 4 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  strengthBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,166,35,0.12)',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1, borderColor: 'rgba(245,166,35,0.25)',
  },
  strengthText: { ...T.fontMono, fontSize: 9, fontWeight: '800', color: '#f5a623' },
  breachBadge: {
    alignSelf: 'flex-start',
    backgroundColor: T.dangerA14,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1, borderColor: 'rgba(255,77,109,0.25)',
  },
  breachText: { ...T.fontMono, fontSize: 9, fontWeight: '800', color: T.danger },
  right: { alignItems: 'flex-end' },
  passRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dots: { ...T.fontMono, fontSize: 10, color: T.muted, letterSpacing: 1, marginRight: 8 },
  copyIcon: { fontSize: 14, color: T.muted },
  totpRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  totpCode: { ...T.fontMono, fontSize: 13, color: T.cyan, fontWeight: '700', marginRight: 6 },
  ringWrap: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  ringBase: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  ringActive: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  catPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  catText: { ...T.fontMono, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
});