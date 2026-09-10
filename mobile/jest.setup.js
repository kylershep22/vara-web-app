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

// Mock expo-haptics — same EventEmitter init failure as
// expo-keep-awake. Test suites that mount a component touching
// haptics (modality pickers, brain-state cancel, etc.) would
// otherwise crash on import. Per-suite mocks remain optional for
// asserting impactAsync call counts.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock expo vector icons
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MockedMaterialCommunityIcons',
}));

// Mock expo-image and expo-linear-gradient — both load expo-modules-core's
// EventEmitter at import, which fails under Jest's react-native preset. Mapping
// each to a host-component string lets ScreenHeader (and any screen using it)
// render in tests; children pass through unchanged.
jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// Same failure, same fix, one layer further out (journey slice 7a). `expo` and
// `expo-video` are what VideoPlayerModal imports, and both reach
// expo-modules-core's EventEmitter at import time. Nothing needed them until
// slice 7a mounted StartHereRow on Home: the Practices mount was only ever
// exercised by StartHereRow's own suite, which mocks VideoPlayerModal outright,
// so the transitive import never reached a screen test before.
//
// MOCKED GLOBALLY RATHER THAN PER SUITE, deliberately. The alternative was
// mocking StartHereRow inside each of the four DashboardScreen suites, which
// would have made Home's Today mount invisible to every screen-level test and
// left the next screen to adopt the row hitting this same wall from scratch.
jest.mock('expo', () => ({
  useEvent: () => null,
}));

// AsyncStorage, via the package's own shipped mock (journey slice 7a). Reached
// for the same reason as the two above: StartHereRow's collapse marker is
// AsyncStorage-backed, and mounting the row on Home put that import on a screen
// for the first time. Suites that already mock it locally are unaffected - a
// per-file jest.mock still wins over this one.
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-video', () => ({
  VideoView: 'VideoView',
  useVideoPlayer: () => ({
    play: jest.fn(),
    pause: jest.fn(),
    replace: jest.fn(),
    release: jest.fn(),
  }),
}));

// Set required environment variables for tests
process.env.REACT_APP_FIREBASE_API_KEY = 'test-api-key';
process.env.REACT_APP_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
process.env.REACT_APP_FIREBASE_PROJECT_ID = 'test-project';
process.env.REACT_APP_FIREBASE_STORAGE_BUCKET = 'test.appspot.com';
process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID = '123456789';
process.env.REACT_APP_FIREBASE_APP_ID = '1:123456789:web:abc123';
