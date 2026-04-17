import tseslint from "typescript-eslint";

export default [
  {
    name: "web",
    files: ["src/**/*"],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      "no-console": "warn",
      "no-unused-vars": "off",
    },
  },
  {
    name: "web",
    ignores: [
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "**/next-env.d.ts",
      "*.config.ts",
      "*.config.js",
    ],
  },
];