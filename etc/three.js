/**
 * This module sets up THREE and the necessary examples js
 * 
 * ### NOTE
 * The reason for this is because threejs example codes sometimes
 * require global namespace pollution and we centrally setup such
 * pollutions here.
 * 
 * @example
 * // importing three
 * var THREE = require('../lib/three');
 */
var THREE = global.THREE = require('three'); // pollute global namespace

// TODO: Eventually include these only if they are needed by a component.
require("three/examples/js/math/Lut");
require("three/examples/js/math/SimplexNoise");
require("three/examples/js/shaders/CopyShader");
require("three/examples/js/shaders/ConvolutionShader");
require("three/examples/js/shaders/FXAAShader");
require("three/examples/js/shaders/SSAOShader");
require("three/examples/js/shaders/LuminosityHighPassShader");
require("three/examples/js/shaders/LuminosityShader");
require("three/examples/js/shaders/ToneMapShader");
require("three/examples/js/shaders/GammaCorrectionShader");
require("three/examples/js/postprocessing/EffectComposer");
require("three/examples/js/postprocessing/RenderPass");
require("three/examples/js/postprocessing/SSAARenderPass");
require("three/examples/js/postprocessing/ShaderPass");
require("three/examples/js/postprocessing/SSAOPass");
require("three/examples/js/postprocessing/MaskPass");
require("three/examples/js/postprocessing/BloomPass");
require("three/examples/js/postprocessing/UnrealBloomPass");
require("three/examples/js/postprocessing/AdaptiveToneMappingPass");
require("three/examples/js/controls/TrackballControls");
require("three/examples/js/controls/DragControls");
require("three/examples/js/loaders/OBJLoader");
// require("three/examples/js/utils/SceneUtils");

module.exports = THREE;