import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ToastAndroid, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BottomNav } from '../components/BottomNav';
import { AppBackground } from '../components/AppBackground';
import { T } from '../theme/tokens';
import { useSecureNotesStore } from '../store/OtherVaults';

const NOTE_COLORS = ['#1a1a3e', '#3B0010', '#003518', '#3A2800', '#001A4A', '#2F1A00'];

export const SecureNotesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { notes, loadNotes, addNote } = useSecureNotesStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [viewNoteVisible, setViewNoteVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected note for viewing
  const [selectedNote, setSelectedNote] = useState<any>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0]);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const handleSave = () => {
    if (!title || !content) {
      Alert.alert('Error', 'Please enter a title and content.');
      return;
    }
    addNote({
      title,
      content,
      color: selectedColor,
      isPinned: isLocked, // Using isPinned state to act as a lock boolean
      category: 'General',
      isFavorite: false,
    });
    setModalVisible(false);
    setTitle(''); setContent(''); setSelectedColor(NOTE_COLORS[0]); setIsLocked(false);
  };

  const openNote = (note: any) => {
    setSelectedNote(note);
    setViewNoteVisible(true);
  };

  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes;
    return notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()));
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
      onPress={() => openNote(note)}
      style={[s.noteCard, { backgroundColor: note.color || T.glass }]}
    >
      <View style={s.cardHeader}>
        <Text style={s.cardTitle} numberOfLines={2}>{note.title}</Text>
        {note.isPinned && <Text style={s.lockIcon}>🔒</Text>}
      </View>
      <Text style={s.cardPreview} numberOfLines={4}>
        {note.isPinned ? "••••••••••••••••••••" : note.content.substring(0, 80) + (note.content.length > 80 ? '...' : '')}
      </Text>
      <Text style={s.cardDate}>{new Date(note.updatedAt).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container}>
      <AppBackground />

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.heading}>Secure Notes</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModalVisible(true)}>
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

      {/* ADD/EDIT NOTE MODAL */}
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
                  <Text style={s.lockDesc}>Require authentication to read</Text>
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

      {/* VIEW NOTE MODAL */}
      <Modal visible={viewNoteVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: selectedNote?.color || '#11151A', height: '90%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>View Note</Text>
              <TouchableOpacity onPress={() => setViewNoteVisible(false)}><Text style={s.closeText}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: T.white, marginBottom: 16 }}>{selectedNote?.title}</Text>
              <Text style={{ fontSize: 16, color: T.white, lineHeight: 24 }}>{selectedNote?.content}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  addBtnText: { color: T.cyan, fontWeight: '700', fontSize: 13, ...T.fontMono },
  
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: T.white, flex: 1, paddingRight: 8 },
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
});
