// Jest setup file — runs before each test suite
// Extend expect with jest-native matchers
require('@testing-library/jest-native/extend-expect');

// Mock Firebase modules
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  getReactNativePersistence: jest.fn(),
  initializeAuth: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('expo-secure-store');

// Mock expo-keep-awake — pulls in expo-modules-core's EventEmitter
// at module load, which fails to initialize under Jest's
// react-native preset. The hook is a no-op in tests; production
// usage activates the screen-wake on visual protocols.
jest.mock('expo-keep-awake', () => ({
  useKeepAwake: jest.fn(),
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(),
}));

// Mock expo vector icons
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MockedMaterialCommunityIcons',
}));

// Set required environment variables for tests
process.env.REACT_APP_FIREBASE_API_KEY = 'test-api-key';
process.env.REACT_APP_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
process.env.REACT_APP_FIREBASE_PROJECT_ID = 'test-project';
process.env.REACT_APP_FIREBASE_STORAGE_BUCKET = 'test.appspot.com';
process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID = '123456789';
process.env.REACT_APP_FIREBASE_APP_ID = '1:123456789:web:abc123';
