import { Neu3D } from './neu3d';
import {
  Vector3, Vector2, Object3D, Matrix4, Mesh,
  MeshLambertMaterial, MeshBasicMaterial, PointsMaterial, LineBasicMaterial,
  BufferGeometry, CylinderGeometry, SphereGeometry, TubeGeometry,
  QuadraticBezierCurve3, VertexColors, LineSegments,
  FileLoader, Float32BufferAttribute
} from 'three';
import {
  createMultiMaterialObject
} from 'three/examples/jsm/utils/SceneUtils';

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'

import { SWC, NeuronSkeleton, Synapses } from './swc_helper';

/** Clip value in between min/max
 *
 * @param {Number} number
 * @param {Number} min
 * @param {Number} max
 * @returns number clipped between min and max
 */
Math.clip = function (number, min, max) {
  if (max < min) {
    return number
  }
  return Math.max(min, Math.min(number, max));
}

/**
* Register Object to `meshDict`
* @param {*} key
* @param {*} unit
* @param {*} object
*/
Neu3D.prototype._registerObject = function (key, unit, object) {
  object.rid = key; // needed rid for raycaster reference
  unit['rid'] = key;
  unit['object'] = object;
  unit['pinned'] = false;
  
  // unit['opacity'] = -1.;
  if (!unit.hasOwnProperty('position')) {
    unit['position'] = new Vector3(
      0.5 * (unit.boundingBox.minX + unit.boundingBox.maxX),
      0.5 * (unit.boundingBox.minY + unit.boundingBox.maxY),
      0.5 * (unit.boundingBox.minZ + unit.boundingBox.maxZ)
    );
  }
  // TODO: move the code below to a function
  // if (!('morph_type' in unit) || (unit['morph_type'] != 'Synapse SWC')) {
  if (unit['class'] != 'Synapse') {
    if (unit['background']) {
      unit['object'].children[0].material.opacity = this.settings.backgroundOpacity;
      unit['object'].children[1].material.opacity = this.settings.backgroundWireframeOpacity;
    } else {
      if (this.settings.defaultOpacity !== 1) {
        for (let i = 0; i < unit['object'].children.length; i++) {
          unit['object'].children[i].material.opacity = this.settings.defaultOpacity;
        }
      }
    }
  } else {
    if (this.settings.synapseOpacity !== 1) {
      for (let i = 0; i < unit['object'].children.length; i++) {
        unit['object'].children[i].material.opacity = this.settings.synapseOpacity;
      }
    }
  }

  this.meshDict[key] = unit;
}

/** Load Mesh from JSON into MeshDict
 * Used primarily for loading background objects
 *
 * @param {String} key
 * @param {*} unit
 * @param {Boolean} visibility
 */
Neu3D.prototype.loadMeshCallBack = function (key, unit, visibility) {
  return (json_or_string) => {
    let json = {};
    if (typeof json_or_string === 'string' || json_or_string instanceof String){
      json = JSON.parse(json_or_string);
    } else if (typeof json_or_string === 'object' || json_or_string instanceof Object) {
      json = json_or_string;
    } else {
      json = unit;
    }
    let color = unit['color'];

    // Create new Buffer Geometry from mesh vertices and faces
    let geometry = new BufferGeometry();
    let vtx = json['vertices'];
    let idx = json['faces'];

    const vertices = [];
    // check if vertics and indices match dimensionality
    if (Math.max(...idx) >= (vtx.length/3)){
      let err = `[Neu3D] Mesh ${key} has face index ${Math.max(...idx)} that exceeds maximum number of vertices ${vtx.length/3}.`;
      if (Math.min(...idx) !== 0) {
        err = `${err} The face index also start from ${Math.min(...idx)}, maybe the face indices should be shifted by 1.`;
      }
      console.error(err);
      return;
    }

    for (let j = 0; j < vtx.length / 3; j++) {
      let x = parseFloat(vtx[3 * j + 0]);
      let y = parseFloat(vtx[3 * j + 1]);
      let z = parseFloat(vtx[3 * j + 2]);
      vertices.push(x,y,z);
      this.updateObjectBoundingBox(unit, x, y, z);
      this.updateBoundingBox(x, y, z);
    }

    geometry.setIndex(idx);
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    let materials = [
      //new THREE.MeshPhongMaterial( { color: color, flatShading: true, shininess: 0, transparent: true } ),
      new MeshLambertMaterial({ color: color, transparent: true, side: 2}),
      new MeshBasicMaterial({ color: color, wireframe: true, transparent: true })
    ];

    let object = createMultiMaterialObject(geometry, materials);
    if (!this.settings.meshWireframe) {
      object.children[1].visible = false;
    }
    object.visible = visibility;
    this._registerObject(key, unit, object);
  };
}


