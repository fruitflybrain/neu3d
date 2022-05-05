import {
    Vector3, Object3D, Matrix4, Mesh, Vector4,
    MeshLambertMaterial, MeshBasicMaterial, LineBasicMaterial,
    BufferGeometry, CylinderGeometry, SphereGeometry, TubeGeometry,
    QuadraticBezierCurve3, LineSegments,
    CatmullRomCurve3,
    Float32BufferAttribute, InstancedMesh, Color
} from 'three';

import {
    createMultiMaterialObject
  } from 'three/examples/jsm/utils/SceneUtils';
import {
    mergeBufferGeometries
} from 'three/examples/jsm/utils/BufferGeometryUtils'
import {
    LineSegmentsGeometry
} from 'three/examples/jsm/lines/LineSegmentsGeometry'
import {
    LineSegments2
} from 'three/examples/jsm/lines/LineSegments2'
import {
    LineMaterial
} from 'three/examples/jsm/lines/LineMaterial'


/** Clip value in between min/max
 *
 * @param {Number} number
 * @param {Number} min
 * @param {Number} max
 * @returns number clipped between min and max
 */
 function clip (number, min, max) {
    if (max < min) {
      return number
    }
    return Math.max(min, Math.min(number, max));
  }

/**
 * Create an array of branches that each define a 3D trajectory in the neuronal tree
 * @param {*} swc
 * @param {*} rootId
 * @param {*} current_branch
 * @param {*} branches
 * @returns
 */
function createTreeFromSWC(swc, rootId, current_branch=undefined, branches=undefined) {
    if (current_branch === undefined) {
        current_branch = [];
    }
    if (branches === undefined) {
        branches = [];
    }
    if (!(rootId in swc)) {
        return
    }
    let root = swc[rootId]
    let rootVec = new Vector4(root.x, root.y, root.z, root.radius)
    current_branch.push(rootVec);
    if (root.children.length === 0) {
        branches.push(current_branch);
        return
    } else if (root.children.length === 1) {
        createTreeFromSWC(swc, root.children[0], current_branch, branches)
    } else {
        branches.push(current_branch); // save current branch
        for (let childId of root.children) {
            let new_branch = [rootVec];
            createTreeFromSWC(swc, childId, new_branch, branches);
        }
    }
    return branches;
}


export class RenderObj {

    /**
    *
    * @param {*} transformation :  scale, rotation and shift
    */
    constructor(transformation=undefined) {
        if (transformation === undefined) {
            transformation = {
                scale: {x: 1., y:1., z:1., radius:1.},
                rotation: {xy: 0., yz:0.},
                shift: {x: 0., y:0., z:0.}
              }
        }
        this.transformation = transformation;
        this.boundingBox = {
            'maxY': -100000, 'minY': 100000, 'maxX': -100000,
            'minX': 100000, 'maxZ': -100000, 'minZ': 100000 };
        this.pinned = false;
        this.type = 'morphology_json';
    }

    /** Register rid of rendered Object3D, and compute position
    *
    * @param {*} rid :  rid for raycaster
    */
    registerProperties(rid) {
        this.threeObj.rid = rid;
        if (this.position === undefined){
            this.position = new Vector3(
                0.5 * (this.boundingBox.minX + this.boundingBox.maxX),
                0.5 * (this.boundingBox.minY + this.boundingBox.maxY),
                0.5 * (this.boundingBox.minZ + this.boundingBox.maxZ));
        }
    }

    /** create 3d object
    *
    * @param {*} color: color of the object
    * @param {bool} color: if object is in background
    * @param {*} setting: neu3dSettings
    * @param {Vector2} render_size: size of the rendered scene
    */
    createObject(color, background, setting, render_size = undefined) {
        throw new Error('createObject not Implemented');
    };

    /** update the visibiilty of the object
    *
    * @param {bool} visibility
    */
    updateVisibility(visibility) {
        this.visibility = visibility;
        this.threeObj.visible = visibility;
    }

    /** toggle the visibiilty of the object
    */
    toggleVis() {
        this.updateVisibility(!this.visibility);
    }

    /** update the bounding box
    *
    * @param {*} x
    * @param {*} y
    * @param {*} z
    */
    updateBoundingBox(x, y, z) {
        if (x < this.boundingBox.minX)
            this.boundingBox.minX = x;
        if (x > this.boundingBox.maxX)
            this.boundingBox.maxX = x;
        if (y < this.boundingBox.minY)
            this.boundingBox.minY = y;
        if (y > this.boundingBox.maxY)
            this.boundingBox.maxY = y;
        if (z < this.boundingBox.minZ)
            this.boundingBox.minZ = z;
        if (z > this.boundingBox.maxZ)
            this.boundingBox.maxZ = z;
    }

    /** update opacity of the object;
    *
    * @param {*} opacity : 0-1 value of opacity
    */
    updateOpacity(opacity) {
        this.opacity = opacity;
        for (var child of this.threeObj.children) {
            child.material.opacity = opacity;
        }
    }

    /** update if depthTest will be checked
    *
    * @param {bool} depth
    */
    updateDepthTest(depth) {
        for (var child of this.threeObj.children){
            child.material.depthTest = depth;
        }
        this.depthTest = depth;
    }

