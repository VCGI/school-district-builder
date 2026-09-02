import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default [
  { ignores: ['dist', 'node_modules', 'deployment', '.vite'] },
  {
    files: ['**/*.{js,cjs,mjs}'],
    ...js.configs.recommended,
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // TypeScript/tsc already covers these; the core rules misfire on TS-only syntax
      // (interfaces, overloads, enums, ambient globals).
      'no-undef': 'off',
      'no-redeclare': 'off',
      'no-fallthrough': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Pre-existing issues to fix during the App.tsx/LeftSidebar decomposition (Phase 2),
      // not as an incidental guardrail-phase change. Downgraded so CI can gate on lint now.
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
]
