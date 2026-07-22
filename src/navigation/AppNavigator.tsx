import React, { useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AppState, AppStateStatus, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

import { useVaultStore } from '../store/vaultStore';
import { T } from '../theme/tokens';

import { SetupScreen } from '../screens/SetupScreen';
import { UnlockScreen } from '../screens/UnlockScreen';
import { FingerprintAuthScreen } from '../screens/FingerprintAuthScreen';
import { EnrollFingerprintScreen } from '../screens/EnrollFingerprintScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { VaultScreen } from '../screens/VaultScreen';
import { SecurityScreen } from '../screens/SecurityScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AddEditCredentialScreen } from '../screens/AddEditCredentialScreen';
import { CredentialDetailScreen } from '../screens/CredentialDetailScreen';
import { AIPasswordGeneratorScreen } from '../screens/AIPasswordGeneratorScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { UserGuideScreen } from '../screens/UserGuideScreen';
import { AutofillSetupScreen } from '../screens/AutofillSetupScreen';
import { BankCardScreen } from '../screens/BankCardScreen';
import { IdentityScreen } from '../screens/IdentityScreen';
import { SecureNotesScreen } from '../screens/SecureNotesScreen';
import { VaultHubScreen } from '../screens/VaultHubScreen';
import { ImportExportScreen } from '../screens/ImportExportScreen';
import { ShareReceiveScreen } from '../screens/ShareReceiveScreen';
import { ActiveSharesScreen } from '../screens/ActiveSharesScreen';
import { LinkingOptions } from '@react-navigation/native';

const navigationRef = createNavigationContainerRef();
const Stack = createStackNavigator();

const linking: LinkingOptions<any> = {
  prefixes: ['securex://', 'https://securex.app'],
  config: {
    screens: {
      ShareReceive: 'share',
    },
  },
};

export const AppNavigator: React.FC = () => {
  const { isSetupComplete, isUnlocked, checkSetup, lock } = useVaultStore();

  useEffect(() => {
    checkSetup();

    // ── DEEP LINK HANDLER ──
    const handleUrl = (url: string | null) => {
      if (!url) return;
      if (url.startsWith('securex://share')) {
        const urlObj = new URL(url.replace('securex://', 'http://securex.app/'));
        const data = (urlObj.searchParams as any).get('data');
        const expires = (urlObj.searchParams as any).get('expires');

        if (!data || !expires) return;

        if (parseInt(expires) < Date.now()) {
          Alert.alert('Link Expired', 'This credential share link is no longer valid.');
          return;
        }

        try {
          // Decode B64
          const decoded = CryptoJS.enc.Base64.parse(decodeURIComponent(data)).toString(CryptoJS.enc.Utf8);
          
          if (navigationRef.isReady()) {
            (navigationRef as any).navigate('ShareReceive', { data: decoded });
          }
        } catch (e) {
          Alert.alert('Error', 'Failed to decode shared link data.');
        }
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const linkingSub = Linking.addEventListener('url', (event) => handleUrl(event.url));

    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        await AsyncStorage.setItem('securex_background_time', Date.now().toString());
      }

      if (nextState === 'active') {
        const stored = await AsyncStorage.getItem('securex_background_time');
        const backgroundTimestamp = stored ? parseInt(stored) : null;
        await AsyncStorage.removeItem('securex_background_time');

        if (backgroundTimestamp) {
          const { isAutoLockEnabled, getAutoLockDuration } = useVaultStore.getState();
          const enabled = await isAutoLockEnabled();
          const duration = await getAutoLockDuration();

          if (enabled) {
            const elapsedMins = (Date.now() - backgroundTimestamp) / 1000 / 60;
            if (elapsedMins >= duration) {
              lock();
              if (navigationRef.isReady()) {
                navigationRef.reset({
                  index: 0,
                  routes: [{
                    name: 'Unlock',
                    params: { message: 'Vault locked after inactivity' }
                  }],
                });
              }
            }
          }
        }
      }
    });

    return () => {
      subscription.remove();
      linkingSub.remove();
    };
  }, [checkSetup, lock]);

  const getInitialRoute = () => {
    if (!isSetupComplete) return 'Setup';
    if (!isUnlocked) return 'Unlock';
    return 'Dashboard';
  };

  const screenOptions = {
    headerShown: false,
    cardStyle: { backgroundColor: T.bg },
    animationEnabled: true,
  };

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator screenOptions={screenOptions} initialRouteName={getInitialRoute()}>
        {!isSetupComplete ? (
          <Stack.Screen name="Setup" component={SetupScreen} />
        ) : !isUnlocked ? (
          <>
            <Stack.Screen name="Unlock" component={UnlockScreen} />
            <Stack.Screen name="FingerprintAuth" component={FingerprintAuthScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Vault" component={VaultScreen} />
            <Stack.Screen name="Security" component={SecurityScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="AIPasswordGenerator" component={AIPasswordGeneratorScreen} />
            <Stack.Screen name="AddCredential" component={AddEditCredentialScreen} />
            <Stack.Screen name="CredentialDetail" component={CredentialDetailScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="UserGuide" component={UserGuideScreen} />
            <Stack.Screen name="AutofillSetup" component={AutofillSetupScreen} />
            <Stack.Screen name="BankCards" component={BankCardScreen} />
            <Stack.Screen name="Identity" component={IdentityScreen} />
            <Stack.Screen name="SecureNotes" component={SecureNotesScreen} />
            <Stack.Screen name="VaultHub" component={VaultHubScreen} />
            <Stack.Screen name="ImportExport" component={ImportExportScreen} />
            <Stack.Screen name="ActiveShares" component={ActiveSharesScreen} />
            <Stack.Screen name="ShareReceive" component={ShareReceiveScreen} />
            <Stack.Screen name="EnrollFingerprint" component={EnrollFingerprintScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};