    /** get depthTest value
    */
    getDepthTest() {
        return this.depthTest;
    }

    /** set color of the object;
    *
    * @param {*} color
    */
    setColor(color) {
        if (Array.isArray(color)) {
            color = new Color().fromArray(color);
          } else {
            color = new Color(color);
          }
        for (var child of this.threeObj.children) {
            child.material.color.set(color);
        }
        this.color = color;
    }

    /** get color of the object;
    */
    getColor() {
        return this.color;
    };

    /** dispose threejs object
    */
    dispose() {
        for (let i = 0; i < this.threeObj.children.length; i++) {
            this.threeObj.children[i].geometry.dispose();
            this.threeObj.children[i].material.dispose();
        }
    };

    /** transforms coordinate according to the transformation
    *
    * @param {*} x
    * @param {*} y
    * @param {*} z
    * @param {*} r
    */
    transform(x, y, z, r = undefined) {
        var x_put = x * this.transformation.scale.x;
        var y_put = y * this.transformation.scale.y;
        var z_put = z * this.transformation.scale.z;
        var x_i = Math.cos(this.transformation.rotation.xy) * x_put + Math.sin(this.transformation.rotation.xy) * y_put;
        var y_i = Math.sin(this.transformation.rotation.xy) * x_put + Math.cos(this.transformation.rotation.xy) * y_put;
        var z_i = z_put;

        var x_f = x_i;
        var y_f = Math.cos(this.transformation.rotation.yz) * y_i + Math.sin(this.transformation.rotation.yz) * z_i;
        var z_f = Math.sin(this.transformation.rotation.yz) * y_i + Math.cos(this.transformation.rotation.yz) * z_i;

        x_f = x_f + this.transformation.shift.x;
        y_f = y_f + this.transformation.shift.y;
        z_f = z_f + this.transformation.shift.z;

        if (r === undefined){
            return [x_f, y_f, z_f];
        } else {
            return [x_f, y_f, z_f, r * this.transformation.scale.radius];
        }
    };
}


export class MeshObj extends RenderObj{
    constructor(data, type, transformation=undefined) {
        super(transformation);
        let mesh = null;
        if (typeof data === 'string' || data instanceof String){
            if (type === 'json') {
                mesh = this.parseMeshFile(data);
            } else {
                console.error("[Neu3D] Mesh unknown type");
            }
        } else {
            if (type === 'json') {
                mesh = this.parseMeshDict(data);
            } else {
                console.error("[Neu3D] Mesh unknown type.");
            }
        }
        this.vertices = mesh['vertices'];
        this.faces = mesh['faces'];
        this.morph_type = 'mesh';
    }

    /** create 3d object
    *
    * @param {*} color: color of the object
    * @param {bool} color: if object is in background
    * @param {*} setting: neu3dSettings
    * @param {Vector2} render_size: size of the rendered scene
    */
    createObject(color, background, neu3dSettings, renderer_size = undefined) {
        this.color = new Color(color);
        if (background === undefined) {
            this.background = false;
        } else {
            this.background = background;
        }
        this.meshWireframe = neu3dSettings.meshWireframe;
        
        var vtx = this.vertices;
        var idx = this.faces;

        for (var j = 0; j < vtx.length / 3; j++) {
            this.updateBoundingBox(vtx[3*j+0],vtx[3*j+1],vtx[3*j+2]);
        }

        let geometry = new BufferGeometry();

        geometry.setIndex(idx);
        geometry.setAttribute('position', new Float32BufferAttribute(vtx, 3));
        geometry.computeVertexNormals();
        var opacity1, opacity2;
        if (this.background) {
            opacity1 = neu3dSettings.backgroundOpacity;
            opacity2 = neu3dSettings.backgroundWireframeOpacity;
        } else {
            opacity1 = neu3dSettings.defaultOpacity;
            opacity2 = neu3dSettings.backgroundWireframeOpacity;
        }
        this.opacity = opacity1;
        this.WireframeOpacity = opacity2;
        let materials = [
            new MeshLambertMaterial({ color: color, transparent: true, side: 2, opacity: opacity1}),
            new MeshBasicMaterial({ color: color, wireframe: true, transparent: true, opacity: opacity2})
        ];

        let object = createMultiMaterialObject(geometry, materials);
        if (!neu3dSettings.meshWireframe) {
            object.children[1].visible = false;
        }
        this.threeObj = object;
    }

    /**
    * Update opacity
    * @param {*} op1 : opacity of faces
    */
    updateOpacity(op1) {
        this.opacity = op1;
        this.threeObj.children[0].material.opacity = op1;
    }

    /**
    * Update background opacity
    * @param {*} op1 : opacity of faces
    * @param {*} op2 : opacity of wireframe
    */
    updateBackgroundOpacity(op1, op2) {
        this.opacity = op1;
        this.WireframeOpacity = op2;
        this.threeObj.children[0].material.opacity = op1;
        this.threeObj.children[1].material.opacity = op2;
    }

    enableWireframe() {
        this.meshWireframe = true;
        this.threeObj.children[1].visible = true;
    }

    disableWireframe() {
        this.meshWireframe = false;
        this.threeObj.children[1].visible = false;
    }

