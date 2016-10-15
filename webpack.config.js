const webpack = require('webpack');
const path = require('path');
const _ = require('lodash');

let config = {
  context: path.join(__dirname, 'src/front'),
  entry: './index.jsx',

  output: {
    path: path.join(__dirname, 'dist/front'),
    filename: 'index.js',
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        query: {
          presets: ['react', 'es2015'],
        },
      },
      {
        test: /\.(sass|scss|css)$/,
        loader: 'style!css!sass',
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': _(process.env)
        .pick(['NODE_ENV', 'CORENLP_URL'])
        .mapValues(val => `"${val}"`)
        .value(),
    }),
  ],
};
module.exports = config;
