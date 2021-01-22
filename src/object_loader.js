import { Neu3D } from './neu3d';
import {
  Vector3, Face3, Object3D, Matrix4, Mesh,
  MeshLambertMaterial, MeshBasicMaterial, PointsMaterial, LineBasicMaterial,
  Geometry, CylinderGeometry, SphereGeometry, TubeGeometry,
  QuadraticBezierCurve3, VertexColors, LineSegments,
  XHRLoader
} from 'three';
import {
  SceneUtils
} from 'three/examples/jsm/utils/SceneUtils';

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'

/** Clip value in between min/max */
Math.clip = function (number, min, max) {
  if (max < min) {
    return number
  }
  return Math.max(min, Math.min(number, max));
}

function verifySWC(swcObj) {
  const isValid = (val)=> ('type' in val) && ('x' in val) && ('y' in val) && ('z' in val) && ('r' in val) && ('parent' in val);

  for (const [sample, value] of Object.entries(swcObj)){
    if (!isValid(value)) {
      return false;
    }

    if (!(value.parent in swcObj) && (value.parent !== -1)){
      return false
    }
  }
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
    unit['position'] = new Vector3(0.5 * (unit.boundingBox.minX + unit.boundingBox.maxX), 0.5 * (unit.boundingBox.minY + unit.boundingBox.maxY), 0.5 * (unit.boundingBox.minZ + unit.boundingBox.maxZ));
  }
  // TODO: move the code below to a function
  if (!('morph_type' in unit) || (unit['morph_type'] != 'Synapse SWC')) {
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

/** TODO: Add comment
 * @param {*} key 
 * @param {*} unit 
 * @param {*} visibility 
 */
Neu3D.prototype.loadMeshCallBack = function (key, unit, visibility) {
  return (json_or_string) => {
    let json;
    if (typeof json_or_string === 'string' || json_or_string instanceof String){
      json = JSON.parse(json_or_string);
    } else {
      json = json_or_string;
    }
    let color = unit['color'];
    let geometry = new Geometry();
    let vtx = json['vertices'];
    let idx = json['faces'];
    for (let j = 0; j < vtx.length / 3; j++) {
      let x = parseFloat(vtx[3 * j + 0]);
      let y = parseFloat(vtx[3 * j + 1]);
      let z = parseFloat(vtx[3 * j + 2]);
      geometry.vertices.push(new Vector3(x, y, z));
      this.updateObjectBoundingBox(unit, x, y, z);
      this.updateBoundingBox(x, y, z);
    }
    for (let j = 0; j < idx.length / 3; j++) {
      geometry.faces.push(new Face3(parseInt(idx[3 * j + 0]), parseInt(idx[3 * j + 1]), parseInt(idx[3 * j + 2])));
    }
    geometry.mergeVertices();
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();
    let materials = [
      //new THREE.MeshPhongMaterial( { color: color, flatShading: true, shininess: 0, transparent: true } ),
      new MeshLambertMaterial({ color: color, transparent: true, side: 2, flatShading: true }),
      new MeshBasicMaterial({ color: color, wireframe: true, transparent: true })
    ];

    let object = SceneUtils.createMultiMaterialObject(geometry, materials);
    if (!this.settings.meshWireframe) {
      object.children[1].visible = false;
    }
    object.visible = visibility;
    this._registerObject(key, unit, object);
  };
}


// /** Load Mesh from JSON into MeshDict
//  * Used primarily for loading background meshes
//  * 
//  * @param {string} key name of the mesh loaded
//  * @param {*} unit 
//  * @param {boolean} visibility if the mesh should be visible
//  */
// Neu3D.prototype.loadMeshCallBack = function(key, unit, visibility) {
//   return (jsonString) => {
//     let json = JSON.parse(jsonString);
//     let color = unit['color'];
//     let geometry = new BufferGeometry();
//     let vtx = json['vertices'];
//     let idx = json['faces'];
//     // for (let j = 0; j < vtx.length / 3; j++) {
//     //   let x = parseFloat(vtx[3 * j + 0]);
//     //   let y = parseFloat(vtx[3 * j + 1]);
//     //   let z = parseFloat(vtx[3 * j + 2]);
//     //   geometry.vertices.push(new Vector3(x, y, z));
//     //   this.updateObjectBoundingBox(unit, x, y, z);
//     //   this.updateBoundingBox(x, y, z);
//     // }
//     // for (let j = 0; j < idx.length / 3; j++) {
//     //   geometry.faces.push(new Face3(parseInt(idx[3 * j + 0]), parseInt(idx[3 * j + 1]), parseInt(idx[3 * j + 2])));
//     // }
//     // geometry.mergeVertices();
//     geometry.setAttribute('position',  new Float32BufferAttribute( vtx, 3 ))
//     geometry.setIndex(idx);
//     geometry.computeFaceNormals();
//     geometry.computeVertexNormals();

//     geometry.computeBoundingBox();
//     const { x, y, z } = geometry.boundingBox.max;
//     this.updateObjectBoundingBox(unit, x, y, z);
//     this.updateBoundingBox(x, y, z);
//     let materials = [
//       new MeshLambertMaterial({ color: color, transparent: true, side: 2, flatShading: true }),
//       new MeshBasicMaterial({ color: color, wireframe: true, transparent: true })
//     ];

//     let object = SceneUtils.createMultiMaterialObject(geometry, materials);
//     if (!this.settings.meshWireframe){
//       object.children[1].visible = false;
//     }
//     object.visible = visibility;
//     this._registerObject(key, unit, object);
//   };
// }



/** TODO: Add comment
* @param {*} key 
* @param {*} unit 
* @param {*} visibility 
*/
Neu3D.prototype.loadSWCCallBack = function (key, unit, visibility) {
  return (swc_or_string) => {
    let swcObj = {};
    if (typeof swc_or_string === 'string' || swc_or_string instanceof String){
      /** process string */
      let swcString = swc_or_string.replace(/\r\n/g, "\n");
      let swcLine = swcString.split("\n");
      let radius_scale = unit['radius_scale'];
      swcLine.forEach((e) => {
        let seg = e.split(' ');
        if (seg.length == 1) {
          seg = e.split(',');
        }
        if (seg.length == 8) {
          seg = seg.slice(1);
        }
        if (seg.length == 7) {
          var x_put = parseFloat(seg[2]) * unit['x_scale'];
          var y_put = parseFloat(seg[3]) * unit['y_scale'];
          var z_put = parseFloat(seg[4]) * unit['z_scale'];
          var x_i = Math.cos(unit['xy_rot']) * x_put + Math.sin(unit['xy_rot']) * y_put;
          var y_i = Math.sin(unit['xy_rot']) * x_put + Math.cos(unit['xy_rot']) * y_put;
          var z_i = z_put;
          var y_f = Math.cos(unit['yz_rot']) * y_i + Math.sin(unit['yz_rot']) * z_i;
          var z_f = Math.sin(unit['yz_rot']) * y_i + Math.cos(unit['yz_rot']) * z_i;
          var x_f = x_i;
          x_f = x_f + unit['x_shift'];
          y_f = y_f + unit['y_shift'];
          z_f = z_f + unit['z_shift'];

          swcObj[parseInt(seg[0])] = {
            'type': parseInt(seg[1]),
            'x': x_f,
            'y': y_f,
            'z': z_f,
            'radius': parseFloat(seg[5]) * radius_scale,
            'parent': parseInt(seg[6]),
          };
        }
      });
    } else{
      if (!verifySWC(swc_or_string)){
        return;
      }
      swcObj = swc_or_string;
    }
    
    let len = Object.keys(swcObj).length;
    let color = unit['color'];
    let object = new Object3D();
    let pointGeometry = undefined;
    let mergedGeometry = undefined;
    let geometry = undefined;
    let sphereGeometry = undefined;

    for (let idx in swcObj) {
      let c = swcObj[idx];
      if (idx == Math.round(len / 2) && unit.position == undefined) {
        unit.position = new Vector3(c.x, c.y, c.z);
      }
      this.updateObjectBoundingBox(unit, c.x, c.y, c.z);
      this.updateBoundingBox(c.x, c.y, c.z);
      if (c.parent != -1) { // if not soma
        let p = swcObj[c.parent]; // parent object
        if (p != undefined) { // create parent object if undefined
          if (this.settings.neuron3d) {
            if (mergedGeometry == undefined) {
              mergedGeometry = new Geometry();
            }
            // line from parent to current node
            let d = new Vector3((p.x - c.x), (p.y - c.y), (p.z - c.z));

            // set radius of the parent and current radius
            if (!p.radius) {
              p.radius = this.settings.defaultRadius;
            }
            if (!c.radius) {
              c.radius = this.settings.defaultRadius;
            }
            p.radius = Math.clip(p.radius, this.settings.minRadius, this.settings.maxRadius);
            c.radius = Math.clip(c.radius, this.settings.minRadius, this.settings.maxRadius);
            geometry = new CylinderGeometry(p.radius, c.radius, d.length(), 4, 1, 0);
            geometry.translate(0, 0.5 * d.length(), 0);
            geometry.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2));
            geometry.lookAt(d.clone());
            geometry.translate((c.x + c.x) / 2, -0.0 * d.length() + (c.y + c.y) / 2, (c.z + c.z) / 2);
            mergedGeometry.merge(geometry);
            geometry = null;

            if (this.settings.neuron3dMode == 2) {
              geometry = new SphereGeometry(c.radius, 8, 8);
              geometry.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2));
              geometry.lookAt(d);
              geometry.translate((c.x + c.x) / 2, (c.y + c.y) / 2, (c.z + c.z) / 2);
              mergedGeometry.merge(geometry);
              geometry = null;
            } else if (this.settings.neuron3dMode == 3) {
              if (p.parent != -1) { // makesure the parent is not direct descendant of the soma
                let p2 = swcObj[p.parent];
                let a = new Vector3(0.9 * p.x + 0.1 * p2.x, 0.9 * p.y + 0.1 * p2.y, 0.9 * p.z + 0.1 * p2.z);
                let b = new Vector3(0.9 * p.x + 0.1 * c.x, 0.9 * p.y + 0.1 * c.y, 0.9 * p.z + 0.1 * c.z);
                let curve = new QuadraticBezierCurve3(a, new Vector3(p.x, p.y, p.z), b);
                geometry = new TubeGeometry(curve, 8, p.radius, 4, false);
                mergedGeometry.merge(geometry);
                geometry = null;
              }
            }
          } else { // if soma
            if (geometry == undefined) {
              geometry = new Geometry();
            }
            if (p != undefined) {
              geometry.vertices.push(new Vector3(c.x, c.y, c.z));
              geometry.vertices.push(new Vector3(p.x, p.y, p.z));
              geometry.colors.push(color);
              geometry.colors.push(color);
            }
          }
        }
      }
      if (c.type == 1) {
        if (!c.radius) {
          c.radius = this.settings.defaultSomaRadius;
        }
        sphereGeometry = new SphereGeometry(
          Math.clip(c.radius, this.settings.minSomaRadius, this.settings.maxSomaRadius, 8, 8));
        sphereGeometry.translate(c.x, c.y, c.z);
        let sphereMaterial = new MeshLambertMaterial({ color: color, transparent: true });
        object.add(new Mesh(sphereGeometry, sphereMaterial));
        unit['position'] = new Vector3(c.x, c.y, c.z);
      }
      if (c.type == -1) {
        if (this.settings.synapseMode == true) {
          if (mergedGeometry == undefined) {
            mergedGeometry = new Geometry();
          }
          if (!c.radius) {
            c.radius = this.settings.defaultSynapseRadius;
          }
          sphereGeometry = new SphereGeometry(
            Math.clip(c.radius, this.settings.minSynapseRadius, this.settings.maxSynapseRadius), 8, 8);
          sphereGeometry.translate(c.x, c.y, c.z);
          //let sphereMaterial = new MeshLambertMaterial( {color: color, transparent: true} );
          //object.add(new Mesh( sphereGeometry, sphereMaterial));
          mergedGeometry.merge(sphereGeometry);
          unit['position'] = new Vector3(c.x, c.y, c.z);
        } else {
          if (pointGeometry == undefined) {
            pointGeometry = new Geometry();
          }
          pointGeometry.vertices.push(new Vector3(c.x, c.y, c.z));
        }
      }
    }
    if (pointGeometry) {
      let pointMaterial = new PointsMaterial({ color: color, size: this.settings.defaultSynapseRadius, lights: true });
      let points = new Points(pointGeometry, pointMaterial);
      object.add(points);
    }
    if (mergedGeometry) {
      let material = new MeshLambertMaterial({ color: color, transparent: true });
      //let modifier = new SimplifyModifier();
      //simplified = modifier.modify( mergedGeometry, geometry.vertices.length * 0.25 | 0 )
      let mesh = new Mesh(mergedGeometry, material);
      //let mesh = new Mesh(simplified, material);
      object.add(mesh);
    }
    if (geometry) {
      let material = new LineBasicMaterial({ vertexColors: VertexColors, transparent: true, color: color });
      object.add(new LineSegments(geometry, material));
    }
    object.visible = visibility;
    this._registerObject(key, unit, object);
  };
}

