import { Lut } from 'three/examples/jsm/math/Lut';
import { 
  Color, Group, Box3, FileLoader, LoadingManager,
  Vector3, Object3D, Matrix4, Mesh, 
  MeshLambertMaterial, MeshBasicMaterial, PointsMaterial, LineBasicMaterial, 
  Geometry, CylinderGeometry,  SphereGeometry, TubeGeometry, BufferGeometry,
  QuadraticBezierCurve3, LineSegments, Points,
  Float32BufferAttribute,
  // Sphere,  VertexColors
} from 'three';
import { SceneUtils } from 'three/examples/jsm/utils/SceneUtils';
// import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'


/** Clip value in between min/max */
const clipNumber = function(number:number, min:number, max:number) {
  if (max < min){
    return number
  }
  return Math.max(min, Math.min(number, max));
}


/**
* Mesh Dictionary Model
*/
export class MeshDict {
  constructor(
    colormap: string="rainbow",
    settings: Partial<MeshDict.ISettings>
  ) {
    this.colormap = colormap;
    this.lut = this.initLut(this.colormap, this.maxColorNum);
    this.settings = {
      defaultOpacity: settings.defaultOpacity ??  0.7,
      synapseOpacity: settings.synapseOpacity ??  1.0,
      nonHighlightableOpacity: settings.nonHighlightableOpacity ??  0.1,
      lowOpacity: settings.lowOpacity ??  0.1,
      pinOpacity: settings.pinOpacity ??  0.9,
      pinLowOpacity: settings.pinLowOpacity ??  0.15,
      highlightedObjectOpacity: settings.highlightedObjectOpacity ??  1.0,
      defaultRadius: settings.defaultRadius ??  0.5,
      defaultSomaRadius: settings.defaultSomaRadius ??  3.0,
      defaultSynapseRadius: settings.defaultSynapseRadius ??  0.2,
      minRadius: settings.minRadius ??  0.1,
      minSomaRadius: settings.minSomaRadius ??  1.0,
      minSynapseRadius: settings.minSynapseRadius ??  0.1,
      maxRadius: settings.maxRadius ??  1.0,
      maxSomaRadius: settings.maxSomaRadius ??  10.0,
      maxSynapseRadius: settings.maxSynapseRadius ??  1.,
      backgroundOpacity: settings.backgroundOpacity ??  1.0,
      backgroundWireframeOpacity: settings.backgroundWireframeOpacity ??  0.07,
      neuron3d: settings.neuron3d ??  false,
      neuron3dMode: settings.neuron3dMode ??  1,
      synapseMode: settings.synapseMode ??  true,
      meshWireframe: settings.meshWireframe ??  true,
      backgroundColor: settings.backgroundColor ??  "#260226"
    }
  }


  /** Initialize Look Up Table(Lut) for Color */
  initLut(colormap: string, maxColorNum:number) {
    let lut = new Lut(colormap, maxColorNum);
    lut.setMin(0);
    lut.setMax(1);
    return lut;
  }
  
  /**
  * Add JSON object to meshdict
  * @param {object} json 
  */
  addJson(json: Partial<MeshDict.IMesh>, settings: any): Promise<void> {
    if ((json === undefined) || !("ffbo_json" in json)) {
      console.log('mesh json is undefined');
      return Promise.resolve(void 0);
    }

    return new Promise((resolve) => {
      let metadata = {
        type: json.meshType ?? '',
        visibility: json.visibility ?? true,
        colormap: json.colormap ?? this.colormap,
        colororder: json.colororder ?? "random",
        showAfterLoadAll: json.showAfterLoadAll ?? false,
        radiusScale: json.radiusScale ?? 1.,
      };
      
      //   if (json.reset){
      //     this.reset();
      //   }
      
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
      
      // if (metadata.showAfterLoadAll) {
      //   this.groups.front.visible = false;
      // }
      
      for (let i = 0; i < Object.keys(json.ffbo_json).length; ++i) {
        let key = Object.keys(json.ffbo_json)[i];
        if (key in this._meshDict) {
          console.log('mesh object already exists... skip rendering...');
          continue;
        }
        let unit = json.ffbo_json[key];
        /* read mesh */
        switch (unit.type) {
          case 'morphology_json':
            unit.type = 'MorphJSON';
            unit = new MeshItem('MorphJSON', key, unit, metadata.visibility, this.settings);
            break;
          case 'obj':
            unit.type = 'Obj';
            unit = new MeshItem('Obj', key, unit, metadata.visibility, this.settings);
            break;
          default:
            if (unit.dataStr && unit.filename){
              console.warn(`[Neu3D] mesh cannot have booth dataStra and filename. addJSON failed for ${json}`);
              break;
            }
            if (unit.filename) {
              unit.filetype = unit.filename.split('.').pop();
              let loader = new FileLoader(this.loadingManager);
              if (unit.filetype == "json"){
                loader.load(
                  unit.filename, 
                  ()=>{
                    unit = new MeshItem('Mesh', key, unit, metadata.visibility, this.settings);
                  }
                );
                break;
              } else if (json.filetype == "swc") {
                loader.load(
                  unit.filename, 
                  ()=>{
                    return new MeshItem('SWC', key, unit, metadata.visibility, this.settings);
                  }
                );
                break;
              } 
            } else if (unit.dataStr) {
              if (unit.filetype === 'json'){
                unit.type = 'Mesh';
                unit = new MeshItem('Mesh', key, unit, metadata.visibility, this.settings);
                break;
              } else if (unit.filetype === 'swc') {
                unit.type = 'SWC';
                unit = new MeshItem('SWC', key, unit, metadata.visibility, this.settings);
                break;
              }
            }
            console.warn(`[Neu3D] mesh data type not understood. addJSON failed for ${json}`);
            return resolve(void 0);
        }
        this._meshDict[key] = unit;
      }
      resolve();
    });
  }

