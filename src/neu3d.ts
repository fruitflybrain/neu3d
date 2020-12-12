import { FFBOLightsHelper } from './lightshelper';
import { MeshDict, MeshItem } from './mesh_dict';
import { 
  Vector2, Raycaster,
  Group, WebGLRenderer,
  Scene, Vector3, LoadingManager, 
  PerspectiveCamera, Color, Mesh, Geometry
} from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';

// add FontAwesome
import '@fortawesome/fontawesome-free/js/all.js';
const STATS = require('../etc/stats');
import '../style/index.css';
// import { ControlPanel, IDatGUIOptions } from './control_panel';
import { ControlPanel } from './control_panel_tweakpane';
import { PostProcessor } from './post_process';

/**
 * Neu3D 
 */
export class Neu3D {
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: TrackballControls;
  loadingManager: LoadingManager;
  // private _take_screenshot = false;
  container: HTMLDivElement;
  meshDict: MeshDict;
  private _addingJsons = false;
  private _animationId: any = null;
  private _addedDOMElements: { [name: string]: HTMLElement } = {};
  private _containerEventListener: { [name: string]: any } = {};
  private _fov: number;
  private _prevhfov: number;

  postProcess: PostProcessor;
  _metadata: Neu3D.IMetaData;
  states: Neu3D.IStates;
  animation: Neu3D.IAnimation;
  activeRender: Neu3D.IActiveRender;
  raycaster: Raycaster;
  uiVars: Neu3D.IUIVars;
  renderSettings: Neu3D.IRenderSettings;
  lightsHelper: FFBOLightsHelper;
  stats: any; // TODO: add typing stats panel
  controlPanel: ControlPanel;
  scenes = {
    front: new Scene(),
    back: new Scene()
  };
  fileUploadInput: HTMLInputElement;
  commandDispatcher: { [name: string]: Function };

