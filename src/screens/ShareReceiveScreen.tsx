import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import { AppBackground } from '../components/AppBackground';
import { T, getCategoryColor } from '../theme/tokens';
import { CryptoService, EncryptedData } from '../theme/crypto/CryptoService';

type RootStackParamList = {
  ShareReceive: { data?: string };
};

export const ShareReceiveScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'ShareReceive'>>();
  
  const [pin, setPin] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedItem, setDecryptedItem] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-clear clipboard handling
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (route.params?.data) {
      try {
        const parsed = JSON.parse(route.params.data);
        // Map user requested the following keys: { credentialName, username, password, expiry }
        // The component expects: { name, username, password, url, totp, notes }
        setDecryptedItem({
          name: parsed.credentialName || 'Shared Credential',
          username: parsed.username || '',
          password: parsed.password || '',
          url: parsed.url || '',
          totp: parsed.totp || '',
          notes: parsed.notes || '',
        });
      } catch (e) {
        setErrorMsg("Failed to load shared credential.");
      }
    }
  }, [route.params?.data]);

  useEffect(() => {
    let timeout: any;
    if (copiedField) {
      timeout = setTimeout(() => {
        Clipboard.setString('');
        setCopiedField(null);
      }, 30000);
    }
    return () => clearTimeout(timeout);
  }, [copiedField]);

  const handleCopy = (text: string, field: string) => {
    Clipboard.setString(text);
    setCopiedField(field);
  };

  const attemptDecrypt = async () => {
    if (pin.length < 6) return;
    setIsDecrypting(true);
    setErrorMsg('');

    try {
      const payloadStr = route.params?.data;
      if (!payloadStr) throw new Error("Invalid link missing payload data");

      const encData: EncryptedData | null = CryptoService.stringToEncryptedData(payloadStr);
      if (!encData || !encData.salt) throw new Error("Link data is corrupted");

      // 1. Derive key
      const keyHex = CryptoService.deriveShareKey(pin, encData.salt);

      // 2. Decrypt
      const jsonStr = CryptoService.decryptWithKey(encData, keyHex);
      if (!jsonStr) throw new Error("Incorrect PIN");

      // 3. Parse and check expiry
      const parsed = JSON.parse(jsonStr);
      if (parsed.exp && parsed.exp < Date.now()) {
        throw new Error("This secure link has expired.");
      }

      setDecryptedItem(parsed);

    } catch (e: any) {
      setErrorMsg(e.message || "Decryption failed");
      setPin('');
    } finally {
      setIsDecrypting(false);
    }
  };

  if (!route.params?.data) {
    return (
      <SafeAreaView style={s.container}>
        <AppBackground />
        <View style={s.centerBox}>
          <Text style={s.emoji}>❌</Text>
          <Text style={s.title}>Invalid Link</Text>
          <Text style={s.desc}>This share link is missing its payload data.</Text>
          <TouchableOpacity style={[s.btn, s.btnCancel]} onPress={() => navigation.navigate('Unlock')}>
            <Text style={s.btnTextCancel}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <AppBackground />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Unlock')} style={s.backBtn}>
          <Text style={s.backIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={s.heading}>Secure Share</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        
        {!decryptedItem ? (
          <View style={s.card}>
            <Text style={s.title}>Locked Link</Text>
            <Text style={s.desc}>
              {errorMsg || "This link could not be opened. It may be corrupted or expired."}
            </Text>
            <TouchableOpacity 
              style={[s.btn, s.btnPrimary]} 
              onPress={() => navigation.navigate('Unlock')}
            >
              <Text style={s.btnTextPrimary}>Go Home</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={[s.card, s.readOnlyAlert]}>
              <Text style={s.readOnlyTitle}>Read-Only View</Text>
              <Text style={s.readOnlyDesc}>This item is shared securely. You cannot save it to your vault.</Text>
              {copiedField && (
                <Text style={s.copyWarning}>📋 {copiedField} copied. Clipboard clears in 30s.</Text>
              )}
            </View>

            <View style={s.itemCard}>
              <Text style={s.credentialName}>{decryptedItem.name}</Text>
              
              {decryptedItem.username ? (
                <View style={s.fieldRow}>
                  <View style={s.fieldMain}>
                    <Text style={s.fieldLabel}>USERNAME / EMAIL</Text>
                    <Text style={s.fieldValue}>{decryptedItem.username}</Text>
                  </View>
                  <TouchableOpacity style={s.copyBtn} onPress={() => handleCopy(decryptedItem.username, 'Username')}>
                    <Text style={s.copyIcon}>📋</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {decryptedItem.password ? (
                <View style={s.fieldRow}>
                  <View style={s.fieldMain}>
                    <Text style={s.fieldLabel}>PASSWORD</Text>
                    <Text style={s.fieldValue}>{decryptedItem.password}</Text>
                  </View>
                  <TouchableOpacity style={s.copyBtn} onPress={() => handleCopy(decryptedItem.password, 'Password')}>
                    <Text style={s.copyIcon}>📋</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {decryptedItem.url ? (
                <View style={s.fieldRow}>
                  <View style={s.fieldMain}>
                    <Text style={s.fieldLabel}>URL</Text>
                    <Text style={s.fieldValue}>{decryptedItem.url}</Text>
                  </View>
                  <TouchableOpacity style={s.copyBtn} onPress={() => handleCopy(decryptedItem.url, 'URL')}>
                    <Text style={s.copyIcon}>📋</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {decryptedItem.totp ? (
                <View style={s.fieldRow}>
                  <View style={s.fieldMain}>
                    <Text style={s.fieldLabel}>2FA SECRET</Text>
                    <Text style={[s.fieldValue, { color: T.amber }]}>Confidential 2FA payload shared</Text>
                  </View>
                </View>
              ) : null}

              {decryptedItem.notes ? (
                <View style={[s.fieldRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <View style={s.fieldMain}>
                    <Text style={s.fieldLabel}>NOTES</Text>
                    <Text style={s.fieldValue}>{decryptedItem.notes}</Text>
                  </View>
                </View>
              ) : null}

            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: T.pad, paddingTop: 10, paddingBottom: 24 },
  backBtn: { padding: 8, marginLeft: -8 },
  backIcon: { fontSize: 24, color: T.white, fontWeight: '800' },
  heading: { fontSize: 18, fontWeight: '800', color: T.white },
  
  content: { paddingHorizontal: T.pad, paddingTop: 30 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emoji: { fontSize: 60, marginBottom: 20 },

  card: { backgroundColor: '#11151A', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: T.border, alignSelf: 'center', width: '100%', maxWidth: 400 },
  title: { fontSize: 22, fontWeight: '800', color: T.white, marginBottom: 8, textAlign: 'center' },
  desc: { fontSize: 14, color: T.muted, marginBottom: 32, lineHeight: 22, textAlign: 'center' },

  pinInput: { backgroundColor: T.glass, borderWidth: 1, borderColor: T.border, borderRadius: 16, fontSize: 32, letterSpacing: 10, textAlign: 'center', color: T.cyan, padding: 16, fontFamily: 'monospace', marginBottom: 24 },
  errorText: { color: T.danger, fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 24 },

  btn: { width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnCancel: { backgroundColor: T.glass, borderWidth: 1, borderColor: T.border },
  btnTextCancel: { color: T.muted, fontWeight: '700' },
  btnPrimary: { backgroundColor: T.cyan },
  btnTextPrimary: { color: '#000', fontWeight: '800', fontSize: 16 },

  readOnlyAlert: { backgroundColor: 'rgba(255,193,7,0.08)', borderColor: 'rgba(255,193,7,0.3)', marginBottom: 24 },
  readOnlyTitle: { fontSize: 16, fontWeight: '800', color: T.amber, marginBottom: 4 },
  readOnlyDesc: { fontSize: 13, color: T.amber, opacity: 0.8 },
  copyWarning: { marginTop: 12, fontSize: 12, color: T.amber, fontWeight: '700' },

  itemCard: { backgroundColor: T.glass, borderRadius: T.rCard, padding: 20, borderWidth: 1, borderColor: T.border },
  credentialName: { fontSize: 24, fontWeight: '800', color: T.white, marginBottom: 30 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 16, marginBottom: 16 },
  fieldMain: { flex: 1, paddingRight: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: T.muted, marginBottom: 6, letterSpacing: 1 },
  fieldValue: { color: T.white, ...T.fontMono, fontSize: 16 },
  copyBtn: { padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 },
  copyIcon: { fontSize: 16 },
});