  dispose() {
    for (let mesh of Object.values(this._meshDict)){
      mesh.dispose();
    }
  }
  
  boundingBox: Box3;
  private _meshDict: {[key: string]: MeshItem}
  loadingManager = new LoadingManager();
  settings: MeshDict.ISettings;
  lut: Lut;
  colormap: string;
  maxColorNum: number = 1747591;
}


/**
* Mesh Model - corresponds to 1 object in the scene
*/
class MeshItem implements MeshDict.IMesh {
  constructor(
    type: 'Mesh' | 'SWC' | 'MorphJSON' | 'Obj' | string,
    key: string, 
    unit: Partial<MeshDict.IMesh>,
    visibility: boolean,
    settings: any, // visualization settings
    // lut: Lut, // Look up table,
    loadingManager?: LoadingManager
  ){
    switch (type) {
      case 'Mesh':
        this._addMesh(key, unit, settings, visibility);
        break;
      case 'SWC':
        this._addSWC(key, unit, settings, visibility);
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
      this.object.children[j].geometry.dispose();
      this.object.children[j].material.dispose();
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
    unit.rid = key;
    unit.object = object;
    unit.pinned = false;
    unit.position = unit.position ??  new Vector3(
      0.5 * (unit.boundingBox.min.x + unit.boundingBox.max.x), 
      0.5 * (unit.boundingBox.min.y + unit.boundingBox.max.y), 
      0.5 * (unit.boundingBox.min.z + unit.boundingBox.max.z)
    );
    // TODO: move the code below to a function
    // if (unit.morph_type !== 'Synapse SWC') {
    if (unit.morph_type !== 'Synapse SWC') {
      if (unit.background) {
        unit.object.children[0].material.opacity = settings.backgroundOpacity;
        unit.object.children[1].material.opacity = settings.backgroundWireframeOpacity;
      } else {
        if (settings.defaultOpacity !== 1){
          for (let i = 0; i < unit.object.children.length; i++){
            unit.object.children[i].material.opacity = settings.defaultOpacity;
          }
        }
      }
    } else { 
      if (settings.synapseOpacity !== 1){
        for (let i = 0; i < unit.object.children.length; i++){
          unit.object.children[i].material.opacity = settings.synapseOpacity;
        }
      }
    }
    this.object = object;
  }

  /**
   * Create object from mesh
   * @param key 
   * @param unit 
   * @param settings 
   * @param visibility 
   */
  _addMesh(key:string, unit: Partial<MeshDict.IMesh>, settings: MeshDict.ISettings, visibility: boolean) {
    return (jsonString: string)=> {
      let json = JSON.parse(jsonString);
      let buffergeometry = new BufferGeometry();
      buffergeometry.setAttribute('position',  new Float32BufferAttribute( json.vertices, 3 ))
      buffergeometry.setIndex(json.faces);
      let geometry = new Geometry().fromBufferGeometry(buffergeometry);
      buffergeometry.dispose();
      geometry.computeFaceNormals();
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      let materials = [
        new MeshLambertMaterial({ color: unit.color, transparent: true, side: 2, flatShading: true }),
        new MeshBasicMaterial({ color: unit.color, wireframe: true, transparent: true })
      ];
      let object = SceneUtils.createMultiMaterialObject(geometry, materials);
      if (!settings.meshWireframe){
        object.children[1].visible = false;
      }
      object.visible = visibility;
      this._onAfterAdd(key, unit, object, settings);
      //DEBUG: this._registerObject(key, unit, object);
    }
  }

  _addSWC(key:string, unit: Partial<MeshDict.IMesh>, settings: any, visibility: boolean) { 
    return (swcString: string) => {
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
        //let modifier = new SimplifyModifier();
        //simplified = modifier.modify( mergedGeometry, geometry.vertices.length * 0.25 | 0 )
        let mesh = new Mesh(neuronGeometry, material);
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
    };
  }

  // TODO: fix this and reuse code from above
  // _addMorphJSON(key:string, unit: Partial<MeshDict.IMesh>, settings: any, visibility: boolean) { 
  //   return () => {
  //     let swcObj = this.toSWC(unit);
  //   };
  // }

  // TODO: fix this
  // _addObj(key:string, unit: Partial<MeshDict.IMesh>, settings: any, visibility: boolean, loadingManager: LoadingManager){
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


  object: Object3D;
  transform: MeshDict.ISWCTransform;
}


/**
 * MeshDict Namespace
 */
export namespace MeshDict {
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

  export interface IMesh {
    ffbo_json: {[name:string]: any};
    meshType: 'Mesh' | 'SWC' | 'MorphJSON' | 'Obj' | string;
    rid: string;
    pinned: boolean;
    morph_type?: 'Synapse SWC' | string;
    object: Group | Object3D | any; // shouldn't really be any
    position: Vector3;
    background: boolean;
    color: Color;


    filename?: string;
    filetype?: 'json' | 'swc' | string;
    colormap?: string;
    colororder?: string;
    showAfterLoadAll?: boolean;
    reset?: boolean;
    boundingBox: Box3;
    highlight: boolean;

    opacity: number;
    visibility: boolean;
    
    label: string;
    radiusScale: number;
    uname: string;
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