let config = {
  context: `${__dirname}/src/front`,
  entry: './index.jsx',

  output: {
    path: `${__dirname}/dist/front`,
    filename: "index.js",
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['react', 'es2015'],
        },
      },
      {
        test: /\.(less|css)$/,
        loader: 'style!css!less',
      },
    ],
  },
};
module.exports = config;
