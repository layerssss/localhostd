const js = require("@eslint/js");
const globals = require("globals");
const babelParser = require("@babel/eslint-parser");
const reactPlugin = require("eslint-plugin-react");
const reactHooksPlugin = require("eslint-plugin-react-hooks");
const prettierConfig = require("eslint-config-prettier");

const commonRules = {
  semi: ["error", "always"],
  "no-var": "error",
  "prefer-const": "error"
};

module.exports = [
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
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ["@babel/preset-react"]
        }
      },
      globals: { ...globals.browser, ...globals.es2020 }
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin
    },
    settings: {
      react: { version: "detect" }
    },
    rules: {
      ...commonRules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/prop-types": "off"
    }
  },
  prettierConfig
];
