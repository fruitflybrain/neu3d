const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  plugins: [
    new webpack.ProvidePlugin({
      THREE: 'three',
      $: 'jquery'
    }),
  ],
  output: {
    filename: 'mesh3DTest.min.js',
    path: path.resolve(__dirname, 'dist')
  }
};