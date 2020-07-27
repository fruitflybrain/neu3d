import { Lut } from 'three/examples/jsm/math/Lut';
import { 
  Color, Group, Box3, FileLoader, LoadingManager,
  Vector3, Object3D, Matrix4, Mesh, 
  MeshLambertMaterial, MeshBasicMaterial, PointsMaterial, LineBasicMaterial, 
  Geometry, CylinderGeometry,  SphereGeometry, TubeGeometry,
  QuadraticBezierCurve3, LineSegments, Points,
  Material, Face3
} from 'three';
import { PromiseDelegate } from '@lumino/coreutils';
import { SceneUtils } from 'three/examples/jsm/utils/SceneUtils';
import { Signal, ISignal } from '@lumino/signaling';
// import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'


/** Clip value in between min/max */
const clipNumber = function(number:number, min:number, max:number) {
  if (max < min){
    return number
  }
  return Math.max(min, Math.min(number, max));
}

/**
 * return anything as array of itself
 */
const asArray = function (value: any): Array<any> {
  if (Array.isArray(value)) {
    return value
  } else {
    return [value];
  }
}

/**
 * Convert any color type to Color instance
 * @param color 
 */
const convertColor = function (color: Color | string | number | number[]): Color {
  if (Array.isArray(color)) {
    return new Color().fromArray(color)
  } else if (color instanceof Color) {
    return color;
  } else {
    return new Color(color);
  }
}

/**
* Mesh Dictionary Model
*/
export class MeshDict implements MeshDict.IMeshDict {
  state = { pin: false, highlight: false };
  boundingBox = new Box3();
  visibleBoundingBox = new Box3();
  _meshDict: { [key: string]: MeshItem } = {};
  _opacityChanged = new Signal<this, MeshDict.ISettings>(this);
  _labelToRid: { [label: string]: string } = {}; // map label to Rid
  loadingManager = new LoadingManager();
  settings: MeshDict.ISettings;
  lut: Lut;
  colormap: string;
  maxColorNum: number = 1747591;
  groups = { front: new Group(), back: new Group() };

  constructor(
    colormap: string = "rainbow",
    settings: Partial<MeshDict.ISettings>
  ) {
    this.colormap = colormap;
    this.lut = this.initLut(this.colormap, this.maxColorNum);
    let that = this;
    let settingsChangeHandler = {
      set: function (obj: MeshDict.ISettings, prop: string, value: number | string | boolean) {
        if (prop.toLowerCase().includes('opacity')) {
          that._opacityChanged.emit(obj);
          that.updateOpacity();
        }
        if (prop === 'backgroundColor') {
          that.setBackgroundColor(value as any);
        }
        // if (['radius', 'strength', 'threshold', 'enabled'].includes(prop)) {
        //   that._opacityChanged.emit(obj);
        // }
        (obj as any)[prop] = value;
        return true;
      }
    }

    this.settings = new Proxy({
      defaultOpacity: settings.defaultOpacity ?? 0.7,
      synapseOpacity: settings.synapseOpacity ?? 1.0,
      nonHighlightableOpacity: settings.nonHighlightableOpacity ?? 0.1,
      lowOpacity: settings.lowOpacity ?? 0.1,
      pinOpacity: settings.pinOpacity ?? 0.9,
      pinLowOpacity: settings.pinLowOpacity ?? 0.15,
      highlightedObjectOpacity: settings.highlightedObjectOpacity ?? 1.0,
      defaultRadius: settings.defaultRadius ?? 0.5,
      defaultSomaRadius: settings.defaultSomaRadius ?? 3.0,
      defaultSynapseRadius: settings.defaultSynapseRadius ?? 0.2,
      minRadius: settings.minRadius ?? 0.1,
      minSomaRadius: settings.minSomaRadius ?? 1.0,
      minSynapseRadius: settings.minSynapseRadius ?? 0.1,
      maxRadius: settings.maxRadius ?? 1.0,
      maxSomaRadius: settings.maxSomaRadius ?? 10.0,
      maxSynapseRadius: settings.maxSynapseRadius ?? 1.,
      backgroundOpacity: settings.backgroundOpacity ?? 1.0,
      backgroundWireframeOpacity: settings.backgroundWireframeOpacity ?? 0.07,
      neuron3d: settings.neuron3d ?? false,
      neuron3dMode: settings.neuron3dMode ?? 1,
      synapseMode: settings.synapseMode ?? true,
      meshWireframe: settings.meshWireframe ?? true,
      backgroundColor: settings.backgroundColor ?? "#260226"
    }, settingsChangeHandler);
  }

  /**
   * Compute the bounding box of visible objects
   */
  computeVisibleBoundingBox(includeBackground = false): Box3 {
    let box = new Box3();
    for (let mesh of Object.values(this._meshDict)) {
      if (mesh.background && !includeBackground) {
        continue;
      }
      if (mesh.visibility) {
        box.union(mesh.boundingBox);
      }
    }
    this.visibleBoundingBox = box;
    return box;
  }

  get opacityChanged(): ISignal<this, MeshDict.ISettings> {
    return this._opacityChanged;
  }

  /** Initialize Look Up Table(Lut) for Color */
  initLut(colormap: string, maxColorNum:number) {
    let lut = new Lut(colormap, maxColorNum);
    lut.setMin(0);
    lut.setMax(1);
    return lut;
  }

