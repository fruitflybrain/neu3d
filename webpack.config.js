import * as path from 'path';
import * as webpack from 'webpack';

export default {
  mode: 'development',
  entry: './index.js',
  target: 'web',
  plugins: [
    new webpack.ProvidePlugin({
      THREE: 'three',
      $: 'jquery'
    }),
  ],
  output: {
    filename: 'neu3d.min.js',
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
