import React from 'react';
import { StatusBar } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { T } from './src/theme/tokens';

export default function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AppNavigator />
    </>
  );
}

