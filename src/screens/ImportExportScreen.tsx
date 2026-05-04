// ─────────────────────────────────────────────────────────────────────────────
// IMPORT / EXPORT SCREEN — SecureX
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { VaultImportExport, ImportResult } from '../utils/vaultImportExport';
import { AppBackground } from '../components/AppBackground';
import { BottomNav } from '../components/BottomNav';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';
import { T } from '../theme/tokens';
import { MasterPasswordManager } from '../theme/database/MasterPasswordManager';
import { useVaultStore } from '../store/vaultStore';

export const ImportExportScreen: React.FC = () => {
  const navigation = useNavigation();
  const toastRef = useRef<MicroToastHandle>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'EXPORT' | 'IMPORT_JSON'>('EXPORT');
  const [masterPassword, setMasterPassword] = useState('');
  const [pendingFileUri, setPendingFileUri] = useState<string | null>(null);

  // Preview State
  const [previewData, setPreviewData] = useState<ImportResult | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // EXPORT FLOW
  // ──────────────────────────────────────────────────────────────────────────
  const handleExportStart = () => {
    setModalMode('EXPORT');
    setMasterPassword('');
    setModalVisible(true);
  };

  const executeExport = async () => {
    if (!masterPassword) {
      Alert.alert('Error', 'Please enter your Master Password to proceed.');
      return;
    }

    setModalVisible(false); // Close initial modal
    setIsLoading(true);

    try {
      // 1. Verify master password locally
      const isValid = await MasterPasswordManager.verifyMasterPassword(masterPassword);
      if (!isValid) {
        setIsLoading(false);
        Alert.alert('Authentication Failed', 'Incorrect Master Password.');
        return;
      }

      // 2. Call exportVault
      const success = await VaultImportExport.exportVault(masterPassword);
      setIsLoading(false);

      if (success) {
        toastRef.current?.show('✔ Backup created successfully');
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg !== 'User did not share') {
        Alert.alert('Export Error', msg);
      }
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // IMPORT FLOW
  // ──────────────────────────────────────────────────────────────────────────
  const handleImportStart = async () => {
    try {
      const file = await VaultImportExport.pickImportFile();
      if (!file) return;

      const filename = file.name.toLowerCase();

      if (filename.endsWith('.json')) {
        // SecureX JSON: Ask for password first
        setPendingFileUri(file.uri);
        setModalMode('IMPORT_JSON');
        setMasterPassword('');
        setModalVisible(true);
      } else if (filename.endsWith('.csv')) {
        // CSV: Import directly
        await processImport(file.uri);
      } else {
        Alert.alert('Format Error', 'Please select a .csv or SecureX .json backup file.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Picker Error', msg);
    }
  };

  const processImport = async (uri: string, password?: string) => {
    setIsLoading(true);
    setModalVisible(false);
    try {
      const result = await VaultImportExport.importVault(uri, password);
      setPreviewData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Import Failed', msg);
    } finally {
      setIsLoading(false);
      setPendingFileUri(null);
    }
  };

  const handleExecuteImportModal = () => {
    if (!masterPassword) {
      Alert.alert('Error', 'Master Password is required.');
      return;
    }
    if (pendingFileUri) {
      processImport(pendingFileUri, masterPassword);
    }
  };

  const confirmBulkAdd = async () => {
    if (!previewData) return;
    setIsLoading(true);
    try {
      const addedCount = await useVaultStore.getState().bulkAddCredentials(previewData.added);
      setPreviewData(null);
      toastRef.current?.show(`✔ ${addedCount} passwords imported, ${previewData.skipped} duplicates skipped`);
      setTimeout(() => navigation.goBack(), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Confirmation Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.container}>
      <AppBackground />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.heading}>Import / Export</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.card}>
          <Text style={s.cardEmoji}>📥</Text>
          <Text style={s.cardTitle}>Import Vault</Text>
          <Text style={s.cardDesc}>
            Import passwords from Chrome, Bitwarden, 1Password CSV files, or a SecureX JSON backup.
          </Text>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: T.glass }]}
            onPress={handleImportStart}
            disabled={isLoading}
          >
            {isLoading && !modalVisible && !previewData ? (
              <ActivityIndicator color={T.cyan} />
            ) : (
              <Text style={[s.btnText, { color: T.cyan }]}>Select File</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.cardEmoji}>📤</Text>
          <Text style={s.cardTitle}>Export Vault</Text>
          <Text style={s.cardDesc}>
            Create an AES-256 encrypted JSON backup of your entire vault (requires Master Password confirmation).
          </Text>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: T.cyan }]}
            onPress={handleExportStart}
            disabled={isLoading}
          >
            {isLoading && !modalVisible && !previewData ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={[s.btnText, { color: '#000' }]}>Generate Backup</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* PASSWORD MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>
              {modalMode === 'EXPORT' ? 'Export Vault' : 'Unlock Backup'}
            </Text>
            <Text style={s.modalDesc}>
              {modalMode === 'EXPORT'
                ? 'Confirm your Master Password to encrypt and save the backup.'
                : 'Enter the password that was used to encrypt this backup.'}
            </Text>

            <TextInput
              style={s.input}
              placeholder="Master Password"
              placeholderTextColor={T.faint}
              secureTextEntry
              autoFocus
              value={masterPassword}
              onChangeText={setMasterPassword}
            />

            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, s.modalBtnCancel]} onPress={() => setModalVisible(false)}>
                <Text style={s.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnPrimary]}
                onPress={modalMode === 'EXPORT' ? executeExport : handleExecuteImportModal}
              >
                <Text style={s.modalBtnTextPrimary}>
                  {modalMode === 'EXPORT' ? 'Start Export' : 'Process File'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* IMPORT PREVIEW MODAL */}
      <Modal visible={!!previewData} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { maxHeight: '80%' }]}>
            <Text style={s.modalTitle}>Import Preview</Text>
            <Text style={[s.modalDesc, { marginBottom: 16 }]}>
              {previewData?.type === 'CSV' ? 'CSV file detected. ' : 'SecureX backup decrypted. '}
              Found {previewData?.total} total entries.
            </Text>

            <View style={s.previewSummary}>
              <View style={s.summaryItem}>
                <Text style={s.summaryVal}>{previewData?.added.length}</Text>
                <Text style={s.summaryLabel}>To Add</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={[s.summaryVal, { color: T.muted }]}>{previewData?.skipped}</Text>
                <Text style={s.summaryLabel}>Duplicates</Text>
              </View>
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnCancel]}
                onPress={() => setPreviewData(null)}
              >
                <Text style={s.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnPrimary]}
                onPress={confirmBulkAdd}
                disabled={previewData?.added.length === 0}
              >
                <Text style={s.modalBtnTextPrimary}>Confirm Import</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* GLOBAL LOADING OVERLAY */}
      {isLoading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color={T.cyan} />
          <Text style={{ color: T.white, marginTop: 16, fontWeight: '600' }}>Please wait...</Text>
        </View>
      )}

      <MicroToast ref={toastRef} />
      <BottomNav activeTab="Settings" />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C10' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: T.pad, paddingTop: 10, paddingBottom: 24 },
  backBtn: { padding: 8, marginLeft: -8 },
  backIcon: { fontSize: 24, color: T.white, fontWeight: '800' },
  heading: { fontSize: 20, fontWeight: '800', color: T.white },

  content: { paddingHorizontal: T.pad, gap: 24, paddingTop: 16 },

  card: {
    backgroundColor: T.glass,
    borderRadius: T.rCard,
    padding: 24,
    borderWidth: 1, borderColor: T.border,
    alignItems: 'center'
  },
  cardEmoji: { fontSize: 48, marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: T.white, marginBottom: 8 },
  cardDesc: { fontSize: 14, color: T.muted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },

  btn: { width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  btnText: { fontWeight: '800', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#11151A', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: T.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: T.white, marginBottom: 8 },
  modalDesc: { fontSize: 14, color: T.muted, marginBottom: 24, lineHeight: 20 },
  input: {
    backgroundColor: T.glass, borderWidth: 1, borderColor: T.border, borderRadius: 12,
    padding: 16, color: T.white, ...T.fontMono, fontSize: 16, marginBottom: 24
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtnCancel: { backgroundColor: T.glass, borderWidth: 1, borderColor: T.border },
  modalBtnTextCancel: { color: T.muted, fontWeight: '700' },
  modalBtnPrimary: { backgroundColor: T.cyan },
  modalBtnTextPrimary: { color: '#000', fontWeight: '800' },

  previewSummary: { flexDirection: 'row', backgroundColor: '#000', borderRadius: 16, padding: 20, gap: 20, marginBottom: 24 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 24, fontWeight: '800', color: T.cyan },
  summaryLabel: { fontSize: 12, color: T.muted, marginTop: 4, fontWeight: '600' },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 999
  }
});
