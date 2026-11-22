import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigationRef } from '../navigation/AppNavigator';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';

// Vector SVG Icons for Tab Bar
const ShieldIcon = ({ color = '#FFFFFF', size = 23, strokeWidth = 1.85 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ListIcon = ({ color = '#FFFFFF', size = 23, strokeWidth = 1.85 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const AlertTriangleIcon = ({ color = '#FFFFFF', size = 23, strokeWidth = 1.85 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 9v4M12 17h.01"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SettingsIcon = ({ color = '#FFFFFF', size = 23, strokeWidth = 1.85 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PlusIcon = ({ color = '#080c10', size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 5v14M5 12h14"
      stroke={color}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Vector icons for Add Modal
const KeyIcon = ({ color = '#00e5ff', size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 2l-2 2m-3 3l2 2m-3-1l2 2m-8.5 2.5a5.5 5.5 0 1 1 7.78-7.78 5.5 5.5 0 0 1-7.78 7.78l-7 7v3h3l1.5-1.5V17h2v-2.5z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);



const SparklesIcon = ({ color = '#06d6a0', size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface FloatingTabBarProps {
  activeRouteName?: string;
}

export const FloatingTabBar: React.FC<FloatingTabBarProps> = ({ activeRouteName }) => {
  const insets = useSafeAreaInsets();
  const [showAddSheet, setShowAddSheet] = useState(false);

  const currentRoute = activeRouteName || 'Dashboard';

  const tabs = [
    { name: 'Dashboard', label: 'Vault', Icon: ShieldIcon },
    { name: 'Vault', label: 'Items', Icon: ListIcon },
    { name: 'Security', label: 'Audit', Icon: AlertTriangleIcon },
    { name: 'Settings', label: 'Settings', Icon: SettingsIcon },
  ];

  const showPlusButton = ['Dashboard', 'Vault', 'Security', 'Settings'].includes(currentRoute);

  const addActions = [
    {
      title: 'App & Web Login',
      desc: 'Website or app username & password',
      Icon: KeyIcon,
      bgColor: 'rgba(0,229,255,0.12)',
      route: 'AddCredential',
      params: { category: 'Web' },
    },
    {
      title: 'Password Generator',
      desc: 'Generate strong custom passwords',
      Icon: SparklesIcon,
      bgColor: 'rgba(6,214,160,0.12)',
      route: 'AIPasswordGenerator',
      params: {},
    },
  ];

  const handleTabPress = (routeName: string) => {
    if (navigationRef.isReady()) {
      (navigationRef as any).navigate(routeName);
    }
  };

  const handleActionSelect = (action: typeof addActions[0]) => {
    setShowAddSheet(false);
    if (navigationRef.isReady()) {
      (navigationRef as any).navigate(action.route, action.params);
    }
  };

  const bottomInset = Math.max(insets.bottom, 16);

  return (
    <>
      <View style={[s.wrapper, { bottom: bottomInset }]}>
        {/* Floating Capsule */}
        <View style={[s.capsule, !showPlusButton && s.capsuleFullWidth]}>
          <View style={s.glassOverlay} />
          <View style={s.tabsRow}>
            {tabs.map((tab) => {
              const isActive = currentRoute === tab.name;
              const TabIcon = tab.Icon;

              return (
                <TouchableOpacity
                  key={tab.name}
                  style={s.tabTouchArea}
                  activeOpacity={0.7}
                  onPress={() => handleTabPress(tab.name)}
                  accessibilityLabel={tab.label}
                  accessibilityRole="button"
                >
                  {isActive ? (
                    <View style={s.activePill}>
                      <View style={s.activePillHighlight} />
                      <TabIcon color="#FFFFFF" size={21} strokeWidth={2.2} />
                      <Text style={s.activePillText} maxFontSizeMultiplier={1.3}>
                        {tab.label}
                      </Text>
                    </View>
                  ) : (
                    <View style={s.inactivePill}>
                      <TabIcon color="rgba(255,255,255,0.78)" size={23} strokeWidth={1.85} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Plus Button (Only on Vault & Items tabs) */}
        {showPlusButton ? (
          <TouchableOpacity
            style={s.plusButtonWrapper}
            activeOpacity={0.88}
            onPress={() => setShowAddSheet(true)}
            accessibilityLabel="Add new item"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={['#FFFFFF', '#CFE3FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.plusButtonCircle}
            >
              <PlusIcon color="#080c10" size={28} />
            </LinearGradient>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Add Item Bottom Sheet Modal */}
      <Modal
        visible={showAddSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddSheet(false)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setShowAddSheet(false)}>
          <Pressable style={s.modalSheetContainer} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle} maxFontSizeMultiplier={1.3}>
              Add to SecureX
            </Text>

            <View style={s.actionsList}>
              {addActions.map((act) => {
                const ActionIcon = act.Icon;
                return (
                  <TouchableOpacity
                    key={act.title}
                    style={s.actionRow}
                    activeOpacity={0.75}
                    onPress={() => handleActionSelect(act)}
                    accessibilityLabel={act.title}
                    accessibilityRole="button"
                  >
                    <View style={[s.actionIconTile, { backgroundColor: act.bgColor }]}>
                      <ActionIcon size={22} />
                    </View>
                    <View style={s.actionTextContainer}>
                      <Text style={s.actionTitle} maxFontSizeMultiplier={1.3}>
                        {act.title}
                      </Text>
                      <Text style={s.actionDesc} maxFontSizeMultiplier={1.3}>
                        {act.desc}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const s = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 99,
  },
  capsule: {
    flex: 1,
    height: 68,
    borderRadius: 34,
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  capsuleFullWidth: {
    marginRight: 0,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabTouchArea: {
    flex: 1,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  activePillHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.40)',
  },
  activePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  inactivePill: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusButtonWrapper: {
    width: 68,
    height: 68,
  },
  plusButtonCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheetContainer: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  actionsList: {
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  actionIconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.50)',
  },
});
