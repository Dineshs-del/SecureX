import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ToastAndroid, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import { BottomNav } from '../components/BottomNav';
import { AppBackground } from '../components/AppBackground';
import { T } from '../theme/tokens';
import { useBankCardStore, BankCard } from '../store/BankCardVault';

export const BankCardScreen: React.FC = () => {
  const navigation = useNavigation();
  const { cards, loadCards, addCard } = useBankCardStore();
  const [modalVisible, setModalVisible] = useState(false);

  // Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [bankName, setBankName] = useState('');
  const [cardType, setCardType] = useState('Visa');

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleCopy = (text: string) => {
    Clipboard.setString(text);
    ToastAndroid.show('Card number copied', ToastAndroid.SHORT);
  };

  const handleSave = () => {
    if (!cardNumber || !cardholderName || !expiry) {
      Alert.alert('Error', 'Please fill in required fields: Card Number, Name, Expiry');
      return;
    }
    addCard({
      cardNumber,
      cardholderName,
      expiry,
      cvv,
      bankName: bankName || 'My Bank',
      cardType: cardType as any,
      cardNickname: `${bankName} ${cardType}`,
      cardColor: '#1a1a3e',
      isFavorite: false,
    });
    setModalVisible(false);
    // Reset
    setCardNumber('');
    setCardholderName('');
    setExpiry('');
    setCvv('');
    setBankName('');
  };

  const getGradientColors = (type: string) => {
    switch (type) {
      case 'Visa': return ['#1a2980', '#26d0ce'];
      case 'Mastercard': return ['#f12711', '#f5af19'];
      case 'Amex': return ['#3a7bd5', '#3a6073'];
      default: return ['#333333', '#111111'];
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <AppBackground />

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.heading}>Bank Cards</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={s.addBtnText}>+ Add Card</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {cards.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>💳</Text>
            <Text style={s.emptyTitle}>No cards saved yet</Text>
            <Text style={s.emptyDesc}>Add your first credit or debit card securely.</Text>
          </View>
        ) : (
          <>
            {/* CAROUSEL */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.carousel}>
              {cards.map(card => (
                <TouchableOpacity
                  key={card.id}
                  activeOpacity={0.9}
                  onLongPress={() => handleCopy(card.cardNumber)}
                >
                  <LinearGradient
                    colors={getGradientColors(card.cardType)}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={s.physicalCard}
                  >
                    <View style={s.cardTop}>
                      <Text style={s.chip}>🖲️</Text>
                      <Text style={s.cardNetworkLabel}>{card.cardType}</Text>
                    </View>
                    <Text style={s.cardNumberDisplay}>{card.maskedNumber}</Text>
                    <View style={s.cardBottom}>
                      <View>
                        <Text style={s.cardLabel}>CARDHOLDER</Text>
                        <Text style={s.cardValue}>{card.cardholderName.toUpperCase()}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.cardLabel}>EXPIRES</Text>
                        <Text style={s.cardValue}>{card.expiry}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.sectionTitle}>ALL CARDS</Text>
            {cards.map(card => (
              <View key={`list-${card.id}`} style={s.listCard}>
                <View style={s.listIconWrap}>
                  <Text style={s.listIcon}>💳</Text>
                </View>
                <View style={s.listInfo}>
                  <Text style={s.listBankName}>{card.bankName}</Text>
                  <Text style={s.listCardType}>{card.cardType} • {card.maskedNumber.slice(-4)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleCopy(card.cardNumber)}>
                  <Text style={s.copyIcon}>📋</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* ADD MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add New Card</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={s.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.inputLabel}>Bank Name</Text>
              <TextInput style={s.input} placeholderTextColor={T.faint} placeholder="e.g. Chase Bank" value={bankName} onChangeText={setBankName} />

              <Text style={s.inputLabel}>Cardholder Name</Text>
              <TextInput style={s.input} placeholderTextColor={T.faint} placeholder="JOHN DOE" value={cardholderName} onChangeText={setCardholderName} />

              <Text style={s.inputLabel}>Card Number</Text>
              <TextInput style={s.input} placeholderTextColor={T.faint} placeholder="0000 0000 0000 0000" keyboardType="numeric" value={cardNumber} onChangeText={setCardNumber} />

              <View style={s.row}>
                <View style={s.flex1}>
                  <Text style={s.inputLabel}>Expiry</Text>
                  <TextInput style={s.input} placeholderTextColor={T.faint} placeholder="MM/YY" value={expiry} onChangeText={setExpiry} />
                </View>
                <View style={{ width: 16 }} />
                <View style={s.flex1}>
                  <Text style={s.inputLabel}>CVV</Text>
                  <TextInput style={s.input} placeholderTextColor={T.faint} secureTextEntry placeholder="123" keyboardType="numeric" value={cvv} onChangeText={setCvv} />
                </View>
              </View>

              <Text style={s.inputLabel}>Card Type</Text>
              <View style={s.typeRow}>
                {['Visa', 'Mastercard', 'Amex'].map(t => (
                  <TouchableOpacity key={t} style={[s.typeBtn, cardType === t && s.typeBtnActive]} onPress={() => setCardType(t)}>
                    <Text style={[s.typeBtnText, cardType === t && s.typeBtnTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                <Text style={s.saveBtnText}>Securely Save Card</Text>
              </TouchableOpacity>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: T.pad, paddingTop: 10, paddingBottom: 20 },
  backBtn: { padding: 8, marginLeft: -8 },
  backIcon: { fontSize: 24, color: T.white, fontWeight: '800' },
  heading: { fontSize: 20, fontWeight: '800', color: T.white },
  addBtn: { backgroundColor: T.cyanA12, paddingHorizontal: 14, paddingVertical: 8, borderRadius: T.rPill, borderWidth: 1, borderColor: T.cyanA18 },
  addBtnText: { color: T.cyan, fontWeight: '700', fontSize: 13, ...T.fontMono },
  
  content: { paddingBottom: 110 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: T.white, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: T.muted, textAlign: 'center', paddingHorizontal: 40 },

  carousel: { paddingHorizontal: T.pad, gap: 16, paddingBottom: 24 },
  physicalCard: { width: 300, height: 190, borderRadius: 16, padding: 20, justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { fontSize: 24 },
  cardNetworkLabel: { color: 'white', fontWeight: '800', fontSize: 16, fontStyle: 'italic' },
  cardNumberDisplay: { color: 'white', fontSize: 22, fontWeight: '500', letterSpacing: 2, ...T.fontMono },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, marginBottom: 4 },
  cardValue: { color: 'white', fontSize: 14, fontWeight: '600', ...T.fontMono },

  sectionTitle: { ...T.fontLabel, color: T.muted, marginHorizontal: T.pad, marginBottom: 12 },
  listCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.glass, marginHorizontal: T.pad, padding: 16, borderRadius: T.rCard, marginBottom: 10, borderWidth: 1, borderColor: T.border },
  listIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  listIcon: { fontSize: 20 },
  listInfo: { flex: 1 },
  listBankName: { fontSize: 16, fontWeight: '700', color: T.white, marginBottom: 4 },
  listCardType: { fontSize: 13, color: T.muted, ...T.fontMono },
  copyIcon: { fontSize: 18, color: T.faint, padding: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#11151A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: T.pad, maxHeight: '90%', borderWidth: 1, borderColor: T.borderTop },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: T.white },
  closeText: { fontSize: 20, color: T.muted, fontWeight: '800' },
  inputLabel: { ...T.fontLabel, color: T.muted, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: T.glass, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 14, color: T.white, fontSize: 16, ...T.fontMono },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: T.border, alignItems: 'center', backgroundColor: T.glass },
  typeBtnActive: { borderColor: T.cyan, backgroundColor: T.cyanA08 },
  typeBtnText: { color: T.muted, fontWeight: '600', fontSize: 13 },
  typeBtnTextActive: { color: T.cyan, fontWeight: '800' },
  saveBtn: { backgroundColor: T.cyan, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 32, marginBottom: 24 },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },
});
