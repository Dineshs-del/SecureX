/* eslint-env jest */
import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    NavigationContainer: ({ children }) => React.createElement(React.Fragment, null, children),
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useRoute: () => ({ params: {} }),
  };
});

jest.mock('@react-navigation/stack', () => {
  const React = require('react');
  return {
    createStackNavigator: () => ({
      Navigator: ({ children }) => React.createElement(React.Fragment, null, children),
      Screen: ({ children }) => React.createElement(React.Fragment, null, children),
    }),
  };
});

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __store: store,
    setItem: jest.fn(async (key, value) => {
      store.set(String(key), String(value));
      return null;
    }),
    getItem: jest.fn(async key => (store.has(String(key)) ? store.get(String(key)) : null)),
    removeItem: jest.fn(async key => {
      store.delete(String(key));
      return null;
    }),
    clear: jest.fn(async () => {
      store.clear();
      return null;
    }),
    getAllKeys: jest.fn(async () => Array.from(store.keys())),
    multiGet: jest.fn(async keys => keys.map(k => [k, store.get(String(k)) ?? null])),
    multiSet: jest.fn(async entries => {
      entries.forEach(([k, v]) => store.set(String(k), String(v)));
      return null;
    }),
    multiRemove: jest.fn(async keys => {
      keys.forEach(k => store.delete(String(k)));
      return null;
    }),
  };
});

jest.mock('react-native-biometrics', () => {
  return function ReactNativeBiometricsMock() {
    return {
      isSensorAvailable: async () => ({ available: false }),
      simplePrompt: async () => ({ success: false }),
    };
  };
});

jest.mock('@op-engineering/op-sqlite', () => ({
  open: () => ({
    execute: () => ({ rows: [] }),
  }),
}));

jest.mock('uuid', () => ({
  v4: () => '00000000-0000-4000-8000-000000000000',
}));