    /**
    * Convert input json to mesh json
    * 
    * @param {*} unit
    * @returns mesh json with vertices and faces
    */
    parseMeshDict(unit) {
        let vtx = unit['vertices'];
        let idx = unit['faces'];
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
            var xyz = this.transform(x,y,z);
            vertices.push(xyz[0], xyz[1], xyz[2]);
        }
        return {'vertices': vertices, 'faces': idx};
    };

    parseMeshFile(meshString) {
        let data = {};
        data = JSON.parse(meshString);
        return this.parseMeshDict(data);
    };
}

export class NeuronSkeleton extends RenderObj{
    constructor(data, type, transformation=undefined) {
        super(transformation);
        let skeleton = null;
        if (typeof data === 'string' || data instanceof String){
            if (type === 'swc'){
                skeleton = this.parseSWCFile(data);
            } else if (type === 'ns') {
                skeleton = this.parseNSFile(data);
            } else {
                console.error("[Neu3D] NeuronSkeleton unknown type.");
            }
        } else {
            if (type === 'swc') {
                skeleton = this.parseSWCDict(data);
            } else if (type === 'ns') {
                skeleton = this.parseNSDict(data);
            } else {
                console.error("[Neu3D] NeuronSkeleton unknown type.");
            }
        }
        // if (!NeuronSkeleton.verifySkeleton(skeleton)) {
        //     console.error("[Neu3D] Parse NeuronSkeleton failed.");
        // }
        this.vertices = skeleton['vertices'];
        this.segments = skeleton['segments'];
        this.heads = skeleton['heads'];
        this.morph_type = type;
    };