  constructor(
    container: HTMLDivElement,
    data: object | any,
    metadata: object | any,
    options: Neu3D.IOptions = {}
  ) {
    this.container = container;
    this.activeRender = {
      resINeed: 0,
      activeRender: true,
      powerSaving: false
    }
    this.meshDict = new MeshDict(
      metadata?.colormap ?? "rainbow",
      {}// settings
    );
    this.animation = {
      activityData: {},
      it1: null,
      it2: null,
      meshOscAmp: 0
    }
    this.states = {
      mouseOver: false,
      pinned: false,
      highlight: false
    };

    this._metadata = {
      colormap: metadata?.colormap ?? "rainbow",
      maxColorNum: metadata?.maxColorNum ??  1747591,
      allowPin: metadata?.allowPin ??  true,
      allowHighlight: metadata?.allowHighlight ??  true,
      enablePositionReset: metadata?.enablePositionReset ??  false,
      resetPosition: metadata?.resetPosition ??  new Vector3(0., 0., 0.),
      upVector: metadata?.upVector ??  new Vector3(0., 1., 0.),
      cameraTarget: metadata?.cameraTarget ??  new Vector3(0., 0., 0.),
      upSign: metadata?.upSign ??  1. // TODO: Deprecated
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
      toolTipPosition: new Vector2(),
      highlightedObjects: null,
      currentIntersected: undefined,
      cursorPosition: new Vector2(-100000, -100000),
      meshNum: 0,
      frontNum: 0,
      backNum: 0,
      tooltip: undefined,
      selected: undefined
    };

    // Mesh.raycast = acceleratedRaycast;
    this.raycaster = new Raycaster();
    this.raycaster.params.Line.threshold = 3;
  
    if (options.stats) {
      this.stats = STATS.Stats();
      this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
      this.stats.dom.style.position = "relative";
      this.stats.dom.className += ' vis-3d-stats'
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
    this.postProcess = new PostProcessor(this.camera, this.scenes, this.renderer, this.container);

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
      'resetview': this.resetView,
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
      this.meshDict.addJSON(data);
    }

    this.addDivs();
    window.onresize = this.onWindowResize.bind(this);

    let controlPanelDiv = document.createElement('div');
    controlPanelDiv.className = 'vis-3d-settings';
    // uncomment the line below if using TweakPane
    this.controlPanel = new ControlPanel(this, controlPanelDiv);
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
  addDivs(){ 
    // add file input
    let ffbomesh = this.meshDict;
    let fileUploadInput = document.createElement('input');
    fileUploadInput.multiple = true;
    fileUploadInput.id = `neu3d-file-upload-${Neu3D.generateGuid()}`;
    fileUploadInput.setAttribute("type", "file");
    fileUploadInput.style.visibility = 'hidden';
    fileUploadInput.style.display = 'none';
    fileUploadInput.onchange = (evt) => {
      for (let i=0; i<(evt.target as any).files.length; i++) {
        const file = (evt.target as any).files.item(i);
        const name = file.name.split('.')[0];
        let isSWC = false;
        if (file.name.match('.+(\.swc)$')) {
          isSWC = true;
        }
        let reader = new FileReader();
        reader.onload = (event) => {
          let json: {[rid: string]: any} = {};
          json[name] = {
            label: name,
            dataStr: event.target.result,
            filetype: 'swc'
          };
          if (isSWC === true){
            ffbomesh.addJSON({ ffbo_json: json });
          } else {
            ffbomesh.addJSON({ ffbo_json: json, type: 'obj' });
          }
        };
        reader.readAsText(file);
      }
    }

    // this input has to be added as siblinig of vis-3d
    // becuase vis-3d blocks click event propagation.
    document.body.appendChild(fileUploadInput);
    this._addedDOMElements['fileupload'] = fileUploadInput;
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
    for (let [name, el] of Object.entries(this._addedDOMElements)){
      el.remove();
      delete this._addedDOMElements[name];
    }
  }

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

  async addJSON(json: any) {
    this._addingJsons = true;
    await this.meshDict.addJSON(json);
    this.meshDict.updateOpacity();
    this._addingJsons = false;
  }

  clearActivity() {
    clearInterval(this.animation.it1);
    clearInterval(this.animation.it2);
  }

  /**
   * Animate Meshes based on activity data
   * @param activityData 
   * @param t_i 
   * @param interval 
   * @param interpolation_interval 
   */
  animateActivity(activityData: any, t_i: number, interval: number, interpolation_interval: number) {
    let ffbomesh = this;

    this.animation.activityData = activityData;
    let t = t_i || 0;
    let t_max = activityData[Object.keys(activityData)[0]].length;
    let interp = 0;
    this.animation.it1 = setInterval(frame, interval);
    this.animation.it2 = setInterval(intFrame, interpolation_interval);
    function intFrame() {
      interp += interpolation_interval / interval;
      let t_current = t;
      let t_next = t + 1;
      if (t_next == t_max)
        t_next = 0;
      for (let key in activityData) {
        ffbomesh.meshDict.meshDict[key].opacity = activityData[key][t_current] * (1 - interp) + activityData[key][t_next] * (interp);
      }
      ffbomesh.meshDict.resetOpacity();
    }
    function frame() {
      interp = 0;
      t = t + 1;
      if (t == t_max)
        t = 0;
    }
  }

  /** Initialize WebGL Renderer */
  private initCamera() {
    let height = this.container.clientHeight;
    let width = this.container.clientWidth;

    this._fov = 20;
    this._prevhfov = 2 * Math.atan(Math.tan(Math.PI * this._fov / 2 / 180) * width / height);

    let camera = new PerspectiveCamera(this._fov, width / height, 0.1, 10000000);
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
  private initRenderer() {
    let renderer = new WebGLRenderer({ 'logarithmicDepthBuffer': true });
    // TODO: add adaptive resolution
    // renderer.setPixelRatio(window.devicePixelRatio * this.settings.render_resolution);
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

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
  private initControls() {
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

  /** Initialize Scene */
  private initScenes() {
    let scenes = {
      front: new Scene(),
      back: new Scene()
    };

    scenes.front.background = null;
    scenes.front.add(this.camera);

    scenes.back.background = new Color(0x030305);
    scenes.back.add(this.camera);

    scenes.front.add(this.meshDict.groups.front);
    scenes.back.add(this.meshDict.groups.back);
    return scenes;
  }


  /** Initialize FFBOLightsHelper */
  private initLights() {
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
      position: new Vector3(0, 0, 5000),
      key: 'frontDirectional_1'
    });

    lightsHelper.addDirectionalLight({
      intensity: 0.55,
      position: new Vector3(0, 0, 5000),
      scene: this.scenes.back,
      key: 'backDirectional_1'
    });

    lightsHelper.addDirectionalLight({
      intensity: 0.1,
      position: new Vector3(0, 0, -5000),
      key: 'frontDirectional_2'
    });

    lightsHelper.addDirectionalLight({
      intensity: 0.55,
      position: new Vector3(0, 0, -5000),
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
 private initLoadingManager() {
    let loadingManager = new LoadingManager();
    loadingManager.onLoad = () => {
      this.controls.target0.x = 0.5 * (this.meshDict.boundingBox.min.x + this.meshDict.boundingBox.max.x);
      this.controls.target0.y = 0.5 * (this.meshDict.boundingBox.min.y + this.meshDict.boundingBox.max.y);
      // this.controls.reset();
      this.meshDict.groups.front.visible = true;
    };
    return loadingManager;
  }

  /**
   * Import Visualization settings
   * @param settings 
   */
  import_settings(settings: any) {
    settings = Object.assign({}, settings);
    if ('lightsHelper' in settings) {
      this.lightsHelper.import(settings.lightsHelper);
      delete settings.lightsHelper;
    }

    if ('postProcessing' in settings) {
      let postProcessing = settings.postProcessing;
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
      let bg = settings.backgroundColor;
      setTimeout(() => {
        this.meshDict.setBackgroundColor(bg);
      }, 4000);
      delete settings.backgroundColor;
    }
    Object.assign(this.meshDict.settings, settings);
  }

  /** 
  * Export state of the workspace 
  * 
  * Note: useful for tagging
  */
  export_state(): any {
    let colors: {[rid: string]: number[]} = {}
    let visibilities: { [rid: string]: boolean } = {}
    for (let [rid, mesh] of Object.entries(this.meshDict.meshDict)) {
      colors[rid] = (mesh.color as Color).toArray();
      visibilities[rid] = mesh.visibility;
    }
    return {
      color: colors,
      pinned: this.meshDict.pinned,
      visibility: visibilities,
      camera:{
        position: {
          x: this.camera.position.x,
          y: this.camera.position.y,
          z: this.camera.position.z,
        },
        up: {
          x: this.camera.up.x,
          y: this.camera.up.y,
          z: this.camera.up.z,
        }
      }, 
      target: {
        x: this.controls.target.x,
        y: this.controls.target.y,
        z: this.controls.target.z,
      }
    };
  }

  /**
  * Import State
  * 
  * Note: useful for tagging
  * @param {object} state_metadata 
  */
  import_state(state_metadata: any) {
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
    for (let i = 0; i < state_metadata['pinned'].length; ++i) {
      let key = state_metadata['pinned'][i];
      if (this.meshDict.meshDict.hasOwnProperty(key)) {
        this.meshDict.meshDict[key].pinned = true;
      }
    }
    for (let key of Object.keys(state_metadata['visibility'])) {
      if (!this.meshDict.hasOwnProperty(key)) {
        continue;
      }
      this.meshDict.meshDict[key].visibility = state_metadata['visibility'][key];
      if (this.meshDict.meshDict[key].background) {
        continue;
      }
      let meshobj = this.meshDict.meshDict[key].object;
      let color = state_metadata['color'][key];
      for (let j = 0; j < meshobj.children.length; ++j) {
        ((meshobj.children[j] as Mesh).material as MeshDict.Neu3DMaterial).color.fromArray(color);
        for (let k = 0; k < ((meshobj.children[j] as Mesh).geometry as Geometry).colors.length; ++k) {
          ((meshobj.children[j] as Mesh).geometry as Geometry).colors[k].fromArray(color);
        }
        ((meshobj.children[j] as Mesh).geometry as Geometry).colorsNeedUpdate = true;
      }
    }
  }

  /** 
   * Update selected object 
   * @param {string} rid uid of selected object
   */
  select(rid: string) {
    this.uiVars.selected = rid;
  }

  /** 
   * Reset workspace 
   * 
   * @param {boolean=} resetBackground whether to reset background
   */
  reset(resetBackground: boolean = false) {
    this.meshDict.reset(resetBackground); // call MeshDict's reset function
    if (resetBackground) {
      this.controls.target0.set(0, 0, 0);
    }
  }

  /**
   * Setup event listener for the container
   */
  private _addContainerEventListener(){
    let func_0 = this.onDocumentMouseClick.bind(this);
    this.container.addEventListener('click', func_0, false);
    this._containerEventListener['click'] = func_0;

    let func_1 = this.onDocumentMouseDBLClick.bind(this);
    this.container.addEventListener('dblclick', func_1, false);
    this._containerEventListener['dblclick'] = func_1;

    if (Neu3D.isOnMobile) {
      let func_2 = this.onDocumentMouseDBLClickMobile.bind(this);
      // this.container.addEventListener('taphold', func_2);
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

  removeContainerEventListener(){
    for (let [evtName, func] of Object.entries(this._containerEventListener)){
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
  }

  /**
   * 
   * @param {object} json 
   */
  execCommand(json: any) {
    let neuList = json['neurons'] || [];
    let commandList = json['commands'] || [];
    let args = json['args'] || undefined;

    neuList = Neu3D.asArray(neuList);
    commandList = Neu3D.asArray(commandList);
    for (let i = 0; i < commandList.length; ++i) {
      let c = commandList[i].toLowerCase();
      this.commandDispatcher[c].call(this, neuList, args);
    }
  }

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


  animate() {
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
    if ((this.activeRender && this.activeRender.powerSaving) || (!(this.activeRender.powerSaving))){
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
  onDocumentDrop(event: DragEvent) {
    event.preventDefault();

    let ffbomesh = this.meshDict;
    for (let i=0; i<event.dataTransfer.files.length; i++) {
      const file = event.dataTransfer.files.item(i);
      const name = file.name.split('.')[0];
      let isSWC = false;
      if (file.name.match('.+(\.swc)$')) {
        isSWC = true;
      }
      let reader = new FileReader();
      reader.onload = (evt) => {
        let json: {[rid: string]: any} = {};
        json[name] = {
          label: name,
          dataStr: evt.target.result,
          filetype: 'swc'
        };
        if (isSWC === true){
          ffbomesh.addJSON({ ffbo_json: json });
        } else {
          ffbomesh.addJSON({ ffbo_json: json, type: 'obj' });
        }
      };
      reader.readAsText(file);
    }
  }

  /**
   * Mouse Click Event
   * @param {*} event 
   */
  onDocumentMouseClick(event:MouseEvent) {
    if (event !== undefined) {
      event.preventDefault();
    }
    let intersected = this.getIntersection([this.meshDict.groups.front]);
    if (intersected != undefined && intersected['highlight']) {
      this.select(intersected.rid);
    }
  }

  blockDragEvents(event: DragEvent) {
    event.preventDefault(); 
    event.stopPropagation()
  }

  blockContextMenu() {
    return false;
  }

  /**
   * Double Click callback
   * Toggle pin
   * @param event 
   */
  onDocumentMouseDBLClick(event: MouseEvent) {
    if (event !== undefined) {
      event.preventDefault();
    }
    let intersected = this.getIntersection([this.meshDict.groups.front]);
    if (intersected != undefined) {
      if (!intersected['highlight']) {
        return;
      }
      intersected.togglePin();
    }
  }

  /**
   * Double Click Mobile
   * Toggle Pin
   * @param event 
   */
  onDocumentMouseDBLClickMobile(event: MouseEvent) {
    if (!Neu3D.isOnMobile) { // do nothing if not on mobile
      return;
    }
    if (event !== undefined) {
      event.preventDefault();
    }
    let intersected = this.getIntersection([this.meshDict.groups.front]);
    if (intersected != undefined) {
      if (!intersected['highlight']) {
        return;
      }
      intersected.togglePin();
    }
  }

  /** 
   * Overload mouse move event 
   * Move tooltip to follow mouse 
   * @param event 
   */
  onDocumentMouseMove(event: MouseEvent) {
    event.preventDefault();
    this.states.mouseOver = true;
    let rect = this.container.getBoundingClientRect();
    this.uiVars.toolTipPosition.x = event.clientX;
    this.uiVars.toolTipPosition.y = event.clientY;
    this.uiVars.cursorPosition.x = ((event.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
    this.uiVars.cursorPosition.y = -((event.clientY - rect.top) / this.container.clientHeight) * 2 + 1;
  }

  /**
   * Set mouseover and active Render to true
   * @param event 
   */
  onDocumentMouseEnter(event: MouseEvent) {
    event.preventDefault();
    this.states.mouseOver = true;
    this.activeRender.activeRender = true;
  }

  /**
   * On Mouse Leave to disable highlight
   * @param event - mouse event whose default is overwritten
   */
  onDocumentMouseLeave(event: MouseEvent) {
    event.preventDefault();
    this.highlight(false);
    this.states.mouseOver = false;
    this.activeRender.activeRender = false;
  }


  /**
   * Response to window resize 
   * Resizes the canvas and scale ThreeJS cameras accrodingly
   */
  onWindowResize() {
    let height = this.container.clientHeight;
    let width = this.container.clientWidth;
    let aspect = width / height;
    let cam_dir = new Vector3();
    cam_dir.subVectors(this.camera.position, this.controls.target);
    let prevDist = cam_dir.length();
    cam_dir.normalize();
    let hspan = prevDist * 2 * Math.tan(this._prevhfov / 2);

    this._prevhfov = 2 * Math.atan(Math.tan(Math.PI * this._fov / 2 / 180) * aspect);

    let dist = hspan / 2 / Math.tan(this._prevhfov / 2);
    this.camera.position.copy(this.controls.target);
    this.camera.position.addScaledVector(cam_dir, dist);

    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.postProcess.composer.setSize(
      width * window.devicePixelRatio,
      height * window.devicePixelRatio
    );
    this.postProcess.effectFXAA.uniforms['resolution'].value.set(1 / Math.max(width, 1440), 1 / Math.max(height, 900));
    this.controls.handleResize();
    this.render();
    // TODO: Check
    // if (this.dispatch['resize'] !== undefined) {
    //   this.dispatch['resize']();
    // }
  }


  /**
   * Render 
   */
  render() {
    if (this._addingJsons) {
      return;
    }
    if (this.states.highlight) {
      // do nothing
    } else {
      if (this.animation.meshOscAmp && this.animation.meshOscAmp > 0) {
        for (let [rid, mesh] of Object.entries(this.meshDict.meshDict)) {
          if (mesh.object !== undefined) {
            let x = new Date().getTime();
            if (mesh.background) {
              let scale = (this.meshDict.settings.backgroundOpacity + 0.5 * this.animation.meshOscAmp * (1 + Math.sin(x * .0005)));
              if (mesh.opacity >= 0.00) {
                this.meshDict.setOpacity(rid, mesh.opacity * scale);
              } else {
                this.meshDict.setOpacity(rid, scale);
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
      let intersected = this.getIntersection([this.meshDict.groups.front, this.meshDict.groups.back]);
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
  }

  // screenshot() {
  //   this._take_screenshot = true;
  // }

  /**
   * Raycaster intersection groups
   * @param groups 
   */
  getIntersection(groups: Group[]): MeshItem {
    let val = undefined;
    let object = undefined;
    this.raycaster.setFromCamera(this.uiVars.cursorPosition, this.camera);
    for (const group of groups) {
      let intersects = this.raycaster.intersectObjects(group.children, true);
      if (intersects.length > 0) {
        object = intersects[0].object.parent;
        if ((object as any).rid in this.meshDict) { // object rid set in meshDict addJSON callback
          val = this.meshDict.meshDict[(object as any).rid as string];
          break;
        }
      }
    }
    return val;
  }

  /**
   * Export Visualization as Object
   */
  export_settings() {
    let backgroundColor: string | number[] = [0.15, 0.01, 0.15];
    if (this.meshDict.groups.back.children.length) {
      backgroundColor = ((this.meshDict.groups.back.children[0].children[0] as Mesh).material as MeshDict.Neu3DMaterial).color.toArray();
    }
    if (this.meshDict.settings.backgroundColor !== undefined) {
      backgroundColor = this.meshDict.settings.backgroundColor;
    }
    let set = Object.assign({}, this.meshDict.settings, {
      lightsHelper: this.lightsHelper.export(),
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
  }

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
  highlight(rid: string | boolean, updatePos = true) {
    if (rid === false) {
      this.states.highlight = false;
      this.hide3dToolTip();
      return;
    }
    this.meshDict.highlight(rid as string);

    if (updatePos) {
      let pos = this.getNeuronScreenPosition(rid as string);
      this.uiVars.toolTipPosition.x = pos.x;
      this.uiVars.toolTipPosition.y = pos.y;
    }
    this.show3dToolTip(this.meshDict.meshDict[rid as string].label);
  }

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
  resetView() {
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
  }

  /**
   * Reset view based on visible objects
   */
  resetVisibleView() {
    this.meshDict.computeVisibleBoundingBox();
    let box = this.meshDict.visibleBoundingBox;
    this.controls.target.x = 0.5 * (box.min.x + box.max.x);
    this.controls.target.y = 0.5 * (box.min.y + box.max.y);
    this.controls.target.z = 0.5 * (box.min.z + box.max.z);
    this.camera.updateProjectionMatrix();
    setTimeout(() => {
      let positions = [
        new Vector3(box.min.x, box.min.y, box.min.z),
        new Vector3(box.min.x, box.min.y, box.max.z),
        new Vector3(box.min.x, box.max.y, box.min.z),
        new Vector3(box.min.x, box.max.y, box.max.z),
        new Vector3(box.max.x, box.min.y, box.min.z),
        new Vector3(box.max.x, box.min.y, box.max.z),
        new Vector3(box.max.x, box.max.y, box.min.z),
        new Vector3(box.max.x, box.max.y, box.max.z)
      ];
      // From https://stackoverflow.com/a/11771236
      let targetFov = 0.0;
      for (let i = 0; i < 8; i++) {
        let proj2d = positions[i].applyMatrix4(this.camera.matrixWorldInverse);
        let angle = Math.max(Math.abs(Math.atan(proj2d.x / proj2d.z) / this.camera.aspect), Math.abs(Math.atan(proj2d.y / proj2d.z)));
        targetFov = Math.max(targetFov, angle);
      }


      let currentFov = Math.PI * this._fov / 2 / 180;

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
   * Create Tooltip
   */
  private _createToolTip() {
    let toolTipDiv = document.createElement('div');
    toolTipDiv.style.cssText = 'position: fixed; text-align: center; width: auto; min-width: 100px; height: auto; padding: 2px; font: 12px arial; z-index: 999; background: #ccc; border: solid #212121 3px; border-radius: 8px; pointer-events: none; opacity: 0.0; color: #212121';
    toolTipDiv.style.transition = "opacity 0.5s";
    this.container.appendChild(toolTipDiv);
    this._addedDOMElements['tooltip'] = toolTipDiv;
  }

  /**
   * Show tooltip given content
   * @param content
   */
  show3dToolTip(content: string) {
    let toolTipDiv = this._addedDOMElements['tooltip'];
    toolTipDiv.style.opacity = '.9';
    toolTipDiv.innerHTML = content;
    let domRect = this.renderer.domElement.getBoundingClientRect();
    let toolTipRect = toolTipDiv.getBoundingClientRect();
    let left = this.uiVars.toolTipPosition.x + 10;
    if (left + toolTipRect.width > domRect.right) {
      left = domRect.right - 10 - toolTipRect.width;
    }
    let top = this.uiVars.toolTipPosition.y + 10;
    if (top + toolTipRect.height > domRect.bottom) {
      top = this.uiVars.toolTipPosition.y - 10 - toolTipRect.height;
    }
    toolTipDiv.style.left = left + "px";
    toolTipDiv.style.top = top + "px";
  }

  /** Hid tooltip */
  hide3dToolTip() {
    let toolTipDiv = this._addedDOMElements['tooltip'];
    toolTipDiv.style.opacity = '0.0';
  }


  /**
   * Get 2D projeted position of neuron on the screen
   * @param rid 
   */
  getNeuronScreenPosition(rid: string) {
    let vector = this.meshDict.meshDict[rid].position.clone();
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
   * @param neu3d 
   */
  syncControls(neu3d: Neu3D) {
    if (this === neu3d) {
      return;
    }

    this.controls.target.copy(neu3d.controls.target);
    this.camera.position.copy(neu3d.camera.position);
    this.camera.up.copy(neu3d.camera.up);
    this.camera.lookAt(neu3d.controls.target);
  }
};


export namespace Neu3D {
  export const isOnMobile = checkOnMobile();

  /**used for generating unique file upload div id */
  export function generateGuid(): string {
    var result, i, j;
    result = '';
    for(j=0; j<32; j++) {
      if( j == 8 || j == 12 || j == 16 || j == 20) {
        result = result + '-';
      }
      i = Math.floor(Math.random()*16).toString(16).toUpperCase();
      result = result + i;
    }
    return result;
  }

  /** Check if we are on mobile */
  export function checkOnMobile(): boolean {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
      return true;
    }
    else{
      return false;
    }
      
  }

  /**
   * return anything as array of itself
   */
  export const asArray = function (value: any): Array<any> {
    if (Array.isArray(value)) {
      return value
    } else {
      return [value];
    }
  }

  // /** Get random integer between bound including bound */
  // function getRandomIntInclusive(min: number, max: number): number {
  //   min = Math.ceil(min);
  //   max = Math.floor(max);
  //   return Math.floor(Math.random() * (max - min + 1)) + min;
  // }
  // if (!Detector.webgl) Detector.addGetWebGLMessage();

  export interface IMetaData {
    colormap: string;
    maxColorNum: number;
    allowPin: boolean;
    allowHighlight: boolean;
    enablePositionReset: boolean;
    resetPosition: Vector3;
    upVector: Vector3;
    cameraTarget: Vector3;
    upSign: number;
  }

  export interface IStates {
    mouseOver: boolean;
    pinned: boolean;
    highlight: boolean;
  }

  export interface IAnimation {
    activityData: object;
    it1: NodeJS.Timeout;
    it2: NodeJS.Timeout;
    meshOscAmp: number;
  }

  export interface IActiveRender {
    resINeed: number;
    activeRender: boolean; // Whether the animate function should render the contents of this container in every frame
    powerSaving: boolean;
  }

  export interface IUIVars {
    pinnedObjects: Set<any>; // TODO
    toolTipPosition: Vector2;
    highlightedObjects: any; // TODO
    currentIntersected: any; // TODO
    cursorPosition: Vector2;
    meshNum: number;
    frontNum: number;
    backNum: number;
    tooltip: any; // TODO
    selected: any; // TODO
  }

  export interface IOptions {
    stats?: boolean;
  }

  export interface IRenderSettings {
    toneMappingPass: { brightness: number };
    bloomPass: { radius: number, strength: number, threshold: number };
    effectFXAA: { enabled: boolean };
    backrenderSSAO: { enabled: boolean };
  }
}