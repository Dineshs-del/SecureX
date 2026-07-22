import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert, Share } from 'react-native';
import { T } from '../theme/tokens';
import { CryptoService } from '../theme/crypto/CryptoService';
import { useShareStore } from '../store/shareStore';
import CryptoJS from 'crypto-js';

interface Props {
  isVisible: boolean;
  credential: any;
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { label: '1 Hour', value: 3600 * 1000 },
  { label: '24 Hours', value: 86400 * 1000 },
  { label: '7 Days', value: 7 * 86400 * 1000 },
];

export const ShareCreateModal: React.FC<Props> = ({ isVisible, credential, onClose }) => {
  const [step, setStep] = useState<1 | 2>(1); // 1: Choose expiry, 2: Show PIN
  const [selectedExpiry, setSelectedExpiry] = useState<number>(EXPIRY_OPTIONS[1].value);
  const [pin, setPin] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { addShare } = useShareStore();

  useEffect(() => {
    if (isVisible) {
      setStep(1);
      setPin('');
      setIsGenerating(false);
    }
  }, [isVisible]);

  const handleGenerateShare = async () => {
    if (!credential) return;
    setIsGenerating(true);

    try {
      const now = Date.now();
      const expiresAt = now + selectedExpiry;
      const payloadObj = {
        credentialName: credential.name,
        username: credential.username,
        password: credential.password,
        expiry: expiresAt,
      };
      
      const payloadStr = JSON.stringify(payloadObj);
      
      const encodedPayload = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(payloadStr));
      
      const shareUrl = `securex://share?data=${encodeURIComponent(encodedPayload)}&expires=${expiresAt}`;

      await Share.share({
        message: `I've shared a secure credential with you. It expires soon.\n\nLink: ${shareUrl}`,
      });

      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.content}>
          
          {step === 1 && (
            <>
              <Text style={s.title}>Share Securely</Text>
              <Text style={s.desc}>
                Generate an end-to-end encrypted deep link. The link and its payload will mathematically expire on the client side.
              </Text>

              <Text style={s.label}>Link Expiry Duration:</Text>
              <View style={s.optionsRow}>
                {EXPIRY_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.label}
                    style={[s.optionBtn, selectedExpiry === opt.value && s.optionActive]}
                    onPress={() => setSelectedExpiry(opt.value)}
                  >
                    <Text style={[s.optionText, selectedExpiry === opt.value && s.optionTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.actions}>
                <TouchableOpacity style={[s.btn, s.btnCancel]} onPress={onClose} disabled={isGenerating}>
                  <Text style={s.btnTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={handleGenerateShare} disabled={isGenerating}>
                  {isGenerating ? <ActivityIndicator color="#000" /> : <Text style={s.btnTextPrimary}>Generate Link</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={s.title}>Share PIN Code</Text>
              <Text style={s.desc}>
                Give this 6-digit PIN to your recipient out-of-band (e.g. verbally or via a different app).
              </Text>

              <View style={s.pinBox}>
                <Text style={s.pinText}>{pin}</Text>
              </View>
              
              <Text style={s.warnText}>⚠️ They cannot open the link without this exact PIN.</Text>

              <TouchableOpacity style={[s.btn, s.btnPrimary, { width: '100%', marginTop: 24 }]} onPress={onClose}>
                <Text style={s.btnTextPrimary}>Done</Text>
              </TouchableOpacity>
            </>
          )}

        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  content: { width: '100%', backgroundColor: '#11151A', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: T.border },
  title: { fontSize: 20, fontWeight: '800', color: T.white, marginBottom: 8 },
  desc: { fontSize: 14, color: T.muted, marginBottom: 24, lineHeight: 20 },
  
  label: { fontSize: 12, fontWeight: '700', color: T.muted, marginBottom: 12, textTransform: 'uppercase' },
  optionsRow: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  optionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: T.border, alignItems: 'center', backgroundColor: T.glass },
  optionActive: { borderColor: T.cyan, backgroundColor: T.cyanA12 },
  optionText: { fontSize: 13, fontWeight: '600', color: T.white },
  optionTextActive: { color: T.cyan, fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnCancel: { backgroundColor: T.glass, borderWidth: 1, borderColor: T.border },
  btnTextCancel: { color: T.muted, fontWeight: '700' },
  btnPrimary: { backgroundColor: T.cyan },
  btnTextPrimary: { color: '#000', fontWeight: '800' },

  pinBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pinText: { fontSize: 40, fontWeight: '800', color: T.cyan, letterSpacing: 8, fontFamily: 'monospace' },
  warnText: { fontSize: 13, color: T.amber, textAlign: 'center', fontWeight: '600' },
});