    /** create 3d object
    *
    * @param {*} color: color of the object
    * @param {bool} color: if object is in background
    * @param {*} setting: neu3dSettings
    * @param {Vector2} render_size: size of the rendered scene
    */
    createObject(color, background, neu3dSettings, renderer_size = undefined) {
        this.color = new Color(color);
        if (background === undefined) {
            this.background = false;
        } else {
            this.background = background;
        }
        this.mode = neu3dSettings.neuron3dMode;

        var opacity;
        if (this.background) {
            opacity = neu3dSettings.backgroundOpacity;
        } else {
            opacity = neu3dSettings.defaultOpacity;
        }
        this.opacity = opacity;
        this.mode = neu3dSettings.neuron3dMode;
        var mergedGeometry = undefined;
        var geometryToMerge = [];
        var geometry = undefined;
        //var geometryCylinder = undefined;
        var geometrySphere = undefined;
        //var cylinders = undefined;
        var spheres = undefined;
        var object = new Object3D();

        var vertices = this.vertices;
        var segments = this.segments;
        var len = Object.keys(vertices).length;
        var somalen = 0;

        for (var [idx, c] of Object.entries(vertices)) {
            this.updateBoundingBox(c.x, c.y, c.z);
            if (c.type == 1) {
                somalen += 1;
            }
        }
        // var total_seg = Object.keys(segments).length;
        let defaultRadiusNodes = [];
        let defaultSomaRadiusNodes = [];
        
        if (neu3dSettings.neuron3dMode == 0){
            var matrix = new Matrix4();
            var materialSphere = new MeshLambertMaterial( {color: color, transparent: true, opacity: opacity});
            geometrySphere = new SphereGeometry(1.0, 8, 8);

            var sphere_params = [];
            var n_spheres = 0;
            var vs = {1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [],
              11: [], 12: [], 13: [], 14: [], 15: [], 16: [], 17: [], 18: [], 19: [], 20: [],
              21: [], 22: [], 23: [], 24: [], 25: [], 26: [], 27: [], 28: [], 29: [], 30: [],
              31: [], 32: [], 33: [], 34: [], 35: [], 36: [], 37: [], 38: [], 39: [], 40: [],
              41: [], 42: [], 43: [], 44: [], 45: [], 46: [], 47: [], 48: [], 49: []
            };
            
            var bin, defaultBin;
            
            if (neu3dSettings.defaultRadius <= 1) {
                defaultBin = Math.max(Math.ceil(Math.log10(neu3dSettings.defaultRadius)/0.05)+40, 1);
            } else {
                defaultBin = Math.floor(neu3dSettings.defaultRadius);
            }
            if (defaultBin > 48){
                defaultBin = 49;
            }

            var j = 0;
            for (var [idx, c] of Object.entries(vertices)) {
                if(c.type == 1){
                    if (c.radius > 0){
                        scale = clip(c.radius, neu3dSettings.minSomaRadius, neu3dSettings.maxSomaRadius);
                    } else {
                        scale = neu3dSettings.defaultSomaRadius; 
                        defaultSomaRadiusNodes.push(j);
                    }
                    sphere_params.push([c.x, c.y, c.z, scale])
                    j += 1;
                    n_spheres += 1;
                } else {
                    if (c.radius) {
                        if (c.radius > 1.0) {
                            bin = Math.floor(c.radius)+40;
                            if (bin > 48){
                                bin = 49;
                            }
                            scale = bin-40+0.5;
                            sphere_params.push([c.x, c.y, c.z, scale]);
                            n_spheres += 1;
                        }
                    }
                }
            }

            for (var [idx, value] of Object.entries(segments) ) {
                var c = vertices[value['start']];
                var p = vertices[value['end']];
                
                if (c.type != 1 && p.type != 1) {
                    if (c.radius) {
                        if (c.radius <= 1) {
                            bin = Math.max(Math.ceil(Math.log10(c.radius)/0.05)+40, 1);
                        } else {
                            bin = Math.floor(c.radius)+40;
                        }
                        if (bin > 48){
                            bin = 49;
                        }
                    } else {
                        bin = defaultBin;
                    }
                    vs[bin.toString()].push(c.x);
                    vs[bin.toString()].push(c.y);
                    vs[bin.toString()].push(c.z);
                    vs[bin.toString()].push( (c.x+p.x)/2 );
                    vs[bin.toString()].push( (c.y+p.y)/2 );
                    vs[bin.toString()].push( (c.z+p.z)/2 );
            
                    if (p.radius) {
                        if (p.radius <= 1) {
                            bin = Math.max(Math.ceil(Math.log10(p.radius)/0.05)+40, 1);
                        } else {
                            bin = Math.floor(p.radius)+40;
                        }
                        if (bin > 48){
                            bin = 49;
                        }
                    } else {
                        bin = defaultBin;
                    }
                    vs[bin.toString()].push(p.x);
                    vs[bin.toString()].push(p.y);
                    vs[bin.toString()].push(p.z);
                    vs[bin.toString()].push( (c.x+p.x)/2 );
                    vs[bin.toString()].push( (c.y+p.y)/2 );
                    vs[bin.toString()].push( (c.z+p.z)/2 );
                }
            }
            spheres = new InstancedMesh( geometrySphere, materialSphere, n_spheres );
            var j = 0;
            for (var n of sphere_params){
                matrix.makeScale(n[3], n[3], n[3]);
                matrix.setPosition( n[0], n[1], n[2] );
                spheres.setMatrixAt( j, matrix );
                j += 1;
            }
            object.add(spheres);

            var width;
            for (var i = 1; i <= 49; i++){
                if (i <= 40) {
                    width = Math.pow(10, (i-40)*0.05);
                } else {
                    width = i-40+0.5;
                }
                if (vs[i.toString()].length){
                    geometry = new LineSegmentsGeometry();
                    geometry.setPositions(vs[i.toString()]);
                    var material_lines = new LineMaterial({ transparent: true, linewidth: width*2, color: color.getHex(), dashed: false, worldUnits: true, opacity: opacity, resolution: renderer_size, alphaToCoverage: false}); 
                    var lines = new LineSegments2(geometry, material_lines);
                    lines.computeLineDistances();
                    object.add(lines);
                }
            }
        } else if (neu3dSettings.neuron3dMode == 6){
            var swcObj = {};
            for (var [nodeIndex, c] of Object.entries(vertices)) {
                swcObj[nodeIndex] = {
                    'type': c['type'],
                    'x': c['x'],
                    'y': c['y'],
                    'z': c['z'],
                    'radius': c['radius'],
                    'parent': null,
                    'children': []
                };
            };
            for (var nodeIndex of this.heads) {
                swcObj[nodeIndex].parent = -1;
            }
            var start, end;
            for (let [segmentId, c] of Object.entries(segments)){
                start = c['start'];
                end = c['end'];
                if (start in swcObj && end in swcObj){
                    swcObj[end].parent = start;
                    swcObj[start].children.push(end);
                }
            }

            var all_branches = {};

            for (var nodeIndex of this.heads) {
                all_branches[nodeIndex] = createTreeFromSWC(swcObj, nodeIndex);
            }

            let widths = new Set();
            for (let node of Object.values(swcObj)){
                if (node.type !== 1){
                    widths.add(node.radius);
                }
            }
            const hasVariableWidth = widths.size > 1;
            
            if (!hasVariableWidth){
                const radius = Array.from(widths)[0] == 0 ? neu3dSettings.defaultRadius : clip(Array.from(widths)[0], neu3dSettings.minRadius, neu3dSettings.maxRadius);
                
                for (let [head, branches] of Object.entries(all_branches)) {
                    for (let branch of branches) {
                        if (branch.length < 2) {
                            // this should only happen for soma when soma is directly connected to multiple branches
                            continue;
                        }
                        const branch3D = branch.map((node)=>{return new Vector3(node.x, node.y, node.z)})
                        const path = new CatmullRomCurve3(branch3D, false);
                        geometryToMerge.push(new TubeGeometry(path, Math.min(30, branch3D.length), radius, 8, false));
                    }
                }
            } else{
                for (let [head, branches] of Object.entries(all_branches)) {
                    for (let branch of branches) {
                        for (let start_idx in branch.slice(0, -1)) {
                            start_idx = parseInt(start_idx);
                            const curr = branch[start_idx];
                            const next = branch[start_idx + 1];
                            let d = new Vector3((curr.x - next.x), (curr.y - next.y), (curr.z - next.z));
                            curr.w = clip(curr.w, neu3dSettings.minRadius, neu3dSettings.maxRadius);
                            next.w = clip(next.w, neu3dSettings.minRadius, neu3dSettings.maxRadius);
                            let segment = new CylinderGeometry(curr.w, next.w, d.length(), 8, 1, 0);
                            segment.translate(0, 0.5 * d.length(), 0);
                            segment.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2));
                            segment.lookAt(d.clone());
                            segment.translate(next.x, next.y, next.z);
                            geometryToMerge.push(segment);
                            if (start_idx > 0) {
                                const prev = branch[start_idx-1];
                                let a = new Vector3(0.9 * curr.x + 0.1 * prev.x, 0.9 * curr.y + 0.1 * prev.y, 0.9 * curr.z + 0.1 * prev.z);
                                let b = new Vector3(0.9 * curr.x + 0.1 * next.x, 0.9 * curr.y + 0.1 * next.y, 0.9 * curr.z + 0.1 * next.z);
                                let curve = new QuadraticBezierCurve3(a, new Vector3(curr.x, curr.y, curr.z), b);
                                var joint = new TubeGeometry(curve, 8, curr.w, 4, false);
                                geometryToMerge.push(joint);
                            }
                        }
                    }
                }
            }
            var materialSphere = new MeshLambertMaterial( {color: color, transparent: true, opacity: opacity});
            geometrySphere = new SphereGeometry(1.0, 8, 8);
            spheres = new InstancedMesh( geometrySphere, materialSphere, somalen);
            var scale;
            var matrix = new Matrix4();
            var j = 0;
            for (var [idx, c] of Object.entries(vertices)) {
                if (c.type == 1) {
                    if (c.radius > 0) {
                        scale = clip(c.radius, neu3dSettings.minSomaRadius, neu3dSettings.maxSomaRadius);
                    } else {
                        scale = neu3dSettings.defaultSomaRadius;
                        defaultSomaRadiusNodes.push(j);
                    }
                
                    matrix.makeScale(scale, scale, scale);
                    matrix.setPosition( c.x, c.y, c.z );
                    spheres.setMatrixAt( j, matrix );
                    j += 1;
                }
            }
            object.add(spheres);
            
