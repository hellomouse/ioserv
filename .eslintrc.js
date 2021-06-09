// EVERYTHING SHALL BE RED
// MWAHAHAHAHAHAHAHA
module.exports = {
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  env: {
    node: true,
    es6: true
  },
  extends: ['@hellomouse/eslint-config'],
  rules: {
    // lol
    'quotes': 'off',
    'no-invalid-this': 'off',
    'comma-dangle': 'off',
    'jsdoc/require-property-description': 'off',
  }
};
