import js from "@eslint/js";
import globals from "globals";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";

const commonRules = {
  semi: ["error", "always"],
  "no-var": "error",
  "prefer-const": "error"
};

export default [
  {
    ignores: ["node_modules/**", "dist/**", "ui_build/**"]
  },
  js.configs.recommended,
  {
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
    }
  },
  {
    files: ["bin/**/*.js", "lib/**/*.js", "webpack.config.js", "eslint.config.js"],
    languageOptions: {
      globals: { ...globals.node, ...globals.es2020 }
    },
    rules: {
      ...commonRules,
      "no-console": "warn"
    }
  },
  {
    files: ["src/**/*.js", "src/**/*.jsx"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest"
      },
      globals: { ...globals.browser, ...globals.es2020 }
    },
    plugins: {
      "react-hooks": reactHooksPlugin
    },
    rules: {
      ...commonRules,
      ...reactHooksPlugin.configs.recommended.rules
    }
  },
  prettierConfig
];
