import tseslint from "typescript-eslint";

export default [
...tseslint.config(
  tseslint.configs.recommended,
),
{
  ignores: ["**/*.js", "**/*.d.ts", "test/integ.*.js.snapshot/", "coverage/"]
},
{
  rules: {
    "@typescript-eslint/no-require-imports": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "prefer-const": "off",
    "@typescript-eslint/no-empty-object-type": "off",
    "@typescript-eslint/no-array-constructor": "off"
  }
}
];
// /** @type {import('eslint').Linter.Config[]} */
// export default [

//   {
//     name: "practice",
//     settings: {
//       "import/parsers": {
//         "@typescript-eslint/parser": [".ts", ".tsx"],
//       },
//       "import/resolver": {
//         node: {},
//         typescript: {
//           directory: "./tsconfig.json"
//         }
//       },
//     },
//     files: ["**/*.ts"],
//     ignores: ["**/*.js", "**/*.d.ts", "test/integ.*.js.snapshot/", "coverage/"],
//     rules: {
//       // stylistic rules listed here: https://eslint.style/packages/js
//       "stylisticTs/semi": 'error',
//       "stylisticTs/no-trailing-spaces": "error",
//       "stylisticTs/no-tabs": "error",
//       "stylisticTs/comma-spacing": ["error", { "before": false, "after": true }],
//       "stylisticTs/one-var-declaration-per-line": ["error", "always"],
//       "stylisticTs/indent": ["error", 2],

//       // language rules
//       "prefer-const": "error",
//       "no-unused-vars": ["error"],
//       "@typescript-eslint/no-explicit-any": "error",

//       // License rules
//       "licenseHeader/header": ["error", "../license-header.js"],

//       // import rules
//       "importPlugin/no-extraneous-dependencies": [
//         "error",
//         {
//           "devDependencies": [
//             "**/test/**",
//             "**/utils.ts"
//           ],
//           "optionalDependencies": false,
//           "peerDependencies": false
//         },
//       ],
//       "importPlugin/no-unresolved": "error",
//       // 'tseslint/no-require-imports': "error",
//     },
//     languageOptions: {
//       parser: tseslint.parser,
//       parserOptions: {
//         project: "./tsconfig.json",
//       },
//       globals: {
//         ...globals.node,
//       },
//       ecmaVersion: 2018,
//       sourceType: "module",
//     },
//     plugins: {
//       licenseHeader,
//       importPlugin,
//       tseslint,
//       stylisticTs
//     },
//   },
//   // ...tseslint.configs.recommended,
// ];