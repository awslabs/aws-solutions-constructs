// ts-check

import tseslint from 'typescript-eslint';
import stylisticJs from '@stylistic/eslint-plugin-js';
import preferarrow from 'eslint-plugin-prefer-arrow';
import esimport from 'eslint-plugin-import';
import licenseHeader from 'eslint-plugin-license-header';

export default [
  {
    ignores: ['**/*.js', '**/*.js', '**/*.d.ts', '**/integ.*.js.snapshot/*'],
  },
  {
    files: ["**/*.ts"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "@stylisticJs": stylisticJs,
      "@prefer-arrow": preferarrow,
      "@import": esimport,
      "license-header": licenseHeader
    },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2018,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/adjacent-overload-signatures": "error",
      '@typescript-eslint/array-type': 'error',
      '@typescript-eslint/no-wrapper-object-types': "error",
      "@typescript-eslint/prefer-function-type": "error",
      "@typescript-eslint/naming-convention": ["error", {
        selector: "class",
        format: ["PascalCase"],
        leadingUnderscore: "forbid",
        trailingUnderscore: "forbid"
      }],
      "@typescript-eslint/naming-convention": ["error", {
        selector: ["variable", "parameter"],
        format: ["camelCase", "UPPER_CASE"],
        leadingUnderscore: "forbid",
        trailingUnderscore: "forbid"
      }],
      "@typescript-eslint/consistent-type-assertions": "error",
      "@typescript-eslint/no-misused-new": "error",
      "@typescript-eslint/no-namespace": "error",
      "@typescript-eslint/triple-slash-reference": "error",
      "@typescript-eslint/no-var-requires": "error",
      "@typescript-eslint/prefer-for-of": "error",
      "@typescript-eslint/unified-signatures": "error",
      "@typescript-eslint/no-require-imports": "error",

      "no-labels": "error",
      "no-caller": "error",
      "no-bitwise": "error",
      "no-cond-assign": "error",
      "semi": "error",
      "no-console": "error",
      "no-new-wrappers": "error",
      "no-debugger": "error",
      "constructor-super": "error",
      "no-empty": "error",
      "no-eval": "error",
      "no-invalid-this": "error",
      "no-shadow": "error",
      "dot-notation": "error",
      "no-throw-literal": "error",
      "no-trailing-spaces": "error",
      "no-undef-init": "error",
      "no-unsafe-finally": "error",
      "no-unused-expressions": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "one-var": ["error", "never"],
      "prefer-const": "error",
      "radix": "error",
      "eqeqeq": "error",
      "valid-typeof": "error",
      "use-isnan": "error",
      "guard-for-in": "error",
      "no-redeclare": "error",
      "no-void": "error",
      "no-with": "error",
      "no-useless-constructor": "error",
      "no-useless-escape": "error",
      "no-async-promise-executor": "error",
      "no-return-await": "error",
      "no-empty-function": "error",
      "no-fallthrough": "error",
      "no-octal": "error",
      "no-octal-escape": "error",
      "no-useless-catch": "error",
      "no-useless-computed-key": "error",
      "no-useless-concat": "error",
      "no-useless-rename": "error",
      "no-useless-call": "error",
      "no-useless-backreference": "error",
      "no-useless-assignment": "error",

      "@import/no-extraneous-dependencies": "error",
      "@import/no-unresolved": "error",

      "@prefer-arrow/prefer-arrow-functions": ["error", { "allowStandaloneDeclarations": true }],

      "@stylisticJs/max-len": ["error", {
        "code": 150,
        "comments": 150,
        "ignoreUrls": true,
        "ignoreStrings": true,
        "ignoreTemplateLiterals": true,
      }],
      "@stylisticJs/function-call-spacing": "error",
      "@stylisticJs/arrow-spacing": "error",
      "@stylisticJs/block-spacing": "error",
      "@stylisticJs/semi-spacing": "error",
      "@stylisticJs/dot-location": ["error", "property"],
      "@stylisticJs/spaced-comment": ["error", "always" ],
      "@stylisticJs/no-multiple-empty-lines": "error",
      "@stylisticJs/no-tabs": "error",
      "@stylisticJs/new-parens": "error",

      "license-header/header": ["error", "../license-header.js"]
    },
  }];
