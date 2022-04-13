import { PropertyManager } from './propertymanager';
import { FFBOLightsHelper } from './lightshelper';
import {
  Vector2, Raycaster, Matrix4,
  Group, WebGLRenderer,
  Scene, Vector3, LoadingManager,
  PerspectiveCamera, Color, FileLoader, GammaEncoding
} from 'three';

import { Lut } from 'three/examples/jsm/math/Lut'
// import { AdaptiveToneMappingPass } from 'three/examples/jsm/postprocessing/AdaptiveToneMappingPass';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader'
// add FontAwesome
import '@fortawesome/fontawesome-free/js/all.js';

const STATS = require('../etc/stats');
// const Detector = require("three/examples/js/WEBGL");
// const THREE = require('../etc/three');
import '../style/neu3d.css';

var isOnMobile = checkOnMobile();
var _saveImage;

// return next power of 2 of given number
function nextPow2(x) {
  return Math.pow(2, Math.round(Math.max(x, 0)).toString(2).length);
}

// used for generating unique file upload div id
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

function checkOnMobile() {

  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    return true;
  }
  else {
    return false;
  }

}

function getAttr(obj, key, val) {
  if (key in obj) {
    val = obj[key];
  }
  return val;
}

function setAttrIfNotDefined(obj, key, val) {
  if (!(key in obj)) {
    obj[key] = val;
  }
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
// if (!Detector.webgl) Detector.addGetWebGLMessage();



export class Neu3D {
  /**
   * 
   * @param {HTMLDivElement} container : parent div element
   * @param {JSON | undefined } data : optionally add initalization data
   * @param {JSON | undefined } metadata : optional metadata
   * @param {Object} [options={}] : additional options 
   */
  constructor(container, data, metadata, options = {}) {
    this.container = container;
    this.frameCounter = 0;
    this.resINeed = 0;
    this.activeRender = true; // Whether the animate function should render the contents of this container in every frame
    this.powerSaving = false; // Whether power saving measures are active or not
    if (options['powerSaving']) {
      this.powerSaving = true;
    }

    this._animationId = null; // animation frame id, useful for stopping animation
    this._containerEventListener = {}; // function references to event listeners on container div
    this._addedDOMElements = [];
    /* default metadata */
    this._metadata = {
      colormap: "rainbow",
      maxColorNum: 1747591,
      allowPin: true,
      allowHighlight: true,
      enablePositionReset: false,
      resetPosition: { 'x': 0., 'y': 0., 'z': 0. },
      upVector: { 'x': 0., 'y': 1., 'z': 0. },
      cameraTarget: { 'x': 0., 'y': 0., 'z': 0. },
      upSign: 1., // Deprecated
    };
    if (metadata !== undefined)
      for (let key in this._metadata) {
        if ((key in metadata) && (metadata[key] !== undefined)) {
          this._metadata[key] = metadata[key];
        }
      }
    this.settings = new PropertyManager({
      defaultOpacity: 0.7,
      synapseOpacity: 1.0,
      meshOscAmp: 0.0,
      nonHighlightableOpacity: 0.1,
      lowOpacity: 0.05,
      pinOpacity: 0.9,
      pinLowOpacity: 0.1,
      highlightedObjectOpacity: 1.0,
      defaultRadius: 1.0,
      defaultSomaRadius: 0.5,
      defaultSynapseRadius: 0.5,
      minRadius: 0.01,
      minSomaRadius: 0.01,
      minSynapseRadius: 0.001,
      maxRadius: 10.0,
      maxSomaRadius: 20.0,
      maxSynapseRadius: 5.0,
      linewidth: 0.75,
      backgroundOpacity: 0.5,
      backgroundWireframeOpacity: 0.07,
      neuron3dMode: 0,
      synapseMode: true,
      meshWireframe: true,
      backgroundColor: new Color("#260226"),
      sceneBackgroundColor: '#030305',
      render_resolution: 1.0
    });
    // this.settings.toneMappingPass = new PropertyManager({ brightness: 0.95 });
    this.settings.bloomPass = new PropertyManager({enabled: false, radius: 0.2, strength: 0.2, threshold: 0.3 });
    this.settings.effectFXAA = new PropertyManager({ enabled: false });
    this.settings.backrenderSSAO = new PropertyManager({ enabled: false }); // change
    this.states = new PropertyManager({
      mouseOver: false,
      pinned: false,
      highlight: false,
      animate: false
    });
    this.activityData = {};
    this.it1 = {};
    this.it2 = {};
    this.meshDict = new PropertyManager();
    this.uiVars = new PropertyManager({
      pinnedObjects: new Set(),
      toolTipPosition: new Vector2(),
      highlightedObjects: null,
      currentIntersected: undefined,
      cursorPosition: new Vector2(-100000, -100000),
      meshNum: 0,
      frontNum: 0,
      backNum: 0,
      tooltip: undefined,
      selected: undefined
    });
    // In case of non-unique labels, will hold the rid for the last object
    // added with that label
    this._labelToRid = {};
    // Mesh.raycast = acceleratedRaycast;
    this.raycaster = new Raycaster();
    this.raycaster.params.Line.threshold = 3;
    if (options['stats']) {
      this.stats = STATS.Stats();
      this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
      this.stats.dom.style.position = "relative";
      this.stats.dom.className += ' vis-3d-stats'
      this._addedDOMElements.push(this.stats.dom);
      this.container.appendChild(this.stats.dom);
    }
    this.camera = this.initCamera();
    this.renderer = this.initRenderer();
    this.groups = {
      front: new Group(),
      back: new Group()
    };
    this.scenes = this.initScenes();
    this.controls = this.initControls();
    this.lightsHelper = this.initLights();
    this.lut = this.initLut();
    this.loadingManager = this.initLoadingManager();
    let controlPanelDiv = document.createElement('div');
    controlPanelDiv.className = 'vis-3d-settings';

    // this.controlPanel = this.initControlPanel({container: controlPanelDiv, ...options['datGUI']});
    this.controlPanel = this.initControlPanel(options['datGUI']);
    controlPanelDiv.appendChild(this.controlPanel.domElement);
    this._addedDOMElements.push(controlPanelDiv);
    this.container.appendChild(controlPanelDiv);

    this.addContainerEventListener();

    this.animOpacity = {};
    this.defaultBoundingBox = { 'maxY': -100000, 'minY': 100000, 'maxX': -100000, 'minX': 100000, 'maxZ': -100000, 'minZ': 100000 };
    this.boundingBox = Object.assign({}, this.defaultBoundingBox);
    this.visibleBoundingBox = Object.assign({}, this.defaultBoundingBox);
    this.createToolTip();
    this._take_screenshot = false;
    this.initPostProcessing();

    this.dispatch = {
      click: undefined,
      dblclick: undefined,
      getInfo: this._getInfo,
      syncControls: undefined,
      resize: undefined
      /*'showInfo': undefined,
        'removeUnpin': undefined,
        'hideAll': undefined,
        'showAll': undefined,*/
    };

    this.commandDispatcher = {
      'show': this.show,
      'showall': this.showAll,
      'hide': this.hide,
      'hideall': this.hideAll,
      'pin': this.pin,
      'unpin': this.unpin,
      'unpinall': this.unpinAll,
      'remove': this.remove,
      'setcolor': this.setColor,
      'resetview': this.resetView,
    };

    /** Callbacks fired on `this` will be callbacks fired on `meshDict` */
    this.callbackRegistry = {
      'add': ((func) => { this.meshDict.on('add', func); }),
      'remove': ((func) => { this.meshDict.on('remove', func); }),
      'pinned': ((func) => { this.meshDict.on('change', func, 'pinned'); }),
      'visibility': ((func) => { this.meshDict.on('change', func, 'visibility'); }),
      'num': ((func) => { this.uiVars.on('change', func, 'frontNum'); }),
      'highlight': ((func) => { this.states.on('change', func, 'highlight'); }),
      'click': ((func) => { this.uiVars.on('change', func, 'selected'); }),
    };

    this.on('add', ((e) => { this.onAddMesh(e); }));
    this.on('remove', ((e) => { this.onRemoveMesh(e); }));
    this.on('pinned', ((e) => { this.updatePinned(e); this.updateOpacity(e); }));
    this.on('visibility', ((e) => { this.onUpdateVisibility(e.path[0]); }));
    //this.on('num', (function () { this.updateInfoPanel(); }).bind(this)); 
    // this.on('num', () => { this.controlPanel.__controllers[0].setValue(this.uiVars.frontNum); });
    this.on('highlight', ((e) => { this.updateOpacity(e); this.onUpdateHighlight(e); }));


    this.settings.on("change", ((e) => {
      this.updateOpacity(e);
    }), [
        "pinLowOpacity", "pinOpacity", "defaultOpacity", "backgroundOpacity",
        "backgroundWireframeOpacity", "synapseOpacity",
        "highlightedObjectOpacity", "nonHighlightableOpacity", "lowOpacity"
      ]);
    this.settings.on("change", ((e) => {
      this.updateLinewidth(e.value);
    }), "linewidth");

    this.settings.on("change", ((e) => {
      this.updateSynapseRadius(e.value);
    }), "defaultSynapseRadius");

    this.settings.on('change', ((e) => {
      this[e.path[0]][e.prop] = e.value;
    }), ['radius', 'strength', 'threshold', 'enabled']);
    // this.settings.toneMappingPass.on('change', ((e) => {
    //   this.toneMappingPass.setMinLuminance(1 - this.settings.toneMappingPass.brightness);
    // }), 'brightness');
    this.settings.on('change', ((e) => {
      this.setBackgroundColor(e.value);
    }), 'backgroundColor');
    this.settings.on('change', ((e) => {
      this.setSceneBackgroundColor(e.value);
    }), 'sceneBackgroundColor');

    // add data if instantiated with data
    if (data != undefined && Object.keys(data).length > 0) {
      this.addJson(data);
    }

    this.addDivs();
    window.onresize = this.onWindowResize.bind(this);
    _saveImage = (function () {
      let a = document.createElement("a");
      document.body.appendChild(a);
      a.style = "display: none";
      return function (blob, fileName) {
        let url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      };
    }());

    // start animation loop
    this.animate();
    this._defaultSettings = this.export_settings();
  } // ENDOF Constructor

  addDivs() {
    // add file input
    let ffbomesh = this;
    let fileUploadInput = document.createElement('input');
    fileUploadInput.multiple = true;
    fileUploadInput.id = `neu3d-file-upload-${generateGuid()}`;
    fileUploadInput.setAttribute("type", "file");
    fileUploadInput.style.visibility = 'hidden';
    fileUploadInput.style.display = 'none';
    fileUploadInput.onchange = (evt) => {
      for (let i = 0; i < evt.target.files.length; i++) {
        const file = evt.target.files.item(i);
        const name = file.name.split('.')[0];
        let isSWC = false;
        let isSyn = false;
        var filetype;
        if (file.name.match('.+(\.swc)$')) {
          isSWC = true;
          filetype = 'swc';
        }
        if (file.name.match('.+(\.syn)$')) {
          isSyn = true;
          filetype = 'syn';
        }
        let reader = new FileReader();
        reader.onload = (event) => {
          let json = {};
          json[name] = {
            label: name,
            dataStr: event.target.result,
            filetype: filetype,
          };
          if (isSWC === true || isSyn === true) {
            ffbomesh.addJson({ ffbo_json: json });
          } else {
            ffbomesh.addJson({ ffbo_json: json, type: 'obj' });
          }
        };
        reader.readAsText(file);
      }
    }

    // this input has to be added as siblinig of vis-3d
    // becuase vis-3d blocks click event propagation.
    document.body.appendChild(fileUploadInput);
    this._addedDOMElements.push(fileUploadInput);
    this.fileUploadInput = fileUploadInput; // expose div

    var _tooltips = document.getElementsByClassName("tooltip")
    for (var l of _tooltips) {
      let element = document.createElement('SPAN');
      element.classList.add('tooltiptext');
      element.innerHTML = l.getAttribute('title');
      l.appendChild(element);
      l.removeAttribute('title');
    }
  }

  removeDivs() {
    for (let el of this._addedDOMElements) {
      el.remove();
    }
  }

  /**
   * Setup callback
   * @param {string} key string of callback
   * @param {function} func callback function
   */
  on(key, func) {
    if (typeof (func) !== "function") {
      console.error(`[Neu3D] setting callback for key ${key} with something that is not a function, ${func}`);
      return;
    }

    if (key in this.callbackRegistry) {
      let register = this.callbackRegistry[key];
      register(func);
    } else {
      console.error(`[Neu3D] Callback keyword ${key} not recognized.`);
    }
  }


  clearActivity() {
    clearInterval(this.it1);
    clearInterval(this.it2);
  }

  animateActivity(activityData, t_i, interval, interpolation_interval) {
    let ffbomesh = this;

    this.activityData = activityData;
    let t = t_i || 0;
    let t_max = activityData[Object.keys(activityData)[0]].length;
    let interp = 0;
    this.it1 = setInterval(frame, interval);
    this.it2 = setInterval(intFrame, interpolation_interval);
    function intFrame() {
      interp += interpolation_interval / interval;
      let t_current = t;
      let t_next = t + 1;
      if (t_next == t_max)
        t_next = 0;
      for (let key in activityData) {
        ffbomesh.meshDict[key]['opacity'] = activityData[key][t_current] * (1 - interp) + activityData[key][t_next] * (interp);
      }
      ffbomesh.resetOpacity();
    }
    function frame() {
      interp = 0;
      t = t + 1;
      if (t == t_max)
        t = 0;
    }
  }

  /** Initialize WebGL Renderer */
  initCamera() {
    let height = this.container.clientHeight;
    let width = this.container.clientWidth;

    this.fov = 20;
    this.prevhfov = 2 * Math.atan(Math.tan(Math.PI * this.fov / 2 / 180) * width / height);

    let camera = new PerspectiveCamera(this.fov, width / height, 0.1, 10000000);
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
  }

  /** Initialize WebGL Renderer */
  initRenderer() {
    let renderer = new WebGLRenderer({ 'logarithmicDepthBuffer': true, 'alpha': false, antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio * this.settings.render_resolution);
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = false;
    renderer.outputEncoding = GammaEncoding;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  updateResolution() {

    if (this.stats.getFPS() < 30 && this.settings.render_resolution > 0.25) {
      this.settings.render_resolution = this.settings.render_resolution - 0.005;
      if (this.settings.render_resolution < 0.25)
        this.settings.render_resolution = 0.25;
      if (this.settings.backrenderSSAO.enabled == true)
        this.highSettingsFPS = 1.0 + (1 - 1 / this.stats.getFPS()) * this.highSettingsFPS;
    }
    else if (this.stats.getFPS() > 58 && this.settings.render_resolution < 2.0) {
      this.settings.render_resolution = this.settings.render_resolution + 0.005;
      if (this.settings.render_resolution > 2.0)
        this.settings.render_resolution = 2.0;
    }
    else if (this.stats.getFPS() > 30 && this.settings.render_resolution < 1.0) {
      this.settings.render_resolution = this.settings.render_resolution + 0.005;
      if (this.settings.render_resolution > 1.0)
        this.settings.render_resolution = 1.0;
    }
    else if (this.stats.getFPS() > 30 && this.settings.render_resolution > 1.0) {
      this.settings.render_resolution = this.settings.render_resolution - 0.005;
    }
    if (this.stats.getFPS() > 58 && this.settings.render_resolution >= 1.95 && this.settings.backrenderSSAO.enabled == false && this.highSettingsFPS > 45)
      this.settings.backrenderSSAO.enabled = true;
    else if (this.settings.render_resolution < 1.00)
      this.settings.backrenderSSAO.enabled = false;


    if (this.settings.render_resolution != this.resINeed) {
      this.renderer.setPixelRatio(window.devicePixelRatio * this.settings.render_resolution);
      this.resINeed = this.settings.render_resolution;
    }
  }

  updateShaders() {
    if (this.stats.getFPS() < 30 && this.settings.render_resolution > 0.25) {
      this.settings.effectFXAA.enabled = false;
      this.settings.backrenderSSAO.enabled = false;
    } else if (this.stats.getFPS() > 50 && this.settings.render_resolution >= 1.95 && this.settings.backrenderSSAO.enabled == false && this.highSettingsFPS > 45) {
      this.settings.backrenderSSAO.enabled = true;
      this.settings.effectFXAA.enabled = true;
    }
  }

  /** Initialize Mouse Control */
  initControls() {
    let controls = new TrackballControls(this.camera, this.renderer.domElement);
    controls.rotateSpeed = 2.0;
    controls.zoomSpeed = 1.0;
    controls.panSpeed = 2.0;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;
    return controls;
  }


  updateControls() {
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
  }

  /** Initialize Post Processing */
  initPostProcessing() {
    let height = this.container.clientHeight;
    let width = this.container.clientWidth;
    this.EffectComposerPasses = {};

    this.renderScene = new RenderPass(this.scenes.front, this.camera);
    this.renderScene.clear = false;
    this.renderScene.clearAlpha = true;
    this.renderScene.clearDepth = true;
    this.EffectComposerPasses['renderScene'] = this.renderScene;

    this.backrenderScene = new RenderPass(this.scenes.back, this.camera);
    this.EffectComposerPasses['backrenderScene'] = this.backrenderScene;

    this.backrenderSSAO = new SSAOPass(this.scenes.back, this.camera, width, height);
    this.backrenderSSAO.enabled = this.settings.backrenderSSAO.enabled;
    this.EffectComposerPasses['backrenderSSAO'] = this.backrenderSSAO;

    // this.volumeScene = new Scene();
    // this.volumeScene.background = null;
    // this.volumeRenderPass = new RenderPass(this.volumeScene, this.camera);
    this.effectFXAA = new ShaderPass(FXAAShader);
    this.effectFXAA.enabled = this.settings.effectFXAA.enabled;
    this.effectFXAA.uniforms['resolution'].value.set(1 / Math.max(width, 1440), 1 / Math.max(height, 900));
    this.EffectComposerPasses['effectFXAA'] = this.effectFXAA;

    this.bloomPass = new UnrealBloomPass(
      new Vector2(width, height),
      this.settings.bloomPass.strength,
      this.settings.bloomPass.radius,
      this.settings.bloomPass.threshold
    );
    this.bloomPass.enabled = this.settings.bloomPass.enabled;
    this.EffectComposerPasses['bloomPass'] = this.bloomPass;
    this.bloomPass.renderToScreen = true;//

    this.effectCopy = new ShaderPass(CopyShader);
    this.effectCopy.renderToScreen = true;
    // this.toneMappingPass = new AdaptiveToneMappingPass(true, nextPow2(width));
    // this.toneMappingPass.setMinLuminance(1. - this.settings.toneMappingPass.brightness);

    // this.renderer.gammaInput = true;
    // this.renderer.gammaOutput = true;
    this.renderer.outputEncoding = GammaEncoding;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(this.backrenderScene);
    this.composer.addPass(this.backrenderSSAO);
    this.composer.addPass(this.renderScene);
    this.composer.addPass(this.effectFXAA);
    // this.composer.addPass(this.toneMappingPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass( this.effectCopy );
    // // this.composer.addPass(this.volumeRenderPass);
    this.composer.setSize(
      width * window.devicePixelRatio,
      height * window.devicePixelRatio
    );
  }

  /** Initialize Scene */
  initScenes() {
    let scenes = {
      front: new Scene(),
      back: new Scene()
    };

    scenes.front.background = null;
    scenes.front.add(this.camera);

    scenes.back.background = new Color(0x030305);
    scenes.back.add(this.camera);

    scenes.front.add(this.groups.front);
    scenes.back.add(this.groups.back);
    return scenes;
  }

  /** Initialize Look Up Table(Lut) for Color */
  initLut() {
    this.maxColorNum = this._metadata.maxColorNum;
    let lut = new Lut(this._metadata.colormap, this.maxColorNum);
    lut.setMin(0);
    lut.setMax(1);
    return lut;
  }

  /** Initialize FFBOLightsHelper */
  initLights() {
    let lightsHelper = new FFBOLightsHelper(this.camera, this.controls, this.scenes.front);

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
      position: new Vector3(0, 5000, 0),
      key: 'frontDirectional_1'
    });

    lightsHelper.addDirectionalLight({
      intensity: 0.55,
      position: new Vector3(0, 5000, 0),
      scene: this.scenes.back,
      key: 'backDirectional_1'
    });

    lightsHelper.addDirectionalLight({
      intensity: 0.1,
      position: new Vector3(0, -5000, 0),
      key: 'frontDirectional_2'
    });

    lightsHelper.addDirectionalLight({
      intensity: 0.55,
      position: new Vector3(0, -5000, 0),
      scene: this.scenes.back,
      key: 'backDirectional_2'
    });

    lightsHelper.addSpotLight({
      posAngle1: 0,
      posAngle2: 0,
      intensity: 2.0,
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
      posAngle1: 0,
      posAngle2: 0,
      intensity: 0.0,
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
  }


  /** 
   * Initialize LoadingManager
   * https://threejs.org/docs/#api/en/loaders/managers/LoadingManager
  */
  initLoadingManager() {
    let loadingManager = new LoadingManager();
    loadingManager.onLoad = () => {
      this.controls.target0.x = 0.5 * (this.boundingBox.minX + this.boundingBox.maxX);
      this.controls.target0.y = 0.5 * (this.boundingBox.minY + this.boundingBox.maxY);
      // this.controls.reset();
      this.groups.front.visible = true;
    };
    return loadingManager;
  }

  /** 
   * Update selected object 
   * @param {string} id uid of selected object
   */
  select(id) {
    this.uiVars.selected = id;
  }

  /** 
   * Reset workspace 
   * 
   * @param {boolean=} resetBackground whether to reset background
   */
  reset(resetBackground = false) {
    for (let key of Object.keys(this.meshDict)) {
      if (!resetBackground && this.meshDict[key].background) {
        continue;
      }
      if (this.meshDict[key]['pinned']) {
        this.meshDict[key]['pinned'] = false;
      }
      let meshobj = this.meshDict[key].object;
      for (let i = 0; i < meshobj.children.length; i++) {
        meshobj.children[i].geometry.dispose();
        meshobj.children[i].material.dispose();
      }
      --this.uiVars.meshNum;
      if (this.meshDict[key].background) {
        this.groups.back.remove(meshobj);
      } else {
        this.groups.front.remove(meshobj);
      }
      meshobj = null;
      delete this.meshDict[key];
    }
    this.uiVars.frontNum = 0;
    this.states.highlight = false;
    if (resetBackground) {
      this.controls.target0.set(0, 0, 0);
      this.boundingBox = { 'maxY': -100000, 'minY': 100000, 'maxX': -100000, 'minX': 100000, 'maxZ': -100000, 'minZ': 100000 };
    }
  }

  addContainerEventListener() {
    let func_0 = this.onDocumentMouseClick.bind(this);
    this.container.addEventListener('click', func_0, false);
    this._containerEventListener['click'] = func_0;

    let func_1 = this.onDocumentMouseDBLClick.bind(this);
    this.container.addEventListener('dblclick', func_1, false);
    this._containerEventListener['dblclick'] = func_1;

    if (isOnMobile) {
      let func_2 = this.onDocumentMouseDBLClickMobile.bind(this);
      this.container.addEventListener('taphold', func_2);
      document.body.addEventListener('contextmenu', this.blockContextMenu);
      this._containerEventListener['taphold'] = func_2;
    }
    let func_4 = this.onDocumentMouseEnter.bind(this);
    this.container.addEventListener('mouseenter', func_4, false);
    this._containerEventListener['mouseenter'] = func_4;
    let func_5 = this.onDocumentMouseMove.bind(this);
    this.container.addEventListener('mousemove', func_5, false);
    this._containerEventListener['mousemove'] = func_5;
    let func_6 = this.onDocumentMouseLeave.bind(this);
    this.container.addEventListener('mouseleave', func_6, false);
    this._containerEventListener['mouseleave'] = func_6;
    let func_7 = this.onDocumentDrop.bind(this);
    this.container.addEventListener('drop', func_7, false); // drop file load swc
    this._containerEventListener['drop'] = func_7;
    let func_8 = this.blockDragEvents.bind(this);
    this.container.addEventListener('dragover', func_8, false); // drop file load swc
    this._containerEventListener['dragover'] = func_8;
    let func_9 = this.blockDragEvents.bind(this);
    this.container.addEventListener('dragenter', func_9, false); // drop file load swc
    this._containerEventListener['dragenter'] = func_9;
    let func_10 = this.onWindowResize.bind(this);
    this.container.addEventListener('resize', func_10, false);
    this._containerEventListener['resize'] = func_10;
  }

  removeContainerEventListener() {
    for (let [evtName, func] of Object.entries(this._containerEventListener)) {
      this.container.removeEventListener(evtName, func, false);
    }
    document.body.removeEventListener('contextmenu', this.blockContextMenu);
  }

  /**
   * Dispose everything and release memory
   */
  dispose() {
    this.reset(true);
    this.render();
    cancelAnimationFrame(this._animationId);

    // dispose control panel
    this.disposeControlPanel();
    this.controlPanel.domElement.remove();
    delete this.controlPanel;

    // remove listener
    this.removeContainerEventListener();

    // delete scenes
    // this.scenes.front.dispose();
    // this.scenes.back.dispose();
    delete this.scenes.front;
    delete this.scenes.back;
    delete this.scenes;
    // this.scenes = null;

    delete this.groups.front;
    // this.groups.front = null;
    delete this.groups.back;
    // this.groups.back = null;
    delete this.groups;
    // this.groups = null;


    this.controls.dispose();
    delete this.controls;
    // this.controls = null;
    delete this.lightsHelper;
    // this.lightsHelper = null;
    delete this.backrenderScene;
    // this.backrenderScene = null;

    // dispose post processors
    this.backrenderSSAO.dispose();
    delete this.backrenderSSAO;
    // this.backrenderSSAO = null;
    delete this.renderScene;
    // this.renderScene = null;
    delete this.effectFXAA;
    // this.effectFXAA = null;
    // this.toneMappingPass.dispose();
    // delete this.toneMappingPass;
    // this.toneMappingPass = null;
    this.bloomPass.dispose();
    delete this.bloomPass;
    // this.bloomPass = null;
    delete this.composer;
    // this.composer = null;

    delete this.loadingManager;

    // dispose color
    delete this.lut;
    // this.lut = null;

    //dispose camera &
    delete this.camera;
    // this.camera = null;


    delete this.raycaster;
    // this.raycaster = null;

    delete this.domRect;
    // this.domRect = null

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
    delete this.meshDict;
    // this.meshDict = null;
    delete this.settings;
    // this.settings = null;
    delete this.uiVars;
    // this.uiVars = null;    
    delete this.dispatch;
    // this.dispatch = null;
    delete this.commandDispatcher;
    // this.commandDispatcher = null;
    delete this.callbackRegistry;
    // this.callbackRegistry = null;

    // remove divs
    this.removeDivs();
  }

  /**
   * 
   * @param {object} json 
   */
  execCommand(json) {
    let neuList = json['neurons'] || [];
    let commandList = json['commands'] || [];
    let args = json['args'] || undefined;

    neuList = this.asarray(neuList);
    commandList = this.asarray(commandList);
    for (let i = 0; i < commandList.length; ++i) {
      let c = commandList[i].toLowerCase();
      this.commandDispatcher[c].call(this, neuList, args);
    }
  }

  /**
   * Add Object to workspace as JSON
   * @param {object} json 
   */
  addJson(json) {
    return new Promise((resolve) => {
      if ((json === undefined) || !("ffbo_json" in json)) {
        console.error(`[Neu3D] cannot addJson, ffbo_json is not undefined, ${json}`);
        return;
      }

      /* Set Metadata */
      let metadata = {
        "type": undefined,
        "visibility": true,
        "colormap": this._metadata.colormap,
        "colororder": "random",
        "showAfterLoadAll": false,
        "radius_scale": 1.,
      };
      for (let key in metadata) {
        if ((key in json) && (json[key] !== undefined)) {
          metadata[key] = json[key];
        }
      }

      /* Reset */
      if (('reset' in json) && json.reset) {
        this.reset();
      }

      /* set colormap */
      let ridList = Object.keys(json.ffbo_json);
      let colorNum, id2float, lut;
      if (metadata.colororder === "order") {
        colorNum = ridList.length;
        id2float = function (i) { return i / colorNum; };
      } else {
        colorNum = this.maxColorNum;
        id2float = function (i) { return getRandomIntInclusive(1, colorNum) / colorNum; };
      }
      if (metadata.colororder === "order" && (colorNum !== this.maxColorNum || metadata.colormap !== "rainbow")) {
        colorNum = ridList.length;
        lut = new Lut(metadata.colormap, colorNum);
        lut.setMin(0);
        lut.setMax(1);
      } else {
        lut = this.lut;
      }

      /* Optionally delay showing till after everything is loaded  */
      if (metadata.showAfterLoadAll) {
        this.groups.front.visible = false;
      }

      /* Add objects into meshDict */
      for (const [i, [key, mesh]] of Object.entries(json.ffbo_json).entries()){

        // settings? not sure when this is used and what it is for
        if (key === 'set') {
          console.debug(`[Neu3D] New setting configuration found.`);
          let _this = this;
          Object.keys(json.ffbo_json[key]).forEach(function (setkey) {
            _this.settings[setkey] = json.ffbo_json[key][setkey];
          });
          continue;
        }

        // check if already exists
        if (key in this.meshDict) {
          console.warn(`[Neu3D] mesh already exists, skipped.`);
          continue;
        }

        // create propMan proxy of mesh if mesh is not already a propMan proxy
        let unit;
        if (mesh.hasOwnProperty('_PropMan')) {
          unit = mesh;
        } else {
          unit = new PropertyManager(mesh);
        }

        // set default values of unit

        unit.boundingBox = Object.assign({}, this.defaultBoundingBox);
        setAttrIfNotDefined(unit, 'background', 
          (unit.hasOwnProperty('class') && unit.class == 'Neuropil')
        );
        setAttrIfNotDefined(unit, 'uname', 
          getAttr(unit, 'uname', getAttr(unit, 'name', key))
        );
        setAttrIfNotDefined(unit, 'name', getAttr(unit, 'uname', key));
        setAttrIfNotDefined(unit, 'label', unit.uname);
        setAttrIfNotDefined(unit, 'highlight', (unit.background) ? false: true);
        if (unit.background) {
          setAttrIfNotDefined(unit, 'opacity', this.settings.backgroundOpacity);
        } else {
          setAttrIfNotDefined(unit, 'opacity', this.settings.defaultOpacity);
        }
        setAttrIfNotDefined(unit, 'visibility', true);
        setAttrIfNotDefined(unit, 'color', 
          (unit.background) ? this.settings.backgroundColor :  lut.getColor(id2float(i))
        );
        setAttrIfNotDefined(unit, 'radius_scale', 1.);
        setAttrIfNotDefined(unit, 'x_shift', 0.);
        setAttrIfNotDefined(unit, 'y_shift', 0.);
        setAttrIfNotDefined(unit, 'z_shift', 0.);
        setAttrIfNotDefined(unit, 'x_scale', 1.);
        setAttrIfNotDefined(unit, 'y_scale', 1.);
        setAttrIfNotDefined(unit, 'z_scale', 1.);
        setAttrIfNotDefined(unit, 'xy_rot', 0.);
        setAttrIfNotDefined(unit, 'yz_rot', 0.);

        // set unit color, this may not be used
        if (Array.isArray(unit.color)) {
          unit.color = new Color(...unit.color);
        }
        /* load mesh */
        if (metadata.type === "morphology_json") {
          if (unit.hasOwnProperty('morph_type') && unit.morph_type === 'mesh'){
            this.loadMeshCallBack(key, unit, metadata.visibility).bind(this)();
          } else {
            this.loadMorphJSONCallBack(key, unit, metadata.visibility).bind(this)();
          }
        } else if (metadata.type === "obj") {
          this.loadObjCallBack(key, unit, metadata.visibility).bind(this)();
        } else if (('dataStr' in unit) && ('filename' in unit)) {
          console.warn(`[Neu3D] mesh object ${key} has both dataStr and filename, should only have one. Skipped`);
          continue;
        } else if ('filename' in unit) {
          unit['filetype'] = unit.filename.split('.').pop();
          let loader = new FileLoader(this.loadingManager);
          if (unit['filetype'] == "json") {
            loader.load(unit.filename, this.loadMeshCallBack(key, unit, metadata.visibility).bind(this));
          } else if (unit['filetype'] == "swc") {
            unit['class'] = 'Neuron';
            unit['morph_type'] = 'swc'
            loader.load(unit.filename, this.loadNeuronSkeletonCallBack(key, unit, metadata.visibility).bind(this));
          } else if (unit['filetype'] == "syn") {
            unit['class'] = 'Synapse';
            unit['morph_type'] = 'swc'
            loader.load(unit.filename, this.loadSynapsesCallBack(key, unit, metadata.visibility).bind(this));
          }else {
            console.warn(`[Neu3D] mesh object ${key} has unrecognized data format, skipped`);
            continue;
          }
        } else if ('dataStr' in unit) {
          if (unit['filetype'] == "json") {
            this.loadMeshCallBack(key, unit, metadata.visibility).bind(this)(unit['dataStr']);
          } else if (unit['filetype'] == "swc") {
            unit['class'] = 'Neuron';
            unit['morph_type'] = 'swc'
            this.loadNeuronSkeletonCallBack(key, unit, metadata.visibility).bind(this)(unit['dataStr']);
          } else if (unit['filetype'] == "syn") {
            unit['class'] = 'Synapse';
            unit['morph_type'] = 'swc'
            this.loadSynapsesCallBack(key, unit, metadata.visibility).bind(this)(unit['dataStr']);
          } else {
            console.warn(`[Neu3D] mesh object ${key} has unrecognized data format, skipped`);
            continue;
          }
        } else {
          console.warn(`[Neu3D] mesh object ${key} has neither dataStr nor filename, skipped`);
          continue;
        }
      }
      resolve();
    });
  }

  /**
   * Compute Visible Bounding Box of all objects.
   * @param {boolean=} includeBackground 
   */
  computeVisibleBoundingBox(includeBackground = false) {
    this.visibleBoundingBox = Object.assign({}, this.defaultBoundingBox);
    let updated = false;
    for (let key in this.meshDict) {
      if (this.meshDict[key].background)
        continue;
      if (this.meshDict[key].visibility) {
        updated = true;
        if (this.meshDict[key].boundingBox.minX < this.visibleBoundingBox.minX)
          this.visibleBoundingBox.minX = this.meshDict[key].boundingBox.minX;
        if (this.meshDict[key].boundingBox.maxX > this.visibleBoundingBox.maxX)
          this.visibleBoundingBox.maxX = this.meshDict[key].boundingBox.maxX;
        if (this.meshDict[key].boundingBox.minY < this.visibleBoundingBox.minY)
          this.visibleBoundingBox.minY = this.meshDict[key].boundingBox.minY;
        if (this.meshDict[key].boundingBox.maxY > this.visibleBoundingBox.maxY)
          this.visibleBoundingBox.maxY = this.meshDict[key].boundingBox.maxY;
        if (this.meshDict[key].boundingBox.maxZ < this.visibleBoundingBox.minZ)
          this.visibleBoundingBox.minZ = this.meshDict[key].boundingBox.minZ;
        if (this.meshDict[key].boundingBox.maxZ > this.visibleBoundingBox.maxZ)
          this.visibleBoundingBox.maxZ = this.meshDict[key].boundingBox.maxZ;
      }
    }
    if (!updated)
      Object.assign(this.visibleBoundingBox, this.boundingBox);
  }

  /**
   * Update Bounding Box of Object
   * @param {*} obj 
   * @param {*} x 
   * @param {*} y 
   * @param {*} z 
   */
  updateObjectBoundingBox(obj, x, y, z) {
    if (x < obj.boundingBox.minX)
      obj.boundingBox.minX = x;
    if (x > obj.boundingBox.maxX)
      obj.boundingBox.maxX = x;
    if (y < obj.boundingBox.minY)
      obj.boundingBox.minY = y;
    if (y > obj.boundingBox.maxY)
      obj.boundingBox.maxY = y;
    if (z < obj.boundingBox.minZ)
      obj.boundingBox.minZ = z;
    if (z > obj.boundingBox.maxZ)
      obj.boundingBox.maxZ = z;
  }

  /** TODO: Add comment
   * @param {*} x 
   * @param {*} y 
   * @param {*} z 
   */
  updateBoundingBox(x, y, z) {
    this.updateObjectBoundingBox(this, x, y, z)
  }

  animate() {
    if (this.stats) {
      this.stats.begin();
    }
    this.controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
    if (this.states.mouseOver && this.dispatch.syncControls) {
      this.dispatch.syncControls(this);
      if (options['adaptive']) {
        this.updateResolution();
        this.updateShaders();
        /*
        if(this.frameCounter < 3){
          this.frameCounter++;
        }else{
          this.updateResolution();
          this.updateShaders();
          this.frameCounter = 0;
        }
        */

      }
    }
    if ((this.activeRender && this.powerSaving) || (!(this.powerSaving))) {
      this.render();
    }
    if (this.stats) {
      this.stats.end();
    }
    this._animationId = requestAnimationFrame(this.animate.bind(this));
  }



  /**
   * Load swc files on drop
   * @param {DragEvent} event
   */
  onDocumentDrop(event) {
    event.preventDefault();

    let ffbomesh = this;
    for (let i = 0; i < event.dataTransfer.files.length; i++) {
      const file = event.dataTransfer.files.item(i);
      const name = file.name.split('.')[0];
      let isSWC = false;
      if (file.name.match('.+(\.swc)$')) {
        isSWC = true;
      }
      let reader = new FileReader();
      reader.onload = (evt) => {
        let json = {};
        json[name] = {
          label: name,
          dataStr: evt.target.result,
          filetype: 'swc'
        };
        if (isSWC === true) {
          ffbomesh.addJson({ ffbo_json: json });
        } else {
          ffbomesh.addJson({ ffbo_json: json, type: 'obj' });
        }
      };
      reader.readAsText(file);
    }
  }

  /**
   * Mouse Click Event
   * @param {*} event 
   */
  onDocumentMouseClick(event) {
    if (event !== undefined) {
      event.preventDefault();
    }

    let intersected = this.getIntersection([this.groups.front]);
    if (intersected != undefined && intersected['highlight']) {
      this.select(intersected.rid);
    }
  }

  blockDragEvents(event) {
    event.preventDefault();
    event.stopPropagation()
  }

  blockContextMenu() {
    return false;
  }



  /**
   * Double Click callback
   * @param {*} event 
   */
  onDocumentMouseDBLClick(event) {
    if (event !== undefined) {
      event.preventDefault();
    }
    let intersected = this.getIntersection([this.groups.front]);
    if (intersected != undefined) {
      if (!intersected['highlight']) {
        return;
      }
      this.togglePin(intersected);
    }
  }


  /**
   * Double Click Mobile
   * @param {*} event 
   */
  onDocumentMouseDBLClickMobile(event) {
    if (event !== undefined) {
      event.preventDefault();
    }
    let intersected = this.getIntersection([this.groups.front]);
    if (intersected != undefined) {
      if (!intersected['highlight']) {
        return;
      }
      this.togglePin(intersected);
    }
  }

  /** TODO: Add Comment
   * 
   * @param {*} event 
   */
  onDocumentMouseMove(event) {
    event.preventDefault();
    this.states.mouseOver = true;
    let rect = this.container.getBoundingClientRect();
    this.uiVars.toolTipPosition.x = event.clientX;
    this.uiVars.toolTipPosition.y = event.clientY;
    this.uiVars.cursorPosition.x = ((event.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
    this.uiVars.cursorPosition.y = -((event.clientY - rect.top) / this.container.clientHeight) * 2 + 1;
  }

  /**TODO: Add comment
   * 
   * @param {*} event 
   */
  onDocumentMouseEnter(event) {
    event.preventDefault();
    this.states.mouseOver = true;
    this.activeRender = true;
  }

  /**TODO: Add comment
   * 
   * @param {*} event 
   */
  onDocumentMouseLeave(event) {
    event.preventDefault();
    this.states.mouseOver = false;
    this.highlight(undefined);
    this.activeRender = false;
  }


  /**
   * Response to window resize 
   */
  onWindowResize() {
    let height = this.container.clientHeight;
    let width = this.container.clientWidth;
    let aspect = width / height;
    let cam_dir = new Vector3();
    cam_dir.subVectors(this.camera.position, this.controls.target);
    let prevDist = cam_dir.length();
    cam_dir.normalize();
    let hspan = prevDist * 2 * Math.tan(this.prevhfov / 2);

    this.prevhfov = 2 * Math.atan(Math.tan(Math.PI * this.fov / 2 / 180) * aspect);

    let dist = hspan / 2 / Math.tan(this.prevhfov / 2);
    this.camera.position.copy(this.controls.target);
    this.camera.position.addScaledVector(cam_dir, dist);

    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width * window.devicePixelRatio,
      height * window.devicePixelRatio);
    this.effectFXAA.uniforms['resolution'].value.set(1 / Math.max(width, 1440), 1 / Math.max(height, 900));
    this.controls.handleResize();
    this.render();
    if (this.dispatch['resize'] !== undefined) {
      this.dispatch['resize']();
    }
  }


  /**
   * Render 
   */
  render() {
    if (this.states.highlight) {
      // do nothing
    } else {
      if (this.settings.meshOscAmp && this.settings.meshOscAmp > 0) {
        for (let key in this.meshDict) {
          if (this.meshDict[key].object !== undefined) {
            let x = new Date().getTime();
            if (this.meshDict[key]['background']) {
              let obj = this.meshDict[key].object.children;
              if (this.meshDict[key]['opacity'] >= 0.00) {
                obj[0].material.opacity = this.meshDict[key]['opacity'] * (this.settings.backgroundOpacity + 0.5 * this.settings.meshOscAmp * (1 + Math.sin(x * .0005)));
              } else {
                obj[0].material.opacity = this.settings.backgroundOpacity + 0.5 * this.settings.meshOscAmp * (1 + Math.sin(x * .0005));
                obj[1].material.opacity = this.settings.backgroundWireframeOpacity;
              }


              obj[0].material.opacity = this.settings.backgroundOpacity + 0.5 * this.settings.meshOscAmp * (1 + Math.sin(x * .0005));
              obj[1].material.opacity = this.settings.backgroundWireframeOpacity;
            } else {
              //TODO: check what this else loop does
            }
          }
        }
      }
    }

    /*
    * show label of mesh object when it intersects with cursor
    */
    if (this.states.mouseOver) {
      let intersected = this.getIntersection([this.groups.front, this.groups.back]);
      if (this.uiVars.currentIntersected || intersected) {
        this.uiVars.currentIntersected = intersected;
        this.highlight(intersected);
      }
    }

    this.composer.render();
    if (this._take_screenshot) {
      this.renderer.domElement.toBlob(function (b) {
        _saveImage(b, "ffbo_screenshot.png")
      })
      this._take_screenshot = false;
    }
  }

  /**
   * Raycaster intersection groups
   * @param {Array<object>} groups 
   */
  getIntersection(groups) {
    if (groups === undefined) {
      return undefined;
    }
    let val = undefined;
    let object = undefined;
    this.raycaster.setFromCamera(this.uiVars.cursorPosition, this.camera);
    var b = false;
    for (const group of groups) {
      let intersects = this.raycaster.intersectObjects(group.children, true);
      if (intersects.length > 0) {
        object = intersects[0].object.parent;
        if (object.hasOwnProperty('rid') && object.rid in this.meshDict) {
          val = this.meshDict[object.rid];
          break;
        }
      }
    }
    return val;
  }

  /** Show front neurons */
  showFrontAll() {
    for (let val of this.groups.front.children) {
      this.meshDict[val.rid].visibility = true;
    }
  }

  /** hide front neurons */
  hideFrontAll() {
    for (let val of this.groups.front.children) {
      this.meshDict[val.rid].visibility = false;
    }
  }

  /** Show back neurons */
  showBackAll() {
    for (let val of this.groups.back.children) {
      this.meshDict[val.rid].visibility = true;
    }
  }

  /** Hide front neurons */
  hideBackAll() {
    for (let val of this.groups.back.children) {
      this.meshDict[val.rid].visibility = false;
    }
  }

  /** Show all neurons */
  showAll() {
    for (let key in this.meshDict) {
      this.meshDict[key].visibility = true;
    }
  }

  /** Hide all neurons */
  hideAll() {
    for (let key in this.meshDict) {
      if (!this.meshDict[key]['pinned']) {
        this.meshDict[key].visibility = false;
      }
    }
  }

  /** export settings */
  export_settings() {
    let backgroundColor = [0.15, 0.01, 0.15];
    if (this.groups.back.children.length) {
      backgroundColor = this.groups.back.children[0].children[0].material.color.toArray();
    }
    if (this.settings.backgroundColor !== undefined) {
      backgroundColor = this.settings.backgroundColor;
    }
    let set = Object.assign({}, this.settings, {
      lightsHelper: this.lightsHelper.export(),
      postProcessing: {
        fxaa: this.settings.effectFXAA.enabled,
        ssao: this.settings.backrenderSSAO.enabled,
        // toneMappingMinLum: 1 - this.settings.toneMappingPass.brightness,
        bloom: this.settings.bloomPass.enabled,
        bloomRadius: this.settings.bloomPass.radius,
        bloomThreshold: this.settings.bloomPass.threshold,
        bloomStrength: this.settings.bloomPass.strength
      },
      backgroundColor: backgroundColor
    });
    delete set.effectFXAA;
    delete set.backrenderSSAO;
    // delete set.toneMappingPass;
    delete set.bloomPass;
    return set;
  }

  /**
   * show individual object
   * @param {string} id 
   */
  show(id) {
    id = this.asarray(id);
    for (let i = 0; i < id.length; ++i) {
      if (!(id[i] in this.meshDict)) {
        continue;
      }
      this.meshDict[id[i]].visibility = true;
    }
  }

  /**
   * Hide individual object
   * @param {string} id
   */
  hide(id) {
    id = this.asarray(id);
    for (let i = 0; i < id.length; ++i) {
      if (!(id[i] in this.meshDict)) {
        continue;
      }
      this.meshDict[id[i]].visibility = false;
    }
  }

  /**
   * callback for when mesh is added
   * @param {event} e 
   */
  onAddMesh(e) {
    if (!e.value['background']) {
      if (e.value['class'] === 'Neuron')
        ++this.uiVars.frontNum;
      this.groups.front.add(e.value.object);
    }
    else {
      this.groups.back.add(e.value.object);
      ++this.uiVars.backNum;
    }
    ++this.uiVars.meshNum;
    this._labelToRid[e.value.label] = e.prop;
  }

  /**
   * callback when mesh is removed
   * 
   * Dispose objects, decrement counters
   * @param {event} e 
   */
  onRemoveMesh(e) {
    if (this.states.highlight == e.prop)
      this.states.highlight = false;
    if (e.value['pinned'])
      e.value['pinned'] = false;
    let meshobj = e.value.object;
    for (let j = 0; j < meshobj.children.length; ++j) {
      meshobj.children[j].geometry.dispose();
      meshobj.children[j].material.dispose();
    }
    if (!e.value['background']) {
      if (e.value['class'] === 'Neuron')
        --this.uiVars.frontNum;
      this.groups.front.remove(meshobj);
    }
    else {
      this.groups.back.remove(meshobj);
      --this.uiVars.backNum;
    }
    --this.uiVars.meshNum;
    meshobj = null;
    delete this._labelToRid[e.value.label];
  }

  /** TODO: Add Comment
   * 
   * @param {*} key 
   */
  toggleVis(key) {
    if (key in this.meshDict)
      this.meshDict[key].visibility = !this.meshDict[key].visibility;
  }

  /** Change visibility of the neuron
   * 
   * @param {*} key 
   */
  onUpdateVisibility(key) {
    this.meshDict[key]['object'].visible = this.meshDict[key].visibility;
  }

  /** Highlight a  neuron
   * 
   * @param {*} d 
   * @param {*} updatePos 
   */
  highlight(d, updatePos) {
    if (d === undefined || d === false) {
      this.states.highlight = false;
      this.hide3dToolTip();
      return;
    }

    if (typeof (d) === 'string' && (d in this.meshDict)) {
      d = this.meshDict[d];
    }

    if ((d['highlight']) !== false) {
      this.states.highlight = d['rid'];
    } else {
      this.states.highlight = false;
    }

    if (updatePos !== undefined && updatePos === true) {
      let pos = this.getNeuronScreenPosition(d['rid']);
      this.uiVars.toolTipPosition.x = pos.x;
      this.uiVars.toolTipPosition.y = pos.y;
    }
    this.show3dToolTip(d['label']);
  }

  /** TODO: Add Comment
   * 
   * @param {event} e 
   */
  onUpdateHighlight(e) {
    if (e.old_value) {
      this.meshDict[e.old_value]['object']['visible'] = this.meshDict[e.old_value]['visibility'];
    }
    if (e.value === false) {
      this.renderer.domElement.style.cursor = "auto";
    } else {
      this.renderer.domElement.style.cursor = "pointer";
      this.meshDict[e.value]['object']['visible'] = true;
    }
  }

  /** TODO: Add Comment
   * 
   * @param {*} e 
   */
  updateOpacity(e) {
    if (e.prop == 'highlight' && this.states.highlight) {
      let list = ((e !== undefined) && e.old_value) ? [e.old_value] : Object.keys(this.meshDict);
      for (const key of list) {
        let val = this.meshDict[key];
        let opacity = val['highlight'] ? this.settings.lowOpacity : this.settings.nonHighlightableOpacity;
        
        let depthTest = true;
        if (val['pinned']) {
          opacity = this.settings.pinOpacity;
          depthTest = true;
        }
        for (var i in val.object.children) {
          val.object.children[i].material.opacity = opacity;
          val.object.children[i].material.depthTest = depthTest;
        }
      }
      let val = this.meshDict[this.states.highlight];
      for (let i in val.object.children) {
        val.object.children[i].material.opacity = this.settings.highlightedObjectOpacity;
        val.object.children[i].material.depthTest = false;
      }
    } else if (this.states.highlight) {
      return;
      // Either entering pinned mode or pinned mode settings changing
    } else if ((e.prop == 'highlight' && this.states.pinned) ||
      (e.prop == 'pinned' && e.value && this.uiVars.pinnedObjects.size == 1) ||
      (( (e.prop == 'pinLowOpacity') || (e.prop == 'pinOpacity')) && this.states.pinned))  {
      for (const key of Object.keys(this.meshDict)) {
        var val = this.meshDict[key];
        if (!val['background']) {
          var opacity = this.meshDict[key]['pinned'] ? this.settings.pinOpacity : this.settings.pinLowOpacity;
          var depthTest = !this.meshDict[key]['pinned'];
          for (var i in val.object.children) {
            val.object.children[i].material.opacity = opacity;
            val.object.children[i].material.depthTest = depthTest;
          }
        } else {
          val.object.children[0].material.opacity = this.settings.backgroundOpacity;
          val.object.children[1].material.opacity = this.settings.backgroundWireframeOpacity;
        }
      }
    } else if (e.prop == 'pinned' && this.states.pinned) {// New object being pinned while already in pinned mode
      for (var i in e.obj.object.children) {
        e.obj.object.children[i].material.opacity = (e.value) ? this.settings.pinOpacity : this.settings.pinLowOpacity;
        e.obj.object.children[i].material.depthTest = !e.value;
      }
    } else if (!this.states.pinned || e.prop == 'highlight') { // Default opacity value change in upinned mode or exiting highlight mode
      this.resetOpacity();
    }
  }


  /** Reset Opacity of all objects in workspace */
  resetOpacity() {
    for (const key of Object.keys(this.meshDict)) {
      if (!this.meshDict[key]['background']) {
        if (this.meshDict[key]['class'] === 'Neuron') {
          for (let i in this.meshDict[key].object.children) {
            if (this.meshDict[key]['opacity'] >= 0.) {
              this.meshDict[key].object.children[i].material.opacity = this.meshDict[key]['opacity'] * this.settings.defaultOpacity;
              this.meshDict[key].object.children[i].material.depthTest = true;
            } else {
              this.meshDict[key].object.children[i].material.opacity = this.settings.defaultOpacity;
              this.meshDict[key].object.children[i].material.depthTest = true;
            }
          }
        } else {
          for (let i in this.meshDict[key].object.children) {
            if (this.meshDict[key]['opacity'] >= 0.) {
              this.meshDict[key].object.children[i].material.opacity = this.meshDict[key]['opacity'] * this.settings.synapseOpacity;
              this.meshDict[key].object.children[i].material.depthTest = true;
            } else {
              this.meshDict[key].object.children[i].material.opacity = this.settings.synapseOpacity;
              this.meshDict[key].object.children[i].material.depthTest = true;
            }
          }
        }
      } else {
        if (this.meshDict[key]['opacity'] >= 0.) {
          this.meshDict[key].object.children[0].material.opacity = this.meshDict[key]['opacity'] * this.settings.backgroundOpacity;
          this.meshDict[key].object.children[1].material.opacity = this.meshDict[key]['opacity'] * this.settings.backgroundWireframeOpacity;
          this.meshDict[key].object.children[0].material.depthTest = true;
          this.meshDict[key].object.children[1].material.depthTest = true;
        } else {
          this.meshDict[key].object.children[0].material.opacity = this.settings.backgroundOpacity;
          this.meshDict[key].object.children[1].material.opacity = this.settings.backgroundWireframeOpacity;
          this.meshDict[key].object.children[0].material.depthTest = true;
          this.meshDict[key].object.children[1].material.depthTest = true;
        }
      }
    }
  }

  /**
   * Update linewidth
   * @param {*} e 
   */
  updateLinewidth(e) {
    for (const key of Object.keys(this.meshDict)) {
      if(this.meshDict[key]['class'] === 'Neuron'){
        for (var i in this.meshDict[key].object.children) {
          if (this.meshDict[key].object.children[i].material.type == 'LineMaterial'){
            this.meshDict[key].object.children[i].material.linewidth = e;
          }
        }
      }
    }
  }

  updateSynapseRadius(e) {
    var matrix = new Matrix4();
    var new_matrix = new Matrix4();
    var scale_vec = new Vector3();
    var overallScale;
    for (const key of Object.keys(this.meshDict)) {
      if(this.meshDict[key]['class'] === 'Synapse'){
          for (var i in this.meshDict[key].object.children) {
            if ( this.meshDict[key].object.children[i].type === 'Mesh' ){
              overallScale = this.meshDict[key].object.children[i].overallScale;
              for(var j = 0; j < this.meshDict[key].object.children[i].count; j++){
                this.meshDict[key].object.children[i].getMatrixAt(j, matrix);
                scale_vec.setFromMatrixScale(matrix);
                new_matrix.makeScale(scale_vec.x/overallScale*e, scale_vec.y/overallScale*e, scale_vec.z/overallScale*e);
                new_matrix.copyPosition(matrix);
                this.meshDict[key].object.children[i].setMatrixAt( j, new_matrix );
              }
              this.meshDict[key].object.children[i].instanceMatrix.needsUpdate=true;
              this.meshDict[key].object.children[i].overallScale = e;
            }
          }
        }
      }
   }


  /**
   * Conver to array
   * @param {any} variable 
   */
  asarray(variable) {
    if (variable.constructor !== Array) {
      variable = [variable];
    }
    return variable;
  }


  /**
   * Update Pinned objects
   * @param {*} e 
   */
  updatePinned(e) {
    if (e.obj['pinned']) {
      this.uiVars.pinnedObjects.add(e.path[0]);
    }
    else {
      this.uiVars.pinnedObjects.delete(e.path[0]);
    }
    this.states.pinned = (this.uiVars.pinnedObjects.size > 0);
  }

  /**
   * pin an object in workspace
   * @param {string} id 
   */
  pin(id) {
    id = this.asarray(id);
    for (let i = 0; i < id.length; ++i) {
      if (!(id[i] in this.meshDict) || this.meshDict[id[i]]['pinned']) {
        continue;
      }
      this.meshDict[id[i]]['pinned'] = true;
    }
  }

  /**
   * Unpin an object in workspace
   * @param {string} id
   */
  unpin(id) {
    id = this.asarray(id);
    for (let i = 0; i < id.length; ++i) {
      if (!(id[i] in this.meshDict) || !this.meshDict[id[i]]['pinned']) {
        continue;
      }
      this.meshDict[id[i]]['pinned'] = false;
    }
  }

  /**
   * Get pinned objects
   */
  getPinned() {
    return Array.from(this.uiVars.pinnedObjects);
  }

  /**
   * Get unpinned objects
   */
  getUnpinned() {
    let list = [];
    for (let key of Object.keys(this.meshDict)) {
      if (!this.meshDict[key]['background'] && !this.meshDict[key]['pinned']) {
        list.push(key);
      }
    }
    return list;
  }

  /**
   * remove object by id
   * @param {string} id 
   */
  remove(id) {
    id = this.asarray(id);
    for (let i = 0; i < id.length; ++i) {
      if (!(id[i] in this.meshDict)) {
        continue;
      }
      delete this.meshDict[id[i]];
    }
  }

  /**
   * remove upinned object by id
   * @param {string} id
   */
  removeUnpinned() {
    for (let key of Object.keys(this.meshDict)) {
      if (!this.meshDict[key]['background'] && !this.meshDict[key]['pinned'])
        delete this.meshDict[key];
    }
  }

  /**
   * Set color of given object
   * @param id 
   * @param color 
   */
  setColor(id, color) {
    id = this.asarray(id);
    color = new Color(color);
    for (let i = 0; i < id.length; ++i) {
      if (!(id[i] in this.meshDict)) {
        continue;
      }
      let meshobj = this.meshDict[id[i]].object;
      for (let j = 0; j < meshobj.children.length; ++j) {
        meshobj.children[j].material.color.set(color);
        // meshobj.children[j].geometry.colorsNeedUpdate = true;
        // for (let k = 0; k < meshobj.children[j].geometry.colors.length; ++k) {
        //   meshobj.children[j].geometry.colors[k].set(color);
        // }
      }
      this.meshDict[id[i]].color = color;
    }
  }

  /**
   * Set background color
   * @param {Array} color 
   */
  setBackgroundColor(color) {
    if (Array.isArray(color)) {
      color = new Color().fromArray(color);
    } else {
      color = new Color(color);
    }
    for (let i = 0; i < this.groups.back.children.length; ++i) {
      let meshobj = this.groups.back.children[i];
      for (let j = 0; j < meshobj.children.length; ++j) {
        meshobj.children[j].material.color.set(color);
        // meshobj.children[j].geometry.colorsNeedUpdate = true;
        // for (let k = 0; k < meshobj.children[j].geometry.colors.length; ++k) {
        //   meshobj.children[j].geometry.colors[k].set(color);
        // }
      }
    }
  }

  setSceneBackgroundColor(color) {
    this.scenes.back.background.set(color);
  }

  /**
   * Reset camera and control position
   */
  resetView() {
    this.controls.target0.x = 0.5 * (this.boundingBox.minX + this.boundingBox.maxX);
    this.controls.target0.y = 0.5 * (this.boundingBox.minY + this.boundingBox.maxY);
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
  }

  /**
   * Reset view based on visible objects
   */
  resetVisibleView() {
    this.computeVisibleBoundingBox();
    this.controls.target.x = 0.5 * (this.visibleBoundingBox.minX + this.visibleBoundingBox.maxX);
    this.controls.target.y = 0.5 * (this.visibleBoundingBox.minY + this.visibleBoundingBox.maxY);
    this.controls.target.z = 0.5 * (this.visibleBoundingBox.minZ + this.visibleBoundingBox.maxZ);
    this.camera.updateProjectionMatrix();
    setTimeout(() => {
      let positions = [
        new Vector3(this.visibleBoundingBox.minX, this.visibleBoundingBox.minY, this.visibleBoundingBox.minZ),
        new Vector3(this.visibleBoundingBox.minX, this.visibleBoundingBox.minY, this.visibleBoundingBox.maxZ),
        new Vector3(this.visibleBoundingBox.minX, this.visibleBoundingBox.maxY, this.visibleBoundingBox.minZ),
        new Vector3(this.visibleBoundingBox.minX, this.visibleBoundingBox.maxY, this.visibleBoundingBox.maxZ),
        new Vector3(this.visibleBoundingBox.maxX, this.visibleBoundingBox.minY, this.visibleBoundingBox.minZ),
        new Vector3(this.visibleBoundingBox.maxX, this.visibleBoundingBox.minY, this.visibleBoundingBox.maxZ),
        new Vector3(this.visibleBoundingBox.maxX, this.visibleBoundingBox.maxY, this.visibleBoundingBox.minZ),
        new Vector3(this.visibleBoundingBox.maxX, this.visibleBoundingBox.maxY, this.visibleBoundingBox.maxZ)
      ];
      // From https://stackoverflow.com/a/11771236
      let targetFov = 0.0;
      for (let i = 0; i < 8; i++) {
        let proj2d = positions[i].applyMatrix4(this.camera.matrixWorldInverse);
        let angle = Math.max(Math.abs(Math.atan(proj2d.x / proj2d.z) / this.camera.aspect), Math.abs(Math.atan(proj2d.y / proj2d.z)));
        targetFov = Math.max(targetFov, angle);
      }
      let currentFov = Math.PI * this.fov / 2 / 180;
      let cam_dir = new Vector3();
      cam_dir.subVectors(this.camera.position, this.controls.target);
      let prevDist = cam_dir.length();
      cam_dir.normalize();
      let dist = prevDist * Math.tan(targetFov) / Math.tan(currentFov);
      let aspect = this.camera.aspect;
      let targetHfov = 2 * Math.atan(Math.tan(targetFov / 2) * aspect);
      let currentHfov = 2 * Math.atan(Math.tan(currentFov / 2) * aspect);
      dist = Math.max(prevDist * Math.tan(targetHfov) / Math.tan(currentHfov), dist);
      this.camera.position.copy(this.controls.target);
      this.camera.position.addScaledVector(cam_dir, dist);
      this.camera.updateProjectionMatrix();
    }, 400);
  }


  /**
   * toggle pinned state
   * @param {string} d id of object
   */
  togglePin(d) {
    if (!this._metadata.allowPin) {
      return;
    }
    if (typeof (d) === 'string' && (d in this.meshDict)) {
      d = this.meshDict[d];
    }
    d['pinned'] = !d['pinned'];
  }

  /**
   * Unpin all neurons
   */
  unpinAll() {
    if (!this._metadata.allowPin) {
      return;
    }
    for (let key of this.uiVars.pinnedObjects) {
      this.meshDict[key]['pinned'] = false;
    }
  }

  /**
   * Create Tooltip
   */
  createToolTip() {
    this.toolTipDiv = document.createElement('div');
    this._addedDOMElements.push(this.toolTipDiv);
    this.toolTipDiv.style.cssText = 'position: fixed; text-align: center; width: auto; min-width: 100px; height: auto; padding: 2px; font: 12px arial; z-index: 999; background: #ccc; border: solid #212121 3px; border-radius: 8px; pointer-events: none; opacity: 0.0; color: #212121';
    this.toolTipDiv.style.transition = "opacity 0.5s";
    this.container.appendChild(this.toolTipDiv);
  }


  /**
   * Show tooltip for an object
   * @param {string} d id
   */
  show3dToolTip(d) {
    this.toolTipDiv.style.opacity = .9;
    this.toolTipDiv.innerHTML = d;
    this.domRect = this.renderer.domElement.getBoundingClientRect();
    let toolTipRect = this.toolTipDiv.getBoundingClientRect();
    let left = this.uiVars.toolTipPosition.x + 10;
    if (left + toolTipRect.width > this.domRect.right) {
      left = this.domRect.right - 10 - toolTipRect.width;
    }
    let top = this.uiVars.toolTipPosition.y + 10;
    if (top + toolTipRect.height > this.domRect.bottom) {
      top = this.uiVars.toolTipPosition.y - 10 - toolTipRect.height;
    }
    this.toolTipDiv.style.left = left + "px";
    this.toolTipDiv.style.top = top + "px";
  }

  /** Hid tooltip */
  hide3dToolTip() {
    this.toolTipDiv.style.opacity = 0.0;
  }

  /** TODO: what is this? */
  _getInfo(d) {
    return d;
  }

  /**
   * Get position of neuron on the screen
   * @param {*} id 
   */
  getNeuronScreenPosition(id) {
    let vector = this.meshDict[id].position.clone();
    let canvasRect = this.renderer.domElement.getBoundingClientRect();
    // map to normalized device coordinate (NDC) space
    vector.project(this.camera);
    // map to 2D screen space
    vector.x = Math.round((vector.x + 1) * canvasRect.width / 2) + canvasRect.left;
    vector.y = Math.round((-vector.y + 1) * canvasRect.height / 2) + canvasRect.top;
    return { 'x': vector.x, 'y': vector.y };
  }

  /**
   * Synchronize controls with another `Neu3D` object
   * @param {*} ffbomesh 
   */
  syncControls(ffbomesh) {
    if (this === ffbomesh) {
      return;
    }

    this.controls.target.copy(ffbomesh.controls.target);
    this.camera.position.copy(ffbomesh.camera.position);
    this.camera.up.copy(ffbomesh.camera.up);
    this.camera.lookAt(ffbomesh.controls.target);
  }
};