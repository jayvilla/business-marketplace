import skipFormatting from '@vue/eslint-config-prettier/skip-formatting';
import vue from 'eslint-plugin-vue';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: await import('@typescript-eslint/parser'),
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  // Prettier owns formatting. Vue's recommended config also ships stylistic
  // rules, and the two disagree on attribute wrapping. This package is already
  // installed. It turns the overlapping rules off.
  skipFormatting,
];
