import * as Stats from 'stats.js';
import { PropertyManager } from './propertymanager';
import { FFBOLightsHelper } from './lightshelper';

// add FontAwesome
import fontawesome from '@fortawesome/fontawesome';
import solid from '@fortawesome/fontawesome-free-solid';
import regular from '@fortawesome/fontawesome-free-regular';
fontawesome.library.add(regular);
fontawesome.library.add(solid);


const Detector = require("three/examples/js/Detector");
const THREE = require('../etc/three');

import dat from '../etc/dat.gui';
import '../style/neu3d.css';

var isOnMobile = checkOnMobile();

function checkOnMobile() {

  if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) )
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
if ( ! Detector.webgl ) Detector.addGetWebGLMessage();


/**
 * Function taken from THREE.SceneUtils
 * 
 * @param geometry 
 * @param materials 
 * 
 * ### Note
 * reason for extracting this method is that loading THREE.SceneUtils
 * always returns `module has been moved to ...` error.
 */
function createMultiMaterialObject(geometry, materials) {

      var group = new THREE.Group();

      for (var i = 0, l = materials.length; i < l; i++) {

        group.add(new THREE.Mesh(geometry, materials[i]));

      }

      return group;
}


export class Neu3D {
  /**
   * 
   * @param {HTMLDivElement} container : parent div element
   * @param {JSON | undefined } data : optionally add initalization data
   * @param {JSON | undefined } metadata : optional metadata
   * @param {Object} [options={}] : additional options 
   */
  constructor(container, data, metadata, options={}) {
    this.container = container;
    /* default metadata */
    this._metadata = {
      "colormap": "rainbow_gist",
      "maxColorNum": 1747591,
      "allowPin": true,
      "allowHighlight": true,
      "enablePositionReset": false,
      "resetPosition": { 'x': 0., 'y': 0., 'z': 0. },
      "upSign": 1.,
    };
    if (metadata !== undefined)
      for (var key in this._metadata)
        if ((key in metadata) && (metadata[key] !== undefined))
          this._metadata[key] = metadata[key];
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
      backgroundOpacity: 1.0,
      backgroundWireframeOpacity: 0.07,
      neuron3d: false,
      neuron3dMode: 1,
      synapseMode: true,
      meshWireframe: true,
      backgroundColor: "#260226"
    });
    this.settings.toneMappingPass = new PropertyManager({ brightness: 0.95 });
    this.settings.bloomPass = new PropertyManager({ radius: 0.2, strength: 0.2, threshold: 0.3 });
    this.settings.effectFXAA = new PropertyManager({ enabled: true });
    this.settings.backrenderSSAO = new PropertyManager({ enabled: true });
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
    this.raycaster = new THREE.Raycaster();
    this.raycaster.linePrecision = 3;
    if (options['stats']) {
      this.stats = new Stats();
      this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
      this.stats.dom.style.position = "relative";
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
    controlPanelDiv.id = 'vis-3d-settings';

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
    this.container.addEventListener('resize', this.onWindowResize.bind(this), false);
    this.animOpacity = {};
    this.defaultBoundingBox = { 'maxY': -100000, 'minY': 100000, 'maxX': -100000, 'minX': 100000, 'maxZ': -100000, 'minZ': 100000 };
    this.boundingBox = Object.assign({}, this.defaultBoundingBox);
    this.visibleBoundingBox = Object.assign({}, this.defaultBoundingBox);
    //this.createInfoPanel();
    this.createToolTip();
    this._take_screenshot = false;
    this.initPostProcessing();
    //this.composer.addPass( this.gammaCorrectionPass );
    // this.UIBtns = {};
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
      'add': (function (func) { this.meshDict.on('add', func); }).bind(this),
      'remove': (function (func) { this.meshDict.on('remove', func); }).bind(this),
      'pinned': (function (func) { this.meshDict.on('change', func, 'pinned'); }).bind(this),
      'visibility': (function (func) { this.meshDict.on('change', func, 'visibility'); }).bind(this),
      'num': (function (func) { this.uiVars.on('change', func, 'frontNum'); }).bind(this),
      'highlight': (function (func) { this.states.on('change', func, 'highlight'); }).bind(this),
      'click': (function (func) { this.uiVars.on('change', func, 'selected'); }).bind(this)
    };
    this.on('add', (function (e) { this.onAddMesh(e); }).bind(this));
    this.on('remove', (function (e) { this.onRemoveMesh(e); }).bind(this));
    this.on('pinned', (function (e) { this.updatePinned(e); this.updateOpacity(e); }).bind(this));
    this.on('visibility', (function (e) { this.onUpdateVisibility(e.path[0]); }).bind(this));
    //this.on('num', (function () { this.updateInfoPanel(); }).bind(this)); 
    this.on('num', ()=>{ this.controlPanel.__controllers[0].setValue(this.uiVars.frontNum); });

    this.on('highlight', (function (e) { this.updateOpacity(e); this.onUpdateHighlight(e); }).bind(this));
    this.settings.on("change", (function (e) {
      this.updateOpacity(e);
    }).bind(this), [
        "pinLowOpacity", "pinOpacity", "defaultOpacity", "backgroundOpacity",
        "backgroundWireframeOpacity", "synapseOpacity",
        "highlightedObjectOpacity", "nonHighlightableOpacity", "lowOpacity"
      ]);
    this.settings.on('change', (function (e) {
      this[e.path[0]][e.prop] = e.value;
    }).bind(this), ['radius', 'strength', 'threshold', 'enabled']);
    this.settings.toneMappingPass.on('change', (function (e) {
      this.toneMappingPass.setMinLuminance(1 - this.settings.toneMappingPass.brightness);
    }).bind(this), 'brightness');
    this.settings.on('change', (function (e) {
      this.setBackgroundColor(e.value);
    }).bind(this), 'backgroundColor');
    if (data != undefined && Object.keys(data).length > 0)
      this.addJson(data);
    this.animate();
    this._defaultSettings = this.export_settings();

    // setup drag-drop functionality
    $('#' + this.container.id).on({
      'dragover dragenter': function (e) {
        e.preventDefault();
        e.stopPropagation();
      },
      'drop': function (e) {
        var dataTransfer = e.originalEvent.dataTransfer;
        if (dataTransfer && dataTransfer.files.length) {
          e.preventDefault();
          e.stopPropagation();
          $.each(dataTransfer.files, function (i, file) {
            var reader = new FileReader();
            reader.onload = $.proxy(function (file, event) {
              if (file.name.match('.+(\.swc)$')) {
                var name = file.name.split('.')[0];
                var json = {};
                json[name] = {
                  label: name,
                  dataStr: event.target.result,
                  filetype: 'swc'
                };
                ffbomesh.addJson({ ffbo_json: json });
              }
            }, this, file);
            reader.readAsText(file);
          });
        }
      }
    });
    
    // add file input
    let fileUploadInput = document.createElement('input');
    fileUploadInput.id = "neu3d-file-upload";
    fileUploadInput.setAttribute("type", "file");
    fileUploadInput.style.visibility = 'hidden';
    fileUploadInput.onchange = (evt) => {
      $.each(evt.target.files, function (i, file) {
        let reader = new FileReader();
        reader.onload = $.proxy(function (file, event) {
          if (file.name.match('.+(\.swc)$')) {
            var name = file.name.split('.')[0];
            var json = {};
            json[name] = {
              label: name,
              dataStr: event.target.result,
              filetype: 'swc'
            };
            ffbomesh.addJson({ ffbo_json: json });
          }
        }, this, file);
        reader.readAsText(file);
      });
    }

    // this input has to be added as siblinig of vis-3d
    // becuase vis-3d blocks click event propagation.
    this.container.insertAdjacentElement('afterend',fileUploadInput);

    // <DEBUG>: this resize event is not working right now
    this.container.addEventListener('resize',()=>{
      // console.log('div resize');
      this.onWindowResize();
    })
    window.onresize = this.onWindowResize.bind(this);
    $.each( $( ".tooltip" ), function() {
      let element = document.createElement('SPAN');
      // console.log('continuing');
      element.classList.add('tooltiptext');
      element.innerHTML = this.getAttribute('title');
      //this.__li.innerHTML += element.outerHTML;
      this.appendChild(element);
      // console.log(this);
      // console.log(element);
      this.removeAttribute('title');
    });

  } // ENDOF Constructor

  on(key, func) {
    if (typeof (func) !== "function") {
      console.log("not a function");
      return;
    }
    if (key in this.callbackRegistry) {
      var register = this.callbackRegistry[key];
      register(func);
    }
    else {
      console.log("callback keyword '" + key + "' not recognized.");
    }
  }

  initControlPanel(options={}){
    let GUIOptions =  {
      autoPlace: (options.autoPlace) ? options.autoPlace : false, 
      resizable: (options.resizable) ? options.resizable : true, 
      scrollable: (options.scrollable) ? options.scrollable : true, 
      closeOnTop: (options.closeOnTop) ? options.closeOnTop : true, 
      load: datGuiPresets
    };
    for (let key in options){
      if (!(key in GUIOptions)){
        GUIOptions[key] = options[key];
      }
    }
    let controlPanel = new dat.GUI(GUIOptions);
    window.panel = controlPanel;
    $(panel.__closeButton).hide();
    let neuronNum = controlPanel.add(this.uiVars, 'frontNum').name('Number of Neurons: ');
    neuronNum.domElement.style["pointerEvents"] = "None";
    neuronNum.domElement.parentNode.parentNode.classList.add('noneurons');
    function _createBtn (name, icon, iconAttrs, tooltip, func) {
      let newButton = function () {
        this[name] = func;
      };
      let btn = new newButton();
      var buttonid = controlPanel.add(btn, name).title(tooltip).icon(icon,"strip",iconAttrs);
      
    }

    _createBtn("uploadFile", "fa fa-upload", {}, "Upload SWC File", () => { document.getElementById('neu3d-file-upload').click(); });
    _createBtn("resetView", "fa fa-sync", { "aria-hidden": "true" }, "Reset View", () => { this.resetView() });
    _createBtn("resetVisibleView", "fa fa-align-justify",{}, "Center and zoom into visible Neurons/Synapses", () => { this.resetVisibleView() });
    _createBtn("hideAll", "fa fa-eye-slash",{}, "Hide All", () => { this.hideAll() });
    _createBtn("showAll", "fa fa-eye",{}, "Show All", () => { this.showAll() });
    _createBtn("takeScreenshot", "fa fa-camera",{}, "Download Screenshot", () => { this._take_screenshot = true;});
    _createBtn("removeUnpin", "fa fa-trash", {}, "Remove Unpinned Neurons", ()=> {this.removeUnpinned();})
    _createBtn("removeUnpin", "fa fa-map-upin", {}, "Unpin All", () => { this.unpinAll(); })
    _createBtn("showSettings", "fa fa-cogs", {}, "Display Settings", () => { controlPanel.__closeButton.click(); })

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

    f1_1.add(this.settings, 'defaultOpacity', 0.0, 1.0);
    f1_1.add(this.settings, 'synapseOpacity', 0.0, 1.0);
    f1_1.add(this.settings, 'nonHighlightableOpacity', 0.0, 1.0);
    f1_1.add(this.settings, 'lowOpacity', 0.0, 1.0);
    f1_1.add(this.settings, 'pinOpacity', 0.0, 1.0);
    f1_1.add(this.settings, 'pinLowOpacity', 0.0, 1.0);
    f1_1.add(this.settings, 'highlightedObjectOpacity', 0.0, 1.0);
    f1_1.add(this.settings, 'backgroundOpacity', 0.0, 1.0);
    f1_1.add(this.settings, 'backgroundWireframeOpacity', 0.0, 1.0);
    
    let f1_2 = f1.addFolder('Advanced');

    f1_2.add(this.settings.toneMappingPass, 'brightness').name("ToneMap Brightness");
    f1_2.add(this.settings.bloomPass, 'radius', 0.0, 10.0).name("BloomPass Radius");;
    f1_2.add(this.settings.bloomPass, 'strength', 0.0, 1.0).name("BloomPass Strength");;
    f1_2.add(this.settings.bloomPass, 'threshold', 0.0, 2.0).name("BloomPass Threshold");;
    f1_2.add(this.settings.effectFXAA, 'enabled').name("FXAA");
    f1_2.add(this.settings.backrenderSSAO, 'enabled').name("SSAO");


    let f2 = f_vis.addFolder('Size');
    f2.add(this.settings, 'defaultRadius');
    f2.add(this.settings, 'defaultSomaRadius');
    f2.add(this.settings, 'defaultSynapseRadius');

    // let f3 = f_vis.addFolder('Animation');
    // f3.add(this.states, 'animate');
    // f3.add(this.settings, 'meshOscAmp', 0.0, 1.0);

    controlPanel.remember(this.settings);
    controlPanel.remember(this.settings.toneMappingPass);
    controlPanel.remember(this.settings.bloomPass);
    controlPanel.remember(this.settings.effectFXAA);
    controlPanel.remember(this.settings.backrenderSSAO);

    controlPanel.open();
    
    return controlPanel;
  }

  clearActivity() {
    clearInterval(this.it1);
    clearInterval(this.it2);
  }

  animateActivity(activityData, t_i, interval, interpolation_interval) {
    this.activityData = activityData;
    var t = t_i || 0; 
    var t_max = activityData[Object.keys(activityData)[0]].length;
    var interp = 0;
    this.it1 = setInterval(frame, interval);
    this.it2 = setInterval(intFrame, interpolation_interval);
    function intFrame() {
        interp += interpolation_interval / interval;
        var t_current = t;
        var t_next = t+1;
        if (t_next == t_max)
        t_next = 0;
        for (var key in activityData) {
            ffbomesh.meshDict[key]['opacity'] = activityData[key][t_current] * (1-interp) + activityData[key][t_next] * (interp);
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

  initCamera() {
    var height = this.container.clientHeight;
    var width = this.container.clientWidth;
    this.fov = 20;
    this.prevhfov = 2 * Math.atan(Math.tan(Math.PI * this.fov / 2 / 180) * width / height);
    let camera = new THREE.PerspectiveCamera(this.fov, width / height, 0.1, 1000000 );
    camera.position.z = 1800;
    if (width < 768 && width / height < 1)
      camera.position.z = 3800;
    if (width < 768 && width / height >= 1)
      camera.position.z = 2600;

    if (this._metadata["enablePositionReset"] == true) {
      camera.position.z = this._metadata["resetPosition"]['z'];
      camera.position.y = this._metadata["resetPosition"]['y'];
      camera.position.x = this._metadata["resetPosition"]['x'];
      camera.up.y = this._metadata["upSign"];
    }

    return camera;
  }

  initRenderer() {
    let renderer = new THREE.WebGLRenderer({ 'logarithmicDepthBuffer': true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

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

  initPostProcessing() {
    var height = this.container.clientHeight;
    var width = this.container.clientWidth;
    this.renderScene = new THREE.RenderPass(this.scenes.front, this.camera);
    this.renderScene.clear = false;
    this.renderScene.clearDepth = true;
    this.backrenderScene = new THREE.RenderPass(this.scenes.back, this.camera);
    this.backrenderSSAO = new THREE.SSAOPass(this.scenes.back, this.camera, width, height);
    this.effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
    this.effectFXAA.uniforms['resolution'].value.set(1 / Math.max(width, 1440), 1 / Math.max(height, 900));
    this.bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(width, height), this.settings.bloomPass.strength, this.settings.bloomPass.radius, this.settings.bloomPass.threshold);
    this.bloomPass.renderToScreen = true;
    this.toneMappingPass = new THREE.AdaptiveToneMappingPass(true, width);
    this.toneMappingPass.setMinLuminance(1. - this.settings.toneMappingPass.brightness);
    this.renderer.gammaInput = true;
    this.renderer.gammaOutput = true;
    this.composer = new THREE.EffectComposer(this.renderer);
    this.composer.addPass(this.backrenderScene);
    this.composer.addPass(this.backrenderSSAO);
    this.composer.addPass(this.renderScene);
    this.composer.addPass(this.effectFXAA);
    this.composer.addPass(this.toneMappingPass);
    this.composer.addPass(this.bloomPass);
    this.composer.setSize(width * window.devicePixelRatio, height * window.devicePixelRatio);
  }
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
  initLut() {
    this.maxColorNum = this._metadata.maxColorNum;
    let lut = new THREE.Lut(this._metadata.colormap, this.maxColorNum);
    lut.setMin(0);
    lut.setMax(1);
    return lut;
  }
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
  initLoadingManager() {
    let loadingManager = new THREE.LoadingManager();
    loadingManager.onLoad = function () {
      this.controls.target0.x = 0.5 * (this.boundingBox.minX + this.boundingBox.maxX);
      this.controls.target0.y = 0.5 * (this.boundingBox.minY + this.boundingBox.maxY);
      this.controls.reset();
      this.groups.front.visible = true;
    }.bind(this);
    return loadingManager;
  }
  select(id) {
    this.uiVars.selected = id;
  }
  reset(resetBackground = false) {
    //resetBackground = resetBackground || false;
    for (var key of Object.keys(this.meshDict)) {
      if (!resetBackground && this.meshDict[key].background) {
        continue;
      }
      if (this.meshDict[key]['pinned'])
        this.meshDict[key]['pinned'] = false;
      var meshobj = this.meshDict[key].object;
      for (var i = 0; i < meshobj.children.length; i++) {
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
    // this.uiVars.pinnedObjects.clear()
    if (resetBackground) {
      this.controls.target0.set(0, 0, 0);
      this.boundingBox = { 'maxY': -100000, 'minY': 100000, 'maxX': -100000, 'minX': 100000, 'maxZ': -100000, 'minZ': 100000 };
    }
  }
  _configureCallbacks() {
    this.settings.on("change", function (e) {
      for (i = 0; i < this.groups.back.children.length; i++)
        this.groups.back.children[i].children[1].visible = e["value"];
    }.bind(this), "meshWireframe");
  }
  execCommand(json) {
    var neuList = json['neurons'] || [];
    var commandList = json['commands'] || [];
    var args = json['args'] || undefined;
    neuList = this.asarray(neuList);
    commandList = this.asarray(commandList);
    for (var i = 0; i < commandList.length; ++i) {
      var c = commandList[i].toLowerCase();
      this.commandDispatcher[c].call(this, neuList, args);
    }
  }
  addJson(json) {
    return new Promise((function (resolve) {
      if ((json === undefined) || !("ffbo_json" in json)) {
        console.log('mesh json is undefined');
        return;
      }
      var metadata = {
        "type": undefined,
        "visibility": true,
        "colormap": this._metadata.colormap,
        "colororder": "random",
        "showAfterLoadAll": false,
      };
      for (var key in metadata)
        if ((key in json) && (json[key] !== undefined))
          metadata[key] = json[key];
      if (('reset' in json) && json.reset)
        this.reset();
      /* set colormap */
      var keyList = Object.keys(json.ffbo_json);
      var colorNum, id2float, lut;
      if (metadata.colororder === "order") {
        colorNum = keyList.length;
        id2float = function (i) { return i / colorNum; };
      }
      else {
        colorNum = this.maxColorNum;
        id2float = function (i) { return getRandomIntInclusive(1, colorNum) / colorNum; };
      }
      if (metadata.colororder === "order" && (colorNum !== this.maxColorNum || metadata.colormap !== "rainbow_gist")) {
        colorNum = keyList.length;
        lut = new THREE.Lut(metadata.colormap, colorNum);
        lut.setMin(0);
        lut.setMax(1);
      }
      else
        lut = this.lut;
      if (metadata.showAfterLoadAll)
        this.groups.front.visible = false;
      for (var i = 0; i < keyList.length; ++i) {
        var key = keyList[i];
        if (key in this.meshDict) {
          console.log('mesh object already exists... skip rendering...');
          continue;
        }
        var unit = new PropertyManager(json.ffbo_json[key]);
        unit.boundingBox = Object.assign({}, this.defaultBoundingBox);
        setAttrIfNotDefined(unit, 'highlight', true);
        setAttrIfNotDefined(unit, 'opacity', -1.0);
        setAttrIfNotDefined(unit, 'visibility', true);
        setAttrIfNotDefined(unit, 'background', false);
        setAttrIfNotDefined(unit, 'color', lut.getColor(id2float(i)));
        setAttrIfNotDefined(unit, 'label', getAttr(unit, 'uname', key));
        if (Array.isArray(unit.color))
          unit.color = new THREE.Color(...unit.color);
        /* read mesh */
        if (metadata.type === "morphology_json") {
          this.loadMorphJSONCallBack(key, unit, metadata.visibility).bind(this)();
        }
        else if (('dataStr' in unit) && ('filename' in unit)) {
          console.log('mesh object has both data string and filename... should only have one... skip rendering');
          continue;
        }
        else if ('filename' in unit) {
          unit['filetype'] = unit.filename.split('.').pop();
          var loader = new THREE.FileLoader(this.loadingManager);
          if (unit['filetype'] == "json")
            loader.load(unit.filename, this.loadMeshCallBack(key, unit, metadata.visibility).bind(this));
          else if (unit['filetype'] == "swc")
            loader.load(unit.filename, this.loadSWCCallBack(key, unit, metadata.visibility).bind(this));
          else {
            console.log('mesh object has unrecognized data format... skip rendering');
            continue;
          }
        }
        else if ('dataStr' in unit) {
          if (unit['filetype'] == "json")
            this.loadMeshCallBack(key, unit, metadata.visibility).bind(this)(unit['dataStr']);
          else if (unit['filetype'] == "swc")
            this.loadSWCCallBack(key, unit, metadata.visibility).bind(this)(unit['dataStr']);
          else {
            console.log('mesh object has unrecognized data format... skip rendering');
            continue;
          }
        }
        else {
          console.log('mesh object has neither filename nor data string... skip rendering');
          continue;
        }
      }
      resolve();
    }).bind(this));
  }
  computeVisibleBoundingBox(includeBackground = false) {
    this.visibleBoundingBox = Object.assign({}, this.defaultBoundingBox);
    let updated = false;
    for (var key in this.meshDict) {
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
  updateBoundingBox(x, y, z) {
    this.updateObjectBoundingBox(this, x, y, z)
  }
  animate() {
    if (this.stats){
      this.stats.begin();
    }
    this.controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
    if (this.states.mouseOver && this.dispatch.syncControls)
      this.dispatch.syncControls(this);
    this.render();
    if (this.stats){
      this.stats.end();
    }
    requestAnimationFrame(this.animate.bind(this));
  }
  loadMeshCallBack(key, unit, visibility) {
    return function (jsonString) {
      var json = JSON.parse(jsonString);
      var color = unit['color'];
      var geometry = new THREE.Geometry();
      var vtx = json['vertices'];
      var idx = json['faces'];
      for (var j = 0; j < vtx.length / 3; j++) {
        var x = parseFloat(vtx[3 * j + 0]);
        var y = parseFloat(vtx[3 * j + 1]);
        var z = parseFloat(vtx[3 * j + 2]);
        geometry.vertices.push(new THREE.Vector3(x, y, z));
        this.updateObjectBoundingBox(unit, x, y, z);
        this.updateBoundingBox(x, y, z);
      }
      for (var j = 0; j < idx.length / 3; j++) {
        geometry.faces.push(new THREE.Face3(parseInt(idx[3 * j + 0]), parseInt(idx[3 * j + 1]), parseInt(idx[3 * j + 2])));
      }
      geometry.mergeVertices();
      geometry.computeFaceNormals();
      geometry.computeVertexNormals();
      let materials = [
        //new THREE.MeshPhongMaterial( { color: color, flatShading: true, shininess: 0, transparent: true } ),
        new THREE.MeshLambertMaterial({ color: color, transparent: true, side: 2, flatShading: true }),
        new THREE.MeshBasicMaterial({ color: color, wireframe: true, transparent: true })
      ];
      var object = createMultiMaterialObject(geometry, materials);
      if (!this.settings.meshWireframe)
        object.children[1].visible = false;
      object.visible = visibility;
      this._registerObject(key, unit, object);
    };
  }
  loadSWCCallBack(key, unit, visibility) {
    return function (swcString) {
      /*
      * process string
      */
      swcString = swcString.replace(/\r\n/g, "\n");
      var swcLine = swcString.split("\n");
      var len = swcLine.length;
      var swcObj = {};
      swcLine.forEach(function (e) {
        var seg = e.split(' ');
        if (seg.length == 7) {
          swcObj[parseInt(seg[0])] = {
            'type': parseInt(seg[1]),
            'x': parseFloat(seg[2]),
            'y': parseFloat(seg[3]),
            'z': parseFloat(seg[4]),
            'radius': parseFloat(seg[5]),
            'parent': parseInt(seg[6]),
          };
        }
      });
      var color = unit['color']
      var object = new THREE.Object3D();
      var pointGeometry = undefined;
      var mergedGeometry = undefined;
      var geometry = undefined;
      for (var idx in swcObj) {
        var c = swcObj[idx];
        if (idx == Math.round(len / 2) && unit.position == undefined)
          unit.position = new THREE.Vector3(c.x, c.y, c.z);
        this.updateObjectBoundingBox(unit, c.x, c.y, c.z);
        this.updateBoundingBox(c.x, c.y, c.z);
        if (c.parent != -1) {
          var p = swcObj[c.parent];
          if (this.settings.neuron3d) {
            if (mergedGeometry == undefined)
              mergedGeometry = new THREE.Geometry();
            var d = new THREE.Vector3((p.x - c.x), (p.y - c.y), (p.z - c.z));
            if (!p.radius || !c.radius)
              var geometry = new THREE.CylinderGeometry(this.settings.defaultRadius, this.settings.defaultRadius, d.length(), 4, 1, 0);
            else
              var geometry = new THREE.CylinderGeometry(p.radius, c.radius, d.length(), 8, 1, 0);
            geometry.translate(0, 0.5 * d.length(), 0);
            geometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
            geometry.lookAt(d.clone());
            geometry.translate((c.x + c.x) / 2, -0.0 * d.length() + (c.y + c.y) / 2, (c.z + c.z) / 2);
            mergedGeometry.merge(geometry);
            geometry = null;
            if (this.settings.neuron3dMode == 2) {
              var geometry = new THREE.SphereGeometry(c.radius, 8, 8);
              geometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
              geometry.lookAt(d);
              geometry.translate((c.x + c.x) / 2, (c.y + c.y) / 2, (c.z + c.z) / 2);
              mergedGeometry.merge(geometry);
              geometry = null;
            }
            else if (this.settings.neuron3dMode == 3) {
              if (p.parent != -1) {
                let p2 = swcObj[p.parent];
                var a = new THREE.Vector3(0.9 * p.x + 0.1 * p2.x, 0.9 * p.y + 0.1 * p2.y, 0.9 * p.z + 0.1 * p2.z);
                var b = new THREE.Vector3(0.9 * p.x + 0.1 * c.x, 0.9 * p.y + 0.1 * c.y, 0.9 * p.z + 0.1 * c.z);
                var curve = new THREE.QuadraticBezierCurve3(a, new THREE.Vector3(p.x, p.y, p.z), b);
                var geometry = new THREE.TubeGeometry(curve, 8, p.radius, 4, false);
                mergedGeometry.merge(geometry);
                geometry = null;
              }
            }
          }
          else {
            if (geometry == undefined)
              geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3(c.x, c.y, c.z));
            geometry.vertices.push(new THREE.Vector3(p.x, p.y, p.z));
            geometry.colors.push(color);
            geometry.colors.push(color);
          }
        }
        if (c.type == 1) {
          if (c.radius)
            var sphereGeometry = new THREE.SphereGeometry(c.radius, 8, 8);
          else
            var sphereGeometry = new THREE.SphereGeometry(this.settings.defaultSomaRadius, 8, 8);
          sphereGeometry.translate(c.x, c.y, c.z);
          var sphereMaterial = new THREE.MeshLambertMaterial({ color: color, transparent: true });
          object.add(new THREE.Mesh(sphereGeometry, sphereMaterial));
          unit['position'] = new THREE.Vector3(c.x, c.y, c.z);
        }
        if (c.type == -1) {
          if (this.settings.synapseMode == true) {
            if (mergedGeometry == undefined)
              mergedGeometry = new THREE.Geometry();
            if (c.radius)
              var sphereGeometry = new THREE.SphereGeometry(c.radius, 8, 8);
            else
              var sphereGeometry = new THREE.SphereGeometry(this.settings.defaultSynapseRadius, 8, 8);
            sphereGeometry.translate(c.x, c.y, c.z);
            //var sphereMaterial = new THREE.MeshLambertMaterial( {color: color, transparent: true} );
            //object.add(new THREE.Mesh( sphereGeometry, sphereMaterial));
            mergedGeometry.merge(sphereGeometry);
            unit['position'] = new THREE.Vector3(c.x, c.y, c.z);
          }
          else {
            if (pointGeometry == undefined)
              pointGeometry = new THREE.Geometry();
            pointGeometry.vertices.push(new THREE.Vector3(c.x, c.y, c.z));
          }
        }
      }
      if (pointGeometry) {
        var pointMaterial = new THREE.PointsMaterial({ color: color, size: this.settings.defaultSynapseRadius, lights: true });
        var points = new THREE.Points(pointGeometry, pointMaterial);
        object.add(points);
      }
      if (mergedGeometry) {
        var material = new THREE.MeshLambertMaterial({ color: color, transparent: true });
        //var modifier = new THREE.SimplifyModifier();
        //simplified = modifier.modify( mergedGeometry, geometry.vertices.length * 0.25 | 0 )
        var mesh = new THREE.Mesh(mergedGeometry, material);
        //var mesh = new THREE.Mesh(simplified, material);
        object.add(mesh);
      }
      if (geometry) {
        var material = new THREE.LineBasicMaterial({ vertexColors: THREE.VertexColors, transparent: true, color: color });
        object.add(new THREE.LineSegments(geometry, material));
      }
      object.visible = visibility;
      this._registerObject(key, unit, object);

    };
  }
  loadMorphJSONCallBack(key, unit, visibility) {
    return function () {
      /*
      * process string
      */
      var swcObj = {};
      var len = unit['sample'].length;
      for (var j = 0; j < len; j++) {
        swcObj[parseInt(unit['sample'][j])] = {
          'type': parseInt(unit['identifier'][j]),
          'x': parseFloat(unit['x'][j]),
          'y': parseFloat(unit['y'][j]),
          'z': parseFloat(unit['z'][j]),
          'radius': parseFloat(unit['r'][j]),
          'parent': parseInt(unit['parent'][j]),
        };
      }
      var color = unit['color'];
      var object = new THREE.Object3D();
      var pointGeometry = undefined;
      var mergedGeometry = undefined;
      var geometry = undefined;
      for (var idx in swcObj) {
        var c = swcObj[idx];
        if (idx == Math.round(len / 2) && unit.position == undefined)
          unit.position = new THREE.Vector3(c.x, c.y, c.z);
        this.updateObjectBoundingBox(unit, c.x, c.y, c.z);
        this.updateBoundingBox(c.x, c.y, c.z);
        if (c.parent != -1) {
          var p = swcObj[c.parent];
          if (this.settings.neuron3d) {
            if (mergedGeometry == undefined)
              mergedGeometry = new THREE.Geometry();
            var d = new THREE.Vector3((p.x - c.x), (p.y - c.y), (p.z - c.z));
            if (!p.radius || !c.radius)
              var geometry = new THREE.CylinderGeometry(this.settings.defaultRadius, this.settings.defaultRadius, d.length(), 4, 1, 0);
            else
              var geometry = new THREE.CylinderGeometry(p.radius, c.radius, d.length(), 8, 1, 0);
            geometry.translate(0, 0.5 * d.length(), 0);
            geometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
            geometry.lookAt(d.clone());
            geometry.translate((c.x + c.x) / 2, -0.0 * d.length() + (c.y + c.y) / 2, (c.z + c.z) / 2);
            mergedGeometry.merge(geometry);
            geometry = null;
            if (this.settings.neuron3dMode == 2) {
              var geometry = new THREE.SphereGeometry(c.radius, 8, 8);
              geometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
              geometry.lookAt(d);
              geometry.translate((c.x + c.x) / 2, (c.y + c.y) / 2, (c.z + c.z) / 2);
              mergedGeometry.merge(geometry);
              geometry = null;
            }
            else if (this.settings.neuron3dMode == 3) {
              if (p.parent != -1) {
                p2 = swcObj[p.parent];
                var a = new THREE.Vector3(0.9 * p.x + 0.1 * p2.x, 0.9 * p.y + 0.1 * p2.y, 0.9 * p.z + 0.1 * p2.z);
                var b = new THREE.Vector3(0.9 * p.x + 0.1 * c.x, 0.9 * p.y + 0.1 * c.y, 0.9 * p.z + 0.1 * c.z);
                var curve = new THREE.QuadraticBezierCurve3(a, new THREE.Vector3(p.x, p.y, p.z), b);
                var geometry = new THREE.TubeGeometry(curve, 8, p.radius, 4, false);
                mergedGeometry.merge(geometry);
                geometry = null;
              }
            }
          }
          else {
            if (geometry == undefined)
              geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3(c.x, c.y, c.z));
            geometry.vertices.push(new THREE.Vector3(p.x, p.y, p.z));
            geometry.colors.push(color);
            geometry.colors.push(color);
          }
        }
        if (c.type == 1) {
          if (c.radius)
            var sphereGeometry = new THREE.SphereGeometry(c.radius, 8, 8);
          else
            var sphereGeometry = new THREE.SphereGeometry(this.settings.defaultSomaRadius, 8, 8);
          sphereGeometry.translate(c.x, c.y, c.z);
          var sphereMaterial = new THREE.MeshLambertMaterial({ color: color, transparent: true });
          object.add(new THREE.Mesh(sphereGeometry, sphereMaterial));
          unit['position'] = new THREE.Vector3(c.x, c.y, c.z);
        }
        if (c.type == -1) {
          if (this.settings.synapseMode == true) {
            if (mergedGeometry == undefined)
              mergedGeometry = new THREE.Geometry();
            if (c.radius)
              var sphereGeometry = new THREE.SphereGeometry(c.radius, 8, 8);
            else
              var sphereGeometry = new THREE.SphereGeometry(this.settings.defaultSynapseRadius, 8, 8);
            sphereGeometry.translate(c.x, c.y, c.z);
            //var sphereMaterial = new THREE.MeshLambertMaterial( {color: color, transparent: true} );
            //object.add(new THREE.Mesh( sphereGeometry, sphereMaterial));
            mergedGeometry.merge(sphereGeometry);
            unit['position'] = new THREE.Vector3(c.x, c.y, c.z);
          }
          else {
            if (pointGeometry == undefined)
              pointGeometry = new THREE.Geometry();
            pointGeometry.vertices.push(new THREE.Vector3(c.x, c.y, c.z));
          }
        }
      }
      if (pointGeometry) {
        var pointMaterial = new THREE.PointsMaterial({ color: color, size: this.settings.defaultSynapseRadius, lights: true });
        var points = new THREE.Points(pointGeometry, pointMaterial);
        object.add(points);
      }
      if (mergedGeometry) {
        var material = new THREE.MeshLambertMaterial({ color: color, transparent: true });
        //var modifier = new THREE.SimplifyModifier();
        //simplified = modifier.modify( mergedGeometry, geometry.vertices.length * 0.25 | 0 )
        var mesh = new THREE.Mesh(mergedGeometry, material);
        //var mesh = new THREE.Mesh(simplified, material);
        object.add(mesh);
      }
      if (geometry) {
        var material = new THREE.LineBasicMaterial({ vertexColors: THREE.VertexColors, transparent: true, color: color });
        object.add(new THREE.LineSegments(geometry, material));
      }
      object.visible = visibility;
      this._registerObject(key, unit, object);
      /* delete morpology data */
      delete unit['identifier'];
      delete unit['x'];
      delete unit['y'];
      delete unit['z'];
      delete unit['r'];
      delete unit['parent'];
      delete unit['sample'];
      delete unit['type'];
    };
  }
  _registerObject(key, unit, object) {
    object.rid = key; // needed rid for raycaster reference
    unit['rid'] = key;
    unit['object'] = object;
    unit['pinned'] = false;
    unit['opacity'] = -1.;
    if (!unit.hasOwnProperty('position')) {
      unit['position'] = new THREE.Vector3(0.5 * (unit.boundingBox.minX + unit.boundingBox.maxX), 0.5 * (unit.boundingBox.minY + unit.boundingBox.maxY), 0.5 * (unit.boundingBox.minZ + unit.boundingBox.maxZ));
    }
    // TODO: move the code below to a function
    if (!('morph_type' in unit) || (unit['morph_type'] != 'Synapse SWC')) {
      if (this.settings.defaultOpacity !== 1)
        for (var i = 0; i < unit['object'].children.length; i++)
          unit['object'].children[i].material.opacity = this.settings.defaultOpacity;
    }
    else {
      if (this.settings.synapseOpacity !== 1)
        for (var i = 0; i < unit['object'].children.length; i++)
          unit['object'].children[i].material.opacity = this.settings.synapseOpacity;
    }
    this.meshDict[key] = unit;
  }
  onDocumentMouseClick(event) {
    if (event !== undefined)
      event.preventDefault();
    // if (!this.controls.checkStateIsNone())
    //   return;
    var intersected = this.getIntersection([this.groups.front]);
    if (intersected != undefined && intersected['highlight']) {
      this.select(intersected.rid);
    }
  }
  onDocumentMouseDBLClick(event) {
    if (event !== undefined)
      event.preventDefault();
    var intersected = this.getIntersection([this.groups.front]);
    if (intersected != undefined) {
      if (!intersected['highlight'])
        return;
      this.togglePin(intersected);
    }
  }
  onDocumentMouseDBLClickMobile(event) {
    if (event !== undefined)
      event.preventDefault();
    var intersected = this.getIntersection([this.groups.front]);
    if (intersected != undefined) {
      if (!intersected['highlight'])
        return;
      this.togglePin(intersected);
    }
  }
  onDocumentMouseMove(event) {
    event.preventDefault();
    this.states.mouseOver = true;
    var rect = this.container.getBoundingClientRect();
    this.uiVars.toolTipPosition.x = event.clientX;
    this.uiVars.toolTipPosition.y = event.clientY;
    this.uiVars.cursorPosition.x = ((event.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
    this.uiVars.cursorPosition.y = -((event.clientY - rect.top) / this.container.clientHeight) * 2 + 1;
  }
  onDocumentMouseEnter(event) {
    event.preventDefault();
    this.states.mouseOver = true;
  }
  onDocumentMouseLeave(event) {
    event.preventDefault();
    this.states.mouseOver = false;
    this.highlight(undefined);
  }
  //
  onWindowResize() {
    var height = this.container.clientHeight;
    var width = this.container.clientWidth;
    let aspect = width / height;
    let cam_dir = new THREE.Vector3();
    cam_dir.subVectors(this.camera.position, this.controls.target);
    let prevDist = cam_dir.length();
    cam_dir.normalize();
    let hspan = prevDist * 2 * Math.tan(this.prevhfov / 2);
    //vspan = prevDist*2*Math.tan(Math.PI*this.fov/2/180);
    this.prevhfov = 2 * Math.atan(Math.tan(Math.PI * this.fov / 2 / 180) * aspect);
    //span = Math.max(ffbomesh.boundingBox.maxX-ffbomesh.boundingBox.minX,ffbomesh.boundingBox.maxY-ffbomesh.boundingBox.minY, ffbomesh.boundingBox.maxZ-ffbomesh.boundingBox.minZ);
    //dist = Math.max(hspan/2/Math.tan(hfov/2), vspan/2/Math.tan(Math.PI*this.fov/2/180));
    let dist = hspan / 2 / Math.tan(this.prevhfov / 2);
    this.camera.position.copy(this.controls.target);
    this.camera.position.addScaledVector(cam_dir, dist);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width * window.devicePixelRatio, height * window.devicePixelRatio);
    this.effectFXAA.uniforms['resolution'].value.set(1 / Math.max(width, 1440), 1 / Math.max(height, 900));
    this.controls.handleResize();
    this.render();
    if (this.dispatch['resize'] !== undefined)
      this.dispatch['resize']();
  }
  render() {

    for (var key in this.meshDict) {
      if (this.meshDict[key].object != undefined) {
        var x = new Date().getTime();
        if (this.meshDict[key]['background']) {
          var obj = this.meshDict[key].object.children;
          //for ( var i = 0; i < obj.length; ++i )
          if (this.meshDict[key]['opacity'] >= 0.00)
          obj[0].material.opacity = this.meshDict[key]['opacity'] * (this.settings.backgroundOpacity + 0.5 * this.settings.meshOscAmp * (1 + Math.sin(x * .0005)));
          else
          obj[0].material.opacity = this.settings.backgroundOpacity + 0.5 * this.settings.meshOscAmp * (1 + Math.sin(x * .0005));
          obj[1].material.opacity = this.settings.backgroundWireframeOpacity;
        }
        else {
          //this.meshDict[key].object.children[0].material.opacity = 0.3 - 0.3*Math.sin(x * .0005);
          //this.meshDict[key].object.children[0].material.opacity = 0.8;
        }
      }
    }

    /*
    * show label of mesh object when it intersects with cursor
    */
    // if (this.controls.checkStateIsNone() && this.states.mouseOver) {
    if (this.states.mouseOver) {
      var intersected = this.getIntersection([this.groups.front, this.groups.back]);
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
    //this.renderer.render( this.scene, this.camera );
  }
  getIntersection(groups) {
    if (groups === undefined)
      return undefined;
    var val = undefined;
    var object = undefined;
    this.raycaster.setFromCamera(this.uiVars.cursorPosition, this.camera);
    for (const group of groups) {
      var intersects = this.raycaster.intersectObjects(group.children, true);
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
  showFrontAll() {
    for (var val of this.groups.front.children)
      this.meshDict[val.rid].visibility = true;
  }
  hideFrontAll() {
    for (var val of this.groups.front.children)
      this.meshDict[val.rid].visibility = false;
  }
  showBackAll() {
    for (var val of this.groups.back.children)
      this.meshDict[val.rid].visibility = true;
  }
  hideBackAll() {
    for (var val of this.groups.back.children)
      this.meshDict[val.rid].visibility = false;
  }
  showAll() {
    for (var key in this.meshDict)
      this.meshDict[key].visibility = true;
  }
  hideAll() {
    for (var key in this.meshDict)
      if (!this.meshDict[key]['pinned'])
        this.meshDict[key].visibility = false;
  }
  export_settings() {
    let backgroundColor = [0.15, 0.01, 0.15];
    if (this.groups.back.children.length)
      backgroundColor = this.groups.back.children[0].children[0].material.color.toArray();
    if (this.settings.backgroundColor !== undefined)
      backgroundColor = this.settings.backgroundColor;
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
  import_settings(settings) {
    settings = Object.assign({}, settings);
    if ('lightsHelper' in settings) {
      this.lightsHelper.import(settings.lightsHelper);
      delete settings.lightsHelper;
    }
    if ('postProcessing' in settings) {
      postProcessing = settings.postProcessing;
      delete settings.postProcessing;
      if (postProcessing.fxaa != undefined)
        this.settings.effectFXAA.enabled = postProcessing.fxaa;
      if (postProcessing.ssao != undefined)
        this.settings.backrenderSSAO.enabled = postProcessing.ssao;
      if (postProcessing.toneMappingMinLum != undefined)
        this.settings.toneMappingPass.brightness = 1 - postProcessing.toneMappingMinLum;
      if (postProcessing.bloomRadius != undefined)
        this.settings.bloomPass.radius = postProcessing.bloomRadius;
      if (postProcessing.bloomStrength != undefined)
        this.settings.bloomPass.strength = postProcessing.bloomStrength;
      if (postProcessing.bloomThreshold != undefined)
        this.settings.bloomPass.threshold = postProcessing.bloomThreshold;
    }
    if ('backgroundColor' in settings) {
      bg = settings.backgroundColor;
      setTimeout((function () {
        this.setBackgroundColor(bg);
      }).bind(this), 4000);
      delete settings.backgroundColor;
    }
    Object.assign(this.settings, settings);
  }
  export_state() {
    let state_metadata = { 'color': {}, 'pinned': {}, 'visibility': {}, 'camera': { 'position': {}, 'up': {} }, 'target': {} };
    state_metadata['camera']['position']['x'] = this.camera.position.x;
    state_metadata['camera']['position']['y'] = this.camera.position.y;
    state_metadata['camera']['position']['z'] = this.camera.position.z;
    state_metadata['camera']['up']['x'] = this.camera.up.x;
    state_metadata['camera']['up']['y'] = this.camera.up.y;
    state_metadata['camera']['up']['z'] = this.camera.up.z;
    state_metadata['target']['x'] = this.controls.target.x;
    state_metadata['target']['y'] = this.controls.target.y;
    state_metadata['target']['z'] = this.controls.target.z;
    state_metadata['pinned'] = Array.from(this.uiVars.pinnedObjects);
    for (var key in this.meshDict) {
      if (this.meshDict.hasOwnProperty(key)) {
        state_metadata['color'][key] = this.meshDict[key].object.children[0].material.color.toArray();
        state_metadata['visibility'][key] = this.meshDict[key].visibility;
      }
    }
    return state_metadata;
  }
  import_state(state_metadata) {
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
      if (this.meshDict.hasOwnProperty(key))
        this.meshDict[key]['pinned'] = true;
    }
    for (var key of Object.keys(state_metadata['visibility'])) {
      if (!this.meshDict.hasOwnProperty(key))
        continue;
      this.meshDict[key].visibility = state_metadata['visibility'][key];
      if (this.meshDict[key].background)
        continue;
      var meshobj = this.meshDict[key].object;
      var color = state_metadata['color'][key];
      for (var j = 0; j < meshobj.children.length; ++j) {
        meshobj.children[j].material.color.fromArray(color);
        for (var k = 0; k < meshobj.children[j].geometry.colors.length; ++k) {
          meshobj.children[j].geometry.colors[k].fromArray(color);
        }
        meshobj.children[j].geometry.colorsNeedUpdate = true;
      }
    }
  }
  show(id) {
    id = this.asarray(id);
    for (var i = 0; i < id.length; ++i) {
      if (!(id[i] in this.meshDict))
        continue;
      this.meshDict[id[i]].visibility = true;
    }
  }
  hide(id) {
    id = this.asarray(id);
    for (var i = 0; i < id.length; ++i) {
      if (!(id[i] in this.meshDict))
        continue;
      this.meshDict[id[i]].visibility = false;
    }
  }
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
  onRemoveMesh(e) {
    // console.log(e);
    if (this.states.highlight == e.prop)
      this.states.highlight = false;
    if (e.value['pinned'])
      e.value['pinned'] = false;
    var meshobj = e.value.object;
    for (var j = 0; j < meshobj.children.length; ++j) {
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
  toggleVis(key) {
    if (key in this.meshDict)
      this.meshDict[key].visibility = !this.meshDict[key].visibility;
  }
  onUpdateVisibility(key) {
    this.meshDict[key]['object'].visible = this.meshDict[key].visibility;
  }
  highlight(d, updatePos) {
    if (d === undefined || d === false) {
      this.states.highlight = false;
      this.hide3dToolTip();
      return;
    }
    if (typeof (d) === 'string' && (d in this.meshDict))
      d = this.meshDict[d];
    if ((d['highlight']) !== false) {
      this.states.highlight = d['rid'];
    }
    else
      this.states.highlight = false;
    if (updatePos !== undefined && updatePos === true) {
      var pos = this.getNeuronScreenPosition(d['rid']);
      this.uiVars.toolTipPosition.x = pos.x;
      this.uiVars.toolTipPosition.y = pos.y;
    }
    this.show3dToolTip(d['label']);
  }
  onUpdateHighlight(e) {
    if (e.old_value)
      this.meshDict[e.old_value]['object']['visible'] = this.meshDict[e.old_value]['visibility'];
    if (e.value === false) {
      this.renderer.domElement.style.cursor = "auto";
    }
    else {
      this.renderer.domElement.style.cursor = "pointer";
      this.meshDict[e.value]['object']['visible'] = true;
    }
  }
  updateOpacity(e) {
    // Entering highlight mode or highlighted obj change
    if (e.prop == 'highlight' && this.states.highlight) {
      var list = ((e !== undefined) && e.old_value) ? [e.old_value] : Object.keys(this.meshDict);
      for (const key of list) {
        var val = this.meshDict[key];
        var opacity = val['highlight'] ? this.settings.lowOpacity : this.settings.nonHighlightableOpacity;
        var depthTest = true;
        if (val['pinned']) {
          opacity = this.settings.pinOpacity;
          depthTest = false;
        }
        for (var i in val.object.children) {
          if (val['opacity'] >= 0.)
          val.object.children[i].material.opacity = opacity * val['opacity'];
          else
          val.object.children[i].material.opacity = opacity;
          val.object.children[i].material.depthTest = depthTest;
        }
      }
      
      var val = this.meshDict[this.states.highlight];
      var op = val['opacity'];
      for (var i in val.object.children) {
        if (op >= 0.)
        val.object.children[i].material.opacity = this.settings.highlightedObjectOpacity * op;
        else
        val.object.children[i].material.opacity = this.settings.highlightedObjectOpacity;
        val.object.children[i].material.depthTest = false;
      }
    }
    else if (this.states.highlight) {
      return;
      // Either entering pinned mode or pinned mode settings changing
    }
    else if ((e.prop == 'highlight' && this.states.pinned) ||
      (e.prop == 'pinned' && e.value && this.uiVars.pinnedObjects.size == 1) ||
      (e.prop == 'pinLowOpacity') || (e.prop == 'pinOpacity')) {
      for (const key of Object.keys(this.meshDict)) {
        var val = this.meshDict[key];
        if (!val['background']) {
          var opacity = this.meshDict[key]['pinned'] ? this.settings.pinOpacity : this.settings.pinLowOpacity;
          var depthTest = !this.meshDict[key]['pinned'];
          for (var i in val.object.children) {
            if (val['opacity'] >= 0.)
            val.object.children[i].material.opacity = opacity * val['opacity'];
            else
            val.object.children[i].material.opacity = opacity;
            val.object.children[i].material.depthTest = depthTest;
          }
        }
        else {
          var op = val['opacity'];
          if (val['opacity'] >= 0.)
          val.object.children[i].material.opacity = this.settings.backgroundOpacity * val['opacity'];
          else
          val.object.children[i].material.opacity = this.settings.backgroundOpacity;
          val.object.children[1].material.opacity = this.settings.backgroundWireframeOpacity;
        }
      }
    }
    // New object being pinned while already in pinned mode
    else if (e.prop == 'pinned' && this.states.pinned) {
      for (var i in e.obj.object.children) {
        var op = val['opacity'];
        if (val['opacity'] >= 0.)
        e.obj.object.children[i].material.opacity = ((e.value) ? this.settings.pinOpacity : this.settings.pinLowOpacity)* val['opacity'];
        else
        e.obj.object.children[i].material.opacity = (e.value) ? this.settings.pinOpacity : this.settings.pinLowOpacity;
        e.obj.object.children[i].material.depthTest = !e.value;
      }
    }
    // Default opacity value change in upinned mode or exiting highlight mode
    else if (!this.states.pinned || e.prop == 'highlight') {
      this.resetOpacity();
    }
  }
  resetOpacity() {
    var val = this.settings.defaultOpacity;
    for (const key of Object.keys(this.meshDict)) {
      if (!this.meshDict[key]['background']) {
        if (!('morph_type' in this.meshDict[key]) ||
          (this.meshDict[key]['morph_type'] != 'Synapse SWC')) {
          for (let i in this.meshDict[key].object.children) {
            if (this.meshDict[key]['opacity'] >= 0.)
            this.meshDict[key].object.children[i].material.opacity = this.meshDict[key]['opacity'] * this.settings.defaultOpacity;
            else
            this.meshDict[key].object.children[i].material.opacity = this.settings.defaultOpacity;}
        }
        else {
          for (let i in this.meshDict[key].object.children)
          if (this.meshDict[key]['opacity'] >= 0.)
            this.meshDict[key].object.children[i].material.opacity = this.meshDict[key]['opacity'] * this.settings.synapseOpacity;
          else
            this.meshDict[key].object.children[i].material.opacity = this.settings.synapseOpacity;
        }
      }
      else {
        if (this.meshDict[key]['opacity'] >= 0.)
        {
          this.meshDict[key].object.children[0].material.opacity = this.meshDict[key]['opacity'] * this.settings.backgroundOpacity;
          this.meshDict[key].object.children[1].material.opacity = this.meshDict[key]['opacity'] * this.settings.backgroundWireframeOpacity;
        }
        else
        {
        this.meshDict[key].object.children[0].material.opacity = this.settings.backgroundOpacity;
        this.meshDict[key].object.children[1].material.opacity = this.settings.backgroundWireframeOpacity;
        }
      }
    }
  }
  asarray(variable) {
    if (variable.constructor !== Array)
      variable = [variable];
    return variable;
  }
  updatePinned(e) {
    if (e.obj['pinned']) {
      this.uiVars.pinnedObjects.add(e.path[0]);
    }
    else {
      this.uiVars.pinnedObjects.delete(e.path[0]);
    }
    this.states.pinned = (this.uiVars.pinnedObjects.size > 0);
  }
  pin(id) {
    id = this.asarray(id);
    for (var i = 0; i < id.length; ++i) {
      if (!(id[i] in this.meshDict) || this.meshDict[id[i]]['pinned'])
        continue;
      this.meshDict[id[i]]['pinned'] = true;
    }
  }
  unpin(id) {
    id = this.asarray(id);
    for (var i = 0; i < id.length; ++i) {
      if (!(id[i] in this.meshDict) || !this.meshDict[id[i]]['pinned'])
        continue;
      this.meshDict[id[i]]['pinned'] = false;
    }
  }
  getPinned() {
    return Array.from(this.uiVars.pinnedObjects);
  }
  getUnpinned() {
    var list = [];
    for (var key of Object.keys(this.meshDict)) {
      if (!this.meshDict[key]['background'] && !this.meshDict[key]['pinned'])
        list.push(key);
    }
    return list;
  }
  remove(id) {
    id = this.asarray(id);
    for (var i = 0; i < id.length; ++i) {
      if (!(id[i] in this.meshDict))
        continue;
      delete this.meshDict[id[i]];
    }
  }
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
    for (var i = 0; i < id.length; ++i) {
      if (!(id[i] in this.meshDict))
        continue;
      var meshobj = this.meshDict[id[i]].object;
      for (var j = 0; j < meshobj.children.length; ++j) {
        meshobj.children[j].material.color.set(color);
        meshobj.children[j].geometry.colorsNeedUpdate = true;
        for (var k = 0; k < meshobj.children[j].geometry.colors.length; ++k) {
          meshobj.children[j].geometry.colors[k].set(color);
        }
      }
      this.meshDict[id[i]].color = new THREE.Color(color);
    }
  }
  setBackgroundColor(color) {
    if (Array.isArray(color))
      color = new THREE.Color().fromArray(color);
    for (var i = 0; i < this.groups.back.children.length; ++i) {
      var meshobj = this.groups.back.children[i];
      for (var j = 0; j < meshobj.children.length; ++j) {
        meshobj.children[j].material.color.set(color);
        meshobj.children[j].geometry.colorsNeedUpdate = true;
        for (var k = 0; k < meshobj.children[j].geometry.colors.length; ++k) {
          meshobj.children[j].geometry.colors[k].set(color);
        }
      }
    }
  }
  resetView() {
    if (this._metadata["enablePositionReset"] == true) {
      this.camera.position.z = this._metadata["resetPosition"]['z'];
      this.camera.position.y = this._metadata["resetPosition"]['y'];
      this.camera.position.x = this._metadata["resetPosition"]['x'];
      this.camera.up.y = this._metadata["upSign"];
    }
    this.controls.target0.x = 0.5 * (this.boundingBox.minX + this.boundingBox.maxX);
    this.controls.target0.y = 0.5 * (this.boundingBox.minY + this.boundingBox.maxY);
    this.controls.reset();
  }
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
      for (var i = 0; i < 8; i++) {
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
    //this.controls.reset();
  }
  togglePin(d) {
    if (!this._metadata.allowPin)
      return;
    if (typeof (d) === 'string' && (d in this.meshDict)) {
      d = this.meshDict[d];
    }
    d['pinned'] = !d['pinned'];
  }
  unpinAll() {
    if (!this._metadata.allowPin)
      return;
    for (var key of this.uiVars.pinnedObjects)
      this.meshDict[key]['pinned'] = false;
  }

  /**
   * 
   * @param {String} name 
   * @param {String} icon 
   * @param {String} tooltip 
   * @param {()=>{}} func 
   */
  createUIBtn(name, icon, tooltip, func) {
    let UIFolder;
    try {
      UIFolder = this.controlPanel.addFolder('UI Controls');
    }catch(e){
      UIFolder = this.controlPanel.__folders["UI Controls"];
    }
    // constructor for new UI button
    let newButton = function () {
      this[name] = func;
    };

    let btn = new newButton();
    UIFolder.add(btn,name).title(tooltip);
  }
  createToolTip() {
    this.toolTipDiv = document.createElement('div');
    this.toolTipDiv.style.cssText = 'position: fixed; text-align: center; width: auto; min-width: 100px; height: auto; padding: 2px; font: 12px arial; z-index: 999; background: #ccc; border: solid #212121 3px; border-radius: 8px; pointer-events: none; opacity: 0.0; color: #212121';
    this.toolTipDiv.style.transition = "opacity 0.5s";
    this.container.appendChild(this.toolTipDiv);
  }
  show3dToolTip(d) {
    this.toolTipDiv.style.opacity = .9;
    this.toolTipDiv.innerHTML = d;
    this.domRect = this.renderer.domElement.getBoundingClientRect();
    var toolTipRect = this.toolTipDiv.getBoundingClientRect();
    var left = this.uiVars.toolTipPosition.x + 10;
    if (left + toolTipRect.width > this.domRect.right)
      left = this.domRect.right - 10 - toolTipRect.width;
    var top = this.uiVars.toolTipPosition.y + 10;
    if (top + toolTipRect.height > this.domRect.bottom)
      top = this.uiVars.toolTipPosition.y - 10 - toolTipRect.height;
    this.toolTipDiv.style.left = left + "px";
    this.toolTipDiv.style.top = top + "px";
  }
  hide3dToolTip() {
    this.toolTipDiv.style.opacity = 0.0;
  }
  _getInfo(d) {
    return d;
  }
  getNeuronScreenPosition(id) {
    var vector = this.meshDict[id].position.clone();
    var canvasRect = this.renderer.domElement.getBoundingClientRect();
    // map to normalized device coordinate (NDC) space
    vector.project(this.camera);
    // map to 2D screen space
    vector.x = Math.round((vector.x + 1) * canvasRect.width / 2) + canvasRect.left;
    vector.y = Math.round((-vector.y + 1) * canvasRect.height / 2) + canvasRect.top;
    return { 'x': vector.x, 'y': vector.y };
  }
  syncControls(ffbomesh) {
    if (this === ffbomesh)
      return;
    this.controls.target.copy(ffbomesh.controls.target);
    this.camera.position.copy(ffbomesh.camera.position);
    this.camera.up.copy(ffbomesh.camera.up);
    this.camera.lookAt(ffbomesh.controls.target);
  }
};

var _saveImage;

window.onload = () => {
  _saveImage = (function () {
    var a = document.createElement("a");
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








var datGuiPresets = {
  "preset": "Default",
  "closed": false,
  "remembered": {
    "Low": {
      "0": {
        "neuron3d": false,
        "neuron3dMode": "1",
        "synapseMode": true,
        "meshWireframe": true,
        "backgroundColor": "#260226",
        "defaultOpacity": 0.7,
        "synapseOpacity": 1,
        "nonHighlightableOpacity": 0.1,
        "lowOpacity": 0.1,
        "pinOpacity": 0.9,
        "pinLowOpacity": 0.15,
        "highlightedObjectOpacity": 1,
        "backgroundOpacity": 1,
        "backgroundWireframeOpacity": 0.07,
        "defaultRadius": 0.5,
        "defaultSomaRadius": 3,
        "defaultSynapseRadius": 0.2
      },
      "1": {
        "brightness": 0.95
      },
      "2": {
        "radius": 0.2,
        "strength": 0.2,
        "threshold": 0.3
      },
      "3": {
        "enabled": true
      },
      "4": {
        "enabled": false
      }
    },
    "High": {
      "0": {
        "neuron3d": true,
        "neuron3dMode": "3",
        "synapseMode": true,
        "meshWireframe": true,
        "backgroundColor": "#260226",
        "defaultOpacity": 0.7,
        "synapseOpacity": 1,
        "nonHighlightableOpacity": 0.1,
        "lowOpacity": 0.1,
        "pinOpacity": 0.9,
        "pinLowOpacity": 0.15,
        "highlightedObjectOpacity": 1,
        "backgroundOpacity": 1,
        "backgroundWireframeOpacity": 0.07,
        "defaultRadius": 0.5,
        "defaultSomaRadius": 3,
        "defaultSynapseRadius": 0.2
      },
      "1": {
        "brightness": 0.95
      },
      "2": {
        "radius": 0.2,
        "strength": 0.2,
        "threshold": 0.3
      },
      "3": {
        "enabled": true
      },
      "4": {
        "enabled": true
      }
    },
    "Default": {
      "0": {
        "neuron3d": true,
        "neuron3dMode": "2",
        "synapseMode": true,
        "meshWireframe": true,
        "backgroundColor": "#260226",
        "defaultOpacity": 0.7,
        "synapseOpacity": 1,
        "nonHighlightableOpacity": 0.1,
        "lowOpacity": 0.1,
        "pinOpacity": 0.9,
        "pinLowOpacity": 0.15,
        "highlightedObjectOpacity": 1,
        "backgroundOpacity": 1,
        "backgroundWireframeOpacity": 0.07,
        "defaultRadius": 0.5,
        "defaultSomaRadius": 3,
        "defaultSynapseRadius": 0.2
      },
      "1": {
        "brightness": 0.95
      },
      "2": {
        "radius": 0.2,
        "strength": 0.2,
        "threshold": 0.3
      },
      "3": {
        "enabled": true
      },
      "4": {
        "enabled": true
      }
    }
  },
  "folders": {
    "Settings": {
      "preset": "Default",
      "closed": true,
      "folders": {
        "Display Mode": {
          "preset": "Default",
          "closed": true,
          "folders": {}
        },
        "Visualization": {
          "preset": "Default",
          "closed": true,
          "folders": {
            "Opacity": {
              "preset": "Default",
              "closed": true,
              "folders": {}
            },
            "Advanced": {
              "preset": "Default",
              "closed": true,
              "folders": {}
            }
          }
        },
        "Size": {
          "preset": "Default",
          "closed": true,
          "folders": {}
        }
      }
    }
  }
}















THREE.Lut.prototype.addColorMap( 'rainbow_gist', [
  [ 0.000000, '0xff0028' ], [ 0.031250, '0xff0100' ], [ 0.062500, '0xff2c00' ],
  [ 0.093750, '0xff5700' ], [ 0.125000, '0xff8200' ], [ 0.156250, '0xffae00' ],
  [ 0.187500, '0xffd900' ], [ 0.218750, '0xf9ff00' ], [ 0.250000, '0xceff00' ],
  [ 0.281250, '0xa3ff00' ], [ 0.312500, '0x78ff00' ], [ 0.343750, '0x4dff00' ],
  [ 0.375000, '0x22ff00' ], [ 0.406250, '0x00ff08' ], [ 0.437500, '0x00ff33' ],
  [ 0.468750, '0x00ff5e' ], [ 0.500000, '0x00ff89' ], [ 0.531250, '0x00ffb3' ],
  [ 0.562500, '0x00ffde' ], [ 0.593750, '0x00f4ff' ], [ 0.625000, '0x00c8ff' ],
  [ 0.656250, '0x009dff' ], [ 0.687500, '0x0072ff' ], [ 0.718750, '0x0047ff' ],
  [ 0.750000, '0x001bff' ], [ 0.781250, '0x0f00ff' ], [ 0.812500, '0x3a00ff' ],
  [ 0.843750, '0x6600ff' ], [ 0.875000, '0x9100ff' ], [ 0.906250, '0xbc00ff' ],
  [ 0.937500, '0xe800ff' ], [ 0.968750, '0xff00ea' ], [ 1.000000, '0xff00bf' ],
]);


THREE.Lut.prototype.addColorMap( 'no_purple', [
  [0.000000, '0xFF4000'],
  [0.017544, '0xFF4D00'],
  [0.035088, '0xFF5900'],
  [0.052632, '0xFF6600'],
  [0.070175, '0xFF7300'],
  [0.087719, '0xFF8000'],
  [0.105263, '0xFF8C00'],
  [0.122807, '0xFF9900'],
  [0.140351, '0xFFA600'],
  [0.157895, '0xFFB300'],
  [0.175439, '0xFFBF00'],
  [0.192982, '0xFFCC00'],
  [0.210526, '0xFFD900'],
  [0.228070, '0xFFE500'],
  [0.245614, '0xFFF200'],
  [0.263158, '0xFFFF00'],
  [0.280702, '0xF2FF00'],
  [0.298246, '0xE6FF00'],
  [0.315789, '0xD9FF00'],
  [0.333333, '0xCCFF00'],
  [0.350877, '0xBFFF00'],
  [0.368421, '0xB3FF00'],
  [0.385965, '0xAAFF00'],
  [0.403509, '0x8CFF00'],
  [0.421053, '0x6EFF00'],
  [0.438596, '0x51FF00'],
  [0.456140, '0x33FF00'],
  [0.473684, '0x15FF00'],
  [0.491228, '0x00FF08'],
  [0.508772, '0x00FF26'],
  [0.526316, '0x00FF44'],
  [0.543860, '0x00FF55'],
  [0.561404, '0x00FF62'],
  [0.578947, '0x00FF6F'],
  [0.596491, '0x00FF7B'],
  [0.614035, '0x00FF88'],
  [0.631579, '0x00FF95'],
  [0.649123, '0x00FFA2'],
  [0.666667, '0x00FFAE'],
  [0.684211, '0x00FFBB'],
  [0.701754, '0x00FFC8'],
  [0.719298, '0x00FFD4'],
  [0.736842, '0x00FFE1'],
  [0.754386, '0x00FFEE'],
  [0.771930, '0x00FFFB'],
  [0.789474, '0x00F7FF'],
  [0.807018, '0x00EAFF'],
  [0.824561, '0x00DDFF'],
  [0.842105, '0x00D0FF'],
  [0.859649, '0x00C3FF'],
  [0.877193, '0x00B7FF'],
  [0.894737, '0x00AAFF'],
  [0.912281, '0x009DFF'],
  [0.929825, '0x0091FF'],
  [0.947368, '0x0084FF'],
  [0.964912, '0x0077FF'],
  [0.982456, '0x006AFF'],
  [1.000000, '0x005EFF'],
]);
