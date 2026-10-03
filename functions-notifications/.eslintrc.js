module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    "ecmaVersion": 2018,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
    {
      // Jest suites: test names are sentences and run past 80 columns, and
      // the files declare their jest globals for readers of the file.
      files: ["src/__tests__/**/*.js"],
      env: {
        jest: true,
      },
      rules: {
        "max-len": "off",
        "no-redeclare": "off",
      },
    },
  ],
  globals: {},
};
