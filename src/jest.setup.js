// jest.setup.js
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import 'react-native-gesture-handler/jestSetup';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock("@supabase/supabase-js", () => require("./__mocks__/supabase"));
jest.mock('./services/supabase', () => require('./__mocks__/supabase'));

// Mock `useColorScheme()` to return 'light'
jest.mock('react-native/Libraries/Utilities/Appearance', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

// Mock `NativeModules` (fixes `SettingsManager` issue)
jest.mock('react-native/Libraries/BatchedBridge/NativeModules', () => ({
  SettingsManager: {
    settings: {
      AppleLocale: 'en_US',
      AppleLanguages: ['en'],
    },
    getConstants: () => ({
      AppleLocale: 'en_US',
      AppleLanguages: ['en'],
    }),
  },
  NativeSettingsManager: {
    settings: {
      AppleLocale: 'en_US',
      AppleLanguages: ['en'],
    },
    getConstants: () => ({
      AppleLocale: 'en_US',
      AppleLanguages: ['en'],
    }),
  },
  PlatformConstants: {
    getConstants: () => ({
      reactNativeVersion: {
        major: 0,
        minor: 71,
        patch: 0,
      },
    }),
  },
}));

// Mock `ProgressBarAndroid`, `Clipboard`, `PushNotificationIOS` (to silence warnings)
jest.mock('react-native/Libraries/Components/ProgressBarAndroid/ProgressBarAndroid', () => 'ProgressBarAndroid');
jest.mock('react-native/Libraries/Components/Clipboard/Clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn().mockResolvedValue('mocked clipboard data'),
}));
jest.mock('react-native/Libraries/PushNotificationIOS/PushNotificationIOS', () => ({
  addEventListener: jest.fn(),
  requestPermissions: jest.fn(),
  presentLocalNotification: jest.fn(),
  scheduleLocalNotification: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
  removeEventListener: jest.fn(),
}));



