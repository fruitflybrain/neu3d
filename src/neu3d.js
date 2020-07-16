import { PropertyManager } from './propertymanager';
import { FFBOLightsHelper } from './lightshelper';

// add FontAwesome
import '@fortawesome/fontawesome-free/js/all.js';

const STATS = require('../etc/stats');
// const Detector = require("three/examples/js/WEBGL");
const THREE = require('../etc/three');


import dat from '../etc/dat.gui';
import '../style/neu3d.css';
import { datGuiPresets } from './presets.js';

var isOnMobile = checkOnMobile();

function checkOnMobile() {

  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    return true;
  else
    return false;
}

function getAttr(obj, key, val) {
  if (key in obj)
    val = obj[key];
  return val;
}

function setAttrIfNotDefined(obj, key, val) {
  if (!(key in obj))
    obj[key] = val;
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
      lowOpacity: 0.1,
      pinOpacity: 0.9,
      pinLowOpacity: 0.15,
      highlightedObjectOpacity: 1.0,
      defaultRadius: 0.5,
      defaultSomaRadius: 3.0,
      defaultSynapseRadius: 0.2,
      minRadius: 0.1,
      minSomaRadius: 1.0,
      minSynapseRadius: 0.1,
      maxRadius: 1.0,
      maxSomaRadius: 10.0,
      maxSynapseRadius: 1.,
      backgroundOpacity: 1.0,
      backgroundWireframeOpacity: 0.07,
      neuron3d: false,
      neuron3dMode: 1,
      synapseMode: true,
      meshWireframe: true,
      backgroundColor: "#260226",
      render_resolution: 1.0
    });
    this.settings.toneMappingPass = new PropertyManager({ brightness: 0.95 });
    this.settings.bloomPass = new PropertyManager({ radius: 0.2, strength: 0.2, threshold: 0.3 });
    this.settings.effectFXAA = new PropertyManager({ enabled: true });
    this.settings.backrenderSSAO = new PropertyManager({ enabled: true }); // change
    this.states = new PropertyManager({
      mouseOver: false,
      pinned: false,
      highlight: false
    });
    this.activityData = {};
    this.it1 = {};
    this.it2 = {};
    this.meshDict = new PropertyManager();
    this.uiVars = new PropertyManager({
      pinnedObjects: new Set(),
      toolTipPosition: new THREE.Vector2(),
      highlightedObjects: null,
      currentIntersected: undefined,
      cursorPosition: new THREE.Vector2(-100000, -100000),
      meshNum: 0,
      frontNum: 0,
      backNum: 0,
      tooltip: undefined,
      selected: undefined
    });
    // In case of non-unique labels, will hold the rid for the last object
    // added with that label
    this._labelToRid = {};
    // THREE.Mesh.raycast = acceleratedRaycast;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.linePrecision = 3;
    if (options['stats']) {
      this.stats = STATS.Stats();
      this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
      this.stats.dom.style.position = "relative";
      this.stats.dom.className += ' vis-3d-stats'
      this.container.appendChild(this.stats.dom);
    }
    this.camera = this.initCamera();
    this.renderer = this.initRenderer();
    this.groups = {
      front: new THREE.Group(),
      back: new THREE.Group()
    };
    this.scenes = this.initScenes();
    this.controls = this.initControls();
    this.lightsHelper = this.initLights();
    this.lut = this.initLut();
    this.loadingManager = this.initLoadingManager();
    let controlPanelDiv = document.createElement('div');
    controlPanelDiv.className = 'vis-3d-settings';

    this.controlPanel = this.initControlPanel(options['datGUI']);
    controlPanelDiv.appendChild(this.controlPanel.domElement);
    this.container.appendChild(controlPanelDiv);

    this.container.addEventListener('click', this.onDocumentMouseClick.bind(this), false);
    this.container.addEventListener('dblclick', this.onDocumentMouseDBLClick.bind(this), false);
    if (isOnMobile) {
      this.container.addEventListener('taphold', this.onDocumentMouseDBLClickMobile.bind(this));
      document.body.addEventListener('contextmenu', function () { return false; });
    }
    this.container.addEventListener('mouseenter', this.onDocumentMouseEnter.bind(this), false);
    this.container.addEventListener('mousemove', this.onDocumentMouseMove.bind(this), false);
    this.container.addEventListener('mouseleave', this.onDocumentMouseLeave.bind(this), false);
    this.container.addEventListener('drop', this.onDocumentDrop.bind(this), false); // drop file load swc
    this.container.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation() }, false); // drop file load swc
    this.container.addEventListener('dragenter', (e) => { e.preventDefault(); e.stopPropagation() }, false); // drop file load swc

    this.container.addEventListener('resize', this.onWindowResize.bind(this), false);
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
    this.on('num', () => { this.controlPanel.__controllers[0].setValue(this.uiVars.frontNum); });

    this.on('highlight', ((e) => { this.updateOpacity(e); this.onUpdateHighlight(e); }));
    this.settings.on("change", ((e) => {
      this.updateOpacity(e);
    }), [
        "pinLowOpacity", "pinOpacity", "defaultOpacity", "backgroundOpacity",
        "backgroundWireframeOpacity", "synapseOpacity",
        "highlightedObjectOpacity", "nonHighlightableOpacity", "lowOpacity"
      ]);
    this.settings.on('change', ((e) => {
      this[e.path[0]][e.prop] = e.value;
    }), ['radius', 'strength', 'threshold', 'enabled']);
    this.settings.toneMappingPass.on('change', ((e) => {
      this.toneMappingPass.setMinLuminance(1 - this.settings.toneMappingPass.brightness);
    }), 'brightness');
    this.settings.on('change', ((e) => {
      this.setBackgroundColor(e.value);
    }), 'backgroundColor');

    if (data != undefined && Object.keys(data).length > 0) {
      this.addJson(data);
    }

    this.animate();
    this._defaultSettings = this.export_settings();

    // add file input
    let ffbomesh = this;
    let fileUploadInput = document.createElement('input');
    fileUploadInput.id = "neu3d-file-upload";
    fileUploadInput.setAttribute("type", "file");
    fileUploadInput.style.visibility = 'hidden';
    fileUploadInput.style.display = 'none';
    fileUploadInput.onchange = (evt) => {
      $.each(evt.target.files, function (i, file) {
        let reader = new FileReader();
        reader.onload = $.proxy(function (file, event) {
          if (file.name.match('.+(\.swc)$')) {
            let name = file.name.split('.')[0];
            let json = {};
            json[name] = {
              label: name,
              dataStr: event.target.result,
              filetype: 'swc'
            };
            ffbomesh.addJson({ ffbo_json: json });
          }
          else {
            let name = file.name.split('.')[0];
            let json = {};
            json[name] = {
              label: name,
              dataStr: event.target.result,
              filetype: 'swc'
            };
            ffbomesh.addJson({ ffbo_json: json, type: 'obj' });
          }
        }, this, file);
        reader.readAsText(file);
      });
    }

    // this input has to be added as siblinig of vis-3d
    // becuase vis-3d blocks click event propagation.
    this.container.insertAdjacentElement('afterend', fileUploadInput);

    // <DEBUG>: this resize event is not working right now
    this.container.addEventListener('resize', () => {
      // console.log('div resize');
      this.onWindowResize();
    })
    window.onresize = this.onWindowResize.bind(this);
    var _tooltips = document.getElementsByClassName("tooltip")
    for (var l of _tooltips) {
      let element = document.createElement('SPAN');
      element.classList.add('tooltiptext');
      element.innerHTML = l.getAttribute('title');
      l.appendChild(element);
      l.removeAttribute('title');
    }
  } // ENDOF Constructor

  /**
   * Setup callback
   * @param {string} key string of callback
   * @param {function} func callback function
   */
  on(key, func) {
    if (typeof (func) !== "function") {
      console.log("not a function");
      return;
    }

    if (key in this.callbackRegistry) {
      let register = this.callbackRegistry[key];
      register(func);
    } else {
      console.log("callback keyword '" + key + "' not recognized.");
    }
  }

  /**
   * Initialize Control Panel dat.GUI
   * @param {object} options 
   */
  initControlPanel(options = {}) {
    let GUIOptions = {
      autoPlace: (options.autoPlace !== undefined) ? options.autoPlace : false,
      resizable: (options.resizable !== undefined) ? options.resizable : true,
      scrollable: (options.scrollable !== undefined) ? options.scrollable : true,
      closeOnTop: (options.closeOnTop !== undefined) ? options.closeOnTop : true,
      createButtons: (options.createButtons !== undefined) ? options.createButtons : true,
      preset: (options.preset !== undefined) ? options.preset : "Low",
      load: datGuiPresets
    };
    for (let key in options) {
      if (!(key in GUIOptions)) {
        GUIOptions[key] = options[key];
      }
    }

    let controlPanel = new dat.GUI(GUIOptions);
    controlPanel.remember(this.settings);
    controlPanel.remember(this.settings.toneMappingPass);
    controlPanel.remember(this.settings.bloomPass);
    controlPanel.remember(this.settings.effectFXAA);
    // controlPanel.remember(this.settings.backrenderSSAO);

    controlPanel.__closeButton.style.visibility = 'hidden';
    let neuronNum = controlPanel.add(this.uiVars, 'frontNum').name('Number of Neurons: ');
    neuronNum.domElement.style["pointerEvents"] = "None";
    neuronNum.domElement.parentNode.parentNode.classList.add('noneurons');
    if (GUIOptions['createButtons']) {
      function _createBtn(name, icon, iconAttrs, tooltip, func) {
        let newButton = function () {
          this[name] = func;
        };
        let btn = new newButton();
        let buttonid = controlPanel.add(btn, name).title(tooltip).icon(icon, "strip", iconAttrs);
        return buttonid;
      }

      _createBtn("uploadFile", "fa fa-upload", {}, "Upload SWC File", () => { document.getElementById('neu3d-file-upload').click(); });
      _createBtn("resetView", "fa fa-sync", { "aria-hidden": "true" }, "Reset View", () => { this.resetView() });
      _createBtn("resetVisibleView", "fa fa-align-justify", {}, "Center and zoom into visible Neurons/Synapses", () => { this.resetVisibleView() });
      _createBtn("hideAll", "fa fa-eye-slash", {}, "Hide All", () => { this.hideAll() });
      _createBtn("showAll", "fa fa-eye", {}, "Show All", () => { this.showAll() });
      _createBtn("takeScreenshot", "fa fa-camera", {}, "Download Screenshot", () => { this._take_screenshot = true; });
      _createBtn("removeUnpin", "fa fa-trash", {}, "Remove Unpinned Neurons", () => { this.removeUnpinned(); })
      _createBtn("removeUnpin", "fa fa-map-upin", {}, "Unpin All", () => { this.unpinAll(); })
      _createBtn("showSettings", "fa fa-cogs", {}, "Display Settings", () => { controlPanel.__closeButton.click(); })
    }
    // add settings
    let f_vis = controlPanel.addFolder('Settings');
    let f0 = f_vis.addFolder('Display Mode');
    f0.add(this.settings, 'neuron3d').name("Enable 3D Mode");
    f0.add(this.settings, 'neuron3dMode', [1, 2, 3]);
    f0.add(this.settings, 'synapseMode');

    let f1 = f_vis.addFolder('Visualization');
    f1.add(this.settings, 'meshWireframe').name("Display Wireframe");
    f1.addColor(this.settings, 'backgroundColor').name("Background");
    let f1_1 = f1.addFolder('Opacity');

    f1_1.add(this.settings, 'defaultOpacity', 0.0, 1.0).listen();
    f1_1.add(this.settings, 'synapseOpacity', 0.0, 1.0).listen();
    f1_1.add(this.settings, 'nonHighlightableOpacity', 0.0, 1.0).listen();
    f1_1.add(this.settings, 'lowOpacity', 0.0, 1.0).listen();
    f1_1.add(this.settings, 'pinOpacity', 0.0, 1.0).listen();
    f1_1.add(this.settings, 'pinLowOpacity', 0.0, 1.0).listen();
    f1_1.add(this.settings, 'highlightedObjectOpacity', 0.0, 1.0).listen();
    f1_1.add(this.settings, 'backgroundOpacity', 0.0, 1.0).listen();
    f1_1.add(this.settings, 'backgroundWireframeOpacity', 0.0, 1.0).listen();

    let f1_2 = f1.addFolder('Advanced');

    f1_2.add(this.settings.toneMappingPass, 'brightness').name("ToneMap Brightness");
    f1_2.add(this.settings.bloomPass, 'radius', 0.0, 10.0).name("BloomRadius");;
    f1_2.add(this.settings.bloomPass, 'strength', 0.0, 1.0).name("BloomStrength");;
    f1_2.add(this.settings.bloomPass, 'threshold', 0.0, 2.0).name("BloomThreshold");;
    f1_2.add(this.settings.effectFXAA, 'enabled').name("FXAA").listen();
    // f1_2.add(this.settings.backrenderSSAO, 'enabled').name("SSAO").listen();

    let f2 = f_vis.addFolder('Size');
    f2.add(this.settings, 'defaultRadius',
      this.settings.minRadius, this.settings.maxRadius).listen();
    f2.add(this.settings, 'defaultSomaRadius',
      this.settings.minSomaRadius, this.settings.maxSomaRadius).listen();
    f2.add(this.settings, 'defaultSynapseRadius',
      this.settings.minSynapseRadius, this.settings.maxSynapseRadius).listen();

    let ctl_minR = f2.add(this.settings, 'minRadius', 0).listen();
    ctl_minR.onChange((value) => { value = Math.min(value, this.settings.maxRadius); })
    let ctl_maxR = f2.add(this.settings, 'maxRadius', 0).listen();
    ctl_maxR.onChange((value) => { value = Math.max(value, this.settings.minRadius); })
    let ctl_minSomaR = f2.add(this.settings, 'minSomaRadius', 0).listen();
    ctl_minSomaR.onChange((value) => { value = Math.min(value, this.settings.maxSomaRadius); })
    let ctl_maxSomaR = f2.add(this.settings, 'maxSomaRadius', 0).listen();
    ctl_maxSomaR.onChange((value) => { value = Math.max(value, this.settings.minSomaRadius); })
    let ctl_minSynR = f2.add(this.settings, 'minSynapseRadius', 0).listen();
    ctl_minSynR.onChange((value) => { value = Math.min(value, this.settings.maxSynapseRadius); })
    let ctl_maxSynR = f2.add(this.settings, 'maxSynapseRadius', 0).listen();
    ctl_maxSynR.onChange((value) => { value = Math.max(value, this.settings.minSynapseRadius); })



    // let f3 = f_vis.addFolder('Animation');
    // f3.add(this.states, 'animate');
    // f3.add(this.settings, 'meshOscAmp', 0.0, 1.0);



    controlPanel.open();

    return controlPanel;
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

    let camera = new THREE.PerspectiveCamera(this.fov, width / height, 0.1, 10000000);
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
    let renderer = new THREE.WebGLRenderer({ 'logarithmicDepthBuffer': true });
    renderer.setPixelRatio(window.devicePixelRatio * this.settings.render_resolution);
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
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
      //console.log("UPDATING");
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
    let controls = new THREE.TrackballControls(this.camera, this.renderer.domElement);
    controls.rotateSpeed = 2.0;
    controls.zoomSpeed = 1.0;
    controls.panSpeed = 2.0;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;
    controls.addEventListener('change', this.render.bind(this));
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
    this.renderScene = new THREE.RenderPass(this.scenes.front, this.camera);
    this.renderScene.clear = false;
    this.renderScene.clearAlpha = true;
    this.renderScene.clearDepth = true;

    this.backrenderScene = new THREE.RenderPass(this.scenes.back, this.camera);
    this.backrenderSSAO = new THREE.SSAOPass(this.scenes.back, this.camera, width, height);
    this.backrenderSSAO.enabled = this.settings.backrenderSSAO.enabled;
    this.volumeScene = new THREE.Scene();
    this.volumeScene.background = null;
    this.volumeRenderPass = new THREE.RenderPass(this.volumeScene, this.camera);
    this.effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
    this.effectFXAA.enabled = this.settings.effectFXAA.enabled;
    this.effectFXAA.uniforms['resolution'].value.set(1 / Math.max(width, 1440), 1 / Math.max(height, 900));

    this.bloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(width, height),
      this.settings.bloomPass.strength,
      this.settings.bloomPass.radius,
      this.settings.bloomPass.threshold
    );

    this.bloomPass.renderToScreen = true;

    this.toneMappingPass = new THREE.AdaptiveToneMappingPass(true, width);
    this.toneMappingPass.setMinLuminance(1. - this.settings.toneMappingPass.brightness);

    this.renderer.gammaInput = true;
    this.renderer.gammaOutput = true;

    this.composer = new THREE.EffectComposer(this.renderer);
    this.composer.addPass(this.backrenderScene);
    // this.composer.addPass(this.backrenderSSAO);
    this.composer.addPass(this.renderScene);
    this.composer.addPass(this.effectFXAA);
    this.composer.addPass(this.toneMappingPass);

    this.composer.addPass(this.bloomPass);
    // this.composer.addPass(this.volumeRenderPass);
    this.composer.setSize(width * window.devicePixelRatio,
      height * window.devicePixelRatio);
  }

  /** Initialize Scene */
  initScenes() {
    let scenes = {
      front: new THREE.Scene(),
      back: new THREE.Scene()
    };

    scenes.front.background = null;
    scenes.front.add(this.camera);

    scenes.back.background = new THREE.Color(0x030305);
    scenes.back.add(this.camera);

    scenes.front.add(this.groups.front);
    scenes.back.add(this.groups.back);
    return scenes;
  }

  /** Initialize Look Up Table(Lut) for Color */
  initLut() {
    this.maxColorNum = this._metadata.maxColorNum;
    let lut = new THREE.Lut(this._metadata.colormap, this.maxColorNum);
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
      position: new THREE.Vector3(0, 0, 5000),
      key: 'frontDirectional_1'
    });

    lightsHelper.addDirectionalLight({
      intensity: 0.55,
      position: new THREE.Vector3(0, 0, 5000),
      scene: this.scenes.back,
      key: 'backDirectional_1'
    });

    lightsHelper.addDirectionalLight({
      intensity: 0.1,
      position: new THREE.Vector3(0, 0, -5000),
      key: 'frontDirectional_2'
    });

    lightsHelper.addDirectionalLight({
      intensity: 0.55,
      position: new THREE.Vector3(0, 0, -5000),
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
  }


  /** 
   * Initialize LoadingManager
   * https://threejs.org/docs/#api/en/loaders/managers/LoadingManager
  */
  initLoadingManager() {
    let loadingManager = new THREE.LoadingManager();
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
      this.groups.front.remove(meshobj);
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

  _configureCallbacks() {
    this.settings.on("change", (e) => {
      for (let i = 0; i < this.groups.back.children.length; i++)
        this.groups.back.children[i].children[1].visible = e["value"];
    }, "meshWireframe");
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
        console.log('mesh json is undefined');
        return;
      }
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
      if (('reset' in json) && json.reset) {
        this.reset();
      }
      /* set colormap */
      let keyList = Object.keys(json.ffbo_json);
      let colorNum, id2float, lut;

      if (metadata.colororder === "order") {
        colorNum = keyList.length;
        id2float = function (i) { return i / colorNum; };
      } else {
        colorNum = this.maxColorNum;
        id2float = function (i) { return getRandomIntInclusive(1, colorNum) / colorNum; };
      }

      if (metadata.colororder === "order" && (colorNum !== this.maxColorNum || metadata.colormap !== "rainbow")) {
        colorNum = keyList.length;
        lut = new THREE.Lut(metadata.colormap, colorNum);
        lut.setMin(0);
        lut.setMax(1);
      } else {
        lut = this.lut;
      }

      if (metadata.showAfterLoadAll) {
        this.groups.front.visible = false;
      }

      for (let i = 0; i < keyList.length; ++i) {
        let key = keyList[i];
        if (key in this.meshDict) {
          console.log('mesh object already exists... skip rendering...');
          continue;
        }
        let unit;
        if (json.ffbo_json[key]._PropMan) {
          unit = json.ffbo_json[key]
        } else {
          unit = new PropertyManager(json.ffbo_json[key]);
        }
        unit.boundingBox = Object.assign({}, this.defaultBoundingBox);
        setAttrIfNotDefined(unit, 'highlight', true);
        setAttrIfNotDefined(unit, 'opacity', -1.0); // <TODO> what does this do?
        setAttrIfNotDefined(unit, 'visibility', true);
        setAttrIfNotDefined(unit, 'background', false);
        setAttrIfNotDefined(unit, 'color', lut.getColor(id2float(i)));
        setAttrIfNotDefined(unit, 'label', getAttr(unit, 'uname', key));
        setAttrIfNotDefined(unit, 'radius_scale', 1.);
        setAttrIfNotDefined(unit, 'x_shift', 0.);
        setAttrIfNotDefined(unit, 'y_shift', 0.);
        setAttrIfNotDefined(unit, 'z_shift', 0.);
        setAttrIfNotDefined(unit, 'x_scale', 1.);
        setAttrIfNotDefined(unit, 'y_scale', 1.);
        setAttrIfNotDefined(unit, 'z_scale', 1.);
        setAttrIfNotDefined(unit, 'xy_rot', 0.);
        setAttrIfNotDefined(unit, 'yz_rot', 0.);


        if (Array.isArray(unit.color)) {
          unit.color = new THREE.Color(...unit.color);
        }
        /* read mesh */
        if (metadata.type === "morphology_json") {
          this.loadMorphJSONCallBack(key, unit, metadata.visibility).bind(this)();
        }
        else if (metadata.type === "obj") {
          this.loadObjCallBack(key, unit, metadata.visibility).bind(this)();
        }
        else if (('dataStr' in unit) && ('filename' in unit)) {
          console.log('mesh object has both data string and filename... should only have one... skip rendering');
          continue;
        }
        else if ('filename' in unit) {
          unit['filetype'] = unit.filename.split('.').pop();
          let loader = new THREE.FileLoader(this.loadingManager);
          if (unit['filetype'] == "json")
            loader.load(unit.filename, this.loadMeshCallBack(key, unit, metadata.visibility).bind(this));
          else if (unit['filetype'] == "swc")
            loader.load(unit.filename, this.loadSWCCallBack(key, unit, metadata.visibility).bind(this));
          else {
            console.log('mesh object has unrecognized data format... skip rendering');
            continue;
          }
        } else if ('dataStr' in unit) {
          if (unit['filetype'] == "json")
            this.loadMeshCallBack(key, unit, metadata.visibility).bind(this)(unit['dataStr']);
          else if (unit['filetype'] == "swc")
            this.loadSWCCallBack(key, unit, metadata.visibility).bind(this)(unit['dataStr']);
          else {
            console.log('mesh object has unrecognized data format... skip rendering');
            continue;
          }
        } else {
          console.log('mesh object has neither filename nor data string... skip rendering');
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
    if ((this.activeRender && this.powerSaving)||(!(this.powerSaving))){
      this.render();
    }
    if (this.stats) {
      this.stats.end();
    }
    requestAnimationFrame(this.animate.bind(this));
  }



  /**
   * Load swc files on drop
   * @param {DragEvent} event
   */
  onDocumentDrop(event) {
    event.preventDefault();

    let neu3D_obj = this;
    $.each(event.dataTransfer.files, function (i, file) {
      let reader = new FileReader();
      reader.onload = $.proxy(function (file, event) {
        if (file.name.match('.+(\.swc)$')) {
          let name = file.name.split('.')[0];
          let json = {};
          json[name] = {
            label: name,
            dataStr: event.target.result,
            filetype: 'swc'
          };
          neu3D_obj.addJson({ ffbo_json: json });
        }
        else {
          let name = file.name.split('.')[0];
          let json = {};
          json[name] = {
            label: name,
            dataStr: event.target.result,
            filetype: 'swc'
          };
          neu3D_obj.addJson({ ffbo_json: json, type: 'obj' });
        }
      }, this, file);
      reader.readAsText(file);
    });
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
    let cam_dir = new THREE.Vector3();
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
        toneMappingMinLum: 1 - this.settings.toneMappingPass.brightness,
        bloomRadius: this.settings.bloomPass.radius,
        bloomThreshold: this.settings.bloomPass.threshold,
        bloomStrength: this.settings.bloomPass.strength
      },
      backgroundColor: backgroundColor
    });
    delete set.effectFXAA;
    delete set.backrenderSSAO;
    delete set.toneMappingPass;
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
      if (!('morph_type' in e.value) || (e.value['morph_type'] != 'Synapse SWC'))
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
    // console.log(e);
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
      if (!('morph_type' in e.value) || (e.value['morph_type'] != 'Synapse SWC'))
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

  /** TODO: Add Comment
   * 
   * @param {*} key 
   */
  onUpdateVisibility(key) {
    this.meshDict[key]['object'].visible = this.meshDict[key].visibility;
  }

  /** TODO: Add Comment
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
          depthTest = false;
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
      (e.prop == 'pinLowOpacity') || (e.prop == 'pinOpacity')) {
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
        if (!('morph_type' in this.meshDict[key]) ||
          (this.meshDict[key]['morph_type'] != 'Synapse SWC')) {
          for (let i in this.meshDict[key].object.children) {
            if (this.meshDict[key]['opacity'] >= 0.) {
              this.meshDict[key].object.children[i].material.opacity = this.meshDict[key]['opacity'] * this.settings.defaultOpacity;
            } else {
              this.meshDict[key].object.children[i].material.opacity = this.settings.defaultOpacity;
            }
          }
        } else {
          for (let i in this.meshDict[key].object.children) {
            if (this.meshDict[key]['opacity'] >= 0.) {
              this.meshDict[key].object.children[i].material.opacity = this.meshDict[key]['opacity'] * this.settings.synapseOpacity;
            } else {
              this.meshDict[key].object.children[i].material.opacity = this.settings.synapseOpacity;
            }
          }
        }
      } else {
        if (this.meshDict[key]['opacity'] >= 0.) {
          this.meshDict[key].object.children[0].material.opacity = this.meshDict[key]['opacity'] * this.settings.backgroundOpacity;
          this.meshDict[key].object.children[1].material.opacity = this.meshDict[key]['opacity'] * this.settings.backgroundWireframeOpacity;
        } else {
          this.meshDict[key].object.children[0].material.opacity = this.settings.backgroundOpacity;
          this.meshDict[key].object.children[1].material.opacity = this.settings.backgroundWireframeOpacity;
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
    for (let i = 0; i < id.length; ++i) {
      if (!(id[i] in this.meshDict)) {
        continue;
      }
      let meshobj = this.meshDict[id[i]].object;
      for (let j = 0; j < meshobj.children.length; ++j) {
        meshobj.children[j].material.color.set(color);
        meshobj.children[j].geometry.colorsNeedUpdate = true;
        for (let k = 0; k < meshobj.children[j].geometry.colors.length; ++k) {
          meshobj.children[j].geometry.colors[k].set(color);
        }
      }
      this.meshDict[id[i]].color = new THREE.Color( (color));
    }
  }

  /**
   * Set background color
   * @param {Array} color 
   */
  setBackgroundColor(color) {
    if (Array.isArray(color)) {
      color = new THREE.Color().fromArray(color);
    }
    for (let i = 0; i < this.groups.back.children.length; ++i) {
      let meshobj = this.groups.back.children[i];
      for (let j = 0; j < meshobj.children.length; ++j) {
        meshobj.children[j].material.color.set(color);
        meshobj.children[j].geometry.colorsNeedUpdate = true;
        for (let k = 0; k < meshobj.children[j].geometry.colors.length; ++k) {
          meshobj.children[j].geometry.colors[k].set(color);
        }
      }
    }
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
        new THREE.Vector3(this.visibleBoundingBox.minX, this.visibleBoundingBox.minY, this.visibleBoundingBox.minZ),
        new THREE.Vector3(this.visibleBoundingBox.minX, this.visibleBoundingBox.minY, this.visibleBoundingBox.maxZ),
        new THREE.Vector3(this.visibleBoundingBox.minX, this.visibleBoundingBox.maxY, this.visibleBoundingBox.minZ),
        new THREE.Vector3(this.visibleBoundingBox.minX, this.visibleBoundingBox.maxY, this.visibleBoundingBox.maxZ),
        new THREE.Vector3(this.visibleBoundingBox.maxX, this.visibleBoundingBox.minY, this.visibleBoundingBox.minZ),
        new THREE.Vector3(this.visibleBoundingBox.maxX, this.visibleBoundingBox.minY, this.visibleBoundingBox.maxZ),
        new THREE.Vector3(this.visibleBoundingBox.maxX, this.visibleBoundingBox.maxY, this.visibleBoundingBox.minZ),
        new THREE.Vector3(this.visibleBoundingBox.maxX, this.visibleBoundingBox.maxY, this.visibleBoundingBox.maxZ)
      ];
      // From https://stackoverflow.com/a/11771236
      let targetFov = 0.0;
      for (let i = 0; i < 8; i++) {
        let proj2d = positions[i].applyMatrix4(this.camera.matrixWorldInverse);
        let angle = Math.max(Math.abs(Math.atan(proj2d.x / proj2d.z) / this.camera.aspect), Math.abs(Math.atan(proj2d.y / proj2d.z)));
        targetFov = Math.max(targetFov, angle);
      }
      let currentFov = Math.PI * this.fov / 2 / 180;
      let cam_dir = new THREE.Vector3();
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

var _saveImage;

window.onload = () => {
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
}
