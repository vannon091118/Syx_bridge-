import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['release/**/*', 'node_modules/**/*', 'backups/**/*', '.DB backups/**/*']
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'no-empty': 'warn'
    }
  },
  {
    files: ['src/gui/public/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  }
];
