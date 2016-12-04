'use strict';
const eslint = exports;

eslint.env = {
  browser: true,
  node: true,
  es6: true,
};

eslint.plugins = [
  'babel',
];

eslint.extends = [
  'eslint:recommended',
  'llama',
];

eslint.parserOptions = {
  sourceType: 'module',
};

eslint.parser = 'babel-eslint';

eslint.rules = {
  'require-jsdoc': 'off',
};
