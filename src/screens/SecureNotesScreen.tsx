import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Animated, Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import { BottomNav } from '../components/BottomNav';
import { AppBackground } from '../components/AppBackground';
import { T } from '../theme/tokens';
import { useSecureNotesStore } from '../store/OtherVaults';
import { MicroToast, MicroToastHandle } from '../components/MicroToast';

const NOTE_COLORS = ['#1a1a3e', '#3B0010', '#003518', '#3A2800', '#001A4A', '#2F1A00'];
const PIN_STORE_KEY = '@securex_notes_pin';

export const SecureNotesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { notes, loadNotes, addNote, updateNote, deleteNote } = useSecureNotesStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [viewNoteVisible, setViewNoteVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const toastRef = useRef<MicroToastHandle>(null);
  
  // Selected note for viewing
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0]);
  const [isLocked, setIsLocked] = useState(false);

  // PIN state
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinMode, setPinMode] = useState<'AUTH' | 'SETUP_1' | 'SETUP_2'>('AUTH');
  const [pinSetup1, setPinSetup1] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [targetNote, setTargetNote] = useState<any>(null);
  const [pinError, setPinError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const handleSave = () => {
    if (!title || !content) {
      Alert.alert('Error', 'Please enter a title and content.');
      return;
    }
    
    // We treat isFavorite as LOCKED, and isPinned as PINNED TO TOP
    if (selectedNote && isEditMode) {
      // update
      updateNote(selectedNote.id, {
        title,
        content,
        color: selectedColor,
        isFavorite: isLocked
      });
      toastRef.current?.show('✔ Note updated');
      setViewNoteVisible(false);
      setIsEditMode(false);
    } else {
      // create
      addNote({
        title,
        content,
        color: selectedColor,
        isPinned: false, 
        category: 'General',
        isFavorite: isLocked, // Lock flag
      });
      toastRef.current?.show('✔ Note saved successfully');
    }
    
    setModalVisible(false);
    setTitle(''); setContent(''); setSelectedColor(NOTE_COLORS[0]); setIsLocked(false); setSelectedNote(null);
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Delete Note?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteNote(id);
        toastRef.current?.show('✔ Note deleted');
        setViewNoteVisible(false);
      }}
    ]);
  };

  const handleCopy = (text: string) => {
    Clipboard.setString(text);
    toastRef.current?.show('✔ Note content copied');
  };

  const togglePinToTop = (id: string, currentPinStatus: boolean) => {
    updateNote(id, { isPinned: !currentPinStatus });
    if (!currentPinStatus) {
      toastRef.current?.show('📌 Pinned to top');
    }
  };

  const openNoteRequest = async (note: any) => {
    if (note.isFavorite) {
      // Note is locked
      const stored = await AsyncStorage.getItem(PIN_STORE_KEY);
      if (!stored) {
        setPinMode('SETUP_1');
      } else {
        setPinMode('AUTH');
      }
      setTargetNote(note);
      setPinInput('');
      setPinError(false);
      setPinModalVisible(true);
    } else {
      setSelectedNote(note);
      setIsEditMode(false);
      setViewNoteVisible(true);
    }
  };

  const handlePinPress = (digit: string) => {
    if (pinInput.length < 4) {
      const newVal = pinInput + digit;
      setPinInput(newVal);
      if (newVal.length === 4) {
        setTimeout(() => checkPin(newVal), 50);
      }
    }
  };

  const handleDeletePinChar = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  const checkPin = async (val: string) => {
    if (pinMode === 'AUTH') {
      const stored = await AsyncStorage.getItem(PIN_STORE_KEY);
      if (stored === val) {
        setPinModalVisible(false);
        setPinInput('');
        setSelectedNote(targetNote);
        setIsEditMode(false);
        setViewNoteVisible(true);
      } else {
        setPinError(true);
        triggerShake();
        setTimeout(() => { setPinInput(''); setPinError(false); }, 400);
      }
    } else if (pinMode === 'SETUP_1') {
      setPinSetup1(val);
      setPinMode('SETUP_2');
      setPinInput('');
    } else if (pinMode === 'SETUP_2') {
      if (val === pinSetup1) {
        await AsyncStorage.setItem(PIN_STORE_KEY, val);
        setPinModalVisible(false);
        setPinInput('');
        toastRef.current?.show('✔ PIN set successfully');
        setSelectedNote(targetNote);
        setIsEditMode(false);
        setViewNoteVisible(true);
      } else {
        setPinError(true);
        triggerShake();
        setTimeout(() => { 
           setPinMode('SETUP_1');
           setPinInput(''); 
           setPinSetup1(''); 
           setPinError(false); 
        }, 400);
        toastRef.current?.show('❌ PINs do not match');
      }
    }
  };

  const filteredNotes = useMemo(() => {
    let arr = notes;
    if (searchQuery) {
      arr = notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    // Sort: pinned first, then by date descending
    return [...arr].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, searchQuery]);

  // Masonry split
  const col1: any[] = [];
  const col2: any[] = [];
  filteredNotes.forEach((n, i) => {
    if (i % 2 === 0) col1.push(n);
    else col2.push(n);
  });

  const renderNoteCard = (note: any) => (
    <TouchableOpacity
      key={note.id}
      activeOpacity={0.8}
      onPress={() => openNoteRequest(note)}
      onLongPress={() => confirmDelete(note.id)}
      style={[s.noteCard, { backgroundColor: note.color || T.glass }]}
    >
      <View style={s.cardHeader}>
        {/* Color Dot + Title */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
           <View style={[s.cardDot, { backgroundColor: note.color || T.glass }]} />
           <Text style={s.cardTitle} numberOfLines={2}>{note.title}</Text>
        </View>
        {/* Actions inside header */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {note.isFavorite && <Text style={s.lockIcon}>🔒</Text>}
          <TouchableOpacity onPress={() => togglePinToTop(note.id, note.isPinned)} style={{ padding: 4, marginLeft: 4 }}>
            <Text style={{ fontSize: 14, opacity: note.isPinned ? 1 : 0.3 }}>📌</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={s.cardPreview} numberOfLines={4}>
        {note.isFavorite ? "••••••••••••••••••••" : note.content.substring(0, 80) + (note.content.length > 80 ? '...' : '')}
      </Text>
      <Text style={s.cardDate}>{new Date(note.updatedAt).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );

  const startEditMode = () => {
    setTitle(selectedNote.title);
    setContent(selectedNote.content);
    setSelectedColor(selectedNote.color || NOTE_COLORS[0]);
    setIsLocked(selectedNote.isFavorite);
    setIsEditMode(true);
  };

  return (
    <SafeAreaView style={s.container}>
      <AppBackground />

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.heading}>Secure Notes</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => { setSelectedNote(null); setIsEditMode(false); setTitle(''); setContent(''); setIsLocked(false); setModalVisible(true); }}>
          <Text style={s.addBtnText}>+ New Note</Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={s.searchPill}>
        <Text style={s.searchIconText}>⌕</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Search notes..."
          placeholderTextColor={T.faint}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={s.searchClear}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {filteredNotes.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>📝</Text>
            <Text style={s.emptyTitle}>No notes found</Text>
            <Text style={s.emptyDesc}>Keep your private thoughts, codes, and recovery phrases secure.</Text>
          </View>
        ) : (
          <View style={s.masonryWrap}>
            <View style={s.masonryCol}>{col1.map(renderNoteCard)}</View>
            <View style={s.masonryCol}>{col2.map(renderNoteCard)}</View>
          </View>
        )}
      </ScrollView>

      {/* ADD NEW NOTE MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Secure Note</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={s.closeText}>✕</Text></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.inputLabel}>Title</Text>
              <TextInput style={s.input} placeholderTextColor={T.faint} placeholder="e.g. Master Key Recovery" value={title} onChangeText={setTitle} />

              <Text style={s.inputLabel}>Content</Text>
              <TextInput
                style={[s.input, { height: 160, textAlignVertical: 'top' }]}
                multiline
                placeholderTextColor={T.faint}
                placeholder="Write your secure note here..."
                value={content}
                onChangeText={setContent}
              />

              <Text style={s.inputLabel}>Color Tag</Text>
              <View style={s.colorRow}>
                {NOTE_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setSelectedColor(c)}
                    style={[s.colorCircle, { backgroundColor: c }, selectedColor === c && s.colorCircleActive]}
                  />
                ))}
              </View>

              <View style={s.lockToggleContainer}>
                <View style={s.lockTextDesc}>
                  <Text style={s.lockLabel}>🔒 Lock Note</Text>
                  <Text style={s.lockDesc}>Require PIN authentication to read</Text>
                </View>
                <TouchableOpacity
                  style={[s.toggleTrack, isLocked && s.toggleTrackActive]}
                  onPress={() => setIsLocked(!isLocked)}
                  activeOpacity={0.8}
                >
                  <View style={[s.toggleKnob, isLocked && s.toggleKnobActive]} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                <Text style={s.saveBtnText}>Save Secure Note</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* VIEW / EDIT NOTE MODAL */}
      <Modal visible={viewNoteVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: isEditMode ? '#11151A' : (selectedNote?.color || '#11151A'), height: '90%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{isEditMode ? 'Edit Note' : 'View Note'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {!isEditMode && selectedNote && (
                  <>
                    <TouchableOpacity onPress={() => handleCopy(selectedNote.content)} style={{ marginRight: 16 }}><Text style={s.closeText}>📋</Text></TouchableOpacity>
                    <TouchableOpacity onPress={startEditMode} style={{ marginRight: 16 }}><Text style={s.closeText}>✏️</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(selectedNote.id)} style={{ marginRight: 16 }}><Text style={s.closeText}>🗑️</Text></TouchableOpacity>
                  </>
                )}
                <TouchableOpacity onPress={() => { setViewNoteVisible(false); setIsEditMode(false); }}><Text style={s.closeText}>✕</Text></TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {isEditMode ? (
                <>
                  <Text style={s.inputLabel}>Title</Text>
                  <TextInput style={s.input} placeholderTextColor={T.faint} value={title} onChangeText={setTitle} />

                  <Text style={s.inputLabel}>Content</Text>
                  <TextInput
                    style={[s.input, { height: 160, textAlignVertical: 'top' }]}
                    multiline
                    placeholderTextColor={T.faint}
                    value={content}
                    onChangeText={setContent}
                  />

                  <Text style={s.inputLabel}>Color Tag</Text>
                  <View style={s.colorRow}>
                    {NOTE_COLORS.map(c => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setSelectedColor(c)}
                        style={[s.colorCircle, { backgroundColor: c }, selectedColor === c && s.colorCircleActive]}
                      />
                    ))}
                  </View>

                  <View style={s.lockToggleContainer}>
                    <View style={s.lockTextDesc}>
                      <Text style={s.lockLabel}>🔒 Lock Note</Text>
                      <Text style={s.lockDesc}>Require PIN authentication to read</Text>
                    </View>
                    <TouchableOpacity
                      style={[s.toggleTrack, isLocked && s.toggleTrackActive]}
                      onPress={() => setIsLocked(!isLocked)}
                      activeOpacity={0.8}
                    >
                      <View style={[s.toggleKnob, isLocked && s.toggleKnobActive]} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                    <Text style={s.saveBtnText}>Save Changes</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: T.white, marginBottom: 16 }}>{selectedNote?.title}</Text>
                  <Text style={{ fontSize: 16, color: T.white, lineHeight: 24 }}>{selectedNote?.content}</Text>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PIN AUTHENTICATION MODAL */}
      <Modal visible={pinModalVisible} transparent animationType="fade">
        <View style={[s.modalOverlay, { justifyContent: 'center' }]}>
          <View style={[s.modalContent, { maxHeight: 500, marginHorizontal: 20, borderRadius: 24 }]}>
            <View style={{ alignItems: 'flex-end', marginBottom: 10 }}>
              <TouchableOpacity onPress={() => setPinModalVisible(false)}><Text style={s.closeText}>✕</Text></TouchableOpacity>
            </View>
            <View style={{ alignItems: 'center', marginBottom: 30 }}>
              <Text style={{ fontSize: 36, marginBottom: 16 }}>🔒</Text>
              <Text style={{ fontSize: 18, color: T.white, fontWeight: '700', marginBottom: 8 }}>
                {pinMode === 'AUTH' ? 'Enter PIN to unlock note' : (pinMode === 'SETUP_1' ? 'Create a 4-digit PIN' : 'Confirm your PIN')}
              </Text>
              {pinError && <Text style={{ color: T.danger, fontWeight: '600', fontSize: 13 }}>Incorrect PIN. Try again.</Text>}
            </View>
            
            {/* PIN Dots */}
            <Animated.View style={[{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 40 }, { transform: [{ translateX: shakeAnim }] }]}>
              {[0, 1, 2, 3].map(i => (
                <View key={i} style={[s.pinDot, pinInput.length > i && s.pinDotActive, pinError && s.pinDotError]} />
              ))}
            </Animated.View>

            {/* Numpad */}
            <View style={s.numpad}>
              {[['1','2','3'], ['4','5','6'], ['7','8','9'], ['', '0', 'DEL']].map((row, rI) => (
                <View key={rI} style={s.numRow}>
                  {row.map((btn, cI) => (
                    <TouchableOpacity 
                      key={cI} 
                      style={[s.numBtn, !btn && { backgroundColor: 'transparent' }]}
                      onPress={() => {
                        if (btn === 'DEL') handleDeletePinChar();
                        else if (btn) handlePinPress(btn);
                      }}
                      disabled={!btn}
                    >
                      <Text style={s.numText}>{btn === 'DEL' ? '⌫' : btn}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

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
  
  searchPill: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: T.pad, marginBottom: 16,
    backgroundColor: T.glass, borderRadius: T.rPill, paddingHorizontal: 18,
    borderWidth: 1, borderColor: T.border,
  },
  searchIconText: { fontSize: 18, color: T.faint, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: T.white, paddingVertical: 13 },
  searchClear: { fontSize: 14, color: T.faint, padding: 4 },

  content: { paddingBottom: 110 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: T.white, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: T.muted, textAlign: 'center', paddingHorizontal: 40 },

  masonryWrap: { flexDirection: 'row', paddingHorizontal: T.pad, gap: 12 },
  masonryCol: { flex: 1, gap: 12 },
  noteCard: {
    padding: 16, borderRadius: T.rCard,
    borderWidth: 1, borderColor: T.border,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  cardDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: T.white, flex: 1, paddingRight: 4 },
  lockIcon: { fontSize: 14 },
  cardPreview: { fontSize: 13, color: T.muted, lineHeight: 18, marginBottom: 12 },
  cardDate: { color: T.faint, ...T.fontMono, fontSize: 10, textAlign: 'right' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#11151A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: T.pad, maxHeight: '90%', borderWidth: 1, borderColor: T.borderTop },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: T.white },
  closeText: { fontSize: 20, color: T.muted, fontWeight: '800' },
  
  inputLabel: { ...T.fontLabel, color: T.muted, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: T.glass, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 14, color: T.white, fontSize: 16 },
  
  colorRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  colorCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  colorCircleActive: { borderColor: T.cyan },

  lockToggleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, padding: 16, backgroundColor: T.glass, borderRadius: 12, borderWidth: 1, borderColor: T.border },
  lockTextDesc: { flex: 1 },
  lockLabel: { fontSize: 16, fontWeight: '700', color: T.white, marginBottom: 4 },
  lockDesc: { fontSize: 12, color: T.muted },
  toggleTrack: { width: 44, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', paddingHorizontal: 2 },
  toggleTrackActive: { backgroundColor: T.cyanA18, borderColor: T.cyan, borderWidth: 1 },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: T.muted },
  toggleKnobActive: { backgroundColor: T.cyan, transform: [{ translateX: 18 }] },

  saveBtn: { backgroundColor: T.cyan, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 32, marginBottom: 24 },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },

  // PIN
  pinDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pinDotActive: { backgroundColor: T.cyan, borderColor: T.cyan, shadowColor: T.cyan, shadowOpacity: 0.8, shadowRadius: 6 },
  pinDotError: { backgroundColor: T.danger, borderColor: T.danger, shadowColor: T.danger, shadowOpacity: 0.8, shadowRadius: 6 },
  numpad: { paddingHorizontal: 10, paddingBottom: 20 },
  numRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  numBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 24, color: T.white, fontWeight: '600' }
});