/** Load Neuron from SWC file
* @param {String} key - UID of the object
* @param {*} unit
* @param {Boolean} visibility - whether it's visible
*/
Neu3D.prototype.loadSWCCallBack = function (key, unit, visibility) {
  return (data, transformation=undefined) => {
    let swcObj = new SWC(data, transformation);
    let object = swcObj.createObject(unit['color'], this.settings);
    object.visible = visibility;
    this._registerObject(key, unit, object);
  };
}

Neu3D.prototype.loadNeuronSkeletonCallBack = function (key, unit, visibility) {
  return (data, transformation=undefined) => {
    let skeleton = new NeuronSkeleton(data, 'swc', transformation);
    let object = skeleton.createObject(unit['color'], this.settings, this.renderer.getSize(new Vector2()));
    object.visible = visibility;
    this._registerObject(key, unit, object);
  };
}

Neu3D.prototype.loadSynapsesCallBack = function (key, unit, visibility) {
  return (data, transformation=undefined) => {
    let syn = new Synapses(data, 'syn', transformation);
    let object = syn.createObject(unit['color'], this.settings);
    object.visible = visibility;
    this._registerObject(key, unit, object);
  };
}

/** Load Morphology JSON
*
* @param {*} key
* @param {*} unit
* @param {*} visibility
*/
Neu3D.prototype.loadMorphJSONCallBack = function (key, unit, visibility) {
  return () => {
    /*
    * process string
    */
    if (unit['class'] == 'Neuron' || unit['class'] == 'NeuronFragment') {
      let skeleton = new NeuronSkeleton(unit, unit['morph_type']);
      let object = skeleton.createObject(unit['color'], this.settings, this.renderer.getSize(new Vector2()));
      object.visible = visibility;
      this._registerObject(key, unit, object);
    } else if (unit['class'] == 'Synapse') {
      let syn = new Synapses(unit, unit['morph_type']);
      let object = syn.createObject(unit['color'], this.settings);
      object.visible = visibility;
      this._registerObject(key, unit, object);
    }
    
  };
}

/** Load Obj file
 *
 * @param {*} key
 * @param {*} unit
 * @param {*} visibility
 * @returns
 */
Neu3D.prototype.loadObjCallBack = function (key, unit, visibility) {
  return () => {
    // instantiate a loader
    var loader = new OBJLoader();
    var _this = this;
    loader.load = function load(url, localtext, onLoad, onProgress, onError) {
      var scope = this;
      var loader = new FileLoader(scope.manager);
      loader.setPath(this.path);
      loader.load(url, function (text) {
        if (url == "") {
          text = localtext;
        }
        onLoad(scope.parse(text));
      }, onProgress, onError);
    };
    // load a resource
    loader.load(
      '', unit['dataStr'],
      function (object) {
        object.visible = visibility;
        _this._registerObject(key, unit, object);
        delete unit['identifier'];
        delete unit['x'];
        delete unit['y'];
        delete unit['z'];
        delete unit['r'];
        delete unit['parent'];
        delete unit['sample'];
        delete unit['type'];
      },
      function (xhr) {
        console.debug(`[Neu3D] loading Object: ${(xhr.loaded / xhr.total * 100)}% loaded`);
      },
      function (error) {
        console.error(`[Neu3D] An error happened in loadObjCallBack, ${error}`);
      }
    );

  };
}


export { Neu3D };