/** TODO: Add comment
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
    let swcObj = {};
    let len = unit['sample'].length;
    for (let j = 0; j < len; j++) {
      swcObj[parseInt(unit['sample'][j])] = {
        'type': parseInt(unit['identifier'][j]),
        'x': parseFloat(unit['x'][j]),
        'y': parseFloat(unit['y'][j]),
        'z': parseFloat(unit['z'][j]),
        'radius': parseFloat(unit['r'][j]),
        'parent': parseInt(unit['parent'][j]),
      };
    }
    let color = unit['color'];
    let object = new Object3D();
    let pointGeometry = undefined;
    let mergedGeometry = undefined;
    let geometry = undefined;
    let sphereGeometry = undefined;
    for (let idx in swcObj) {
      let c = swcObj[idx];
      if (idx == Math.round(len / 2) && unit.position == undefined) {
        unit.position = new Vector3(c.x, c.y, c.z);
      }
      this.updateObjectBoundingBox(unit, c.x, c.y, c.z);
      this.updateBoundingBox(c.x, c.y, c.z);
      if ((c.parent != -1) && !(c.type == 7 || c.type == 8)) {
        let p = swcObj[c.parent];
        if (this.settings.neuron3d) {
          if (mergedGeometry == undefined) {
            mergedGeometry = new Geometry();
          }
          let d = new Vector3((p.x - c.x), (p.y - c.y), (p.z - c.z));
          if (!p.radius) {
            p.radius = this.settings.defaultRadius;
          }
          if (!c.radius) {
            c.radius = this.settings.defaultRadius;
          }
          p.radius = Math.clip(p.radius, this.settings.minRadius, this.settings.maxRadius);
          c.radius = Math.clip(c.radius, this.settings.minRadius, this.settings.maxRadius),
            geometry = new CylinderGeometry(p.radius, c.radius, d.length(), 4, 1, 0);
          geometry.translate(0, 0.5 * d.length(), 0);
          geometry.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2));
          geometry.lookAt(d.clone());
          geometry.translate((c.x + c.x) / 2, -0.0 * d.length() + (c.y + c.y) / 2, (c.z + c.z) / 2);
          mergedGeometry.merge(geometry);
          geometry = null;
          if (this.settings.neuron3dMode == 2) {
            geometry = new SphereGeometry(c.radius, 8, 8);
            geometry.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2));
            geometry.lookAt(d);
            geometry.translate((c.x + c.x) / 2, (c.y + c.y) / 2, (c.z + c.z) / 2);
            mergedGeometry.merge(geometry);
            geometry = null;
          } else if (this.settings.neuron3dMode == 3) {
            if (p.parent != -1) {
              p2 = swcObj[p.parent];
              let a = new Vector3(0.9 * p.x + 0.1 * p2.x, 0.9 * p.y + 0.1 * p2.y, 0.9 * p.z + 0.1 * p2.z);
              let b = new Vector3(0.9 * p.x + 0.1 * c.x, 0.9 * p.y + 0.1 * c.y, 0.9 * p.z + 0.1 * c.z);
              let curve = new QuadraticBezierCurve3(a, new Vector3(p.x, p.y, p.z), b);
              geometry = new TubeGeometry(curve, 8, p.radius, 4, false);
              mergedGeometry.merge(geometry);
              geometry = null;
            }
          }
        } else {
          if (geometry == undefined) {
            geometry = new Geometry();
          }
          if (p != undefined) {
            geometry.vertices.push(new Vector3(c.x, c.y, c.z));
            geometry.vertices.push(new Vector3(p.x, p.y, p.z));
            geometry.colors.push(color);
            geometry.colors.push(color);
          }
        }
      }
      if (c.type == 1) {
        if (!c.radius) {
          c.radius = this.settings.defaultSomaRadius;
        }
        sphereGeometry = new SphereGeometry(
          Math.clip(c.radius, this.settings.minSomaRadius, this.settings.maxSomaRadius), 8, 8);
        sphereGeometry.translate(c.x, c.y, c.z);
        let sphereMaterial = new MeshLambertMaterial({ color: color, transparent: true });
        object.add(new Mesh(sphereGeometry, sphereMaterial));
        unit['position'] = new Vector3(c.x, c.y, c.z);
      }
      if (c.type == 7 || c.type == 8) {
        console.debug('[Neu3D] Loading synapse node');
        if (this.settings.synapseMode == true){
          if(mergedGeometry == undefined)
            mergedGeometry = new Geometry()

          if(c.radius)
            sphereGeometry = new SphereGeometry(c.radius, 8, 8 );
          else
            if(c.type == 7)
               sphereGeometry = new SphereGeometry(this.settings.defaultSynapseRadius, 8, 8 );
            else
               sphereGeometry = new SphereGeometry(this.settings.defaultSynapseRadius/2, 8, 8 );
          sphereGeometry.translate( c.x, c.y, c.z );
          //var sphereMaterial = new THREE.MeshLambertMaterial( {color: color, transparent: true} );
          //object.add(new THREE.Mesh( sphereGeometry, sphereMaterial));
          mergedGeometry.merge(sphereGeometry);
          unit['position'] = new Vector3(c.x,c.y,c.z);
        } else {
          if(pointGeometry == undefined)
            pointGeometry = new Geometry();
          pointGeometry.vertices.push(new Vector3(c.x, c.y, c.z));
        }
      }
      if (c.type == -1) {
        if (this.settings.synapseMode == true) {
          if (mergedGeometry == undefined) {
            mergedGeometry = new Geometry();
          }
          if (!c.radius) {
            c.radius = this.settings.defaultSynapseRadius
          }
          sphereGeometry = new SphereGeometry(
            Math.clip(c.radius, this.settings.minSynapseRadius, this.settings.maxSynapseRadius),
            8, 8);
          sphereGeometry.translate(c.x, c.y, c.z);
          //let sphereMaterial = new MeshLambertMaterial( {color: color, transparent: true} );
          //object.add(new Mesh( sphereGeometry, sphereMaterial));
          mergedGeometry.merge(sphereGeometry);
          unit['position'] = new Vector3(c.x, c.y, c.z);
        } else {
          if (pointGeometry == undefined) {
            pointGeometry = new Geometry();
          }
          pointGeometry.vertices.push(new Vector3(c.x, c.y, c.z));
        }
      }
    }
    if (pointGeometry) {
      let pointMaterial = new PointsMaterial({ color: color, size: this.settings.defaultSynapseRadius, lights: true });
      let points = new Points(pointGeometry, pointMaterial);
      object.add(points);
    }
    if (mergedGeometry) {
      let material = new MeshLambertMaterial({ color: color, transparent: true });
      //let modifier = new SimplifyModifier();
      //simplified = modifier.modify( mergedGeometry, geometry.vertices.length * 0.25 | 0 )
      let mesh = new Mesh(mergedGeometry, material);
      //let mesh = new Mesh(simplified, material);
      object.add(mesh);
    }
    if (geometry) {
      let material = new LineBasicMaterial({ vertexColors: VertexColors, transparent: true, color: color });
      object.add(new LineSegments(geometry, material));
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

Neu3D.prototype.loadObjCallBack = function (key, unit, visibility) {
  return () => {
    // instantiate a loader
    var loader = new OBJLoader();
    var _this = this;
    loader.load = function load(url, localtext, onLoad, onProgress, onError) {
      var scope = this;
      var loader = new XHRLoader(scope.manager);
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