            const mergedGeometry = mergeBufferGeometries(geometryToMerge, false);
            var material_merge = new MeshLambertMaterial( {color: color, transparent: true, opacity: opacity});
            object.add(new Mesh(mergedGeometry, material_merge));
        } else {
            // setup sphere geometry. Mode 3 and 5 requires a sphere for each node.
            // Other modes requires a sphere for each soma node.
            if (neu3dSettings.neuron3dMode == 5 || neu3dSettings.neuron3dMode == 3) {
                var materialSphere = new MeshLambertMaterial( {color: color, transparent: true, opacity: opacity});
                geometrySphere = new SphereGeometry(1.0, 8, 8);
                spheres = new InstancedMesh( geometrySphere, materialSphere, len);
            } else { // 1, 2, 4
                var materialSphere = new MeshLambertMaterial( {color: color, transparent: true, opacity: opacity});
                geometrySphere = new SphereGeometry(1.0, 8, 8);
                spheres = new InstancedMesh( geometrySphere, materialSphere, somalen);
            }

            if (neu3dSettings.neuron3dMode > 3) { // create cylinders
                for (var [idx, value] of Object.entries(segments) ) {
                    var c = vertices[value['start']];
                    var p = vertices[value['end']];
                
                    var d = new Vector3((p.x - c.x), (p.y - c.y), (p.z - c.z));
                    
                    var cRadius, pRadius;
                    if(c.radius > 0)
                    {
                        cRadius = clip(c.radius, neu3dSettings.minRadius, neu3dSettings.maxRadius);
                    } else {
                        cRadius = neu3dSettings.defaultRadius;
                    }

                    if(p.radius > 0)
                    {
                        pRadius = clip(p.radius, neu3dSettings.minRadius, neu3dSettings.maxRadius);
                    } else {
                        pRadius = neu3dSettings.defaultRadius;
                    }

                    if (c.type == 1) {
                        if(p.type != 1) {
                            cRadius = pRadius;
                        } else {
                            if (c.radius > 0) {
                                cRadius = clip(c.radius, neu3dSettings.minSomaRadius, neu3dSettings.maxSomaRadius);
                            } else {
                                cRadius = neu3dSettings.defaultSomaRadius;
                            }
                        }
                    }

                    if (p.type == 1) {
                        if (c.type != 1) {
                            pRadius = cRadius;
                        } else {
                            if (p.radius > 0) {
                                pRadius = clip(p.radius, neu3dSettings.minSomaRadius, neu3dSettings.maxSomaRadius);
                            } else {
                                pRadius = neu3dSettings.defaultSomaRadius;
                            }
                        }
                    }

                    var geometry = new CylinderGeometry(pRadius, cRadius, d.length(), 8, 1, 0);
                    geometry.translate(0, 0.5*d.length(),0);
                    geometry.applyMatrix4( new Matrix4().makeRotationX( Math.PI / 2 ) );
                    geometry.lookAt(d.clone());
                    geometry.translate(c.x, c.y, c.z);
    
                    geometryToMerge.push(geometry);
                }
            }

            var j = 0;
            if (neu3dSettings.neuron3dMode == 5 || neu3dSettings.neuron3dMode == 3 ) {
                // render spheres for sphere mode or sphere+cylinder mode
                var scale;
                var matrix = new Matrix4();
                for (var [idx, c] of Object.entries(vertices)) {
                    if(c.radius > 0) {
                        if (c.type == 1) {
                            scale = clip(c.radius, neu3dSettings.minSomaRadius, neu3dSettings.maxSomaRadius);
                        } else {
                            scale = clip(c.radius, neu3dSettings.minRadius, neu3dSettings.maxRadius);
                        }
                    } else {
                        if(c.type == 1) {
                            scale = neu3dSettings.defaultSomaRadius;
                            defaultSomaRadiusNodes.push(j);
                        } else {
                            scale = neu3dSettings.defaultRadius;
                            defaultRadiusNodes.push(j);
                        }
                    }
                    matrix.makeScale(scale, scale, scale);
                    matrix.setPosition( c.x, c.y, c.z );
                    spheres.setMatrixAt( j, matrix );
                    j += 1;
                }
            } else { // mode 1, 2, 4
                var scale;
                var matrix = new Matrix4();
                for (var [idx, c] of Object.entries(vertices)) {
                    if (c.type == 1) {
                        if (c.radius > 0) {
                            scale = clip(c.radius, neu3dSettings.minSomaRadius, neu3dSettings.maxSomaRadius);
                        } else {
                            scale = neu3dSettings.defaultSomaRadius;
                            defaultSomaRadiusNodes.push(j);
                        }
                    
                        matrix.makeScale(scale, scale, scale);
                        matrix.setPosition( c.x, c.y, c.z );
                        spheres.setMatrixAt( j, matrix );
                        j += 1;
                    }
                }
            }


            if(spheres)
                object.add(spheres);
            if(geometryToMerge.length) {
                mergedGeometry = mergeBufferGeometries(geometryToMerge, false);
                for (var n of geometryToMerge) {
                    n.dispose();
                }
                var material_merge = new MeshLambertMaterial( {color: color, transparent: true, opacity: opacity});
                var mesh = new Mesh(mergedGeometry, material_merge);
                object.add(mesh);
            }
            

            // add line segments
            if (neu3dSettings.neuron3dMode <= 3) {
                vs = [];
                for (var [idx, value] of Object.entries(segments) ) {
                    var c = vertices[value.start];
                    var p = vertices[value.end];
                    vs.push(c.x);
                    vs.push(c.y);
                    vs.push(c.z);
                    vs.push(p.x);
                    vs.push(p.y);
                    vs.push(p.z);
                }
    
                if (neu3dSettings.neuron3dMode == 2) {
                    geometry = new LineSegmentsGeometry()
                    geometry.setPositions(vs);
                    var material_lines = new LineMaterial({ transparent: true, linewidth: neu3dSettings.defaultRadius*2, color: color.getHex(), dashed: false, worldUnits: true, opacity: opacity, resolution: renderer_size}); 
                    var lines = new LineSegments2(geometry, material_lines)
                    lines.computeLineDistances()
                } else {
                    geometry = new BufferGeometry();
                    geometry.setAttribute('position', new Float32BufferAttribute(vs, 3));
                    var material_lines = new LineBasicMaterial({ transparent: true, color: color, opacity: opacity});
                    var lines = new LineSegments(geometry, material_lines)
                }
                object.add(lines);
            }
        }
        this.defaultSomaRadiusNodes = defaultSomaRadiusNodes;
        this.defaultRadiusNodes = defaultRadiusNodes;
        this.threeObj = object;
    };

    /**
    * Update the radius of the rendered skeleton if they are rendered with default radius
    * 
    * @param {*} unit
    * @returns skeleton json with vertices and segments
    */
    updateDefaultRadius(radius) {
        if (this.mode == 0) {

        } else if (this.mode == 2) {
            for (var child of this.threeObj.children) {
                if (child.material.type == 'LineMaterial'){
                    child.material.linewidth = radius*2;
                }
            }
        } else if (this.mode == 3) {
            for (var child of this.threeObj.children) {
                if (child instanceof InstancedMesh) {
                    var matrix = new Matrix4();
                    var old_matrix = new Matrix4();
                    for (var j of this.defaultRadiusNodes) {
                        matrix.makeScale(radius, radius, radius);
                        child.getMatrixAt(j, old_matrix);
                        matrix.copyPosition(old_matrix);
                        child.setMatrixAt( j, matrix);
                    }
                    child.instanceMatrix.needsUpdate = true;
                }
            }
        }
    }

    updateDefaultSomaRadius(radius) {
        for (var child of this.threeObj.children) {
            if (child instanceof InstancedMesh) {
                var matrix = new Matrix4();
                var old_matrix = new Matrix4();
                for (var j of this.defaultSomaRadiusNodes) {
                    matrix.makeScale(radius, radius, radius);
                    child.getMatrixAt(j, old_matrix);
                    matrix.copyPosition(old_matrix);
                    child.setMatrixAt( j, matrix);
                }
                child.instanceMatrix.needsUpdate = true;
            }
        }
    }

    recreateObject(neu3dSettings, renderer_size = undefined) {
        if (this.mode !== neu3dSettings.neuron3dMode) {
            this.createObject(this.color, this.background, neu3dSettings, renderer_size);
        }
    }

    /**
    * Convert input json to skeleton
    * @param {*} unit
    * @returns skeleton json with vertices and segments
    */
    parseSWCDict(unit) {
        var vertices = {};
        var segments = {};
        var heads = [];
        let len = unit['sample'].length;
        var nodeIndex, x, y, z, xyzr, type, radius, parentIndex;
        var i = 0;
        for (let j = 0; j < len; j++) {
            nodeIndex = parseInt(unit['sample'][j]);
            type = parseInt(unit['identifier'][j]);
            parentIndex = parseInt(unit['parent'][j]);
            if ('radius' in unit) {
                radius = parseFloat(unit['radius'][j]);
            } else {
                radius = parseFloat(unit['r'][j]);
            }
            
            x = parseFloat(unit['x'][j]);
            y = parseFloat(unit['y'][j]);
            z = parseFloat(unit['z'][j]);

            xyzr = this.transform(x, y, z, radius);

            vertices[nodeIndex] = {
                'type': type,
                'x': xyzr[0],
                'y': xyzr[1],
                'z': xyzr[2],
                'radius': xyzr[3]
            };

            if (parentIndex !== -1) {
                segments[i] = {
                    'start': parentIndex,
                    'end': nodeIndex
                };
                i += 1;
            } else {
                heads.push(nodeIndex);
            }
        }
        var skeleton = {'vertices': vertices,
                        'segments': segments,
                        'heads': heads};
        return skeleton;
    };

    /**
    * Convert string of SWC to json object
    * @param {String} swcString
    * @returns vertices and segments
    */
    parseSWCFile(swcString) {
        var vertices = {};
        var segments = {};
        var heads = [];
        swcString = swcString.replace(/\r\n/g, "\n");
        var x, y, z, xyzr, radius;
        swcString.split("\n").forEach((e, i) => {
            let seg = e.split(' ');
            // if is comma delimted, split again
            if (seg.length === 1) {
                seg = e.split(',');
            }
            // if has leading comma, take the rest of the slice
            if (seg.length === 8) {
                seg = seg.slice(1);
            }

            if (seg.length !== 7)  {
                return
            }

            // only process if have the right length
            x = parseFloat(seg[2]);
            y = parseFloat(seg[3]);
            z = parseFloat(seg[4]);
            radius = parseFloat(seg[5]);
            xyzr = this.transform(x, y, z, radius);

            const nodeIndex = parseInt(seg[0]);
            const parentIndex = parseInt(seg[6]);

            vertices[nodeIndex] = {
                'type': parseInt(seg[1]),
                'x': xyzr[0],
                'y': xyzr[1],
                'z': xyzr[2],
                'radius':  xyzr[3]
            };

            if (parentIndex !== -1) {
                segments[i] = {
                    'start': parentIndex,
                    'end': nodeIndex
                };
            } else {
                heads.push(nodeIndex);
            }
        });
        var skeleton = {'vertices': vertices,
                        'segments': segments,
                        'heads': heads};
        return skeleton;
    }
}


