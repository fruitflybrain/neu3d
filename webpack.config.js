const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: './index.js',
  target: 'web',
  output: {
    filename: 'neu3d.min.js',
    library: 'Neu3D',
    libraryTarget: 'umd',
    umdNamedDefine: false,
    libraryExport: 'Neu3D',
    path: path.resolve(__dirname, 'lib')
  },
  module: {

    rules: [
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      }
    ]
  }
};
