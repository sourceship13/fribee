module.exports = {
  arrowParens: 'avoid',
  singleQuote: true,
  trailingComma: 'all',
  overrides: [
    {
      files: ['*.yml', '*.yaml'],
      options: {
        tabWidth: 2,
        printWidth: 80,
        singleQuote: false,
      },
    },
  ],
};