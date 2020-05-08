var webpack = require("webpack");
module.exports = {
  entry: {
    "rss-parser": "./index.js"
  },
  output: {
    path: __dirname,
    filename: "dist/[name].js",
    libraryTarget: 'umd',
    globalObject: 'this',
    library: 'RSSParser'
  },
  resolve: {
    extensions: ['.js']
  },
  devtool: 'source-map',
  module: {
    rules: [{
      test: /\.js$/,
      loader: 'babel-loader?presets[]=env',
    }]
  },
  externals: {
    xmlbuilder:'xmlbuilder'
  },
  node: {
    fs: "empty"
  }
}
