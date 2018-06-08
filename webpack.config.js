const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './src/index.js',
  module:{
    rules:[
      {
        test: require.resolve('three/examples/js/Detector'),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/utils/SceneUtils"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/math/Lut"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/shaders/CopyShader"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/shaders/ConvolutionShader"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/shaders/FXAAShader"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/shaders/SSAOShader"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/shaders/LuminosityHighPassShader"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/shaders/LuminosityShader"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/shaders/ToneMapShader"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/shaders/GammaCorrectionShader"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/postprocessing/EffectComposer"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/postprocessing/RenderPass"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/postprocessing/SSAARenderPass"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/postprocessing/ShaderPass"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/postprocessing/SSAOPass"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/postprocessing/MaskPass"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/postprocessing/BloomPass"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/postprocessing/UnrealBloomPass"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/postprocessing/AdaptiveToneMappingPass"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve("three/examples/js/controls/TrackballControls"),
        use: 'imports-loader?THREE=three'
      },
      {
        test: require.resolve('three/examples/js/Detector'),
        use: 'exports-loader?Detector'
      },
      {
        test: require.resolve("three/examples/js/utils/SceneUtils"),
        use: 'exports-loader?THREE.SceneUtils'
      },
      {
        test: require.resolve("three/examples/js/math/Lut"),
        use: 'exports-loader?THREE.Lut'
      },
      {
        test: require.resolve("three/examples/js/shaders/CopyShader"),
        use: 'exports-loader?THREE.CopyShader'
      },
      {
        test: require.resolve("three/examples/js/shaders/ConvolutionShader"),
        use: 'exports-loader?THREE.ConvolutionShader'
      },
      {
        test: require.resolve("three/examples/js/shaders/FXAAShader"),
        use: 'exports-loader?THREE.FXAAShader'
      },
      {
        test: require.resolve("three/examples/js/shaders/SSAOShader"),
        use: 'exports-loader?THREE.SSAOShader'
      },
      {
        test: require.resolve("three/examples/js/shaders/LuminosityHighPassShader"),
        use: 'exports-loader?THREE.LuminosityHighPassShader'
      },
      {
        test: require.resolve("three/examples/js/shaders/LuminosityShader"),
        use: 'exports-loader?THREE.LuminosityShader'
      },
      {
        test: require.resolve("three/examples/js/shaders/ToneMapShader"),
        use: 'exports-loader?THREE.ToneMapShader'
      },
      {
        test: require.resolve("three/examples/js/shaders/GammaCorrectionShader"),
        use: 'exports-loader?THREE.GammaCorrectionShader'
      },
      {
        test: require.resolve("three/examples/js/postprocessing/EffectComposer"),
        use: 'exports-loader?THREE.EffectComposer'
      },
      {
        test: require.resolve("three/examples/js/postprocessing/RenderPass"),
        use: 'exports-loader?THREE.RenderPass'
      },
      {
        test: require.resolve("three/examples/js/postprocessing/SSAARenderPass"),
        use: 'exports-loader?THREE.SSAARenderPass'
      },
      {
        test: require.resolve("three/examples/js/postprocessing/ShaderPass"),
        use: 'exports-loader?THREE.ShaderPass'
      },
      {
        test: require.resolve("three/examples/js/postprocessing/SSAOPass"),
        use: 'exports-loader?THREE.SSAOPass'
      },
      {
        test: require.resolve("three/examples/js/postprocessing/MaskPass"),
        use: 'exports-loader?THREE.MaskPass'
      },
      {
        test: require.resolve("three/examples/js/postprocessing/BloomPass"),
        use: 'exports-loader?THREE.BloomPass'
      },
      {
        test: require.resolve("three/examples/js/postprocessing/UnrealBloomPass"),
        use: 'exports-loader?THREE.UnrealBloomPass'
      },
      {
        test: require.resolve("three/examples/js/postprocessing/AdaptiveToneMappingPass"),
        use: 'exports-loader?THREE.AdaptiveToneMappingPass'
      },
      {
        test: require.resolve("three/examples/js/controls/TrackballControls"),
        use: 'exports-loader?THREE.TrackballControls'
      },
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      THREE: 'three',
      $: 'jquery'
    }),
  ],
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  }
};