  reset(resetBackground: boolean = false) {
    for (let key of Object.keys(this._meshDict)) {
      if (!resetBackground && this._meshDict[key].background) {
        continue;
      }
      if (this._meshDict[key]['pinned']) {
        this._meshDict[key]['pinned'] = false;
      }
      this.disposeMeshes();
      // --this.uiVars.meshNum;
    }
    if (resetBackground) {
      this.boundingBox.min.set(-100000, -100000, -100000);
      this.boundingBox.max.set(100000, 100000, 100000);
    }
    // this.uiVars.frontNum = 0;
    // this.states.highlight = false;
  }

  /**
   * Reset opacity to default of all objects in workspace
   */
  resetOpacity() {
    for (let [rid, mesh] of Object.entries(this._meshDict)) {
      if (!mesh.background) {
        if (mesh.morphType !== 'Synapse SWC') {
          if (mesh.opacity >= 0.) {
            this._meshDict[rid].opacity = this._meshDict[rid].opacity * this.settings.defaultOpacity;
          } else {
            this._meshDict[rid].opacity = this.settings.defaultOpacity;
          }
        } else {
          if (mesh.opacity >= 0.) {
            this._meshDict[rid].opacity = this._meshDict[rid].opacity * this.settings.synapseOpacity;
          } else {
            this._meshDict[rid].opacity = this.settings.synapseOpacity;
          }
        }
      } else {
        if (mesh.opacity >= 0.) {
          this._meshDict[rid].opacity = this._meshDict[rid].opacity * this.settings.backgroundOpacity;
        } else {
          this._meshDict[rid].opacity = this.settings.backgroundOpacity;
        }
      }
    }
  }

  /**
   * Update all neurons' opacity based on states
   */
  updateOpacity() {
    for (let mesh of Object.values(this._meshDict)) {
      mesh.updateOpacity(this.state);
    }
    // if (e.prop == 'highlight' && this.states.highlight) {
    //   let list = ((e !== undefined) && e.old_value) ? [e.old_value] : Object.keys(this.meshDict);
    //   for (const key of list) {
    //     let val = this.meshDict[key];
    //     let opacity = val['highlight'] ? this.settings.lowOpacity : this.settings.nonHighlightableOpacity;
    //     let depthTest = true;
    //     if (val['pinned']) {
    //       opacity = this.settings.pinOpacity;
    //       depthTest = false;
    //     }
    //     for (var i in val.object.children) {
    //       val.object.children[i].material.opacity = opacity;
    //       val.object.children[i].material.depthTest = depthTest;
    //     }
    //   }
    //   let val = this.meshDict[this.states.highlight];
    //   for (let i in val.object.children) {
    //     val.object.children[i].material.opacity = this.settings.highlightedObjectOpacity;
    //     val.object.children[i].material.depthTest = false;
    //   }
    // } else if (this.states.highlight) {
    //   return;
    //   // Either entering pinned mode or pinned mode settings changing
    // } else if ((e.prop == 'highlight' && this.states.pinned) ||
    //   (e.prop == 'pinned' && e.value && this.uiVars.pinnedObjects.size == 1) ||
    //   (e.prop == 'pinLowOpacity') || (e.prop == 'pinOpacity')) {
    //   for (const key of Object.keys(this.meshDict)) {
    //     var val = this.meshDict[key];
    //     if (!val['background']) {
    //       var opacity = this.meshDict[key]['pinned'] ? this.settings.pinOpacity : this.settings.pinLowOpacity;
    //       var depthTest = !this.meshDict[key]['pinned'];
    //       for (var i in val.object.children) {
    //         val.object.children[i].material.opacity = opacity;
    //         val.object.children[i].material.depthTest = depthTest;
    //       }
    //     } else {
    //       val.object.children[0].material.opacity = this.settings.backgroundOpacity;
    //       val.object.children[1].material.opacity = this.settings.backgroundWireframeOpacity;
    //     }
    //   }
    // } else if (e.prop == 'pinned' && this.states.pinned) {// New object being pinned while already in pinned mode
    //   for (var i in e.obj.object.children) {
    //     e.obj.object.children[i].material.opacity = (e.value) ? this.settings.pinOpacity : this.settings.pinLowOpacity;
    //     e.obj.object.children[i].material.depthTest = !e.value;
    //   }
    // } else if (!this.states.pinned || e.prop == 'highlight') { // Default opacity value change in upinned mode or exiting highlight mode
    //   this.meshDict.resetOpacity();
    // }
  }
  
  show(rid: string | string[]) {
    rid = asArray(rid);
    for (let id of rid) {
      if (!(id in this._meshDict)) {
        continue;
      }
      this._meshDict[id].show();
    }
  };

  hide(rid: string | string[]) {
    rid = asArray(rid);
    for (let id of rid) {
      if (!(id in this._meshDict)) {
        continue;
      }
      if (!this._meshDict[id].pinned) { // do not hide pinned objects
        this._meshDict[id].hide();  
      }
    }
  };

  showAll(group?: 'front' | 'back') {
    switch (group) {
      case 'front':
        this.show(this.front);
        break
      case 'back':
        this.show(this.back);
        break;
      default:
        this.show(Object.keys(this._meshDict));
        break;
    }
  };

  hideAll(group?: 'front' | 'back') {
    switch (group) {
      case 'front':
        this.hide(this.front);
        break
      case 'back':
        this.hide(this.back);
        break;
      default:
        this.hide(Object.keys(this._meshDict));
        break;
    }
  };

