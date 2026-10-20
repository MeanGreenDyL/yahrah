import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      // The app must never reach a real network. Enforced in code review and tests/unit/no-network.test.ts
      'no-restricted-globals': ['error', { name: 'fetch', message: 'Yahrah runs fully offline; no runtime network calls.' }],
    },
  },
  {
    // Build-time scripts and configs run in Node, not the browser.
    files: ['scripts/**/*.{js,mjs,ts}', '*.config.{js,ts}', 'tests/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: { 'no-restricted-globals': 'off' },
  },
)
