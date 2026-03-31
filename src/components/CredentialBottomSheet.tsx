import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
  ScrollView, Image, Linking, Alert, Modal, Platform,
} from 'react-native';
import { T, getCategoryColor, getBrandColor } from '../theme/tokens';
import { getPasswordStrength } from '../store/vaultStore';
import Clipboard from '@react-native-clipboard/clipboard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;

interface Props {
  isVisible: boolean;
  credential: any;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCopy: (text: string, label: string) => void;
}

const getFaviconUrl = (url: string) => {
  try {
    const domain = url.replace('https://', '').replace('http://', '').split('/')[0];
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return null;
  }
};

const formatLastAccessed = (timestamp: number) => {
  if (!timestamp) return 'Never';
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return new Date(timestamp).toLocaleDateString();
};

export const CredentialBottomSheet: React.FC<Props> = ({
  isVisible, credential, onClose, onEdit, onDelete, onCopy,
}) => {
  const [showPass, setShowPass] = useState(false);
  const [seconds, setSeconds] = useState(30 - (Math.floor(Date.now() / 1000) % 30));
  const anim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setShowPass(false);
    }
  }, [isVisible]);

  useEffect(() => {
    let timer: any;
    if (isVisible && credential?.totp) {
      timer = setInterval(() => {
        setSeconds(30 - (Math.floor(Date.now() / 1000) % 30));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isVisible, credential]);

  if (!credential) return null;

  const catColor = getCategoryColor(credential.category);
  const initial = (credential.name || '?').charAt(0).toUpperCase();
  const favicon = getFaviconUrl(credential.url || '');
  const sTag = getPasswordStrength(credential.password);
  const strengthColor = sTag === 'strong' ? T.success : T.warning;
  const strengthScore = sTag === 'strong' ? 95 : sTag === 'fair' ? 60 : 25;

  const DetailRow = ({ label, value, isPassword = false, isTOTP = false, onCopyAction }: any) => (
    <View style={s.detailCard}>
       <View style={s.topHL} />
       <View style={s.rowHeader}>
         <Text style={s.rowLabel}>{label}</Text>
         <View style={s.rowActions}>
           {isPassword && (
             <TouchableOpacity onPress={() => setShowPass(!showPass)} style={s.rowBtn}>
               <Text style={s.iconSmall}>{showPass ? '🙈' : '👁️'}</Text>
             </TouchableOpacity>
           )}
           <TouchableOpacity onPress={onCopyAction} style={s.rowBtn}>
             <Text style={s.iconSmall}>📋</Text>
           </TouchableOpacity>
         </View>
       </View>
       <Text 
        style={[s.rowValue, isPassword && !showPass && s.masked, isTOTP && s.totpText]}
        numberOfLines={value && value.length > 50 ? 5 : 1}
       >
         {isPassword ? (showPass ? value : '••••••••••••') : value}
       </Text>
       {isPassword && (
         <View style={s.strengthContainer}>
           <View style={[s.strengthBar, { width: `${strengthScore}%`, backgroundColor: strengthColor }]} />
         </View>
       )}
    </View>
  );

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[s.sheet, { transform: [{ translateY: anim }] }]}>
        <View style={s.dragHandle} />
        
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={s.header}>
            <View style={[s.logoLarge, { backgroundColor: catColor + '18', shadowColor: catColor }]}>
               {favicon ? (
                 <Image source={{ uri: favicon }} style={s.faviconLarge} />
               ) : (
                 <Text style={[s.logoLetterLarge, { color: catColor }]}>{initial}</Text>
               )}
            </View>
            <Text style={s.titleLarge}>{credential.name}</Text>
            {credential.url ? (
              <TouchableOpacity onPress={() => Linking.openURL(credential.url)}>
                <Text style={s.urlText}>{credential.url}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Rows */}
          <DetailRow 
            label="👤 USERNAME / EMAIL" 
            value={credential.username} 
            onCopyAction={() => onCopy(credential.username, 'Username')} 
          />
          
          <DetailRow 
            label="🔑 PASSWORD" 
            value={credential.password} 
            isPassword={true}
            onCopyAction={() => onCopy(credential.password, 'Password')} 
          />

          {credential.totp && (
            <View style={s.detailCard}>
              <View style={s.topHL} />
              <View style={s.rowHeader}>
                <Text style={s.rowLabel}>🔐 2FA CODE</Text>
                <TouchableOpacity onPress={() => onCopy('123456', '2FA Code')} style={s.rowBtn}>
                   <Text style={s.iconSmall}>📋</Text>
                </TouchableOpacity>
              </View>
              <View style={s.totpContainer}>
                <Text style={s.totpLarge}>{'123 456'}</Text>
                <View style={s.ringLargeWrap}>
                   <View style={[s.ringBaseLarge, { borderColor: T.cyanA12 }]} />
                   <View style={[s.ringActiveLarge, { 
                     borderColor: T.cyan,
                     borderRightColor: 'transparent',
                     borderBottomColor: 'transparent',
                     transform: [{ rotate: `${(seconds / 30) * 360}deg` }]
                   }]} />
                </View>
              </View>
            </View>
          )}

          <View style={s.detailCard}>
             <View style={s.topHL} />
             <Text style={s.rowLabel}>🏷️ CATEGORY</Text>
             <View style={[s.catPill, { backgroundColor: catColor + '18' }]}>
               <Text style={[s.catText, { color: catColor }]}>{credential.category}</Text>
             </View>
          </View>

          {credential.notes ? (
            <DetailRow 
              label="📝 NOTES" 
              value={credential.notes} 
              onCopyAction={() => onCopy(credential.notes, 'Notes')} 
            />
          ) : null}

          <View style={s.lastAccessedRow}>
            <Text style={s.lastLabel}>🕐 LAST ACCESSED:</Text>
            <Text style={s.lastValue}>{formatLastAccessed(credential.lastAccessed)}</Text>
          </View>

          {/* Actions */}
          <View style={s.actionRow}>
            <TouchableOpacity style={s.editBtn} onPress={() => onEdit(credential.id)}>
               <Text style={s.editBtnText}>✏️ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.deleteBtn} onPress={() => onDelete(credential.id)}>
               <Text style={s.deleteBtnText}>🗑 Delete</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: 'rgba(10,16,22,0.97)',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  dragHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginTop: 12, marginBottom: 12,
  },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: 24 },
  logoLarge: {
    width: 64, height: 64, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 16,
    elevation: 10,
  },
  faviconLarge: { width: 44, height: 44, borderRadius: 8 },
  logoLetterLarge: { fontSize: 28, fontWeight: '800' },
  titleLarge: { fontFamily: 'Syne', fontWeight: '700', fontSize: 20, color: '#FFFFFF' },
  urlText: { ...T.fontMono, color: T.cyan, fontSize: 13, marginTop: 4 },

  detailCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative', overflow: 'hidden',
  },
  topHL: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rowLabel: { ...T.fontLabel, color: T.muted, fontSize: 10 },
  rowActions: { flexDirection: 'row', gap: 12 },
  rowBtn: { padding: 4 },
  iconSmall: { fontSize: 16 },
  rowValue: { ...T.fontBody, fontSize: 15, color: '#FFFFFF' },
  masked: { letterSpacing: 2, color: T.muted },
  totpText: { color: T.cyan, fontWeight: '700' },

  strengthContainer: { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 12, overflow: 'hidden' },
  strengthBar: { height: '100%' },

  totpContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totpLarge: { ...T.fontMono, fontSize: 22, color: T.cyan, fontWeight: '700', letterSpacing: 2 },
  ringLargeWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  ringBaseLarge: { position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 3 },
  ringActiveLarge: { position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 3 },

  catPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  catText: { ...T.fontMono, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  lastAccessedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 24, paddingLeft: 4 },
  lastLabel: { ...T.fontMono, fontSize: 11, color: T.muted, marginRight: 8 },
  lastValue: { ...T.fontMono, fontSize: 11, color: T.muted },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  editBtn: {
    flex: 1, height: 50, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  editBtnText: { fontFamily: 'Syne', fontWeight: '600', fontSize: 15, color: '#FFFFFF' },
  deleteBtn: {
    flex: 1, height: 50, borderRadius: 14,
    backgroundColor: 'rgba(255,77,109,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,77,109,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { fontFamily: 'Syne', fontWeight: '600', fontSize: 15, color: '#ff4d6d' },
});