export class Synapses extends RenderObj{
    constructor(data, type, transformation=undefined) {
        super(transformation);
        let locations = null;
        if (typeof data === 'string' || data instanceof String){
            if (type === 'syn'){
                locations = this.parseSynFile(data);
            } else {
                console.error("[Neu3D] NeuronSkeleton unknown type.");
            }
        } else {
            if (type === 'syn') {
                locations = this.parseSynDict(data);
            } else if (type === 'swc') {
                locations = this.parseSWCDict(data);
            }
        }
        this.locations = locations;
        this.morph_type = 'swc';
    }

    /** create 3d object
    *
    * @param {*} color: color of the object
    * @param {bool} color: if object is in background
    * @param {*} setting: neu3dSettings
    * @param {Vector2} render_size: size of the rendered scene
    */
    createObject(color, background, neu3dSettings) {
        this.color = new Color(color);
        if (background === undefined) {
            this.background = false;
        } else {
            this.background = background;
        }

        var opacity;
        if (this.background) {
            opacity = neu3dSettings.backgroundOpacity;
        } else {
            opacity = neu3dSettings.synapseOpacity;
        }
        this.opacity = opacity;

        var object = new Object3D();

        var locations = this.locations
        var len = locations.length;

        for (var c of locations) {
            this.updateBoundingBox(c.pre_x, c.pre_y, c.pre_z);
        }
        // var total_seg = Object.keys(segments).length;
        
        var material_synapse = new MeshLambertMaterial( {color: color, transparent: true, opacity: opacity});

        var matrix = new Matrix4();
        var geometrySphere = new SphereGeometry( 1.0, 8, 8 );
        // var geometrySphere = new THREE.IcosahedronGeometry( 1.0, 1 );
        // var geometrySphere = new THREE.OctahedronGeometry(1.0, 0);
        var spheres = new InstancedMesh( geometrySphere, material_synapse, len*2);
        var geometry = new BufferGeometry();
        var vertices = [];

        var scale;
        var i = 0;
        for (var c of locations) {
            if (c.pre_radius) {
                scale = c.pre_radius * neu3dSettings.defaultSynapseRadius;
            } else {
                scale = neu3dSettings.defaultSynapseRadius;
            }
            matrix.makeScale(scale, scale, scale);
            matrix.setPosition( c.pre_x, c.pre_y, c.pre_z );
            spheres.setMatrixAt( i, matrix );
            i += 1;

            if (c.post_x !== undefined) {
                if (c.post_radius) {
                    scale = c.post_radius * neu3dSettings.defaultSynapseRadius;
                } else {
                    scale = neu3dSettings.defaultSynapseRadius / 2;
                }
                matrix.makeScale(scale, scale, scale);
                matrix.setPosition( c.post_x, c.post_y, c.post_z );
                spheres.setMatrixAt( i, matrix );
                i += 1;
                vertices.push(c.pre_x, c.pre_y, c.pre_z);
                vertices.push(c.post_x, c.post_y, c.post_z);
            }
        }
        this.overallScale = neu3dSettings.defaultSynapseRadius;
        object.add( spheres );

        geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        var material_lines = new LineBasicMaterial({ transparent: true, color: color, opacity: opacity});
        object.add(new LineSegments(geometry, material_lines));
        
        this.threeObj = object;
    }

