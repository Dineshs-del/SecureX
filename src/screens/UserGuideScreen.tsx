import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, LayoutAnimation, Platform, UIManager,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppBackground } from '../components/AppBackground';
import { T } from '../theme/tokens';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface UserGuideSectionProps {
  emoji: string;
  title: string;
  desc: string;
  children: React.ReactNode;
  isWarning?: 'red' | 'amber';
  style?: any;
}

const UserGuideSection: React.FC<UserGuideSectionProps> = ({ emoji, title, desc, children, isWarning, style }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const getCardStyle = () => {
    if (isWarning === 'red') return s.cardRed;
    if (isWarning === 'amber') return s.cardAmber;
    if (isExpanded) return s.cardExpanded;
    return s.card;
  };

  return (
    <View style={[s.cardWrap, style]}>
      <TouchableOpacity 
        style={getCardStyle()} 
        onPress={toggle} 
        activeOpacity={0.82}
      >
        <View style={s.topHL} />
        <View style={s.cardHeader}>
          <View style={[s.iconBox, isWarning && { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
            <Text style={s.emoji}>{emoji}</Text>
          </View>
          <View style={s.titleWrap}>
            <Text style={[s.title, isWarning === 'red' && { color: '#ff453a' }]}>{title}</Text>
            <Text style={s.desc}>{desc}</Text>
          </View>
          <Text style={s.chevron}>{isExpanded ? '▼' : '▶'}</Text>
        </View>

        {isExpanded && (
          <View style={s.content}>
            <View style={s.separator} />
            <View style={s.innerContent}>
              {children}
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

export const UserGuideScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AppBackground />
      
      {/* Header */}
      <View style={[s.header, { marginTop: Math.max(insets.top, 24) }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={s.headerTitleWrap}>
          <Text style={s.headerTitle}>User Guide</Text>
          <Text style={s.headerSubtitle}>SecureX v1.0.0</Text>
        </View>
        <View style={{ width: 44 }} /> {/* balance */}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        <UserGuideSection 
          emoji="📖" 
          title="Getting Started" 
          desc="Set up your vault and add credentials"
          style={{ marginTop: 8 }}
        >
          <Text style={s.p}>1. Set your master password on first launch.</Text>
          <Text style={s.p}>2. Tap "+ Add New" in the Vault tab.</Text>
          <Text style={s.p}>3. Fill in your account details (Name, User, Pass).</Text>
          <Text style={s.p}>4. Tap Save — your data is encrypted instantly.</Text>
        </UserGuideSection>

        <UserGuideSection 
          emoji="🔐" 
          title="How Encryption Works" 
          desc="Your privacy is our core priority"
        >
          <Text style={s.li}>• All passwords encrypted with AES-256 GCM.</Text>
          <Text style={s.li}>• Your master password is the derived encryption key.</Text>
          <Text style={s.li}>• SecureX never sees or transmits your passwords.</Text>
          <Text style={s.li}>• All data stays locally on your device.</Text>
        </UserGuideSection>

        <UserGuideSection 
          emoji="➕" 
          title="Adding Credentials" 
          desc="Website, App, or Banking details"
        >
          <Text style={s.p}>Use the "Add New" form to save accounts. You can include website URLs to see favicons and add custom notes for each entry.</Text>
        </UserGuideSection>

        <UserGuideSection 
          emoji="🔑" 
          title="Using 2FA / TOTP" 
          desc="Replace Google Authenticator for better security"
        >
          <Text style={s.p}>Example walkthrough (Instagram):</Text>
          <Text style={s.p}>1. Open Instagram → Settings → Security → Two-Factor Authentication</Text>
          <Text style={s.p}>2. Choose "Authentication App"</Text>
          <Text style={s.p}>3. Note the text secret key (e.g., JBSWY3DPEHPK3PXP)</Text>
          <Text style={s.p}>4. Copy ONLY the text secret key.</Text>
          <Text style={s.p}>5. Open SecureX → find Instagram → tap Edit.</Text>
          <Text style={s.p}>6. Paste the key into "Two-Factor Auth" field → Save.</Text>
          <Text style={s.p}>7. SecureX now generates live 6-digit codes automatically.</Text>

          <View style={s.amberCard}>
            <Text style={s.amberText}>⚠️ The TOTP secret can only be viewed ONCE when setting up 2FA. Screenshot it or save it before leaving that screen.</Text>
          </View>
        </UserGuideSection>

        <UserGuideSection 
          emoji="🔒" 
          title="Auto-Lock" 
          desc="Keep your vault safe when idle"
        >
          <Text style={s.p}>Configure security in Settings → Auto-Lock. You can choose a timeout from 1 minute to 1 hour based on your preference.</Text>
        </UserGuideSection>

        <UserGuideSection 
          emoji="👆" 
          title="Biometric Unlock" 
          desc="Quick access via Fingerprint or Face ID"
        >
          <Text style={s.p}>Enable "Biometric Unlock" in Settings. Once active, SecureX will automatically prompt for your identity on launch.</Text>
        </UserGuideSection>

        <UserGuideSection 
          emoji="🆘" 
          title="Forgot Master Password?" 
          desc="Critical policy on data recovery"
          isWarning="red"
        >
          <Text style={s.redText}>⚠️ SecureX cannot recover your master password.</Text>
          <Text style={s.p}>It is the encryption key — without it, your vault data cannot be decrypted. Always store your master password somewhere safe.</Text>
        </UserGuideSection>

        <View style={s.footer}>
          <Text style={s.footerText}>SecureX v1.0.0 • Built with ❤️ for your privacy</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll:    { paddingHorizontal: 20, paddingBottom: 32 },

  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: T.white },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Syne-Bold', fontWeight: '700', color: T.white },
  headerSubtitle: { fontSize: 12, color: T.muted, marginTop: 2 },

  cardWrap: { marginHorizontal: 0, marginBottom: 10 },
  card: {
    backgroundColor: T.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    overflow: 'hidden',
  },
  cardExpanded: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    padding: 16,
    overflow: 'hidden',
    ...T.shadowCard,
  },
  cardAmber: {
    backgroundColor: 'rgba(255,183,77,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,183,77,0.2)',
    padding: 16,
    overflow: 'hidden',
  },
  cardRed: {
    backgroundColor: 'rgba(255,69,58,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.2)',
    padding: 16,
    overflow: 'hidden',
  },
  topHL: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(0,229,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  emoji: { fontSize: 18 },
  titleWrap: { flex: 1 },
  title: { fontSize: 15, fontFamily: 'Syne', fontWeight: '700', color: T.white },
  desc: { fontSize: 12, color: T.muted, marginTop: 2 },
  chevron: { fontSize: 10, color: T.muted, paddingLeft: 8 },

  content: { marginTop: 14 },
  separator: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 14 },
  innerContent: { paddingLeft: 4 },
  
  p:  { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', lineHeight: 22, marginBottom: 8 },
  li: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', lineHeight: 22, marginBottom: 4 },
  
  amberCard: {
    backgroundColor: 'rgba(255,183,77,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,183,77,0.2)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  amberText: { fontSize: 12, color: '#ffb74d', fontWeight: '600', lineHeight: 18 },
  redText:   { fontSize: 13, color: '#ff453a', fontWeight: '700', marginBottom: 8 },

  footer: { marginTop: 32, marginBottom: 24, alignItems: 'center' },
  footerText: { fontSize: 12, color: T.muted },
});
