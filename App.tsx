import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StatusBar, LogBox, View, Text, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';

// Ignore minor non-breaking logs in dev mode
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
]);

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0A0E13', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 12 }}>
            Something went wrong, tap to restart
          </Text>
          {this.state.error && (
            <Text style={{ fontSize: 13, color: '#ff6b6b', textAlign: 'center', marginBottom: 20 }} numberOfLines={8}>
              {this.state.error.message || String(this.state.error)}
            </Text>
          )}
          <TouchableOpacity
            style={{ backgroundColor: '#00e5ff', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 }}
            onPress={this.handleRestart}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0A0E13' }}>Restart</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#080c10' }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#080c10"
          translucent={false}
        />
        <ErrorBoundary>
          <AppNavigator />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

