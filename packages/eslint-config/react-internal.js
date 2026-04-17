const baseConfig = require("./base");

module.exports = {
  ...baseConfig,
  extends: [
    ...baseConfig.extends,
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  plugins: [...baseConfig.plugins, "react", "react-hooks"],
  rules: {
    ...baseConfig.rules,
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
