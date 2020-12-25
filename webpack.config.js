const webpack = require('webpack');
const version = require("./package.json").version;
const banner =
  "/**\n" +
  " * markdown-it-external-preview v" + version + "\n" +
  " * https://github.com/adapttive/markdown-it-external-preview\n" +
  " * MIT License\n" +
  " */\n";

module.exports = {
  entry: './index.js',
  output: {
    path: __dirname + "/dist",
    filename: 'index.js',
    library: 'markdown-it-external-preview',
    libraryTarget: 'umd'
  },
  plugins: [
    new webpack.BannerPlugin(banner, {raw: true})
  ],
  module: {
    rules: [{
      test: /\.css$/,
      use: "style!css"
    }, {
      test: /\.js$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          babelrc: true
        }
      }
    }]
  },
}