    /** update radius of the synapses
    *
    * @param {*} radius: new radius value
    */
    updateRadius(radius) {
        var matrix = new Matrix4();
        var new_matrix = new Matrix4();
        var scale_vec = new Vector3();
        var overallScale;
        for (var child of this.threeObj.children) {
            if ( child.type === 'Mesh' ){
                overallScale = this.overallScale;
                for(var j = 0; j < child.count; j++){
                    child.getMatrixAt(j, matrix);
                    scale_vec.setFromMatrixScale(matrix);
                    new_matrix.makeScale(scale_vec.x/overallScale*radius, scale_vec.y/overallScale*radius, scale_vec.z/overallScale*radius);
                    new_matrix.copyPosition(matrix);
                    child.setMatrixAt( j, new_matrix );
                }
                child.instanceMatrix.needsUpdate=true;
                this.overallScale = radius;
            }
        }
    }

    /**
    * Convert string of synapse locations to json object
    * Expect input file is csv like file with 4 columns or 8 columns.
    * pre_x, pre_y, pre_z, pre_r(, post_x, post_y, post_z, post_r).
    * @param {String} synString
    * @returns Array of dict
    */
    parseSynFile(synString) {
        var locations = [];
        synString = synString.replace(/\r\n/g, "\n");
        synString.split("\n").forEach((e, i) => {
            let seg = e.split(' ');
            // if is comma delimted, split again
            if (seg.length === 1) {
                seg = e.split(',');
            }
            if (seg.length != 4 && seg.length != 8)  {
                return
            }
            // only process if have the right length
            var x = parseFloat(seg[0]);
            var y = parseFloat(seg[1]);
            var z = parseFloat(seg[2]);
            var r = parseFloat(seg[3]);
            var xyzr = this.transform(x, y, z, r);

            if (seg.length == 8) {
                var x2 = parseFloat(seg[4]);
                var y2 = parseFloat(seg[5]);
                var z2 = parseFloat(seg[6]);
                var r2 = parseFloat(seg[7]);
    
                var xyzr2 = this.transform(x2, y2, z2, r2);
            
                locations.push({
                    'pre_x': xyzr[0],
                    'pre_y': xyzr[1],
                    'pre_z': xyzr[2],
                    'pre_radius': xyzr[3],
                    'post_x': xyzr2[0],
                    'post_y': xyzr2[1],
                    'post_z': xyzr2[2],
                    'post_radius': xyzr2[3]
                });
            } else {
                locations.push({
                    'pre_x': xyzr[0],
                    'pre_y': xyzr[1],
                    'pre_z': xyzr[2],
                    'pre_radius': xyzr[3]
                });
            }
        });
        return locations;
    }


