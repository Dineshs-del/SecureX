import React, { useEffect, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AppState, AppStateStatus, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useVaultStore } from '../store/vaultStore';
import { AppBackground } from '../components/AppBackground';
import { FloatingTabBar } from '../components/FloatingTabBar';

import { SetupScreen } from '../screens/SetupScreen';
import { UnlockScreen } from '../screens/UnlockScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { VaultScreen } from '../screens/VaultScreen';
import { AuditScreen } from '../screens/AuditScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AddEditCredentialScreen } from '../screens/AddEditCredentialScreen';
import { CredentialDetailScreen } from '../screens/CredentialDetailScreen';
import { AIPasswordGeneratorScreen } from '../screens/AIPasswordGeneratorScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { AutofillSetupScreen } from '../screens/AutofillSetupScreen';
import { ImportExportScreen } from '../screens/ImportExportScreen';

import { MasterPasswordManager } from '../theme/database/MasterPasswordManager';

export const navigationRef = createNavigationContainerRef();
const Stack = createStackNavigator();

interface GlobalFloatingTabBarProps {
  currentRouteName: string;
  isUnlocked: boolean;
}

const GlobalFloatingTabBar: React.FC<GlobalFloatingTabBarProps> = ({ currentRouteName, isUnlocked }) => {
  if (!isUnlocked) return null;
  const mainTabs = ['Dashboard', 'Vault', 'Security', 'Settings'];
  if (!mainTabs.includes(currentRouteName)) return null;
  return <FloatingTabBar activeRouteName={currentRouteName} />;
};

export const AppNavigator: React.FC = () => {
  const { isCheckingSetup, isSetupComplete, isUnlocked, checkSetup, lock } = useVaultStore();
  const [currentRouteName, setCurrentRouteName] = useState<string>('Dashboard');

  // Keep currentRouteName synchronized when conditional stack switches between Setup / Unlock / Dashboard
  useEffect(() => {
    if (isCheckingSetup) return;
    if (!isSetupComplete) {
      setCurrentRouteName('Setup');
    } else if (!isUnlocked) {
      MasterPasswordManager.lockVault();
      setCurrentRouteName('Unlock');
    } else {
      setCurrentRouteName('Dashboard');
    }
  }, [isUnlocked, isSetupComplete, isCheckingSetup]);

  useEffect(() => {
    checkSetup();

    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      const state = useVaultStore.getState();

      if (nextState === 'background' || nextState === 'inactive') {
        await AsyncStorage.setItem('securex_background_time', Date.now().toString());

        if (state.isUnlocked) {
          const enabled = await state.isAutoLockEnabled();
          const duration = await state.getAutoLockDuration();

          // "Immediately" must lock the moment the app is backgrounded
          if (enabled && duration === 0) {
            state.lock();
          }
        }
      }

      if (nextState === 'active') {
        const stored = await AsyncStorage.getItem('securex_background_time');
        const backgroundTimestamp = stored ? parseInt(stored, 10) : null;
        await AsyncStorage.removeItem('securex_background_time');

        const currentState = useVaultStore.getState();

        if (!currentState.isSetupComplete) return;

        if (currentState.isUnlocked && MasterPasswordManager.isVaultUnlocked()) {
          let shouldLock = false;
          if (backgroundTimestamp) {
            const enabled = await currentState.isAutoLockEnabled();
            const duration = await currentState.getAutoLockDuration();
            if (enabled) {
              const elapsedMins = (Date.now() - backgroundTimestamp) / 1000 / 60;
              if (duration === 0 || elapsedMins >= duration) {
                shouldLock = true;
              }
            }
          }

          if (shouldLock) {
            currentState.lock();
          } else {
            // Refresh credentials from RKStorage in case Android Autofill autosaved a login natively
            await currentState.loadCredentials();
            await currentState.checkAutofillStatus();
          }
        } else {
          currentState.lock();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkSetup, lock]);

  if (isCheckingSetup) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0E13', alignItems: 'center', justifyContent: 'center' }}>
        <AppBackground />
        <ActivityIndicator size="large" color="#00e5ff" />
      </View>
    );
  }

  const getInitialRoute = () => {
    if (!isSetupComplete) return 'Setup';
    if (!isUnlocked) return 'Unlock';
    return 'Dashboard';
  };

  const screenOptions = {
    headerShown: false,
    cardStyle: { backgroundColor: '#0A0E13' },
    contentStyle: { backgroundColor: '#0A0E13' },
    animationEnabled: true,
    cardStyleInterpolator: ({ current }: any) => ({
      cardStyle: {
        opacity: current.progress,
      },
    }),
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        const route = navigationRef.getCurrentRoute() as any;
        if (route?.name) setCurrentRouteName(route.name);
      }}
      onStateChange={() => {
        const route = navigationRef.getCurrentRoute() as any;
        if (route?.name) setCurrentRouteName(route.name);
      }}
    >
      <Stack.Navigator id="root" screenOptions={screenOptions} initialRouteName={getInitialRoute()}>
        {!isSetupComplete ? (
          <Stack.Screen name="Setup" component={SetupScreen} />
        ) : !isUnlocked ? (
          <Stack.Screen name="Unlock" component={UnlockScreen} />
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Vault" component={VaultScreen} />
            <Stack.Screen name="Security" component={AuditScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="AIPasswordGenerator" component={AIPasswordGeneratorScreen} />
            <Stack.Screen name="AddCredential" component={AddEditCredentialScreen} />
            <Stack.Screen name="CredentialDetail" component={CredentialDetailScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="AutofillSetup" component={AutofillSetupScreen} />
            <Stack.Screen name="ImportExport" component={ImportExportScreen} />
          </>
        )}
      </Stack.Navigator>
      <GlobalFloatingTabBar currentRouteName={currentRouteName} isUnlocked={isUnlocked} />
    </NavigationContainer>
  );
};