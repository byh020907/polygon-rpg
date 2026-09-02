import eslint from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist', 'coverage', 'src/vendor/**'] },
  eslint.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['sw.js'],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },
];