  /**
   * return Rids of all elements in the front
   */
  get front(): string[] {
    let rids: string[] = [];
    for (let [rid, mesh] of Object.entries(this._meshDict)) {
      if (!mesh.background) {
        rids.push(rid);
      }
    }
    return rids;
  }

  /**
   * return Rids of all elements in the front
   */
  get back(): string[] {
    let rids: string[] = [];
    for (let [rid, mesh] of Object.entries(this._meshDict)) {
      if (mesh.background === true) {
        rids.push(rid);
      }
    }
    return rids;
  }

  /**
   * Return rid of unpinned items
   */
  get unpinned(): string[] {
    let list: string[] = [];
    for (let [key, mesh] of Object.entries(this._meshDict)) {
      if (!mesh.background && !mesh.pinned) {
        list.push(key);
      }
    }
    return list;
  }

  /**
   * Return Rids of all pinned elements
   */
  get pinned(): string[] {
    let rids: string[] = [];
    for (let [rid, mesh] of Object.entries(this._meshDict)) {
      if (!mesh.background && mesh.pinned) {
        rids.push(rid);
      }
    }
    return rids;
  }
  
  /**
   * Highlight objects given rid(s)
   * @param rid 
   */
  highlight(rid: string): void {
    if (!(rid in this._meshDict)) {
      return;
    }
    
    this._meshDict[rid].highlight = true;
    this._meshDict[rid].show();
    this.state.highlight = true;
  }

  pin(rid: string | string[]) {
    rid = asArray(rid);
    for (let id of rid) {
      if (!(id in this._meshDict)) {
        continue;
      }
      this._meshDict[id].pin();
      this.state.pin = true;
    }
  };

  unpin(rid: string | string[]) {
    rid = asArray(rid);
    for (let id of rid) {
      if (!(id in this._meshDict)) {
        continue;
      }
      this._meshDict[id].unpin();
    }
    if (this.pinned.length == 0) {
      this.state.pin = false;
    }
  };
  
  unpinAll() {
    this.unpin(Object.keys(this._meshDict));
  };

  remove(rid: string | string[]) {
    rid = asArray(rid);
    for (let id of rid) {
      if (!(id in this._meshDict)) {
        continue;
      }
      this._meshDict[id].remove();
      delete this._meshDict[id];
    }
  };

  removeUnpinned() {
    for (let [rid, mesh] of Object.entries(this._meshDict)) {
      if (!mesh.background && !mesh.pinned) {
        this.remove(rid);
      }
    }
  }

  setColor(rid: string | string[], color: number | string | number[] | Color) {
    rid = asArray(rid);
    color = convertColor(color);
    for (let id of rid) {
      if (!(id in this._meshDict)) {
        continue;
      }
      this._meshDict[id].color = color;
    }
  };

  setBackgroundColor(color: number | string | number[] | Color) {
    color = convertColor(color);
    for (let [rid, mesh] of Object.entries(this._meshDict)) {
      if (mesh.background) {
        this._meshDict[rid].color = color;
      }
    }
  };
    
  /**
  * Add JSON object to meshdict
  * @param {object} json 
  */
  async addJson(json: Partial<MeshDict.IInputJSON>): Promise<void> {
    if ((json === undefined) || !("ffbo_json" in json)) {
      console.log('mesh json is undefined');
      return Promise.resolve(void 0);
    }

    let metadata = {
      type: json.type ?? '',
      visibility: json.visibility ?? true,
      colormap: json.colormap ?? this.colormap,
      colororder: json.colororder ?? "random",
      showAfterLoadAll: json.showAfterLoadAll ?? false,
      radiusScale: json.radiusScale ?? 1.,
    };
    
    if (json.reset){
      this.reset();
    }

    /* set colormap */
    let colorNum:number = 0;
    let id2float: any;
    let lut = this.lut;
    if (metadata.colororder === "order") {
      colorNum = Object.keys(json.ffbo_json).length;
      id2float = (i: number) => { return i / colorNum; };
    } else {
      colorNum = this.maxColorNum;
      id2float = (i: number) => { return MeshDict.getRandomIntInclusive(1, colorNum) / colorNum; };
    }
    
    // reinit lut if color is specified
    if (metadata.colororder === "order" && (colorNum !== this.maxColorNum || metadata.colormap !== "rainbow")) {
      colorNum = Object.keys(json.ffbo_json).length;
      lut = new Lut(metadata.colormap, colorNum);
      lut.setMin(0);
      lut.setMax(1);
    }

    if (metadata.showAfterLoadAll) {
      this.groups.front.visible = false;
    }

    for (let i = 0; i < Object.keys(json.ffbo_json).length; ++i) {
      let key = Object.keys(json.ffbo_json)[i];
      await this.addOneJson(key, json.ffbo_json[key], lut.getColor(id2float(i)), metadata);
      if (this._meshDict[key].background) {
        this.boundingBox.union(this._meshDict[key].boundingBox);
      }
    }
    return Promise.resolve(void 0);
  }

