const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = (env = {}) => ({
  mode: env.development ? "development" : "production",
  entry: "./src/index.jsx",
  output: {
    path: path.join(__dirname, "ui_build"),
    filename: "static/js/[name].[contenthash].js",
    chunkFilename: "static/js/[name].[contenthash].chunk.js",
    publicPath: "./",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: "babel-loader",
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf|svg|png|jpg|jpeg|gif)$/i,
        type: "asset/resource",
        generator: { filename: "static/media/[hash][ext][query]" },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: "./public/index.html" }),
    new MiniCssExtractPlugin({
      filename: "static/css/[name].[contenthash].css",
      chunkFilename: "static/css/[name].[contenthash].chunk.css",
    }),
  ],
  devtool: env.development ? "source-map" : false,
});
