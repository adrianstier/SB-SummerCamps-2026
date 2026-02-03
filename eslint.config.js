import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin
    },
    rules: {
      // React
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+
      'react/prop-types': 'off', // We're not using PropTypes
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/jsx-key': 'warn',
      'react/no-unescaped-entities': 'warn',

      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // General
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
      'no-var': 'error',

      // Best practices
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-duplicate-imports': 'error'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  {
    // Test files
    files: ['**/*.test.{js,jsx}', '**/*.spec.{js,jsx}', '**/test/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.jest,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly'
      }
    }
  },
  {
    // Ignore patterns
    ignores: [
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'playwright-report-personas/**',
      'test-results/**',
      '.playwright-mcp/**',
      'coverage/**'
    ]
  }
];