  async addOneJson(key:string, unit: any, color: Color, metadata: any): Promise<MeshItem | void> {
    let objectLoaded = new PromiseDelegate(); // resolves when the fileloaded has finished downloading meshes
    if (key in this._meshDict) {
      console.log('mesh object already exists... skip rendering...');
      return Promise.resolve(void 0);
    }
    unit.color = unit.color ?? color;
    /* read mesh */
    switch (unit.type) {
      case 'morphology_json':
        unit.type = 'MorphJSON';
        unit = new MeshItem('MorphJSON', key, unit, metadata.visibility, this.settings, this.loadingManager);
        objectLoaded.resolve(void 0);
        break;
      case 'obj':
        unit.type = 'Obj';
        unit = new MeshItem('Obj', key, unit, metadata.visibility, this.settings, this.loadingManager);
        objectLoaded.resolve(void 0);
        break;
      default:
        if (unit.dataStr && unit.filename) {
          console.warn(`[Neu3D] mesh cannot have booth dataStra and filename. addJSON failed for ${unit}`);
          objectLoaded.resolve(void 0);
          break;
        }
        if (unit.filename) {
          unit.filetype = unit.filename.split('.').pop();
          let loader = new FileLoader(this.loadingManager);
          if (unit.filetype == "json") {
            loader.load(
              unit.filename,
              (response: any) => {
                unit = new MeshItem('Mesh', key, unit, metadata.visibility, this.settings, this.loadingManager, response);
                objectLoaded.resolve(void 0);
              }
            );
            break;
          } else if (unit.filetype === "swc") {
            loader.load(
              unit.filename,
              (response: any) => {
                unit = new MeshItem('SWC', key, unit, metadata.visibility, this.settings, this.loadingManager, response);
                objectLoaded.resolve(void 0);
              }
            );
            break;
          }
        } else if (unit.dataStr) {
          if (unit.filetype === 'json') {
            unit.type = 'Mesh';
            unit = new MeshItem('Mesh', key, unit, metadata.visibility, this.settings, this.loadingManager, unit.dataStr);
            objectLoaded.resolve(void 0);
            break;
          } else if (unit.filetype === 'swc') {
            unit.type = 'SWC';
            unit = new MeshItem('SWC', key, unit, metadata.visibility, this.settings, this.loadingManager, unit.dataStr);
            objectLoaded.resolve(void 0);
            break;
          }
        } else {
          console.warn(`[Neu3D] mesh data type not understood. addJSON failed for ${unit}`);
          objectLoaded.resolve(void 0);
        }
    }
    return objectLoaded.promise.then(() => {
      this._meshDict[key] = unit as MeshItem;
      if ((unit as MeshItem).background) {
        this.groups.back.add(unit.object as Object3D);
      } else {
        this.groups.front.add(unit.object as Object3D);
      }
      this._labelToRid[(unit as MeshItem).label] = (unit as MeshItem).rid;
      return this._meshDict[key]
    });
  }

  /**
   * Dispose all Meshes to free up GPU memory
   */
  disposeMeshes() {
    for (let [key, mesh] of Object.entries(this._meshDict)){
      mesh.dispose();
      if (mesh.background) {
        this.groups.back.remove(mesh.object);
      } else {
        this.groups.front.remove(mesh.object);
      }
      delete this._meshDict[key];
    }
  }

  /**
   * Dispose everything
   */
  dispose() {
    //TODO
  }
}


/**
* Mesh Model - corresponds to 1 object in the scene
*/
export class MeshItem implements MeshDict.IMesh {
  meshType: 'Mesh' | 'SWC' | 'MorphJSON' | 'Obj' | string;
  morphType?: 'Synapse SWC' | string;
  loadingManager?: LoadingManager;
  object: Object3D;
  transform: MeshDict.ISWCTransform;
  rid: string;
  label: string;
  pinned: boolean;
  highlight: boolean;
  private _visibility: boolean;
  private _color: Color;
  private _opacity: number;
  readonly settings: MeshDict.ISettings;

  background: boolean;
  boundingBox = new Box3();
  position = new Vector3();

  constructor(
    meshType: 'Mesh' | 'SWC' | 'MorphJSON' | 'Obj' | string,
    key: string, 
    unit: Partial<MeshDict.IMeshOptions> | any,
    visibility: boolean,
    settings: MeshDict.ISettings, // visualization settings
    loadingManager?: LoadingManager,
    dataStr?: string // asynchronously added data
  ) {
    this.meshType = meshType;
    this.morphType = unit.morphType ?? '';
    this.rid = key;
    this.pinned = unit.pinned ?? false;
    this.background = unit.background ?? false;
    this._visibility = visibility;
    this._color = convertColor(unit.color);
    this.position = unit.position ?? new Vector3();
    this.loadingManager = loadingManager; // for loading OBJ files
    this.settings = settings;

    this.transform = {
      xShift: unit.xShift ?? 0.,
      yShift: unit.yShift ?? 0.,
      zShift: unit.zShift ?? 0.,
      xScale: unit.xScale ?? 1.,
      yScale: unit.yScale ?? 1.,
      zScale: unit.zScale ?? 1.,
      xyRot: unit.xyRot ?? 0.,
      yzRot: unit.yzRot ?? 0.
    }

    switch (meshType) {
      case 'Mesh':
        this._addMesh(key, unit, settings, visibility, dataStr);
        break;
      case 'SWC':
        this._addSWC(key, unit, settings, visibility, dataStr);
        break;
      // case 'MorphJSON':
      //   this._addMorphJSON(key, unit, settings, visibility);
      //   break;
      // case 'Obj':
      //   this._addObj(key, unit, settings, visibility, loadingManager);
      //   break;
      default:
        break;
    }
    this.updateOpacity();
  }