    /**
    * Convert SWC json to locations
    * expected unit has keys x, y, z, r/radius, identifier, parent, sample.
    * @param {*} unit
    * @returns Array of dict
    */
    parseSWCDict(unit) {
        var locations = [];
        var locdict = {};
        let len = unit['sample'].length;
        var nodeIndex, x, y, z, xyzr, type, radius, parentIndex;
        for (let j = 0; j < len; j++) {
            nodeIndex = parseInt(unit['sample'][j]);
            type = parseInt(unit['identifier'][j]);
            x = parseFloat(unit['x'][j]);
            y = parseFloat(unit['y'][j]);
            z = parseFloat(unit['z'][j]);
            parentIndex = parseInt(unit['parent'][j]);
            if ('radius' in unit) {
                radius = parseFloat(unit['radius'][j]);
            } else {
                radius = parseFloat(unit['r'][j]);
            }
            xyzr = this.transform(x, y, z, radius);

            if (parentIndex == -1) {
                locdict[nodeIndex] = {
                    'pre_x': xyzr[0],
                    'pre_y': xyzr[1],
                    'pre_z': xyzr[2],
                    'pre_radius': xyzr[3]
                };
            } else {
                locdict[parentIndex]['post_x'] = xyzr[0];
                locdict[parentIndex]['post_y'] = xyzr[1];
                locdict[parentIndex]['post_z'] = xyzr[2];
                locdict[parentIndex]['post_radius'] = xyzr[3];
            }
        }
        for (var [k, v] of Object.entries(locdict)){
            locations.push(v);
        }

        return locations;
    }

}
