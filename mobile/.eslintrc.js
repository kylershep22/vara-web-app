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
      files: ['src/**/*.ts', 'src/**/*.tsx'],
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
  ],
  ignorePatterns: ['node_modules/', 'babel.config.js', '.eslintrc.js', 'metro.config.js'],
};