  /**
   * Propogate colorchanges to object's material
   */
  set color(val: Color) {
    val = convertColor(val);
    if (val !== this._color) {
      this._color.set(val);
      for (let j = 0; j < this.object.children.length; ++j) {
        ((this.object.children[j] as Mesh).material as MeshDict.Neu3DMaterial).color.set(this._color);
        ((this.object.children[j] as Mesh).geometry as Geometry).colorsNeedUpdate = true;
      }
    }
  }

  get color(): Color {
    return this._color;
  }

  /**
   * Propogate opacity changes to object's material
   */
  set opacity(val: number) {
    if (this._opacity !== val) {
      this._opacity = val;
      for (let i in this.object.children) {
        ((this.object.children[i] as Mesh).material as Material).opacity = val;
      }
    }
  }

  get opacity(): number { 
    return this._opacity;
  }

  /**
   * Show a given neuron
   */
  show() { this.visibility = true; }
  hide() { this.visibility = false; }
  toggleVis() { this.visibility = !this.visibility; }
  togglePin() { this.pinned = !this.pinned; };
  pin(){ this.pinned = true; };
  unpin() { this.pinned = false;};
  remove() { this.dispose(); };

  /**
   * Propogate visibility changes to object's material
   */
  set visibility(val: boolean) {
    if (val !== this.visibility) {
      this.object.visible = val;
      this._visibility = val; 
    }
  }

  get visibility(): boolean {
    return this._visibility;
  }

  /**
   * Refresh rendering opacity of the object based on its states
   */
  updateOpacity(states?: {pin: boolean, highlight: boolean}) {
    // background opacity always set to settings values
    if (this.background) {
      ((this.object.children[0] as Mesh).material as Material).opacity = this.settings.backgroundOpacity;
      ((this.object.children[1] as Mesh).material as Material).opacity = this.settings.backgroundWireframeOpacity;
      return;
    }

    let opacity = this.opacity;
    let visibility = this.visibility;
    let depthTest = true;
    if (this.pinned) {
      visibility = true;
      opacity = this.settings.pinOpacity;
      depthTest = false;
    } else {
      if (this.highlight) {
        visibility = true;
        opacity = this.settings.highlightedObjectOpacity;
        depthTest = false;
      } else {
        if (states?.highlight) {
          opacity = this.settings.lowOpacity
        } else {
          opacity = this.settings.nonHighlightableOpacity;
        }
        depthTest = true;
      }
    }
    this.opacity = opacity;
    this.visibility = visibility;
    for (var i in this.object.children) {
      ((this.object.children[i] as Mesh).material as Material).depthTest = depthTest;
    }
  }

  /**
   * scale/rotate/shift SWC object inplace
   * @param swcObj object
   * @param transform transformation
   */
  transformSWC(swcObj: MeshDict.ISWC, transform: MeshDict.ISWCTransform): void {
    for (let sample of Object.keys(swcObj)){
      let { x, y, z } = swcObj[sample];
      let x_put = x * transform.xScale
      let y_put = y * transform.yScale;
      let z_put = z * transform.zScale;
      var x_i = Math.cos(transform['xyRot'])*x_put + Math.sin(transform['xyRot'])*y_put;
      var y_i = Math.sin(transform['xyRot'])*x_put + Math.cos(transform['xyRot'])*y_put;
      var z_i = z_put;
      var y_f = Math.cos(transform['yzRot'])*y_i + Math.sin(transform['yzRot'])*z_i;
      var z_f = Math.sin(transform['yzRot'])*y_i + Math.cos(transform['yzRot'])*z_i;
      var x_f = x_i;
      x_f = x_f + transform['xShift'];
      y_f = y_f + transform['yShift'];
      z_f = z_f + transform['zShift'];
      swcObj[sample].x = x_f;
      swcObj[sample].y = y_f;
      swcObj[sample].z = z_f;
    }
  }

  dispose() {
    for (let j = 0; j < this.object.children.length; ++j) {
      (this.object.children[j] as Mesh).geometry.dispose();
      ((this.object.children[j] as Mesh).material as Material).dispose();
    }
    delete this.object;
  }

  /**
   * Convert Neuron Skeleton to SWC Format
   * @param unit 
   */
  toSWC(unit: MeshDict.IMorphJSON | string[] | string): MeshDict.ISWC {
    let swcObj: MeshDict.ISWC = {};
    // if a single string, assume is the entire dataStr of swc, split
    if (typeof(unit) === 'string') {
      unit = unit.replace(/\r\n/g, "\n");
      unit = unit.split("\n");
    } 
    // if array of strings
    if (Array.isArray(unit) && typeof(unit[0]) === 'string'){
      if (unit[0].split(' ').length === 7) {
        unit.forEach((e)=> {
          let seg = e.split(' ');
          swcObj[parseInt(seg[0])] = {
            type: parseInt(seg[1]),
            x: parseFloat(seg[2]),
            y: parseFloat(seg[3]),
            z: parseFloat(seg[4]),
            radius: parseFloat(seg[5]),
            parent: parseInt(seg[6]),
          };
        });
      } else if (unit[0].split(',').length === 7) {
        unit.forEach((e)=> {
          let seg = e.split(',');
          swcObj[parseInt(seg[0])] = {
            type: parseInt(seg[1]),
            x: parseFloat(seg[2]),
            y: parseFloat(seg[3]),
            z: parseFloat(seg[4]),
            radius: parseFloat(seg[5]),
            parent: parseInt(seg[6]),
          };
        });
      }else{ // not understood
        console.warn(`[Neu3D] SWC unit format not understood. toSWC failed ${unit}`); 
      }
    } else { // if MorphJSON
      unit = unit as MeshDict.IMorphJSON;
      for (let j = 0; j < unit.sample.length; j++) {
        swcObj[parseInt(unit.sample[j])] = {
          type: parseInt(unit.identifier[j]),
          x: parseFloat(unit.x[j]),
          y: parseFloat(unit.y[j]),
          z: parseFloat(unit.z[j]),
          radius: parseFloat(unit.r[j]),
          parent: parseInt(unit.parent[j]),
        };
      }
    }
    return swcObj;
  }

