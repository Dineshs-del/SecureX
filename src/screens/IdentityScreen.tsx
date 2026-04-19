import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ToastAndroid, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import { BottomNav } from '../components/BottomNav';
import { AppBackground } from '../components/AppBackground';
import { T } from '../theme/tokens';
import { useIdentityStore } from '../store/Identityvault';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';

const TABS = ['All', 'Passport', 'Driving License', "National ID", 'Other'];

export const IdentityScreen: React.FC = () => {
  const navigation = useNavigation();
  const { docs, loadDocs, addDoc, deleteDoc } = useIdentityStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const toastRef = React.useRef<MicroToastHandle>(null);

  // Form State
  const [docType, setDocType] = useState('Passport');
  const [fullName, setFullName] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [issuingCountry, setIssuingCountry] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleCopy = (text: string) => {
    Clipboard.setString(text);
    toastRef.current?.show('✔ Document number copied');
  };

  const handleDelete = (id: string, docName: string) => {
    Alert.alert('Delete Document?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteDoc(id);
        toastRef.current?.show(`✔ ${docName} deleted`);
      }}
    ]);
  };

  const handleSave = () => {
    if (!docNumber || !fullName) {
      Alert.alert('Error', 'Please fill in Document Number and Full Name');
      return;
    }

    let expiresInDays = 999;
    let isExpired = false;
    
    if (expiryDate) {
      const parts = expiryDate.split('-');
      if (parts.length === 3 || parts.length === 2) {
        // basic approximation
        const eDate = new Date(expiryDate).getTime();
        if (!isNaN(eDate)) {
          expiresInDays = Math.floor((eDate - Date.now()) / (1000 * 60 * 60 * 24));
          isExpired = expiresInDays < 0;
        }
      }
    }

    // Convert 'National ID' to 'Aadhaar Card' or standard docType if needed, but keeping simple
    const standardDocType = docType === 'National ID' ? 'Aadhaar Card' : docType as any;

    addDoc({
      docType: standardDocType,
      docNickname: `${standardDocType}`,
      docNumber,
      fullName,
      issueDate: new Date(issueDate).getTime() || undefined,
      expiryDate: new Date(expiryDate).getTime() || undefined,
      issuingCountry: issuingCountry || 'Unknown',
      notes: notes || undefined,
      isFavorite: false,
    });
    setModalVisible(false);
    
    // Reset
    setFullName(''); setDocNumber(''); setIssueDate(''); setExpiryDate(''); setIssuingCountry(''); setNotes('');
    toastRef.current?.show('✔ Document saved successfully');
  };

  const filteredDocs = useMemo(() => {
    if (activeTab === 'All') return docs;
    if (activeTab === 'National ID') return docs.filter(d => d.docType === 'Aadhaar Card' || d.docType === 'PAN Card');
    return docs.filter(d => d.docType === activeTab);
  }, [docs, activeTab]);

  const getDocColor = (type: string) => {
    if (type.includes('Passport')) return T.cyan;
    if (type.includes('License')) return T.purple;
    if (type.includes('Aadhaar') || type.includes('PAN')) return T.success;
    return T.white;
  };

  return (
    <SafeAreaView style={s.container}>
      <AppBackground />

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.heading}>Identity</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={s.addBtnText}>+ Add ID</Text>
        </TouchableOpacity>
      </View>

      {/* TABS */}
      <View style={s.tabScrollWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, activeTab === tab && s.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {filteredDocs.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>🪪</Text>
            <Text style={s.emptyTitle}>No documents found</Text>
            <Text style={s.emptyDesc}>Keep your passports, licenses, and IDs handy.</Text>
          </View>
        ) : (
          filteredDocs.map(doc => {
            const expStr = doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : 'No expiry';
            const showWarning = doc.expiresInDays <= 90 && !doc.isExpired;

            return (
              <View key={doc.id} style={s.card}>
                <View style={[s.cardLeftColor, { backgroundColor: getDocColor(doc.docType) }]} />
                <View style={s.cardIconWrap}>
                  <Text style={s.cardIcon}>{doc.docIcon}</Text>
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.docName}>{doc.fullName}</Text>
                  <Text style={s.docDetails}>{doc.docType} • {doc.docNumber.slice(0, 3)}***{doc.docNumber.slice(-3)}</Text>
                  <View style={s.docFooter}>
                    <Text style={s.docLoc}>{doc.issuingCountry}</Text>
                    {doc.isExpired ? (
                      <View style={s.badgeExpired}><Text style={s.badgeTextExpired}>EXPIRED</Text></View>
                    ) : showWarning ? (
                      <View style={s.badgeWarn}><Text style={s.badgeTextWarn}>EXP IN {doc.expiresInDays}D</Text></View>
                    ) : (
                      <Text style={s.docExp}>Exp: {expStr}</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleCopy(doc.docNumber)}>
                  <Text style={s.copyIcon}>📋</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(doc.id, doc.fullName)}>
                  <Text style={s.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            )
          })
        )}
      </ScrollView>

      {/* ADD MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Identity Document</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={s.closeText}>✕</Text></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.inputLabel}>Document Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {['Passport', 'Driving License', 'National ID', 'Other'].map(t => (
                  <TouchableOpacity key={t} style={[s.typePill, docType === t && s.typePillActive]} onPress={() => setDocType(t)}>
                    <Text style={[s.typePillText, docType === t && s.typePillTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={s.inputLabel}>Full Name</Text>
              <TextInput style={s.input} placeholderTextColor={T.faint} placeholder="As printed on document" value={fullName} onChangeText={setFullName} />

              <Text style={s.inputLabel}>Document Number</Text>
              <TextInput style={s.input} placeholderTextColor={T.faint} placeholder="e.g. L898902C3" value={docNumber} onChangeText={setDocNumber} />

              <View style={s.row}>
                <View style={s.flex1}>
                  <Text style={s.inputLabel}>Issue Date</Text>
                  <TextInput style={s.input} placeholderTextColor={T.faint} placeholder="YYYY-MM-DD" value={issueDate} onChangeText={setIssueDate} />
                </View>
                <View style={{ width: 16 }} />
                <View style={s.flex1}>
                  <Text style={s.inputLabel}>Expiry Date</Text>
                  <TextInput style={s.input} placeholderTextColor={T.faint} placeholder="YYYY-MM-DD" value={expiryDate} onChangeText={setExpiryDate} />
                </View>
              </View>

              <Text style={s.inputLabel}>Issuing Country / State</Text>
              <TextInput style={s.input} placeholderTextColor={T.faint} placeholder="e.g. USA, New York" value={issuingCountry} onChangeText={setIssuingCountry} />

              <Text style={s.inputLabel}>Additional Notes</Text>
              <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} multiline placeholderTextColor={T.faint} placeholder="Optional" value={notes} onChangeText={setNotes} />

              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                <Text style={s.saveBtnText}>Securely Save ID</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <MicroToast ref={toastRef} />
      <BottomNav activeTab="Vault" />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C10' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: T.pad, paddingTop: 10, paddingBottom: 16 },
  backBtn: { padding: 8, marginLeft: -8 },
  backIcon: { fontSize: 24, color: T.white, fontWeight: '800' },
  heading: { fontSize: 20, fontWeight: '800', color: T.white },
  addBtn: { backgroundColor: T.cyanA12, paddingHorizontal: 14, paddingVertical: 8, borderRadius: T.rPill, borderWidth: 1, borderColor: T.cyanA18 },
  addBtnText: { color: T.cyan, ...T.fontMono, fontWeight: '700', fontSize: 13 },
  
  tabScrollWrap: { height: 40, marginBottom: 16 },
  tabs: { paddingHorizontal: T.pad, gap: 10 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: T.rPill, backgroundColor: T.glass, borderWidth: 1, borderColor: T.border },
  tabActive: { backgroundColor: T.cyanA12, borderColor: T.cyanA18 },
  tabText: { color: T.muted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: T.cyan, fontWeight: '800' },

  content: { paddingBottom: 110 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: T.white, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: T.muted, textAlign: 'center', paddingHorizontal: 40 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.glass, marginHorizontal: T.pad, padding: 16, borderRadius: T.rCard, marginBottom: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  cardLeftColor: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  cardIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 16, marginLeft: 6 },
  cardIcon: { fontSize: 24 },
  cardInfo: { flex: 1 },
  docName: { fontSize: 16, fontWeight: '700', color: T.white, marginBottom: 4 },
  docDetails: { color: T.faint, ...T.fontMono, fontSize: 12, marginBottom: 6 },
  docFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docLoc: { fontSize: 11, color: T.muted, fontWeight: '600', textTransform: 'uppercase' },
  docExp: { color: T.muted, ...T.fontMono, fontSize: 11 },
  badgeWarn: { backgroundColor: T.warningA14, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(245,166,35,0.3)' },
  badgeTextWarn: { color: T.warning, ...T.fontMono, fontSize: 10, fontWeight: '800' },
  badgeExpired: { backgroundColor: T.dangerA14, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,77,109,0.3)' },
  badgeTextExpired: { color: T.danger, ...T.fontMono, fontSize: 10, fontWeight: '800' },
  
  copyIcon: { fontSize: 18, color: T.faint, padding: 8 },
  deleteIcon: { fontSize: 18, color: T.danger, padding: 8, marginLeft: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#11151A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: T.pad, maxHeight: '90%', borderWidth: 1, borderColor: T.borderTop },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: T.white },
  closeText: { fontSize: 20, color: T.muted, fontWeight: '800' },
  
  typePill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: T.glass, marginRight: 8, borderWidth: 1, borderColor: T.border },
  typePillActive: { backgroundColor: T.cyanA12, borderColor: T.cyan },
  typePillText: { color: T.muted, fontSize: 13, fontWeight: '600' },
  typePillTextActive: { color: T.cyan, fontWeight: '700' },

  inputLabel: { ...T.fontLabel, color: T.muted, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: T.glass, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 14, color: T.white, ...T.fontMono, fontSize: 16 },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  saveBtn: { backgroundColor: T.cyan, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 32, marginBottom: 24 },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },
});
