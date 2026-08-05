module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx|mjs)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    // react-native-purchases itself is already matched by the `react-native`
    // prefix above. What was NOT matched is its transitive dependency
    // @revenuecat/purchases-js-hybrid-mappings, which ships `"type": "module"`
    // and so reaches jest as raw ESM. That single unstransformed package is what
    // made AuthContext.test.tsx die with `SyntaxError: Unexpected token 'export'`
    // before executing a single test — the code frame pointed at the `import
    // Purchases from 'react-native-purchases'` line, three requires above the
    // real culprit.
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-paper|react-native-vector-icons|expo-modules-core|expo-font|firebase|@firebase|@revenuecat/.*)',
  ],
  moduleNameMapper: {
    '\\.png$': '<rootDir>/__mocks__/fileMock.js',
    '\\.ttf$': '<rootDir>/__mocks__/fileMock.js',
  },
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx)',
    '**/*.(test|spec).(ts|tsx)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
};