  _onAfterAdd(key:string, unit: Partial<MeshDict.IMesh>, object: Object3D, settings: MeshDict.ISettings) {
    (object as any).rid = key; // needed rid for raycaster reference
    this.object = object;
    for (let obj of this.object.children) {
      (obj as Mesh).geometry.computeBoundingBox();
      this.boundingBox.union((obj as Mesh).geometry.boundingBox);
    }
    this.position = unit.position ??  new Vector3(
      0.5 * (unit.boundingBox.min.x + unit.boundingBox.max.x), 
      0.5 * (unit.boundingBox.min.y + unit.boundingBox.max.y), 
      0.5 * (unit.boundingBox.min.z + unit.boundingBox.max.z)
    );

    if (this.morphType !== 'Synapse SWC') {
      if (this.background) {
        ((this.object.children[0] as Mesh).material as Material).opacity = settings.backgroundOpacity;
        ((this.object.children[1] as Mesh).material as Material).opacity = settings.backgroundWireframeOpacity;
      } else {
        if (settings.defaultOpacity !== 1){
          for (let i = 0; i < this.object.children.length; i++){
            ((this.object.children[i] as Mesh).material as Material).opacity = settings.defaultOpacity;
          }
        }
      }
    } else { 
      if (settings.synapseOpacity !== 1){
        for (let i = 0; i < unit.object.children.length; i++){
          ((this.object.children[i] as Mesh).material as Material).opacity = settings.synapseOpacity;
        }
      }
    }
  }

  /**
   * Create object from mesh
   * @param key 
   * @param unit 
   * @param settings 
   * @param visibility 
   */
  _addMesh(key: string, unit: Partial<MeshDict.IMeshOptions>, settings: MeshDict.ISettings, visibility: boolean, jsonString: string) {
    let json = JSON.parse(jsonString);
    let geometry = new Geometry();
    let vtx = json['vertices'];
    let idx = json['faces'];
    for (let j = 0; j < vtx.length / 3; j++) {
      let x = parseFloat(vtx[3 * j + 0]);
      let y = parseFloat(vtx[3 * j + 1]);
      let z = parseFloat(vtx[3 * j + 2]);
      geometry.vertices.push(new Vector3(x, y, z));
    }
    for (let j = 0; j < idx.length / 3; j++) {
      geometry.faces.push(new Face3(parseInt(idx[3 * j + 0]), parseInt(idx[3 * j + 1]), parseInt(idx[3 * j + 2])));
    }
    geometry.mergeVertices();
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    let materials: any[] = [
      new MeshLambertMaterial({ color: this.color, transparent: true, side: 2, flatShading: true }),
      new MeshBasicMaterial({ color: this.color, wireframe: true, transparent: true })
    ];

    let object = SceneUtils.createMultiMaterialObject(geometry, materials);
    if (!this.settings.meshWireframe) {
      object.children[1].visible = false;
    }
    object.visible = visibility;
    unit.boundingBox = geometry.boundingBox;
    this._onAfterAdd(key, unit, object, settings);
  }

