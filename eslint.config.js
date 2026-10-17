// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', 'node_modules/*', '.expo/*'],
  },
  {
    rules: {
      // Added in redesign Phase 0, when the app first got a lint step. The
      // React Compiler rules below are new in eslint-plugin-react-hooks and
      // flag ~450 spots in code written before them; they're warnings so the
      // existing app passes, and redesigned screens should not add more.
      // rules-of-hooks stays an error — that one is a real crash.
      'react-hooks/refs':               'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability':       'warn',
      'react-hooks/static-components':  'warn',
      'react-hooks/purity':             'warn',
      'react-hooks/globals':            'warn',
      // Uzbek copy uses apostrophes (o', g') in JSX text everywhere; escaping
      // them all would be noise. The redesign moves copy to ʻ (U+02BB).
      'react/no-unescaped-entities':    'off',
    },
  },
])
