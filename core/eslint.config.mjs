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
      'no-unused-vars': ['warn', { caughtErrors: 'none', argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'indent': ['warn', 2],
      'quotes': ['warn', 'single'],
      'semi': ['warn', 'always'],
      'no-empty': ['warn', { allowEmptyCatch: true }]
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
