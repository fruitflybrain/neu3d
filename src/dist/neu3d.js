"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.Neu3D = void 0;
var lightshelper_1 = require("./lightshelper");
var mesh_dict_1 = require("./mesh_dict");
var three_1 = require("three");
var TrackballControls_1 = require("three/examples/jsm/controls/TrackballControls");
// add FontAwesome
require("@fortawesome/fontawesome-free/js/all.js");
var STATS = require('../etc/stats');
require("../style/index.css");
// import { ControlPanel, IDatGUIOptions } from './control_panel';
var control_panel_tweakpane_1 = require("./control_panel_tweakpane");
var post_process_1 = require("./post_process");
/**
 * Neu3D
 */
var Neu3D = /** @class */ (function () {
    function Neu3D(container, data, metadata, options) {
        if (options === void 0) { options = {}; }
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        this._addingJsons = false;
        this._animationId = null;
        this._addedDOMElements = {};
        this._containerEventListener = {};
        this.scenes = {
            front: new three_1.Scene(),
            back: new three_1.Scene()
        };
        this.container = container;
        this.activeRender = {
            resINeed: 0,
            activeRender: true,
            powerSaving: false
        };
        this.meshDict = new mesh_dict_1.MeshDict((_a = metadata === null || metadata === void 0 ? void 0 : metadata.colormap) !== null && _a !== void 0 ? _a : "rainbow", {} // settings
        );
        this.animation = {
            activityData: {},
            it1: null,
            it2: null,
            meshOscAmp: 0
        };
        this.states = {
            mouseOver: false,
            pinned: false,
            highlight: false
        };
        this._metadata = {
            colormap: (_b = metadata === null || metadata === void 0 ? void 0 : metadata.colormap) !== null && _b !== void 0 ? _b : "rainbow",
            maxColorNum: (_c = metadata === null || metadata === void 0 ? void 0 : metadata.maxColorNum) !== null && _c !== void 0 ? _c : 1747591,
            allowPin: (_d = metadata === null || metadata === void 0 ? void 0 : metadata.allowPin) !== null && _d !== void 0 ? _d : true,
            allowHighlight: (_e = metadata === null || metadata === void 0 ? void 0 : metadata.allowHighlight) !== null && _e !== void 0 ? _e : true,
            enablePositionReset: (_f = metadata === null || metadata === void 0 ? void 0 : metadata.enablePositionReset) !== null && _f !== void 0 ? _f : false,
            resetPosition: (_g = metadata === null || metadata === void 0 ? void 0 : metadata.resetPosition) !== null && _g !== void 0 ? _g : new three_1.Vector3(0., 0., 0.),
            upVector: (_h = metadata === null || metadata === void 0 ? void 0 : metadata.upVector) !== null && _h !== void 0 ? _h : new three_1.Vector3(0., 1., 0.),
            cameraTarget: (_j = metadata === null || metadata === void 0 ? void 0 : metadata.cameraTarget) !== null && _j !== void 0 ? _j : new three_1.Vector3(0., 0., 0.),
            upSign: (_k = metadata === null || metadata === void 0 ? void 0 : metadata.upSign) !== null && _k !== void 0 ? _k : 1. // TODO: Deprecated
        };
        //
        this.renderSettings = {
            toneMappingPass: { brightness: 0.95 },
            bloomPass: { radius: 0.2, strength: 0.2, threshold: 0.3 },
            effectFXAA: { enabled: false },
            backrenderSSAO: { enabled: false } //
        };
        this.uiVars = {
            pinnedObjects: new Set(),
            toolTipPosition: new three_1.Vector2(),
            highlightedObjects: null,
            currentIntersected: undefined,
            cursorPosition: new three_1.Vector2(-100000, -100000),
            meshNum: 0,
            frontNum: 0,
            backNum: 0,
            tooltip: undefined,
            selected: undefined
        };
        // Mesh.raycast = acceleratedRaycast;
        this.raycaster = new three_1.Raycaster();
        this.raycaster.params.Line.threshold = 3;
        if (options.stats) {
            this.stats = STATS.Stats();
            this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
            this.stats.dom.style.position = "relative";
            this.stats.dom.className += ' vis-3d-stats';
            this._addedDOMElements['stats'] = this.stats.dom;
            this.container.appendChild(this.stats.dom);
        }
        this.camera = this.initCamera();
        this.renderer = this.initRenderer();
        this.scenes = this.initScenes();
        this.controls = this.initControls();
        this.lightsHelper = this.initLights();
        this.loadingManager = this.initLoadingManager();
        this._addContainerEventListener();
        this._createToolTip();
        this.postProcess = new post_process_1.PostProcessor(this.camera, this.scenes, this.renderer, this.container);
        // TODO: handle dispatcher
        // this.dispatch = {
        //   click: undefined,
        //   dblclick: undefined,
        //   getInfo: this._getInfo,
        //   syncControls: undefined,
        //   resize: undefined
        // };
        this.commandDispatcher = {
            'show': this.meshDict.show,
            'showall': this.meshDict.showAll,
            'hide': this.meshDict.hide,
            'hideall': this.meshDict.hideAll,
            'pin': this.meshDict.pin,
            'unpin': this.meshDict.unpin,
            'unpinall': this.meshDict.unpinAll,
            'remove': this.meshDict.remove,
            'setcolor': this.meshDict.setColor,
            'resetview': this.resetView
        };
        // /** Callbacks fired on `this` will be callbacks fired on `meshDict` */
        // this.callbackRegistry = {
        //   'add': ((func) => { this.meshDict.on('add', func); }),
        //   'remove': ((func) => { this.meshDict.on('remove', func); }),
        //   'pinned': ((func) => { this.meshDict.on('change', func, 'pinned'); }),
        //   'visibility': ((func) => { this.meshDict.on('change', func, 'visibility'); }),
        //   'num': ((func) => { this.uiVars.on('change', func, 'frontNum'); }),
        //   'highlight': ((func) => { this.states.on('change', func, 'highlight'); }),
        //   'click': ((func) => { this.uiVars.on('change', func, 'selected'); }),
        // };
        // // resgister callbacks on `this`, which will be passed as callbacks of meshDict and uiVars as above
        // this.on('remove', ((e) => { this.onRemoveMesh(e); }));
        // this.on('pinned', ((e) => { this.updatePinned(e); this.updateOpacity(e); }));
        // this.on('visibility', ((e) => { this.onUpdateVisibility(e.path[0]); }));
        // //this.on('num', (function () { this.updateInfoPanel(); }).bind(this)); 
        // // this.on('num', () => { this.controlPanel.__controllers[0].setValue(this.uiVars.frontNum); });
        // this.on('highlight', ((e) => { this.updateOpacity(e); this.onUpdateHighlight(e); }));
        // add data if instantiated with data
        if (data !== undefined && Object.keys(data).length > 0) {
            this.meshDict.addJson(data);
        }
        this.addDivs();
        window.onresize = this.onWindowResize.bind(this);
        var controlPanelDiv = document.createElement('div');
        controlPanelDiv.className = 'vis-3d-settings';
        // uncomment the line below if using TweakPane
        this.controlPanel = new control_panel_tweakpane_1.ControlPanel(this, controlPanelDiv);
        // this.controlPanel = new ControlPanel(this, options.datGUI);
        // controlPanelDiv.appendChild(this.controlPanel.panel.domElement);
        // this._addedDOMElements['control'] = controlPanelDiv;
        this.container.appendChild(controlPanelDiv);
        // start animation loop
        this.animate();
    } // ENDOF Constructor
    // /**
    //  * Save Screen Shot
    //  */
    // private _saveImage() {
    //   let a = document.createElement("a");
    //   document.body.appendChild(a);
    //   a.style.display = "none";
    //   return function (blob: Blob, fileName: string) {
    //     let url = window.URL.createObjectURL(blob);
    //     a.href = url;
    //     a.download = fileName;
    //     a.click();
    //     window.URL.revokeObjectURL(url);
    //   };
    // };
    /**
     * Add Divs that accompany Neu3D
     * 1. fileUpload
     * 2. tooltip
     */
    Neu3D.prototype.addDivs = function () {
        // add file input
        var ffbomesh = this.meshDict;
        var fileUploadInput = document.createElement('input');
        fileUploadInput.multiple = true;
        fileUploadInput.id = "neu3d-file-upload-" + Neu3D.generateGuid();
        fileUploadInput.setAttribute("type", "file");
        fileUploadInput.style.visibility = 'hidden';
        fileUploadInput.style.display = 'none';
        fileUploadInput.onchange = function (evt) {
            var _loop_1 = function (i) {
                var file = evt.target.files.item(i);
                var name = file.name.split('.')[0];
                var isSWC = false;
                if (file.name.match('.+(\.swc)$')) {
                    isSWC = true;
                }
                var reader = new FileReader();
                reader.onload = function (event) {
                    var json = {};
                    json[name] = {
                        label: name,
                        dataStr: event.target.result,
                        filetype: 'swc'
                    };
                    if (isSWC === true) {
                        ffbomesh.addJson({ ffbo_json: json });
                    }
                    else {
                        ffbomesh.addJson({ ffbo_json: json, type: 'obj' });
                    }
                };
                reader.readAsText(file);
            };
            for (var i = 0; i < evt.target.files.length; i++) {
                _loop_1(i);
            }
        };
        // this input has to be added as siblinig of vis-3d
        // becuase vis-3d blocks click event propagation.
        document.body.appendChild(fileUploadInput);
        this._addedDOMElements['fileupload'] = fileUploadInput;
        this.fileUploadInput = fileUploadInput; // expose div
        var _tooltips = document.getElementsByClassName("tooltip");
        for (var _i = 0, _tooltips_1 = _tooltips; _i < _tooltips_1.length; _i++) {
            var l = _tooltips_1[_i];
            var element = document.createElement('SPAN');
            element.classList.add('tooltiptext');
            element.innerHTML = l.getAttribute('title');
            l.appendChild(element);
            l.removeAttribute('title');
        }
    };
    Neu3D.prototype.removeDivs = function () {
        for (var _i = 0, _a = Object.entries(this._addedDOMElements); _i < _a.length; _i++) {
            var _b = _a[_i], name = _b[0], el = _b[1];
            el.remove();
            delete this._addedDOMElements[name];
        }
    };
    // /**
    //  * Setup callback
    //  * @param {string} key string of callback
    //  * @param {function} func callback function
    //  */
    // on(key, func) {
    //   if (typeof (func) !== "function") {
    //     console.log("not a function");
    //     return;
    //   }
    //   if (key in this.callbackRegistry) {
    //     let register = this.callbackRegistry[key];
    //     register(func);
    //   } else {
    //     console.log("callback keyword '" + key + "' not recognized.");
    //   }
    // }
    Neu3D.prototype.addJson = function (json) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this._addingJsons = true;
                        return [4 /*yield*/, this.meshDict.addJson(json)];
                    case 1:
                        _a.sent();
                        this.meshDict.updateOpacity();
                        this._addingJsons = false;
                        return [2 /*return*/];
                }
            });
        });
    };
    Neu3D.prototype.clearActivity = function () {
        clearInterval(this.animation.it1);
        clearInterval(this.animation.it2);
    };
    /**
     * Animate Meshes based on activity data
     * @param activityData
     * @param t_i
     * @param interval
     * @param interpolation_interval
     */
    Neu3D.prototype.animateActivity = function (activityData, t_i, interval, interpolation_interval) {
        var ffbomesh = this;
        this.animation.activityData = activityData;
        var t = t_i || 0;
        var t_max = activityData[Object.keys(activityData)[0]].length;
        var interp = 0;
        this.animation.it1 = setInterval(frame, interval);
        this.animation.it2 = setInterval(intFrame, interpolation_interval);
        function intFrame() {
            interp += interpolation_interval / interval;
            var t_current = t;
            var t_next = t + 1;
            if (t_next == t_max)
                t_next = 0;
            for (var key in activityData) {
                ffbomesh.meshDict._meshDict[key].opacity = activityData[key][t_current] * (1 - interp) + activityData[key][t_next] * (interp);
            }
            ffbomesh.meshDict.resetOpacity();
        }
        function frame() {
            interp = 0;
            t = t + 1;
            if (t == t_max)
                t = 0;
        }
    };
    /** Initialize WebGL Renderer */
    Neu3D.prototype.initCamera = function () {
        var height = this.container.clientHeight;
        var width = this.container.clientWidth;
        this._fov = 20;
        this._prevhfov = 2 * Math.atan(Math.tan(Math.PI * this._fov / 2 / 180) * width / height);
        var camera = new three_1.PerspectiveCamera(this._fov, width / height, 0.1, 10000000);
        camera.position.z = 1800;
        if (width < 768 && width / height < 1)
            camera.position.z = 3800;
        if (width < 768 && width / height >= 1)
            camera.position.z = 2600;
        if (this._metadata.enablePositionReset == true) {
            camera.position.z = this._metadata.resetPosition.z;
            camera.position.y = this._metadata.resetPosition.y;
            camera.position.x = this._metadata.resetPosition.x;
            camera.up.x = this._metadata.upVector.x;
            camera.up.y = this._metadata.upVector.y;
            camera.up.z = this._metadata.upVector.z;
        }
        return camera;
    };
    /** Initialize WebGL Renderer */
    Neu3D.prototype.initRenderer = function () {
        var renderer = new three_1.WebGLRenderer({ 'logarithmicDepthBuffer': true });
        // TODO: add adaptive resolution
        // renderer.setPixelRatio(window.devicePixelRatio * this.settings.render_resolution);
        renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(renderer.domElement);
        return renderer;
    };
    // TODO: addin resolution update
    // updateResolution() {
    //   if (this.stats.getFPS() < 30 && this.settings.render_resolution > 0.25) {
    //     this.settings.render_resolution = this.settings.render_resolution - 0.005;
    //     if (this.settings.render_resolution < 0.25)
    //       this.settings.render_resolution = 0.25;
    //     if (this.settings.backrenderSSAO.enabled == true)
    //       this.highSettingsFPS = 1.0 + (1 - 1 / this.stats.getFPS()) * this.highSettingsFPS;
    //   }
    //   else if (this.stats.getFPS() > 58 && this.settings.render_resolution < 2.0) {
    //     this.settings.render_resolution = this.settings.render_resolution + 0.005;
    //     if (this.settings.render_resolution > 2.0)
    //       this.settings.render_resolution = 2.0;
    //   }
    //   else if (this.stats.getFPS() > 30 && this.settings.render_resolution < 1.0) {
    //     this.settings.render_resolution = this.settings.render_resolution + 0.005;
    //     if (this.settings.render_resolution > 1.0)
    //       this.settings.render_resolution = 1.0;
    //   }
    //   else if (this.stats.getFPS() > 30 && this.settings.render_resolution > 1.0) {
    //     this.settings.render_resolution = this.settings.render_resolution - 0.005;
    //   }
    //   if (this.stats.getFPS() > 58 && this.settings.render_resolution >= 1.95 && this.settings.backrenderSSAO.enabled == false && this.highSettingsFPS > 45)
    //     this.settings.backrenderSSAO.enabled = true;
    //   else if (this.settings.render_resolution < 1.00)
    //     this.settings.backrenderSSAO.enabled = false;
    //   if (this.settings.render_resolution != this.resINeed) {
    //     //console.log("UPDATING");
    //     this.renderer.setPixelRatio(window.devicePixelRatio * this.settings.render_resolution);
    //     this.resINeed = this.settings.render_resolution;
    //   }
    // }
    // updateShaders() {
    //   if (this.stats.getFPS() < 30 && this.settings.render_resolution > 0.25) {
    //     this.settings.effectFXAA.enabled = false;
    //     this.settings.backrenderSSAO.enabled = false;
    //   } else if (this.stats.getFPS() > 50 && this.settings.render_resolution >= 1.95 && this.settings.backrenderSSAO.enabled == false && this.highSettingsFPS > 45) {
    //     this.settings.backrenderSSAO.enabled = true;
    //     this.settings.effectFXAA.enabled = true;
    //   }
    // }
    /** Initialize Mouse Control */
    Neu3D.prototype.initControls = function () {
        var controls = new TrackballControls_1.TrackballControls(this.camera, this.renderer.domElement);
        controls.rotateSpeed = 2.0;
        controls.zoomSpeed = 1.0;
        controls.panSpeed = 2.0;
        controls.staticMoving = true;
        controls.dynamicDampingFactor = 0.3;
        return controls;
    };
    Neu3D.prototype.updateControls = function () {
        this.controls.position0.x = this._metadata.resetPosition.x;
        this.controls.position0.y = this._metadata.resetPosition.y;
        this.controls.position0.z = this._metadata.resetPosition.z;
        this.controls.up0.x = this._metadata.upVector.x;
        this.controls.up0.y = this._metadata.upVector.y;
        this.controls.up0.z = this._metadata.upVector.z;
        this.controls.target0.x = this._metadata.cameraTarget.x;
        this.controls.target0.y = this._metadata.cameraTarget.y;
        this.controls.target0.z = this._metadata.cameraTarget.z;
        // this.controls.up0.y = this._metadata.upSign;
    };
    /** Initialize Scene */
    Neu3D.prototype.initScenes = function () {
        var scenes = {
            front: new three_1.Scene(),
            back: new three_1.Scene()
        };
        scenes.front.background = null;
        scenes.front.add(this.camera);
        scenes.back.background = new three_1.Color(0x030305);
        scenes.back.add(this.camera);
        scenes.front.add(this.meshDict.groups.front);
        scenes.back.add(this.meshDict.groups.back);
        return scenes;
    };
    /** Initialize FFBOLightsHelper */
    Neu3D.prototype.initLights = function () {
        var lightsHelper = new lightshelper_1.FFBOLightsHelper(this.camera, this.controls, this.scenes.front);
        lightsHelper.addAmbientLight({
            intensity: 0.1,
            key: 'frontAmbient'
        });
        lightsHelper.addAmbientLight({
            intensity: 0.4,
            scene: this.scenes.back,
            key: 'backAmbient'
        });
        lightsHelper.addDirectionalLight({
            intensity: 0.1,
            position: new three_1.Vector3(0, 0, 5000),
            key: 'frontDirectional_1'
        });
        lightsHelper.addDirectionalLight({
            intensity: 0.55,
            position: new three_1.Vector3(0, 0, 5000),
            scene: this.scenes.back,
            key: 'backDirectional_1'
        });
        lightsHelper.addDirectionalLight({
            intensity: 0.1,
            position: new three_1.Vector3(0, 0, -5000),
            key: 'frontDirectional_2'
        });
        lightsHelper.addDirectionalLight({
            intensity: 0.55,
            position: new three_1.Vector3(0, 0, -5000),
            scene: this.scenes.back,
            key: 'backDirectional_2'
        });
        lightsHelper.addSpotLight({
            posAngle1: 80,
            posAngle2: 80,
            key: 'frontSpot_1'
        });
        lightsHelper.addSpotLight({
            posAngle1: 80,
            posAngle2: 80,
            intensity: 5.5,
            scene: this.scenes.back,
            key: 'backSpot_1'
        });
        lightsHelper.addSpotLight({
            posAngle1: -80,
            posAngle2: 80,
            key: 'frontSpot_2'
        });
        lightsHelper.addSpotLight({
            posAngle1: -80,
            posAngle2: 80,
            intensity: 5.5,
            scene: this.scenes.back,
            key: 'backSpot_2'
        });
        return lightsHelper;
    };
    /**
     * Initialize LoadingManager
     * https://threejs.org/docs/#api/en/loaders/managers/LoadingManager
    */
    Neu3D.prototype.initLoadingManager = function () {
        var _this = this;
        var loadingManager = new three_1.LoadingManager();
        loadingManager.onLoad = function () {
            _this.controls.target0.x = 0.5 * (_this.meshDict.boundingBox.min.x + _this.meshDict.boundingBox.max.x);
            _this.controls.target0.y = 0.5 * (_this.meshDict.boundingBox.min.y + _this.meshDict.boundingBox.max.y);
            // this.controls.reset();
            _this.meshDict.groups.front.visible = true;
        };
        return loadingManager;
    };
    /**
     * Import Visualization settings
     * @param settings
     */
    Neu3D.prototype.import_settings = function (settings) {
        var _this = this;
        settings = Object.assign({}, settings);
        if ('lightsHelper' in settings) {
            this.lightsHelper["import"](settings.lightsHelper);
            delete settings.lightsHelper;
        }
        if ('postProcessing' in settings) {
            var postProcessing = settings.postProcessing;
            delete settings.postProcessing;
            if (postProcessing.fxaa != undefined) {
                this.postProcess.settings.effectFXAA.enabled = postProcessing.fxaa;
            }
            if (postProcessing.ssao != undefined) {
                this.postProcess.settings.backrenderSSAO.enabled = postProcessing.ssao;
            }
            if (postProcessing.toneMappingMinLum != undefined) {
                this.postProcess.settings.toneMappingPass.brightness = 1 - postProcessing.toneMappingMinLum;
            }
            if (postProcessing.bloomRadius != undefined) {
                this.postProcess.settings.bloomPass.radius = postProcessing.bloomRadius;
            }
            if (postProcessing.bloomStrength != undefined) {
                this.postProcess.settings.bloomPass.strength = postProcessing.bloomStrength;
            }
            if (postProcessing.bloomThreshold != undefined) {
                this.postProcess.settings.bloomPass.threshold = postProcessing.bloomThreshold;
            }
        }
        if ('backgroundColor' in settings) {
            var bg_1 = settings.backgroundColor;
            setTimeout(function () {
                _this.meshDict.setBackgroundColor(bg_1);
            }, 4000);
            delete settings.backgroundColor;
        }
        Object.assign(this.meshDict.settings, settings);
    };
    /**
    * Export state of the workspace
    *
    * Note: useful for tagging
    */
    Neu3D.prototype.export_state = function () {
        var colors = {};
        var visibilities = {};
        for (var _i = 0, _a = Object.entries(this.meshDict._meshDict); _i < _a.length; _i++) {
            var _b = _a[_i], rid = _b[0], mesh = _b[1];
            colors[rid] = mesh.color.toArray();
            visibilities[rid] = mesh.visibility;
        }
        return {
            color: colors,
            pinned: this.meshDict.pinned,
            visibility: visibilities,
            camera: {
                position: {
                    x: this.camera.position.x,
                    y: this.camera.position.y,
                    z: this.camera.position.z
                },
                up: {
                    x: this.camera.up.x,
                    y: this.camera.up.y,
                    z: this.camera.up.z
                }
            },
            target: {
                x: this.controls.target.x,
                y: this.controls.target.y,
                z: this.controls.target.z
            }
        };
    };
    /**
    * Import State
    *
    * Note: useful for tagging
    * @param {object} state_metadata
    */
    Neu3D.prototype.import_state = function (state_metadata) {
        this.camera.position.x = state_metadata['camera']['position']['x'];
        this.camera.position.y = state_metadata['camera']['position']['y'];
        this.camera.position.z = state_metadata['camera']['position']['z'];
        this.camera.up.x = state_metadata['camera']['up']['x'];
        this.camera.up.y = state_metadata['camera']['up']['y'];
        this.camera.up.z = state_metadata['camera']['up']['z'];
        this.controls.target.x = state_metadata['target']['x'];
        this.controls.target.y = state_metadata['target']['y'];
        this.controls.target.z = state_metadata['target']['z'];
        this.camera.lookAt(this.controls.target);
        for (var i = 0; i < state_metadata['pinned'].length; ++i) {
            var key = state_metadata['pinned'][i];
            if (this.meshDict._meshDict.hasOwnProperty(key)) {
                this.meshDict._meshDict[key].pinned = true;
            }
        }
        for (var _i = 0, _a = Object.keys(state_metadata['visibility']); _i < _a.length; _i++) {
            var key = _a[_i];
            if (!this.meshDict.hasOwnProperty(key)) {
                continue;
            }
            this.meshDict._meshDict[key].visibility = state_metadata['visibility'][key];
            if (this.meshDict._meshDict[key].background) {
                continue;
            }
            var meshobj = this.meshDict._meshDict[key].object;
            var color = state_metadata['color'][key];
            for (var j = 0; j < meshobj.children.length; ++j) {
                meshobj.children[j].material.color.fromArray(color);
                for (var k = 0; k < meshobj.children[j].geometry.colors.length; ++k) {
                    meshobj.children[j].geometry.colors[k].fromArray(color);
                }
                meshobj.children[j].geometry.colorsNeedUpdate = true;
            }
        }
    };
    /**
     * Update selected object
     * @param {string} rid uid of selected object
     */
    Neu3D.prototype.select = function (rid) {
        this.uiVars.selected = rid;
    };
    /**
     * Reset workspace
     *
     * @param {boolean=} resetBackground whether to reset background
     */
    Neu3D.prototype.reset = function (resetBackground) {
        if (resetBackground === void 0) { resetBackground = false; }
        this.meshDict.reset(resetBackground); // call MeshDict's reset function
        if (resetBackground) {
            this.controls.target0.set(0, 0, 0);
        }
    };
    /**
     * Setup event listener for the container
     */
    Neu3D.prototype._addContainerEventListener = function () {
        var func_0 = this.onDocumentMouseClick.bind(this);
        this.container.addEventListener('click', func_0, false);
        this._containerEventListener['click'] = func_0;
        var func_1 = this.onDocumentMouseDBLClick.bind(this);
        this.container.addEventListener('dblclick', func_1, false);
        this._containerEventListener['dblclick'] = func_1;
        if (Neu3D.isOnMobile) {
            var func_2 = this.onDocumentMouseDBLClickMobile.bind(this);
            // this.container.addEventListener('taphold', func_2);
            document.body.addEventListener('contextmenu', this.blockContextMenu);
            this._containerEventListener['taphold'] = func_2;
        }
        var func_4 = this.onDocumentMouseEnter.bind(this);
        this.container.addEventListener('mouseenter', func_4, false);
        this._containerEventListener['mouseenter'] = func_4;
        var func_5 = this.onDocumentMouseMove.bind(this);
        this.container.addEventListener('mousemove', func_5, false);
        this._containerEventListener['mousemove'] = func_5;
        var func_6 = this.onDocumentMouseLeave.bind(this);
        this.container.addEventListener('mouseleave', func_6, false);
        this._containerEventListener['mouseleave'] = func_6;
        var func_7 = this.onDocumentDrop.bind(this);
        this.container.addEventListener('drop', func_7, false); // drop file load swc
        this._containerEventListener['drop'] = func_7;
        var func_8 = this.blockDragEvents.bind(this);
        this.container.addEventListener('dragover', func_8, false); // drop file load swc
        this._containerEventListener['dragover'] = func_8;
        var func_9 = this.blockDragEvents.bind(this);
        this.container.addEventListener('dragenter', func_9, false); // drop file load swc
        this._containerEventListener['dragenter'] = func_9;
        var func_10 = this.onWindowResize.bind(this);
        this.container.addEventListener('resize', func_10, false);
        this._containerEventListener['resize'] = func_10;
    };
    Neu3D.prototype.removeContainerEventListener = function () {
        for (var _i = 0, _a = Object.entries(this._containerEventListener); _i < _a.length; _i++) {
            var _b = _a[_i], evtName = _b[0], func = _b[1];
            this.container.removeEventListener(evtName, func, false);
        }
        document.body.removeEventListener('contextmenu', this.blockContextMenu);
    };
    /**
     * Dispose everything and release memory
     */
    Neu3D.prototype.dispose = function () {
        this.reset(true);
        this.render();
        cancelAnimationFrame(this._animationId);
        // dispose control panel
        this.controlPanel.dispose();
        delete this.controlPanel;
        // remove listener
        this.removeContainerEventListener();
        // delete scenes
        this.scenes.front.dispose();
        this.scenes.back.dispose();
        delete this.scenes.front;
        delete this.scenes.back;
        delete this.scenes;
        // this.scenes = null;
        this.controls.dispose();
        delete this.controls;
        // this.controls = null;
        delete this.lightsHelper;
        // this.lightsHelper = null;
        this.postProcess.dispose();
        delete this.loadingManager;
        //dispose camera &
        delete this.camera;
        // this.camera = null;
        delete this.raycaster;
        // this.raycaster = null;
        // dispose renderer completely
        this.renderer.dispose();
        delete this.renderer;
        // this.renderer = null;
        // dispose data objects
        delete this._metadata;
        // this._metadata = null;
        delete this.states;
        this.stats.dom.remove();
        delete this.stats;
        // this.states = null;
        this.meshDict.dispose();
        delete this.meshDict;
        // this.meshDict = null;
        delete this.renderSettings;
        // this.settings = null;
        delete this.uiVars;
        // this.uiVars = null;    
        // delete this.dispatch;
        // this.dispatch = null;
        delete this.commandDispatcher;
        // this.commandDispatcher = null;
        // delete this.callbackRegistry;
        // this.callbackRegistry = null;
        // remove divs
        this.removeDivs();
    };
    /**
     *
     * @param {object} json
     */
    Neu3D.prototype.execCommand = function (json) {
        var neuList = json['neurons'] || [];
        var commandList = json['commands'] || [];
        var args = json['args'] || undefined;
        neuList = Neu3D.asArray(neuList);
        commandList = Neu3D.asArray(commandList);
        for (var i = 0; i < commandList.length; ++i) {
            var c = commandList[i].toLowerCase();
            this.commandDispatcher[c].call(this, neuList, args);
        }
    };
    // /**
    //  * Add Object to workspace as JSON
    //  * @param {object} json 
    //  */
    // addJson(json) {
    //   return new Promise((resolve) => {
    //     if ((json === undefined) || !("ffbo_json" in json)) {
    //       console.log('mesh json is undefined');
    //       return;
    //     }
    //     let metadata = {
    //       "type": undefined,
    //       "visibility": true,
    //       "colormap": this._metadata.colormap,
    //       "colororder": "random",
    //       "showAfterLoadAll": false,
    //       "radius_scale": 1.,
    //     };
    //     for (let key in metadata) {
    //       if ((key in json) && (json[key] !== undefined)) {
    //         metadata[key] = json[key];
    //       }
    //     }
    //     if (('reset' in json) && json.reset) {
    //       this.reset();
    //     }
    //     /* set colormap */
    //     let keyList = Object.keys(json.ffbo_json);
    //     let colorNum, id2float, lut;
    //     if (metadata.colororder === "order") {
    //       colorNum = keyList.length;
    //       id2float = function (i) { return i / colorNum; };
    //     } else {
    //       colorNum = this.maxColorNum;
    //       id2float = function (i) { return getRandomIntInclusive(1, colorNum) / colorNum; };
    //     }
    //     if (metadata.colororder === "order" && (colorNum !== this.maxColorNum || metadata.colormap !== "rainbow")) {
    //       colorNum = keyList.length;
    //       lut = new Lut(metadata.colormap, colorNum);
    //       lut.setMin(0);
    //       lut.setMax(1);
    //     } else {
    //       lut = this.lut;
    //     }
    //     if (metadata.showAfterLoadAll) {
    //       this.groups.front.visible = false;
    //     }
    //     for (let i = 0; i < keyList.length; ++i) {
    //       let key = keyList[i];
    //       if (key in this.meshDict) {
    //         console.log('mesh object already exists... skip rendering...');
    //         continue;
    //       }
    //       let unit;
    //       if (json.ffbo_json[key]._PropMan) {
    //         unit = json.ffbo_json[key]
    //       } else {
    //         unit = new PropertyManager(json.ffbo_json[key]);
    //       }
    //       unit.boundingBox = Object.assign({}, this.defaultBoundingBox);
    //       setAttrIfNotDefined(unit, 'highlight', true);
    //       if (unit.background) {
    //         setAttrIfNotDefined(unit, 'opacity', this.settings.backgroundOpacity);
    //       } else {
    //         setAttrIfNotDefined(unit, 'opacity', this.settings.defaultOpacity);
    //       }
    //       setAttrIfNotDefined(unit, 'visibility', true);
    //       setAttrIfNotDefined(unit, 'background', false);
    //       setAttrIfNotDefined(unit, 'color', lut.getColor(id2float(i)));
    //       setAttrIfNotDefined(unit, 'label', 
    //         getAttr(unit, 'uname', key)
    //       );
    //       setAttrIfNotDefined(unit, 'radius_scale', 1.);
    //       setAttrIfNotDefined(unit, 'x_shift', 0.);
    //       setAttrIfNotDefined(unit, 'y_shift', 0.);
    //       setAttrIfNotDefined(unit, 'z_shift', 0.);
    //       setAttrIfNotDefined(unit, 'x_scale', 1.);
    //       setAttrIfNotDefined(unit, 'y_scale', 1.);
    //       setAttrIfNotDefined(unit, 'z_scale', 1.);
    //       setAttrIfNotDefined(unit, 'xy_rot', 0.);
    //       setAttrIfNotDefined(unit, 'yz_rot', 0.);
    //       if (Array.isArray(unit.color)) {
    //         unit.color = new Color(...unit.color);
    //       }
    //       /* read mesh */
    //       if (metadata.type === "morphology_json") {
    //         this.loadMorphJSONCallBack(key, unit, metadata.visibility).bind(this)();
    //       } else if (metadata.type === "obj") {
    //         this.loadObjCallBack(key, unit, metadata.visibility).bind(this)();
    //       } else if (('dataStr' in unit) && ('filename' in unit)) {
    //         console.log('mesh object has both data string and filename... should only have one... skip rendering');
    //         continue;
    //       } else if ('filename' in unit) {
    //         unit['filetype'] = unit.filename.split('.').pop();
    //         let loader = new FileLoader(this.loadingManager);
    //         if (unit['filetype'] == "json"){
    //           loader.load(unit.filename, this.loadMeshCallBack(key, unit, metadata.visibility).bind(this));
    //         } else if (unit['filetype'] == "swc") {
    //           loader.load(unit.filename, this.loadSWCCallBack(key, unit, metadata.visibility).bind(this));
    //         } else {
    //           console.log('mesh object has unrecognized data format... skip rendering');
    //           continue;
    //         }
    //       } else if ('dataStr' in unit) {
    //         if (unit['filetype'] == "json") {
    //           this.loadMeshCallBack(key, unit, metadata.visibility).bind(this)(unit['dataStr']);
    //         } else if (unit['filetype'] == "swc") {
    //           this.loadSWCCallBack(key, unit, metadata.visibility).bind(this)(unit['dataStr']);
    //         } else {
    //           console.log('mesh object has unrecognized data format... skip rendering');
    //           continue;
    //         }
    //       } else {
    //         console.log('mesh object has neither filename nor data string... skip rendering');
    //         continue;
    //       }
    //     }
    //     resolve();
    //   });
    // }
    Neu3D.prototype.animate = function () {
        if (this.stats) {
            this.stats.begin();
        }
        this.controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
        if (this.states.mouseOver && this.syncControls) {
            this.syncControls(this);
            // if (options['adaptive']) {
            //   this.updateResolution();
            //   this.updateShaders();
            //   /*
            //   if(this.frameCounter < 3){
            //     this.frameCounter++;
            //   }else{
            //     this.updateResolution();
            //     this.updateShaders();
            //     this.frameCounter = 0;
            //   }
            //   */
            // }
        }
        if ((this.activeRender && this.activeRender.powerSaving) || (!(this.activeRender.powerSaving))) {
            this.render();
        }
        if (this.stats) {
            this.stats.end();
        }
        this._animationId = requestAnimationFrame(this.animate.bind(this));
    };
    /**
     * Load swc files on drop
     * @param {DragEvent} event
     */
    Neu3D.prototype.onDocumentDrop = function (event) {
        event.preventDefault();
        var ffbomesh = this.meshDict;
        var _loop_2 = function (i) {
            var file = event.dataTransfer.files.item(i);
            var name = file.name.split('.')[0];
            var isSWC = false;
            if (file.name.match('.+(\.swc)$')) {
                isSWC = true;
            }
            var reader = new FileReader();
            reader.onload = function (evt) {
                var json = {};
                json[name] = {
                    label: name,
                    dataStr: evt.target.result,
                    filetype: 'swc'
                };
                if (isSWC === true) {
                    ffbomesh.addJson({ ffbo_json: json });
                }
                else {
                    ffbomesh.addJson({ ffbo_json: json, type: 'obj' });
                }
            };
            reader.readAsText(file);
        };
        for (var i = 0; i < event.dataTransfer.files.length; i++) {
            _loop_2(i);
        }
    };
    /**
     * Mouse Click Event
     * @param {*} event
     */
    Neu3D.prototype.onDocumentMouseClick = function (event) {
        if (event !== undefined) {
            event.preventDefault();
        }
        var intersected = this.getIntersection([this.meshDict.groups.front]);
        if (intersected != undefined && intersected['highlight']) {
            this.select(intersected.rid);
        }
    };
    Neu3D.prototype.blockDragEvents = function (event) {
        event.preventDefault();
        event.stopPropagation();
    };
    Neu3D.prototype.blockContextMenu = function () {
        return false;
    };
    /**
     * Double Click callback
     * Toggle pin
     * @param event
     */
    Neu3D.prototype.onDocumentMouseDBLClick = function (event) {
        if (event !== undefined) {
            event.preventDefault();
        }
        var intersected = this.getIntersection([this.meshDict.groups.front]);
        if (intersected != undefined) {
            if (!intersected['highlight']) {
                return;
            }
            intersected.togglePin();
        }
    };
    /**
     * Double Click Mobile
     * Toggle Pin
     * @param event
     */
    Neu3D.prototype.onDocumentMouseDBLClickMobile = function (event) {
        if (!Neu3D.isOnMobile) { // do nothing if not on mobile
            return;
        }
        if (event !== undefined) {
            event.preventDefault();
        }
        var intersected = this.getIntersection([this.meshDict.groups.front]);
        if (intersected != undefined) {
            if (!intersected['highlight']) {
                return;
            }
            intersected.togglePin();
        }
    };
    /**
     * Overload mouse move event
     * Move tooltip to follow mouse
     * @param event
     */
    Neu3D.prototype.onDocumentMouseMove = function (event) {
        event.preventDefault();
        this.states.mouseOver = true;
        var rect = this.container.getBoundingClientRect();
        this.uiVars.toolTipPosition.x = event.clientX;
        this.uiVars.toolTipPosition.y = event.clientY;
        this.uiVars.cursorPosition.x = ((event.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
        this.uiVars.cursorPosition.y = -((event.clientY - rect.top) / this.container.clientHeight) * 2 + 1;
    };
    /**
     * Set mouseover and active Render to true
     * @param event
     */
    Neu3D.prototype.onDocumentMouseEnter = function (event) {
        event.preventDefault();
        this.states.mouseOver = true;
        this.activeRender.activeRender = true;
    };
    /**
     * On Mouse Leave to disable highlight
     * @param event - mouse event whose default is overwritten
     */
    Neu3D.prototype.onDocumentMouseLeave = function (event) {
        event.preventDefault();
        this.highlight(false);
        this.states.mouseOver = false;
        this.activeRender.activeRender = false;
    };
    /**
     * Response to window resize
     * Resizes the canvas and scale ThreeJS cameras accrodingly
     */
    Neu3D.prototype.onWindowResize = function () {
        var height = this.container.clientHeight;
        var width = this.container.clientWidth;
        var aspect = width / height;
        var cam_dir = new three_1.Vector3();
        cam_dir.subVectors(this.camera.position, this.controls.target);
        var prevDist = cam_dir.length();
        cam_dir.normalize();
        var hspan = prevDist * 2 * Math.tan(this._prevhfov / 2);
        this._prevhfov = 2 * Math.atan(Math.tan(Math.PI * this._fov / 2 / 180) * aspect);
        var dist = hspan / 2 / Math.tan(this._prevhfov / 2);
        this.camera.position.copy(this.controls.target);
        this.camera.position.addScaledVector(cam_dir, dist);
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.postProcess.composer.setSize(width * window.devicePixelRatio, height * window.devicePixelRatio);
        this.postProcess.effectFXAA.uniforms['resolution'].value.set(1 / Math.max(width, 1440), 1 / Math.max(height, 900));
        this.controls.handleResize();
        this.render();
        // TODO: Check
        // if (this.dispatch['resize'] !== undefined) {
        //   this.dispatch['resize']();
        // }
    };
    /**
     * Render
     */
    Neu3D.prototype.render = function () {
        if (this._addingJsons) {
            return;
        }
        if (this.states.highlight) {
            // do nothing
        }
        else {
            if (this.animation.meshOscAmp && this.animation.meshOscAmp > 0) {
                for (var _i = 0, _a = Object.entries(this.meshDict._meshDict); _i < _a.length; _i++) {
                    var _b = _a[_i], rid = _b[0], mesh = _b[1];
                    if (mesh.object !== undefined) {
                        var x = new Date().getTime();
                        if (mesh.background) {
                            var scale = (this.meshDict.settings.backgroundOpacity + 0.5 * this.animation.meshOscAmp * (1 + Math.sin(x * .0005)));
                            if (mesh.opacity >= 0.00) {
                                this.meshDict._meshDict[rid].opacity = mesh.opacity * scale;
                            }
                            else {
                                this.meshDict._meshDict[rid].opacity = scale;
                            }
                        }
                    }
                }
            }
        }
        /*
        * show label of mesh object when it intersects with cursor
        */
        if (this.states.mouseOver) {
            var intersected = this.getIntersection([this.meshDict.groups.front, this.meshDict.groups.back]);
            if (this.uiVars.currentIntersected || intersected) {
                this.uiVars.currentIntersected = intersected;
                this.meshDict.highlight(intersected.rid);
            }
        }
        this.postProcess.composer.render();
        // if (this._take_screenshot) {
        //   this.renderer.domElement.toBlob( (b)=> {
        //     this._saveImage(b, "ffbo_screenshot.png");
        //   })
        //   this._take_screenshot = false;
        // }
    };
    // screenshot() {
    //   this._take_screenshot = true;
    // }
    /**
     * Raycaster intersection groups
     * @param groups
     */
    Neu3D.prototype.getIntersection = function (groups) {
        var val = undefined;
        var object = undefined;
        this.raycaster.setFromCamera(this.uiVars.cursorPosition, this.camera);
        for (var _i = 0, groups_1 = groups; _i < groups_1.length; _i++) {
            var group = groups_1[_i];
            var intersects = this.raycaster.intersectObjects(group.children, true);
            if (intersects.length > 0) {
                object = intersects[0].object.parent;
                if (object.rid in this.meshDict) { // object rid set in meshDict addJSON callback
                    val = this.meshDict._meshDict[object.rid];
                    break;
                }
            }
        }
        return val;
    };
    /**
     * Export Visualization as Object
     */
    Neu3D.prototype.export_settings = function () {
        var backgroundColor = [0.15, 0.01, 0.15];
        if (this.meshDict.groups.back.children.length) {
            backgroundColor = this.meshDict.groups.back.children[0].children[0].material.color.toArray();
        }
        if (this.meshDict.settings.backgroundColor !== undefined) {
            backgroundColor = this.meshDict.settings.backgroundColor;
        }
        var set = Object.assign({}, this.meshDict.settings, {
            lightsHelper: this.lightsHelper["export"](),
            postProcessing: {
                fxaa: this.renderSettings.effectFXAA.enabled,
                ssao: this.renderSettings.backrenderSSAO.enabled,
                toneMappingMinLum: 1 - this.renderSettings.toneMappingPass.brightness,
                bloomRadius: this.renderSettings.bloomPass.radius,
                bloomThreshold: this.renderSettings.bloomPass.threshold,
                bloomStrength: this.renderSettings.bloomPass.strength
            },
            backgroundColor: backgroundColor
        });
        return set;
    };
    // /**
    //  * callback for when mesh is added
    //  * @param {event} e 
    //  */
    // onAddMesh(e) {
    //   if (!e.value['background']) {
    //     if (!('morph_type' in e.value) || (e.value['morph_type'] != 'Synapse SWC'))
    //       ++this.uiVars.frontNum;
    //   }
    //   else {
    //     ++this.uiVars.backNum;
    //   }
    //   ++this.uiVars.meshNum;
    //   this.meshDict._labelToRid[e.value.label] = e.prop;
    // }
    // /**
    //  * callback when mesh is removed
    //  * 
    //  * Dispose objects, decrement counters
    //  * @param {event} e 
    //  */
    // onRemoveMesh(e) {
    //   if (this.states.highlight == e.prop)
    //     this.states.highlight = false;
    //   if (e.value['pinned'])
    //     e.value['pinned'] = false;
    //   let meshobj = e.value.object;
    //   for (let j = 0; j < meshobj.children.length; ++j) {
    //     meshobj.children[j].geometry.dispose();
    //     meshobj.children[j].material.dispose();
    //   }
    //   if (!e.value['background']) {
    //     if (!('morph_type' in e.value) || (e.value['morph_type'] != 'Synapse SWC'))
    //       --this.uiVars.frontNum;
    //     this.groups.front.remove(meshobj);
    //   }
    //   else {
    //     this.groups.back.remove(meshobj);
    //     --this.uiVars.backNum;
    //   }
    //   --this.uiVars.meshNum;
    //   meshobj = null;
    //   delete this._labelToRid[e.value.label];
    // }
    /** Highlight a  neuron
     *
     */
    Neu3D.prototype.highlight = function (rid, updatePos) {
        if (updatePos === void 0) { updatePos = true; }
        if (rid === false) {
            this.states.highlight = false;
            this.hide3dToolTip();
            return;
        }
        this.meshDict.highlight(rid);
        if (updatePos) {
            var pos = this.getNeuronScreenPosition(rid);
            this.uiVars.toolTipPosition.x = pos.x;
            this.uiVars.toolTipPosition.y = pos.y;
        }
        this.show3dToolTip(this.meshDict._meshDict[rid].label);
    };
    // /** TODO: Add Comment
    //  * 
    //  * @param {event} e 
    //  */
    // onUpdateHighlight(e) {
    //   if (e.old_value) {
    //     this.meshDict[e.old_value]['object']['visible'] = this.meshDict[e.old_value]['visibility'];
    //   }
    //   if (e.value === false) {
    //     this.renderer.domElement.style.cursor = "auto";
    //   } else {
    //     this.renderer.domElement.style.cursor = "pointer";
    //     this.meshDict[e.value]['object']['visible'] = true;
    //   }
    // }
    // /**
    //  * Update Pinned objects
    //  * @param
    //  */
    // updatePinned(e) {
    //   if (e.obj['pinned']) {
    //     this.uiVars.pinnedObjects.add(e.path[0]);
    //   }
    //   else {
    //     this.uiVars.pinnedObjects.delete(e.path[0]);
    //   }
    //   this.states.pinned = (this.uiVars.pinnedObjects.size > 0);
    // }
    /**
     * Reset camera and control position
     */
    Neu3D.prototype.resetView = function () {
        this.controls.target0.x = 0.5 * (this.meshDict.boundingBox.min.x + this.meshDict.boundingBox.max.x);
        this.controls.target0.y = 0.5 * (this.meshDict.boundingBox.min.y + this.meshDict.boundingBox.max.y);
        this.controls.reset();
        if (this._metadata.enablePositionReset == true) {
            this.camera.position.z = this._metadata.resetPosition.z;
            this.camera.position.y = this._metadata.resetPosition.y;
            this.camera.position.x = this._metadata.resetPosition.x;
            this.camera.up.x = this._metadata.upVector.x;
            this.camera.up.y = this._metadata.upVector.y;
            this.camera.up.z = this._metadata.upVector.z;
            this.controls.target.x = this._metadata.cameraTarget.x;
            this.controls.target.y = this._metadata.cameraTarget.y;
            this.controls.target.z = this._metadata.cameraTarget.z;
        }
    };
    /**
     * Reset view based on visible objects
     */
    Neu3D.prototype.resetVisibleView = function () {
        var _this = this;
        this.meshDict.computeVisibleBoundingBox();
        var box = this.meshDict.visibleBoundingBox;
        this.controls.target.x = 0.5 * (box.min.x + box.max.x);
        this.controls.target.y = 0.5 * (box.min.y + box.max.y);
        this.controls.target.z = 0.5 * (box.min.z + box.max.z);
        this.camera.updateProjectionMatrix();
        setTimeout(function () {
            var positions = [
                new three_1.Vector3(box.min.x, box.min.y, box.min.z),
                new three_1.Vector3(box.min.x, box.min.y, box.max.z),
                new three_1.Vector3(box.min.x, box.max.y, box.min.z),
                new three_1.Vector3(box.min.x, box.max.y, box.max.z),
                new three_1.Vector3(box.max.x, box.min.y, box.min.z),
                new three_1.Vector3(box.max.x, box.min.y, box.max.z),
                new three_1.Vector3(box.max.x, box.max.y, box.min.z),
                new three_1.Vector3(box.max.x, box.max.y, box.max.z)
            ];
            // From https://stackoverflow.com/a/11771236
            var targetFov = 0.0;
            for (var i = 0; i < 8; i++) {
                var proj2d = positions[i].applyMatrix4(_this.camera.matrixWorldInverse);
                var angle = Math.max(Math.abs(Math.atan(proj2d.x / proj2d.z) / _this.camera.aspect), Math.abs(Math.atan(proj2d.y / proj2d.z)));
                targetFov = Math.max(targetFov, angle);
            }
            var currentFov = Math.PI * _this._fov / 2 / 180;
            var cam_dir = new three_1.Vector3();
            cam_dir.subVectors(_this.camera.position, _this.controls.target);
            var prevDist = cam_dir.length();
            cam_dir.normalize();
            var dist = prevDist * Math.tan(targetFov) / Math.tan(currentFov);
            var aspect = _this.camera.aspect;
            var targetHfov = 2 * Math.atan(Math.tan(targetFov / 2) * aspect);
            var currentHfov = 2 * Math.atan(Math.tan(currentFov / 2) * aspect);
            dist = Math.max(prevDist * Math.tan(targetHfov) / Math.tan(currentHfov), dist);
            _this.camera.position.copy(_this.controls.target);
            _this.camera.position.addScaledVector(cam_dir, dist);
            _this.camera.updateProjectionMatrix();
        }, 400);
    };
    /**
     * Create Tooltip
     */
    Neu3D.prototype._createToolTip = function () {
        var toolTipDiv = document.createElement('div');
        toolTipDiv.style.cssText = 'position: fixed; text-align: center; width: auto; min-width: 100px; height: auto; padding: 2px; font: 12px arial; z-index: 999; background: #ccc; border: solid #212121 3px; border-radius: 8px; pointer-events: none; opacity: 0.0; color: #212121';
        toolTipDiv.style.transition = "opacity 0.5s";
        this.container.appendChild(toolTipDiv);
        this._addedDOMElements['tooltip'] = toolTipDiv;
    };
    /**
     * Show tooltip given content
     * @param content
     */
    Neu3D.prototype.show3dToolTip = function (content) {
        var toolTipDiv = this._addedDOMElements['tooltip'];
        toolTipDiv.style.opacity = '.9';
        toolTipDiv.innerHTML = content;
        var domRect = this.renderer.domElement.getBoundingClientRect();
        var toolTipRect = toolTipDiv.getBoundingClientRect();
        var left = this.uiVars.toolTipPosition.x + 10;
        if (left + toolTipRect.width > domRect.right) {
            left = domRect.right - 10 - toolTipRect.width;
        }
        var top = this.uiVars.toolTipPosition.y + 10;
        if (top + toolTipRect.height > domRect.bottom) {
            top = this.uiVars.toolTipPosition.y - 10 - toolTipRect.height;
        }
        toolTipDiv.style.left = left + "px";
        toolTipDiv.style.top = top + "px";
    };
    /** Hid tooltip */
    Neu3D.prototype.hide3dToolTip = function () {
        var toolTipDiv = this._addedDOMElements['tooltip'];
        toolTipDiv.style.opacity = '0.0';
    };
    /**
     * Get 2D projeted position of neuron on the screen
     * @param rid
     */
    Neu3D.prototype.getNeuronScreenPosition = function (rid) {
        var vector = this.meshDict._meshDict[rid].position.clone();
        var canvasRect = this.renderer.domElement.getBoundingClientRect();
        // map to normalized device coordinate (NDC) space
        vector.project(this.camera);
        // map to 2D screen space
        vector.x = Math.round((vector.x + 1) * canvasRect.width / 2) + canvasRect.left;
        vector.y = Math.round((-vector.y + 1) * canvasRect.height / 2) + canvasRect.top;
        return { 'x': vector.x, 'y': vector.y };
    };
    /**
     * Synchronize controls with another `Neu3D` object
     * @param neu3d
     */
    Neu3D.prototype.syncControls = function (neu3d) {
        if (this === neu3d) {
            return;
        }
        this.controls.target.copy(neu3d.controls.target);
        this.camera.position.copy(neu3d.camera.position);
        this.camera.up.copy(neu3d.camera.up);
        this.camera.lookAt(neu3d.controls.target);
    };
    return Neu3D;
}());
exports.Neu3D = Neu3D;
;
(function (Neu3D) {
    Neu3D.isOnMobile = checkOnMobile();
    /**used for generating unique file upload div id */
    function generateGuid() {
        var result, i, j;
        result = '';
        for (j = 0; j < 32; j++) {
            if (j == 8 || j == 12 || j == 16 || j == 20) {
                result = result + '-';
            }
            i = Math.floor(Math.random() * 16).toString(16).toUpperCase();
            result = result + i;
        }
        return result;
    }
    Neu3D.generateGuid = generateGuid;
    /** Check if we are on mobile */
    function checkOnMobile() {
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            return true;
        }
        else {
            return false;
        }
    }
    Neu3D.checkOnMobile = checkOnMobile;
    /**
     * return anything as array of itself
     */
    Neu3D.asArray = function (value) {
        if (Array.isArray(value)) {
            return value;
        }
        else {
            return [value];
        }
    };
})(Neu3D = exports.Neu3D || (exports.Neu3D = {}));
exports.Neu3D = Neu3D;