  _addSWC(key: string, unit: Partial<MeshDict.IMeshOptions>, settings: any, visibility: boolean, swcString: string) { 
    /** process string */
    let swcObj = this.toSWC(swcString);
    this.transformSWC(swcObj, this.transform);

    let object = new Object3D();  // the neuron Object
    let synapseSphereGeometry: Geometry = new Geometry();  // the synapse sphere geometry
    let synapsePointsGeometry: Geometry = new Geometry();  // the synapse point geometry
    let neuronGeometry: Geometry = new Geometry();  // the neuron 3d geometry
    let neuronLineGeometry: Geometry = new Geometry();  // the neuron line geometry
    
    for (let [idx, c] of Object.entries(swcObj)) {
      if (parseInt(idx) == Math.round(Object.keys(swcObj).length / 2) && unit.position == undefined){
        unit.position = new Vector3(c.x, c.y, c.z);
      }
      // DEBUG: this.updateObjectBoundingBox(unit, c.x, c.y, c.z);
      // DEBUG:this.updateBoundingBox(c.x, c.y, c.z);
      switch (c.type) {
        case 1: // soma
          c.radius = c.radius ?? settings.defaultSomaRadius;
          c.radius = clipNumber(c.radius, settings.minSomaRadius, settings.maxSomaRadius);
          let sphereGeometry = new SphereGeometry(c.radius, 8, 8);
          sphereGeometry.translate(c.x, c.y, c.z);
          let sphereMaterial = new MeshLambertMaterial({ 
            color: unit.color, 
            transparent: true 
          });
          object.add(new Mesh(sphereGeometry, sphereMaterial));
          unit.position = new Vector3(c.x, c.y, c.z);
          break;
        case -1: // synapse
          if (settings.synapseMode) {
            c.radius = c.radius ?? settings.defaultSynapseRadius;
            c.radius = clipNumber(c.radius, settings.minSynapseRadius, settings.maxSynapseRadius);
            let sphereGeometry = new SphereGeometry(c.radius, 8, 8);
            sphereGeometry.translate(c.x, c.y, c.z);
            synapseSphereGeometry.merge(sphereGeometry);
            sphereGeometry.dispose()
            sphereGeometry = null;
            unit.position = new Vector3(c.x, c.y, c.z);
          } else {
            synapsePointsGeometry.vertices.push(new Vector3(c.x, c.y, c.z));
          }
          break;
        default: // neurite
          let p = swcObj[c.parent]; // parent object
          if (p == undefined) {
            break;
          }
          if (!settings.neuron3d) { // 1d neuron
            let geometry = new Geometry();
            geometry.vertices.push(new Vector3(c.x, c.y, c.z));
            geometry.vertices.push(new Vector3(p.x, p.y, p.z));
            geometry.colors.push(unit.color);
            geometry.colors.push(unit.color);
            neuronLineGeometry.merge(geometry);
            geometry.dispose();
            geometry = null;
          } else { // 3d neuron
            // line from parent to current node
            let d = new Vector3((p.x - c.x), (p.y - c.y), (p.z - c.z));

            // set radius of the parent and current radius
            p.radius = p.radius ?? settings.defaultRadius;
            c.radius = c.radius ?? settings.defaultRadius;
            p.radius = clipNumber(p.radius, settings.minRadius, settings.maxRadius);
            c.radius = clipNumber(c.radius, settings.minRadius, settings.maxRadius);

            // create segment
            let geometry = new CylinderGeometry( p.radius, c.radius, d.length(), 4, 1, false);
            geometry.translate(0, 0.5 * d.length(), 0);
            geometry.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2));
            geometry.lookAt(d.clone());
            geometry.translate((c.x + c.x) / 2, -0.0 * d.length() + (c.y + c.y) / 2, (c.z + c.z) / 2);
            neuronGeometry.merge(geometry);
            geometry.dispose();
            geometry = null;

            if (settings.neuron3dMode == 2) {
              let geometry = new SphereGeometry(c.radius, 8, 8);
              geometry.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2));
              geometry.lookAt(d);
              geometry.translate((c.x + c.x) / 2, (c.y + c.y) / 2, (c.z + c.z) / 2);
              neuronGeometry.merge(geometry);
              geometry.dispose();
              geometry = null;

            } else if (settings.neuron3dMode == 3) {
              // if the parent is not direct descendant of the soma
              // smoothly interpolate tubes between parent and child
              if (p.parent != -1) {
                let p2 = swcObj[p.parent];
                let a = new Vector3(0.9 * p.x + 0.1 * p2.x, 0.9 * p.y + 0.1 * p2.y, 0.9 * p.z + 0.1 * p2.z);
                let b = new Vector3(0.9 * p.x + 0.1 * c.x, 0.9 * p.y + 0.1 * c.y, 0.9 * p.z + 0.1 * c.z);
                let curve = new QuadraticBezierCurve3(a, new Vector3(p.x, p.y, p.z), b);
                let geometry = new TubeGeometry(curve, 8, p.radius, 4, false);
                neuronGeometry.merge(geometry);
                geometry.dispose();
                geometry = null;
              }
            }
          }
          break;
      }
    }
    if (synapsePointsGeometry.vertices.length >0) {
      let pointMaterial = new PointsMaterial({ color: unit.color, size: settings.defaultSynapseRadius}); // DEBUG: , lights: true });
      let points = new Points(synapsePointsGeometry, pointMaterial);
      object.add(points);
    } else {
      synapsePointsGeometry.dispose()
      synapsePointsGeometry = null;
    }
    if (neuronGeometry.vertices.length > 0) {
      let material = new MeshLambertMaterial({ color: unit.color, transparent: true });
      let mesh = new Mesh(neuronGeometry, material);

      // TODO: The following code addes simplifier
      //let modifier = new SimplifyModifier();
      //simplified = modifier.modify( mergedGeometry, geometry.vertices.length * 0.25 | 0 )
      //let mesh = new Mesh(simplified, material);
      object.add(mesh);
    } else {
      neuronGeometry.dispose();
      neuronGeometry = null;
    }
    if (neuronLineGeometry.vertices.length > 0) {
      // DEBUG: let material = new LineBasicMaterial({ vertexColors: VertexColors, transparent: true, color: color });
      let material = new LineBasicMaterial({ transparent: true, color: unit.color });
      object.add(new LineSegments(neuronLineGeometry, material));
    } else {
      neuronLineGeometry.dispose();
      neuronLineGeometry = null;
    }

    object.visible = visibility;
    this._onAfterAdd(key, unit, object, settings);
    //DEBUG: this._registerObject(key, unit, object);
  }

  // TODO: fix this and reuse code from above
  // _addMorphJSON(key:string, unit: Partial<MeshDict.IMeshOptions>, settings: any, visibility: boolean) {
  //   return () => {
  //     let swcObj = this.toSWC(unit);
  //   };
  // }

  // TODO: fix this
  // _addObj(key:string, unit: Partial<MeshDict.IMeshOptions>, settings: any, visibility: boolean, loadingManager: LoadingManager){
  //   return () => {
  //     // instantiate a loader
  //     var loader = new OBJLoader(loadingManager);
  //     var _this = this;

  //     loader.load = function load(url: string, localtext: string, onLoad:, onProgress, onError) {
  //       var scope = this;
  //       var loader = new FileLoader(scope.manager);
  //       loader.setPath(this.path);
  //       loader.load(url, (text) => {
  //         if (url == "") {
  //           text = localtext;
  //         }
  //         onLoad(scope.parse(text as string));
  //       }, onProgress, onError);
  //     };
  //     // load a resource
  //     loader.load(
  //       '', unit['dataStr'],
  //       function (object) {
  //         object.visible = visibility;
  //         _this._registerObject(key, unit, object);
  //         delete unit['identifier'];
  //         delete unit['x'];
  //         delete unit['y'];
  //         delete unit['z'];
  //         delete unit['r'];
  //         delete unit['parent'];
  //         delete unit['sample'];
  //         delete unit['type'];
  //       },
  //       function (xhr) {
  //         console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  //       },
  //       function (error) {
  //         console.log('An error happened');
  //       }
  //     );
  //   };
  // }
}


