process.env.NODE_ENV = "production";
process.env.BABEL_ENV = "production";

require("react-scripts/config/env");

const fs = require("fs-extra");
const path = require("path");
const paths = require("react-scripts/config/paths");

paths.appBuild = path.join(__dirname, "../ui_build");
paths.servedPath = "./";

const webpack = require("webpack");
const config = require("react-scripts/config/webpack.config.prod.js");

// removes react-dev-utils/webpackHotDevClient.js at first in the array
// config.entry.shift();

const webpackConfigured = webpack(config);

function callback(err, stats) {
  if (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  } else {
    copyPublicFolder();
  }
  if (stats)
    // eslint-disable-next-line no-console
    console.error(
      stats.toString({
        chunks: false,
        colors: true
      })
    );
}

function copyPublicFolder() {
  fs.copySync(paths.appPublic, paths.appBuild, {
    dereference: true,
    filter: file => file !== paths.appHtml
  });
}

if (process.env.LOCALHOSTD_DEV_WATCH) webpackConfigured.watch({}, callback);
else webpackConfigured.run(callback);
