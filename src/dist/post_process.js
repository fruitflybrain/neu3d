"use strict";
exports.__esModule = true;
exports.PostProcessor = void 0;
var RenderPass_1 = require("three/examples/jsm/postprocessing/RenderPass");
var SSAOPass_1 = require("three/examples/jsm/postprocessing/SSAOPass");
var ShaderPass_1 = require("three/examples/jsm/postprocessing/ShaderPass");
var AdaptiveToneMappingPass_1 = require("three/examples/jsm/postprocessing/AdaptiveToneMappingPass");
var EffectComposer_1 = require("three/examples/jsm/postprocessing/EffectComposer");
var three_1 = require("three");
var FXAAShader_1 = require("three/examples/jsm/shaders/FXAAShader");
var UnrealBloomPass_1 = require("three/examples/jsm/postprocessing/UnrealBloomPass");
/** return next power of 2 of given number */
function nextPow2(x) {
    return Math.pow(2, Math.round(Math.max(x, 0)).toString(2).length);
}
/**
 * PostProcessor of Neu3D
 */
var PostProcessor = /** @class */ (function () {
    function PostProcessor(camera, scenes, renderer, container) {
        var height = container.clientHeight;
        var width = container.clientWidth;
        var renderScene = new RenderPass_1.RenderPass(scenes.front, camera);
        renderScene.clear = false;
        renderScene.clearAlpha = 1.;
        renderScene.clearDepth = true;
        var backrenderScene = this.backrenderScene = new RenderPass_1.RenderPass(scenes.back, camera);
        var backrenderSSAO = this.backrenderSSAO = new SSAOPass_1.SSAOPass(scenes.back, camera, width, height);
        backrenderSSAO.enabled = false;
        var effectFXAA = this.effectFXAA = new ShaderPass_1.ShaderPass(FXAAShader_1.FXAAShader);
        effectFXAA.enabled = false;
        effectFXAA.uniforms['resolution'].value.set(1 / Math.max(width, 1440), 1 / Math.max(height, 900));
        var bloomPass = this.bloomPass = new UnrealBloomPass_1.UnrealBloomPass(new three_1.Vector2(width, height), 0.2, 0.2, 0.3);
        bloomPass.renderToScreen = true;
        var toneMappingPass = this.toneMappingPass = new AdaptiveToneMappingPass_1.AdaptiveToneMappingPass(true, nextPow2(width));
        toneMappingPass.setMinLuminance(1. - 0.95);
        renderer.outputEncoding = three_1.GammaEncoding;
        this.composer = new EffectComposer_1.EffectComposer(renderer);
        this.composer.addPass(backrenderScene);
        this.composer.addPass(backrenderSSAO);
        this.composer.addPass(renderScene);
        this.composer.addPass(effectFXAA);
        this.composer.addPass(toneMappingPass);
        this.composer.addPass(bloomPass);
        this.composer.setSize(width * window.devicePixelRatio, height * window.devicePixelRatio);
        this.settings = {
            toneMappingPass: new ToneMapSetting(toneMappingPass, 0.95),
            bloomPass: new BloomPassSettings(bloomPass, 0.2, 0.2, 0.3),
            effectFXAA: new EnablableSettings(effectFXAA, false),
            backrenderSSAO: new EnablableSettings(backrenderSSAO, false)
        };
    }
    /**
     * Dispose Post-Processor
     */
    PostProcessor.prototype.dispose = function () {
        delete this.backrenderScene;
        this.backrenderSSAO.dispose();
        delete this.renderScene;
        delete this.effectFXAA;
        this.bloomPass.dispose();
        this.toneMappingPass.dispose();
        delete this.composer;
    };
    return PostProcessor;
}());
exports.PostProcessor = PostProcessor;
var ToneMapSetting = /** @class */ (function () {
    function ToneMapSetting(toneMap, brightness) {
        if (brightness === void 0) { brightness = 0.95; }
        this.toneMap = toneMap;
        this._brightness = brightness;
    }
    Object.defineProperty(ToneMapSetting.prototype, "brightness", {
        get: function () {
            return this._brightness;
        },
        set: function (val) {
            this.toneMap.setMinLuminance(1 - val);
            this._brightness = val;
        },
        enumerable: false,
        configurable: true
    });
    return ToneMapSetting;
}());
var EnablableSettings = /** @class */ (function () {
    function EnablableSettings(pass, enabled) {
        if (enabled === void 0) { enabled = false; }
        this.pass = pass;
        this._enabled = enabled;
    }
    Object.defineProperty(EnablableSettings.prototype, "enabled", {
        get: function () {
            return this._enabled;
        },
        set: function (val) {
            this.pass.enabled = val;
            this._enabled = val;
        },
        enumerable: false,
        configurable: true
    });
    return EnablableSettings;
}());
var BloomPassSettings = /** @class */ (function () {
    function BloomPassSettings(pass, radius, strength, threshold) {
        if (radius === void 0) { radius = 0.2; }
        if (strength === void 0) { strength = 0.2; }
        if (threshold === void 0) { threshold = 0.3; }
        this.pass = pass;
        this._radius = radius;
        this._strength = strength;
        this._threshold = threshold;
    }
    Object.defineProperty(BloomPassSettings.prototype, "strength", {
        get: function () { return this._strength; },
        set: function (val) {
            this._strength = val;
            this.pass.strength = val;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(BloomPassSettings.prototype, "radius", {
        get: function () { return this._radius; },
        set: function (val) {
            this._radius = val;
            this.pass.radius = val;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(BloomPassSettings.prototype, "threshold", {
        get: function () { return this._threshold; },
        set: function (val) {
            this._threshold = val;
            this.pass.threshold = val;
        },
        enumerable: false,
        configurable: true
    });
    return BloomPassSettings;
}());
