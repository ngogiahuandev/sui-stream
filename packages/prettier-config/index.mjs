import prettierPluginTailwindcss from "prettier-plugin-tailwindcss";

export default {
  trailingComma: "es5",
  singleQuote: true,
  semi: true,
  tabWidth: 2,
  useTabs: false,
  plugins: [prettierPluginTailwindcss],
  tailwindConfig: "./tailwind.config.js",
};
