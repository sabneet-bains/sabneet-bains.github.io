module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "script",
  },
  overrides: [
    {
      files: ["js/**/*.js"],
      parserOptions: {
        sourceType: "module",
      },
    },
  ],
  rules: {
    "no-console": "warn",
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-implicit-globals": "error",
  },
};
