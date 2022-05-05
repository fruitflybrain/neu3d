import { Neu3D } from './neu3d';
import {
  Vector2,
  FileLoader, 
} from 'three';

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'

import { NeuronSkeleton, Synapses, MeshObj } from './render';

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
  object.registerProperties(key);
  this.updateBoundingBox(object.boundingBox);
  unit['rid'] = key;
  unit['renderObj'] = object;
  unit['pinned'] = false;
  unit['opacity'] = object.opacity
  unit['position'] = object.position;
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
  return (data, transformation=undefined) => {
    let meshObj = new MeshObj(data, 'json', transformation)
    console.log(unit.color)
    meshObj.createObject(unit['color'], unit['background'], this.settings);    
    meshObj.updateVisibility(visibility);
    this._registerObject(key, unit, meshObj);
  };
}

/** Load NeuronSkeleton data
*
* @param {*} key
* @param {*} unit
* @param {*} visibility
*/
Neu3D.prototype.loadNeuronSkeletonCallBack = function (key, unit, visibility) {
  return (data, transformation=undefined) => {
    let skeleton = new NeuronSkeleton(data, 'swc', transformation);
    skeleton.createObject(unit['color'], unit['background'], this.settings, this.renderer.getSize(new Vector2()));
    skeleton.updateVisibility(visibility);
    this._registerObject(key, unit, skeleton);
  };
}

/** Load Synapse data
*
* @param {*} key
* @param {*} unit
* @param {*} visibility
*/
Neu3D.prototype.loadSynapsesCallBack = function (key, unit, visibility) {
  return (data, transformation=undefined) => {
    let syn = new Synapses(data, 'syn', transformation);
    syn.createObject(unit['color'], unit['background'], this.settings);
    syn.updateVisibility(visibility);
    this._registerObject(key, unit, syn);
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
    if (unit['class'] == 'Neuron' || unit['class'] == 'NeuronFragment') {
      let skeleton = new NeuronSkeleton(unit, unit['morph_type']);
      skeleton.createObject(unit['color'], unit['background'], this.settings, this.renderer.getSize(new Vector2()));
      skeleton.updateVisibility(visibility);
      this._registerObject(key, unit, skeleton);
    } else if (unit['class'] == 'Synapse') {
      let syn = new Synapses(unit, unit['morph_type']);
      syn.createObject(unit['color'], unit['background'], this.settings);
      syn.updateVisibility(visibility);
      this._registerObject(key, unit, syn);
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
