'use strict';

const init = require('eslint-config-metarhia');

module.exports = [
  ...init,
  {
    files: ['server.js', 'shared/**/*.mjs', 'static/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
    },
    rules: {
      'max-len': 'off',
    },
  },
  {
    files: ['static/**/*.mjs'],
    languageOptions: {
      globals: {
        customElements: 'readonly',
      },
    },
    rules: {
      strict: 'off',
    },
  },
];