/**
 * MeshDict Namespace
 */
export namespace MeshDict {
  export type Neu3DMaterial = MeshBasicMaterial | MeshLambertMaterial | LineBasicMaterial | PointsMaterial;

  export interface IMeshDict {
    boundingBox: Box3;
    // map label to Rid
    // In case of non - unique labels, will hold the rid for the last object
    // added with that label
    _labelToRid: { [label: string]: string };
    loadingManager: LoadingManager;
    settings: ISettings;
    lut: Lut;
    colormap: string;
    maxColorNum: number;
    groups: { front: Group, back: Group };

    // methods
    reset(resetBackground?: boolean): void;
    updateOpacity(e: any): void; // TODO
    resetOpacity(): void;
    show(rid: string | string[]): void;
    hide(rid: string | string[]): void;
    showAll(group?: 'front' | 'back'): void;
    hideAll(group?: 'front' | 'back'): void;
    highlight(rid: string): void;
    pin(rid: string | string[]): void;
    unpin(rid: string | string[]): void;
    unpinAll(): void;
    remove(rid: string | string[]): void;
    removeUnpinned(): void;
    setColor(rid: string | string[], color: number | string | number[] | Color): void;
    disposeMeshes(): void; // only dispose meshes
    dispose(): void; // dispose everything
    setBackgroundColor(color: number | string | number[] | Color): void;
  }

  export interface ISWC {
    [sample: string]: {
      type: number;
      x: number;
      y: number;
      z: number;
      radius: number;
      parent: number;  
    }
  }

  export interface ISWCTransform {
    xShift: number;
    yShift: number;
    zShift: number;
    xScale: number;
    yScale: number;
    zScale: number;
    xyRot: number;
    yzRot: number; 
  }

  export interface IMorphJSON extends IMesh {
    sample: string[];
    identifier: string[];
    x: string[];
    y: string[];
    z: string[];
    r: string[];
    parent: string[];
  }

  export interface IObj extends IMesh {
    dataStr: string;
  }
  
  export interface IInputJSON {
    ffbo_json: { [key: string]: any }; // TODO: data
    filetype?: string;
    dataStr?: string;
    type: 'morphology_json' | 'obj' | string;
    reset?: boolean; // whether to reset to whole workspace before adding meshes
    visibility: boolean;
    colormap: string;
    colororder: string;
    showAfterLoadAll: boolean;
    radiusScale: number;
  }

  export interface IMeshOptions {
    meshType: 'Mesh' | 'SWC' | 'MorphJSON' | 'Obj' | string;
    morphType?: 'Synapse SWC' | string;
    rid: string;
    label: string;
    pinned: boolean;
    highlight: boolean;
    background: boolean;
    object: Object3D;
    visibility: boolean;
    boundingBox: Box3;
    position: Vector3;
    color: Color;
  }

  export interface IMesh {
    meshType: 'Mesh' | 'SWC' | 'MorphJSON' | 'Obj' | string;
    morphType?: 'Synapse SWC' | string;
    rid: string;
    label: string;
    pinned: boolean;
    highlight: boolean;
    background: boolean;
    object: Object3D;
    visibility: boolean;
    boundingBox: Box3;
    position: Vector3;

    // methods
    show(): void;
    hide(): void;
    togglePin(): void;
    toggleVis(): void;
    pin(): void;
    unpin(): void;
    remove(): void;
    dispose(): void;
  }

  export interface ISettings {
    defaultOpacity: number;
    synapseOpacity: number;
    nonHighlightableOpacity: number;
    lowOpacity: number;
    pinOpacity: number;
    pinLowOpacity: number;
    highlightedObjectOpacity: number;
    defaultRadius: number;
    defaultSomaRadius: number;
    defaultSynapseRadius: number;
    minRadius: number;
    minSomaRadius: number;
    minSynapseRadius: number;
    maxRadius: number;
    maxSomaRadius: number;
    maxSynapseRadius: number;
    backgroundOpacity: number;
    backgroundWireframeOpacity: number;
    neuron3d: boolean;
    neuron3dMode: number;
    synapseMode: boolean;
    meshWireframe: boolean;
    backgroundColor: string;
  }
  
  export function getRandomIntInclusive(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}