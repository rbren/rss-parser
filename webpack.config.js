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
      use: [{
        loader: 'babel-loader',
        options: {presets: ['@babel/preset-env']},
      }],
    }]
  },
  externals: {
    xmlbuilder:'xmlbuilder'
  },
  resolve: {
    fallback: {
      "https": false,
      "http": false,
      "url": false,
      "stream": false,
      "fs": false,
      "timers": false,
    }
  }
}
