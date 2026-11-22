import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { pick, types, errorCodes, isErrorWithCode } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import Svg, { Path } from 'react-native-svg';
import { useVaultStore } from '../store/vaultStore';
import { parseCSVToCredentials } from '../utils/csvParser';
import { VaultImportExport } from '../utils/vaultImportExport';
import { AppBackground } from '../components/AppBackground';
import { GlassView } from '../components/GlassView';
import { CredentialIcon } from '../components/CredentialIcon';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';

// Vector SVG Icons
const ArrowLeftIcon = ({ size = 20, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const FileUploadIcon = ({ size = 32, color = '#CFE3FF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const WarningIcon = ({ size = 20, color = '#f5a623' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 9v4M12 17h.01" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ImportExportScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { bulkAddCredentials, credentials } = useVaultStore();
  const toastRef = useRef<MicroToastHandle>(null);

  const [file, setFile] = useState<{ name: string; size: number; uri: string; type: 'CSV' | 'JSON' } | null>(null);
  const [stats, setStats] = useState({ new: 0, duplicates: 0, skipped: 0 });
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);

  // Encrypted JSON Backup Password Modal
  const [pendingJsonFile, setPendingJsonFile] = useState<{ name: string; size: number; uri: string } | null>(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);

  const pickFile = async () => {
    try {
      const [res] = await pick({
        type: [types.allFiles],
        allowMultiSelection: false,
      });
      if (!res) return;
      const content = await RNFS.readFile(res.uri, 'utf8');
      const trimmed = content.trimStart();
      const fileName = res.name || 'backup';

      // Detect SecureX encrypted JSON backup
      if (fileName.toLowerCase().endsWith('.json') || trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(content);
          if (parsed && typeof parsed.ciphertext === 'string' && typeof parsed.iv === 'string' && typeof parsed.salt === 'string') {
            setPendingJsonFile({ name: fileName, size: res.size || 0, uri: res.uri });
            setBackupPassword('');
            return;
          }
        } catch {}
      }

      // Parse CSV robustly by header name (Chrome, Bitwarden, 1Password)
      const parsedRows = parseCSVToCredentials(content);
      const newItems: any[] = [];
      const duplicates: any[] = [];
      let skipped = 0;

      parsedRows.forEach((normalized) => {
        if (!normalized.password) {
          skipped++;
          return;
        }

        const isDuplicate = credentials.some(
          (c) =>
            (c.url === normalized.url || (c.androidPackage && c.androidPackage === normalized.androidPackage)) &&
            c.username.toLowerCase() === normalized.username.toLowerCase()
        );

        if (isDuplicate) {
          duplicates.push(normalized);
        } else {
          newItems.push(normalized);
        }
      });

      setFile({ name: fileName, size: res.size || 0, uri: res.uri, type: 'CSV' });
      setStats({ new: newItems.length, duplicates: duplicates.length, skipped });
      setPreviewItems(newItems);
    } catch (err: any) {
      if (!(isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED)) {
        toastRef.current?.show('Error reading file or unrecognised format', 'error');
      }
    }
  };

  const handleDecryptJsonBackup = async () => {
    if (!pendingJsonFile) return;
    if (!backupPassword.trim()) {
      toastRef.current?.show('Enter the backup master password', 'error');
      return;
    }

    setIsDecrypting(true);
    try {
      const result = await VaultImportExport.importVault(pendingJsonFile.uri, backupPassword);
      setFile({ name: pendingJsonFile.name, size: pendingJsonFile.size, uri: pendingJsonFile.uri, type: 'JSON' });
      setStats({ new: result.added.length, duplicates: result.skipped, skipped: 0 });
      setPreviewItems(result.added);
      setPendingJsonFile(null);
      setBackupPassword('');
      toastRef.current?.show(`Decrypted ${result.total} backup entries`, 'success');
    } catch (err: any) {
      toastRef.current?.show(err?.message || 'Incorrect password or invalid backup', 'error');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleImport = async () => {
    if (stats.new === 0) return;
    await bulkAddCredentials(previewItems);
    setImportSuccess(true);
    setFile(null);
    setPreviewItems([]);
    toastRef.current?.show(`Successfully imported ${stats.new} logins!`, 'success');
  };

  if (importSuccess) {
    return (
      <SafeAreaView style={s.container}>
        <AppBackground />
        <View style={s.successContainer}>
          <Text style={s.successTitle}>{stats.new} logins imported</Text>
          <TouchableOpacity style={s.importBtn} onPress={() => navigation.goBack()}>
            <Text style={s.importBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080c10" />
      <AppBackground />
      <MicroToast ref={toastRef} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back" accessibilityRole="button">
          <ArrowLeftIcon />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Import</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* File Picker */}
        <TouchableOpacity style={s.fileCard} onPress={pickFile} accessibilityLabel="Choose file" accessibilityRole="button">
          {!file ? (
            <>
              <FileUploadIcon />
              <Text style={s.fileTitle}>Choose file</Text>
              <Text style={s.fileSub}>SecureX encrypted .json or Chrome / Bitwarden / 1Password CSV</Text>
            </>
          ) : (
            <>
              <Text style={s.fileName} numberOfLines={1}>{file.name}</Text>
              <Text style={s.fileSize}>{(file.size / 1024).toFixed(1)} KB • {file.type}</Text>
              <Text style={s.changeFile}>Change file</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Stats */}
        {file && (
          <View style={s.statsRow}>
            <View style={s.statBox}><Text style={s.statNum}>{stats.new}</Text><Text style={s.statLabel}>New</Text></View>
            <View style={s.statBox}><Text style={[s.statNum, { color: '#f5a623' }]}>{stats.duplicates}</Text><Text style={s.statLabel}>Duplicates</Text></View>
            <View style={s.statBox}><Text style={[s.statNum, { color: '#fb7185' }]}>{stats.skipped}</Text><Text style={s.statLabel}>Skipped</Text></View>
          </View>
        )}

        {/* Preview */}
        {previewItems.length > 0 && (
          <View style={s.previewList}>
            {previewItems.slice(0, 5).map((item, i) => (
              <View key={i} style={s.previewRow}>
                <CredentialIcon name={item.name} size={40} />
                <View style={s.previewText}>
                  <Text style={s.previewName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.previewUser} numberOfLines={1}>{item.username}</Text>
                </View>
                <Text style={s.badgeNew}>NEW</Text>
              </View>
            ))}
            {previewItems.length > 5 && <Text style={s.moreItems}>+ {previewItems.length - 5} more</Text>}
          </View>
        )}

        {/* Warning (only for plaintext CSV) */}
        {file && file.type === 'CSV' && (
          <GlassView style={s.warningCard} borderRadius={20}>
            <WarningIcon />
            <Text style={s.warningText}>This CSV file contains your passwords in plain text. Delete it after importing.</Text>
          </GlassView>
        )}
      </ScrollView>

      {/* Action Button */}
      {file && stats.new > 0 && (
        <View style={s.footerButtonWrap}>
          <TouchableOpacity style={s.importBtn} onPress={handleImport} accessibilityLabel={`Import ${stats.new} logins`} accessibilityRole="button">
            <Text style={s.importBtnText}>Import {stats.new} logins</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Encrypted Backup Password Modal */}
      <Modal visible={pendingJsonFile !== null} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Decrypt SecureX Backup</Text>
            <Text style={s.modalSubtitle}>
              Enter the master password used to encrypt {pendingJsonFile?.name}.
            </Text>

            <TextInput
              style={s.modalInput}
              secureTextEntry
              value={backupPassword}
              onChangeText={setBackupPassword}
              placeholder="Backup master password..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none"
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => {
                  setPendingJsonFile(null);
                  setBackupPassword('');
                }}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.modalConfirmBtn}
                onPress={handleDecryptJsonBackup}
                disabled={isDecrypting}
              >
                <Text style={s.modalConfirmText}>{isDecrypting ? 'DECRYPTING...' : 'DECRYPT'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E13' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40 },
  backBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginLeft: 16 },
  content: { padding: 20, paddingBottom: 120 },
  fileCard: { height: 180, borderStyle: 'dashed', borderWidth: 2, borderColor: '#CFE3FF', borderRadius: 26, backgroundColor: 'rgba(207,227,255,0.05)', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  fileTitle: { fontSize: 16, fontWeight: '700', color: '#CFE3FF' },
  fileSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  fileName: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' },
  fileSize: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  changeFile: { fontSize: 13, color: '#00e5ff', marginTop: 8, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statNum: { fontSize: 20, fontWeight: '800', color: '#06d6a0' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontWeight: '700' },
  previewList: { marginTop: 20, gap: 10 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0c1219', padding: 12, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  previewText: { flex: 1 },
  previewName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  previewUser: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  badgeNew: { fontSize: 10, fontWeight: '800', color: '#06d6a0', backgroundColor: 'rgba(6,214,160,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  moreItems: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 10, fontWeight: '600' },
  warningCard: { flexDirection: 'row', gap: 12, padding: 16, marginTop: 20, backgroundColor: 'rgba(245,166,35,0.15)', borderWidth: 1, borderColor: 'rgba(245,166,35,0.4)' },
  warningText: { flex: 1, fontSize: 13, color: '#f5a623', lineHeight: 18, fontWeight: '500' },
  footerButtonWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(10,14,19,0.9)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  importBtn: { height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  importBtnText: { fontSize: 17, fontWeight: '800', color: '#080c10' },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', paddingHorizontal: 20 },
  modalCard: { backgroundColor: '#0c131d', borderRadius: 24, padding: 22, borderWidth: 1, borderColor: 'rgba(0,229,255,0.3)' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  modalSubtitle: { fontSize: 12, color: '#A3B1C2', marginTop: 4, marginBottom: 16, lineHeight: 18 },
  modalInput: { backgroundColor: '#070b10', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', height: 48, paddingHorizontal: 14, color: '#FFFFFF', fontSize: 14, marginBottom: 14 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  modalCancelText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: '#00e5ff', alignItems: 'center' },
  modalConfirmText: { fontSize: 13, fontWeight: '800', color: '#080c10' },
});
