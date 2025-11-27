import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      // ✅ browser globals + window.http 추가
      globals: {
        ...globals.browser,
        http: 'writable',       // window.http 허용
        moment: 'writable',     // 필요하면 window.moment도 허용
        _: 'writable',          // 필요하면 lodash _
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      indent: ['error', 2, { "SwitchCase": 1 }],
      semi: ['error', 'always'], // 세미콜론 강제
      'no-unused-vars': 'off',
      'react-refresh/only-export-components': 'off',
      'eslint-disable-next-line': 'off',
      'react-hooks/rules-of-hooks': 'off',
      //"no-unused-vars": ["warn", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }]
    },
  },
]);