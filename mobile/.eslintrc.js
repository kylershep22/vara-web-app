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
  ignorePatterns: ['node_modules/', 'babel.config.js', '.eslintrc.js', 'metro.config.js'],
};
