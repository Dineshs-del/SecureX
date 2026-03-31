import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Linking, AppState, AppStateStatus,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVaultStore } from '../store/vaultStore';
import { AppBackground } from '../components/AppBackground';
import { T } from '../theme/tokens';

// REBUILD REQUIRED after any changes to Native Modules
// console.warn("[SECUREX] Autofill native module added — rebuild required: npx expo run:android");

export const AutofillSetupScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { autofillEnabled, checkAutofillStatus } = useVaultStore();

  useEffect(() => {
    // Initial check
    const init = async () => {
      try {
        await checkAutofillStatus();
      } catch (e) {
        console.error("[SECUREX] Error in checkAutofillStatus init:", e);
      }
    };
    init();

    // Re-check when app returns to foreground
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        try {
          await checkAutofillStatus();
        } catch (e) {
          console.error("[SECUREX] Error re-checking autofill on app active:", e);
        }
      }
    });

    return () => subscription.remove();
  }, [checkAutofillStatus]);

  const openSettings = () => {
    try {
      Linking.openURL('android.settings.REQUEST_SET_AUTOFILL_SERVICE');
    } catch (e) {
      console.error("[SECUREX] Failed to open Android Autofill settings:", e);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AppBackground />

      <View style={[s.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <TouchableOpacity 
          style={s.backBtn} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Autofill Setup</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. HERO SECTION */}
        <View style={s.hero}>
          <View style={s.heroIconWrap}>
            <Text style={s.heroEmoji}>⚡</Text>
          </View>
          <Text style={s.heroTitle}>Enable SecureX Autofill</Text>
          <Text style={s.heroSub}>Fill passwords in any app automatically</Text>
        </View>

        {/* 2. STATUS CARD */}
        <View style={s.statusCard}>
          <View style={s.cardTopHL} />
          <View style={[s.accentBar, { backgroundColor: autofillEnabled ? '#06d6a0' : '#f5a623' }]} />
          
          <View style={s.statusContent}>
            <View style={[s.statusIconCircle, { backgroundColor: autofillEnabled ? 'rgba(6,214,160,0.14)' : 'rgba(245,166,35,0.14)' }]}>
              <Text style={{ fontSize: 16 }}>{autofillEnabled ? '✅' : '⚠️'}</Text>
            </View>
            <View style={s.statusTextWrap}>
              <Text style={[s.statusTitle, { color: autofillEnabled ? '#06d6a0' : '#f5a623' }]}>
                {autofillEnabled ? 'Autofill is Active' : 'Autofill Not Active'}
              </Text>
              <Text style={s.statusSub}>
                {autofillEnabled 
                   ? 'SecureX will fill your passwords automatically' 
                   : 'Follow the steps below to enable'}
              </Text>
            </View>
          </View>
        </View>

        {/* 3. STEPS SECTION */}
        <Text style={s.sectionLabel}>HOW TO ENABLE</Text>

        <View style={s.stepCard}>
          <View style={s.cardTopHL} />
          <View style={s.stepHeader}>
            <View style={s.stepNum}><Text style={s.stepNumText}>1</Text></View>
            <View style={s.stepTitleWrap}>
              <Text style={s.stepTitle}>Open Android Settings</Text>
              <Text style={s.stepSub}>Tap the button below to go directly</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={s.settingsBtn} 
            onPress={openSettings}
            activeOpacity={0.8}
          >
            <Text style={s.settingsBtnText}>Open Settings →</Text>
          </TouchableOpacity>
        </View>

        <View style={s.stepCard}>
          <View style={s.cardTopHL} />
          <View style={s.stepHeader}>
            <View style={s.stepNum}><Text style={s.stepNumText}>2</Text></View>
            <View style={s.stepTitleWrap}>
              <Text style={s.stepTitle}>Find SecureX in the list</Text>
              <Text style={s.stepSub}>Look for SecureX under available autofill services</Text>
            </View>
          </View>
          <View style={s.pathRow}>
             <Text style={s.pathText}>📱 Settings</Text>
             <Text style={s.pathArrow}>›</Text>
             <Text style={s.pathText}>Passwords</Text>
             <Text style={s.pathArrow}>›</Text>
             <Text style={s.pathText}>Service</Text>
             <Text style={s.pathArrow}>›</Text>
             <Text style={s.pathTextHighlight}>SecureX</Text>
          </View>
        </View>

        <View style={s.stepCard}>
          <View style={s.cardTopHL} />
          <View style={s.stepHeader}>
            <View style={s.stepNum}><Text style={s.stepNumText}>3</Text></View>
            <View style={s.stepTitleWrap}>
              <Text style={s.stepTitle}>Tap SecureX and confirm</Text>
              <Text style={s.stepSub}>Android will ask you to confirm — tap OK</Text>
            </View>
          </View>
        </View>

        {/* 4. HOW IT WORKS CARD */}
        <View style={s.howCard}>
          <View style={s.cardTopHL} />
          <View style={[s.accentBar, { backgroundColor: T.cyan }]} />
          <Text style={s.howTitle}>💡 How Autofill Works</Text>
          
          <View style={s.howRow}>
             <View style={s.howDot} />
             <Text style={s.howText}>Open any app with a login form</Text>
          </View>
          <View style={s.howDivider} />
          <View style={s.howRow}>
             <View style={s.howDot} />
             <Text style={s.howText}>Tap the username or password field</Text>
          </View>
          <View style={s.howDivider} />
          <View style={s.howRow}>
             <View style={s.howDot} />
             <Text style={s.howText}>SecureX icon appears above your keyboard</Text>
          </View>
          <View style={s.howDivider} />
          <View style={s.howRow}>
             <View style={s.howDot} />
             <Text style={s.howText}>Tap it to fill your saved credentials instantly</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 5. BOTTOM BUTTON */}
      <View style={s.footer}>
        <TouchableOpacity 
          style={s.checkBtn} 
          onPress={() => checkAutofillStatus()}
          activeOpacity={0.8}
        >
          <View style={s.cardTopHL} />
          <Text style={s.checkBtnText}>Check Status</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 24, color: T.muted },
  headerTitle: { fontSize: 17, fontWeight: '700', color: T.white, fontFamily: 'Syne-Bold' },

  scrollContent: { paddingHorizontal: T.pad, paddingTop: 8 },

  // Hero
  hero: { alignItems: 'center', marginTop: 40, marginBottom: 32 },
  heroIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(245,166,35,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(245,166,35,0.2)',
    marginBottom: 20,
    shadowColor: '#f5a623', shadowOpacity: 0.3, shadowRadius: 15, elevation: 8,
  },
  heroEmoji: { fontSize: 32 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: T.white, fontFamily: 'Syne-ExtraBold', textAlign: 'center' },
  heroSub: { fontSize: 14, color: T.muted, marginTop: 6, textAlign: 'center' },

  // Status Card
  statusCard: {
    backgroundColor: T.glass, borderRadius: T.rCard,
    padding: T.cardPadH, marginBottom: 24,
    borderWidth: 1, borderColor: T.border,
    overflow: 'hidden',
    ...T.shadowCard,
  },
  cardTopHL: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: T.borderTop },
  accentBar: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2 },
  statusContent: { flexDirection: 'row', alignItems: 'center' },
  statusIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statusTextWrap: { flex: 1, marginLeft: 14 },
  statusTitle: { fontSize: 15, fontWeight: '600', fontFamily: 'Syne-SemiBold' },
  statusSub: { fontSize: 12, color: T.muted, marginTop: 2 },

  // Steps
  sectionLabel: { ...T.fontLabel, color: T.muted, marginBottom: 12, letterSpacing: 1.5, fontSize: 11 },
  stepCard: {
    backgroundColor: T.glass, borderRadius: 16,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: T.border,
    overflow: 'hidden',
    ...T.shadowCard,
  },
  stepHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: T.cyanA12, alignItems: 'center', justifyContent: 'center',
    marginRight: 14, marginTop: 2,
  },
  stepNumText: { color: T.cyan, fontWeight: '800', fontSize: 14 },
  stepTitleWrap: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '600', color: T.white, fontFamily: 'Syne-SemiBold' },
  stepSub: { fontSize: 12, color: T.muted, marginTop: 4, lineHeight: 16 },

  settingsBtn: {
    marginTop: 16, backgroundColor: T.cyanA08,
    borderWidth: 1, borderColor: T.cyanA18,
    borderRadius: 20, paddingVertical: 10, alignItems: 'center',
  },
  settingsBtnText: { color: T.cyan, fontWeight: '700', fontSize: 13 },

  pathRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 16,
    padding: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8,
  },
  pathText: { fontSize: 11, color: T.muted, fontFamily: 'DM-Mono' },
  pathArrow: { fontSize: 11, color: T.faint, marginHorizontal: 4 },
  pathTextHighlight: { fontSize: 11, color: T.cyan, fontFamily: 'DM-Mono', fontWeight: '700' },

  // How it works
  howCard: {
    backgroundColor: T.glass, borderRadius: T.rCard,
    padding: 20, marginTop: 14, marginBottom: 20,
    borderWidth: 1, borderColor: T.border,
    overflow: 'hidden',
    ...T.shadowCard,
  },
  howTitle: { fontSize: 15, fontWeight: '600', color: T.white, fontFamily: 'Syne-SemiBold', marginBottom: 16 },
  howRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  howDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.cyan, marginRight: 12, opacity: 0.6 },
  howText: { flex: 1, fontSize: 13, color: T.muted },
  howDivider: { height: 1, backgroundColor: T.border, marginVertical: 4, marginLeft: 18 },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 24, paddingBottom: 36, backgroundColor: 'transparent',
  },
  checkBtn: {
    backgroundColor: T.cyanA12, height: 56, borderRadius: T.rCard,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: T.cyanA18,
    ...T.shadowCard,
  },
  checkBtnText: { color: T.white, fontWeight: '700', fontSize: 16 },
});
