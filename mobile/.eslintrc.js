module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'react', 'react-native', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    'react-native/react-native': true,
  },
  rules: {
    // No raw hex values in component files
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/^#[0-9A-Fa-f]{3,8}$/]',
        message: 'Use design token imports instead of raw hex values.',
      },
    ],
    // No files over 300 lines
    'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
    // No console.log in production code
    'no-console': ['warn', { allow: ['error', 'warn'] }],
    // TypeScript strictness
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    // React
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
  },
  overrides: [
    {
      // UI STANDARDS 5.1. React Native does not synthesise a weight from a
      // named custom family, so `fontWeight` on a bare RN `Text` selects
      // nothing from Inter and silently renders the system font at that
      // weight. It looks close enough to pass review, which is exactly why it
      // needs a machine.
      //
      // EXCLUSIONS, both deliberate. The primitive's own module is the one
      // place that must import RNText. Tests are exempt because a test
      // asserting on React Native's Text is asserting on the platform, not on
      // the design system; five of them do, and PaywallScreen.test.tsx reaches
      // it through require() where this rule cannot see it anyway.
      // `App.tsx` IS IN SCOPE FROM R1b-ii. The lint script now covers it, and
      // a guard that stopped at `src/` would leave the app's root component as
      // the one file allowed to import RN `Text` freely. It imports only
      // `StyleSheet` today, so this is coverage, not a fix.
      files: ['src/**/*.ts', 'src/**/*.tsx', 'App.tsx'],
      excludedFiles: [
        'src/components/shared/Text.tsx',
        'src/components/shared/TextInput.tsx',
        'src/**/__tests__/**',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'react-native',
                importNames: ['Text', 'TextInput'],
                message:
                  'Import Text/TextInput from components/shared so fontWeight resolves to a registered Inter face (UI Standards 5.1).',
              },
            ],
          },
        ],
      },
    },
    {
      // THE PALETTE'S OWN SOURCE. A token file cannot import its own tokens;
      // these four ARE where the values are declared, so the no-raw-hex rule
      // was permanently flagging the definitions it exists to point people at.
      //
      // SCOPED TO FOUR NAMED FILES, NOT TO `src/constants/`. The directory
      // holds 100 raw-hex errors and only 54 are palette (colors.ts 38,
      // designTokens.ts 11, spacing.ts 3, theme.ts 2). The other 46 are content
      // files declaring their own colours - journalTags.ts 24,
      // groupCategories.ts 9, brainStateWindows.ts 8, featureUnlock.ts 5 - and
      // those are real violations. A directory-wide override would exempt them
      // and retire a finding nobody took.
      files: [
        'src/constants/colors.ts',
        'src/constants/designTokens.ts',
        'src/constants/spacing.ts',
        'src/constants/theme.ts',
      ],
      rules: {
        'no-restricted-syntax': 'off',
      },
    },
    {
      // TESTS ASSERT THE VALUE, ON PURPOSE. A test checking a component renders
      // `#1B5E57` is asserting the value, not the name. Rewriting it to import
      // the token makes the assertion tautological: it would pass if the token
      // changed to the wrong colour. That is the vacuous-green failure this
      // board has already paid for twice, so the hex stays literal in tests.
      // 16 hits across 4 files.
      files: ['src/**/__tests__/**/*.ts', 'src/**/__tests__/**/*.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
      rules: {
        'no-restricted-syntax': 'off',
      },
    },
    {
      // METRO ASSET REQUIRES. `App.tsx:66-69` load four Inter `.ttf` faces into
      // `useFonts`. Metro resolves static assets through `require()`; there is
      // no ESM import form for them, so `no-require-imports` is asking for
      // something that cannot be written. Scoped to this one file rather than
      // disabled globally, and inline-disabling four lines would put the reason
      // four times in a file that should carry it once.
      files: ['App.tsx'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
  ],
  ignorePatterns: ['node_modules/', 'babel.config.js', '.eslintrc.js', 'metro.config.js'],
};
