
const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './lib/browser-parser.js',
  output: {
    filename: 'browser-bundle.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'RSSParser',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  mode: 'production',
  target: 'web',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    fallback: {
      "stream": require.resolve("stream-browserify"),
      "string_decoder": require.resolve("string_decoder/"),
      "timers": require.resolve("timers-browserify"),
      "buffer": require.resolve("buffer/")
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    }),
  ]
};
