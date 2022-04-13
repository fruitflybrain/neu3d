import { Neu3D } from './neu3d';
import {
    Vector3, Object3D, Matrix4, Mesh, Vector4,
    MeshLambertMaterial, LineBasicMaterial,
    BufferGeometry, CylinderGeometry, SphereGeometry, TubeGeometry,
    QuadraticBezierCurve3, LineSegments,
    CatmullRomCurve3, Line,
    Float32BufferAttribute, InstancedMesh
} from 'three';

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
import { merge } from 'lodash';

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

export class SWC {
    constructor(swc_or_string, transformation=undefined) {
        if (transformation === undefined) {
            transformation = {
                scale: {x: 1., y:1., z:1., radius:1.},
                rotation: {xy: 0., yz:0.},
                shift: {x: 0., y:0., z:0.}
              }
        }
        let swc = null;
        if (typeof swc_or_string === 'string' || swc_or_string instanceof String){
            swc = SWC.parseSWC(swc_or_string, transformation.scale, transformation.rotation, transformation.shift);
        } else {
            swc = swc_or_string;
        }
        if (!SWC.verifySWC(swc)) {
            console.error("[Neu3D] Parse SWC failed.");
        }
        this.swc = swc;

        // find soma and synapses
        this.soma = null;
        this.synapses = [];
        for (let nodeId in swc) {
            if (swc[nodeId].parent === -1) {
                if (swc[nodeId].type === 1) {
                    this.soma = swc[nodeId];
                } else if (swc[nodeId].type === -1) {
                    this.synapses.push(swc[nodeId]);
                }
            }
        }
        if (this.soma === null) {
            console.warn("[Neu3D] SWC has no soma.");
        }

        // create an array of branches for each branch on the neuronal tree
        this.branches = createTreeFromSWC(swc, this.soma.id);
    }

    createObject(color, neu3dSettings) {
        // a collection of branches that run down the tree from root
        // including the trunk
        let widths = new Set();
        for (let node of Object.values(this.swc)){
            if (node.id !== this.soma.id){
                widths.add(clip(node.radius, neu3dSettings.minRadius, neu3dSettings.maxRadius));
            }
        }
        const hasVariableWidth = widths.size > 1;

        var neuriteGeometries = [];
        var sphereGeometries = [];

        // render soma
        const soma = new SphereGeometry(
            clip(this.soma.radius, neu3dSettings.minSomaRadius, neu3dSettings.maxSomaRadius),
            8, 8
        )
        soma.translate(this.soma.x, this.soma.y, this.soma.z);
        sphereGeometries.push(soma);

        // render synapses
        for (let synapse of this.synapses) {
            let node = new SphereGeometry(
                clip(node.radius, neu3dSettings.minSynapseRadius, neu3dSettings.maxSynapseRadius),
                8, 8
            )
            node.translate(synapse.x, synapse.y, synapse.z);
            sphereGeometries.push(node);
        }

        // render tree
        const mergedSpheres = mergeBufferGeometries(sphereGeometries);
        const shinyMaterial = new MeshLambertMaterial({
            color: color, transparent: true
        });
        let object = new Object3D();
        if (false) {//(neu3dSettings.neuron3d == false) { // lines
            for (let branch of this.branches) {
                const branch3D = branch.map((node)=>{return new Vector3(node.x, node.y, node.z)})
                const line = new Line(
                    new BufferGeometry().setFromPoints(branch3D),
                    new LineBasicMaterial({color: color})
                )
                object.add(line);
                // neuriteGeometries.push(new BufferGeometry().setFromPoints(branch3D));
            }
            // let mergedNeurites = BufferGeometryUtils.mergeBufferGeometries(neuriteGeometries);

            const spheres = new Mesh(
                mergedSpheres,
                shinyMaterial
            )
            // const line = new Line(
            //     mergedNeurites,
            //     new LineBasicMaterial({color: color})
            // )
            // object.add(line);
            object.add(spheres);

        } else {
            if (!hasVariableWidth){
                const radius = clip(Array.from(widths)[0], neu3dSettings.minRadius, neu3dSettings.maxRadius);
                for (let branch of this.branches) {
                    if (branch.length < 2) {
                        // this should only happen for soma when soma is directly connected to multiple branches
                        continue;
                    }
                    const branch3D = branch.map((node)=>{return new Vector3(node.x, node.y, node.z)})
                    const path = new CatmullRomCurve3(branch3D, false);
                    neuriteGeometries.push(new TubeGeometry(path, Math.min(30, branch3D.length), radius, 8, false));
                }
            } else{
                for (let branch of this.branches) {
                    for (let start_idx in branch.slice(0, -1)) {
                        start_idx = parseInt(start_idx);
                        const curr = branch[start_idx];
                        const next = branch[start_idx + 1];
                        let d = new Vector3((curr.x - next.x), (curr.y - next.y), (curr.z - next.z));
                        curr.w = clip(curr.w, neu3dSettings.minRadius, neu3dSettings.maxRadius);
                        next.w = clip(next.w, neu3dSettings.minRadius, neu3dSettings.maxRadius);
                        let segment = new CylinderGeometry(curr.w, next.w, d.length(), 4, 1, 0);
                        segment.translate(0, 0.5 * d.length(), 0);
                        segment.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2));
                        segment.lookAt(d.clone());
                        segment.translate(next.x, next.y, next.z);
                        neuriteGeometries.push(segment);
                        if (neu3dSettings.neuron3dMode === 2) {
                            let joint = new SphereGeometry(next.radius, 8, 8);
                            joint.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2));
                            joint.lookAt(d);
                            joint.translate(next.x, next.y, next.z);
                            mergedSpheres.merge(joint);
                        } else {
                            if (start_idx > 0) {
                                const prev = branch[start_idx-1];
                                let a = new Vector3(0.9 * curr.x + 0.1 * prev.x, 0.9 * curr.y + 0.1 * prev.y, 0.9 * curr.z + 0.1 * prev.z);
                                let b = new Vector3(0.9 * curr.x + 0.1 * next.x, 0.9 * curr.y + 0.1 * next.y, 0.9 * curr.z + 0.1 * next.z);
                                let curve = new QuadraticBezierCurve3(a, new Vector3(curr.x, curr.y, curr.z), b);
                                joint = new TubeGeometry(curve, 8, p.radius, 4, false);
                                neuriteGeometries.push(joint)
                            }
                        }
                    }
                }
                if (neu3dSettings.neuron3dMode === 2) {
                } else if (neu3dSettings.neuron3dMode === 3) {
                }
            }
            const mergedGeometry = mergeBufferGeometries(neuriteGeometries.concat([mergedSpheres]));
            object.add(new Mesh(mergedGeometry, shinyMaterial));
        }
        return object;
    }

    /**
    * Convert string of SWC to json object
    * @param {String} swcString
    * @param {Map} scale
    * @param {Map} rotation
    * @param {Map} shift
    * @returns object of swcString key-ed by id of each node
    */
    static parseSWC(swcString, scale, rotation, shift) {
        var swcObj = {};
        swcString = swcString.replace(/\r\n/g, "\n");
        swcString.split("\n").forEach((e) => {
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
            var x_put = parseFloat(seg[2]) * scale.x;
            var y_put = parseFloat(seg[3]) * scale.y;
            var z_put = parseFloat(seg[4]) * scale.z;
            var x_i = Math.cos(rotation.xy) * x_put + Math.sin(rotation.xy) * y_put;
            var y_i = Math.sin(rotation.xy) * x_put + Math.cos(rotation.xy) * y_put;
            var z_i = z_put;

            var x_f = x_i;
            var y_f = Math.cos(rotation.yz) * y_i + Math.sin(rotation.yz) * z_i;
            var z_f = Math.sin(rotation.yz) * y_i + Math.cos(rotation.yz) * z_i;

            x_f = x_f + shift.x;
            y_f = y_f + shift.y;
            z_f = z_f + shift.z;

            const nodeIndex = parseInt(seg[0]);
            const parentIndex = parseInt(seg[6]);

            swcObj[nodeIndex] = {
                'id': nodeIndex,
                'type': parseInt(seg[1]),
                'x': x_f,
                'y': y_f,
                'z': z_f,
                'radius': parseFloat(seg[5]) * scale.radius,
                'parent': parentIndex,
                'children': []
            };
        });
        for (let [nodeId, node] of Object.entries(swcObj)){
            if (node.parent in swcObj){
                swcObj[node.parent].children.push(nodeId);
            }
        }
        return swcObj;
    }

    /** Check if SWC object is valid or not
    *
    * @param {Map} swcObj
    * @returns Boolean indicating if SWC is valid
    */
    static verifySWC(swcObj) {
        const isValid = (val) => ('type' in val) && ('x' in val) && ('y' in val) && ('z' in val) && ('radius' in val) && ('parent' in val);

        for (const [sample, value] of Object.entries(swcObj)){
            if (!isValid(value)) {
                return false;
            }

            if (!(value.parent in swcObj) && (value.parent !== -1)){
                return false
            }
        }
        return true;
    }
}

export class NeuronSkeleton {
    constructor(data, type, transformation=undefined) {
        if (transformation === undefined) {
            transformation = {
                scale: {x: 1, y: 1, z: 1, radius:1.},
                rotation: {xy: 0., yz:0.},
                shift: {x: 0., y:0., z:0.}
              }
        }
        let skeleton = null;
        if (typeof data === 'string' || data instanceof String){
            if (type === 'swc'){
                skeleton = NeuronSkeleton.parseSWCFile(data, transformation.scale, transformation.rotation, transformation.shift);
            } else if (type === 'ns') {
                skeleton = NeuronSkeleton.parseNSFile(data, transformation.scale, transformation.rotation, transformation.shift);
            } else {
                console.error("[Neu3D] NeuronSkeleton unknown type.");
            }
        } else {
            if (type === 'swc') {
                skeleton = NeuronSkeleton.parseSWCDict(data);
            } else if (type === 'ns') {
                skeleton = NeuronSkeleton.parseNSDict(data);
            }
        }
        // if (!NeuronSkeleton.verifySkeleton(skeleton)) {
        //     console.error("[Neu3D] Parse NeuronSkeleton failed.");
        // }
        this.vertices = skeleton['vertices'];
        this.segments = skeleton['segments'];
    };

    createObject(color, neu3dSettings, renderer_size = undefined) {
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
        // var total_seg = Object.keys(segments).length;
        
        if (neu3dSettings.neuron3dMode == 0){
            var matrix = new Matrix4();
            var materialSphere = new MeshLambertMaterial( {color: color, transparent: true});
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

            for (var [idx, c] of Object.entries(vertices)) {
                if(c.type == 1){
                    scale = neu3dSettings.minSomaRadius;
                    sphere_params.push([c.x, c.y, c.z, scale])
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
                    var material_lines = new LineMaterial({ transparent: true, linewidth: width*2, color: color.getHex(), dashed: false, worldUnits: true, opacity: neu3dSettings.defaultOpacity, resolution: renderer_size, alphaToCoverage: false}); 
                    var lines = new LineSegments2(geometry, material_lines);
                    lines.computeLineDistances();
                    object.add(lines);
                }
            }
        } else {
            if(neu3dSettings.neuron3dMode > 2){
                if (neu3dSettings.neuron3dMode == 5 || neu3dSettings.neuron3dMode == 3) {
                    var materialSphere = new MeshLambertMaterial( {color: color, transparent: true, opacity: neu3dSettings.defaultOpacity});
                    geometrySphere = new SphereGeometry(1.0, 8, 8);
                    spheres = new InstancedMesh( geometrySphere, materialSphere, len);
                }
                var i = 0;
                var j = 0;
                if (neu3dSettings.neuron3dMode > 3) {
                    for (var [idx, value] of Object.entries(segments) ) {
                        var c = vertices[value['start']];
                        var p = vertices[value['end']];
                    
                        var d = new Vector3((p.x - c.x), (p.y - c.y), (p.z - c.z));
                        if(!p.radius || !c.radius)
                          var geometry = new CylinderGeometry(neu3dSettings.defaultRadius, neu3dSettings.defaultRadius, d.length(), 6, 1, 0);
                        else
                          var geometry = new CylinderGeometry(p.radius, c.radius, d.length(), 8, 1, 0);
                        geometry.translate(0, 0.5*d.length(),0);
                        geometry.applyMatrix4( new Matrix4().makeRotationX( Math.PI / 2 ) );
                        geometry.lookAt(d.clone());
                        geometry.translate(c.x, c.y, c.z);
      
                        geometryToMerge.push(geometry);

                        i += 1;
                    }
                }
                if (neu3dSettings.neuron3dMode == 5 || neu3dSettings.neuron3dMode == 3 ) {
                    // render spheres for sphere mode or sphere+cylinder mode
                    var scale;
                    var matrix = new Matrix4();
                    for (var [idx, c] of Object.entries(vertices)) {
                        if(!c.radius) {
                            if(c.type == 1) {
                                scale = neu3dSettings.minSomaRadius;
                                spheres.soma_index = j;
                            } else {
                                scale = neu3dSettings.defaultRadius;
                            }
                        } else {
                          scale = c.radius;
                        }
    
                        matrix.makeScale(scale, scale, scale);
                        matrix.setPosition( c.x, c.y, c.z );
                        spheres.setMatrixAt( j, matrix );
                        j += 1;
                    }
                }
                if(spheres)
                    object.add(spheres);
                if(geometryToMerge.length) {
                    mergedGeometry = mergeBufferGeometries(geometryToMerge, false);
                    for (var n of geometryToMerge) {
                        n.dispose();
                    }
                    var material_merge = new MeshLambertMaterial( {color: color, transparent: true, opacity: neu3dSettings.defaultOpacity});
                    var mesh = new Mesh(mergedGeometry, material_merge);
                    object.add(mesh);
                }
            }

            // add line segments
            if (neu3dSettings.neuron3dMode <= 3) {
                vs = [];
                for (var [idx, value] of Object.entries(segments) ) {
                    var c = vertices[value.start];
                    // console.log(value);
                    // console.log(value.start);
                    // console.log(vertices);
                    var p = vertices[value.end];
                    vs.push(c.x);
                    vs.push(c.y);
                    vs.push(c.z);
                    vs.push(p.x);
                    vs.push(p.y);
                    vs.push(p.z);
                }

                for (var [idx, c] of Object.entries(vertices) ) {
                    if (c.type == 1) { // soma
                        if(c.radius) {
                            var sphereGeometry = new SphereGeometry(clip(c.radius, neu3dSettings.minSomaRadius, neu3dSettings.maxSomaRadius), 8, 8 );
                        } else {
                            var sphereGeometry = new SphereGeometry(neu3dSettings.minSomaRadius, 8, 8 );
                        }   
                        sphereGeometry.translate( c.x, c.y, c.z );
                        var sphereMaterial = new MeshLambertMaterial( {color: color, transparent: true} );
                        var soma = new Mesh( sphereGeometry, sphereMaterial);
                        soma.soma_index = 0;
                        object.add(soma);
                        // unit['position'] = new THREE.Vector3(c.x,c.y,c.z);
                    }
                }
    
                if (neu3dSettings.neuron3dMode == 2) {
                    geometry = new LineSegmentsGeometry()
                    geometry.setPositions(vs);
                    var material_lines = new LineMaterial({ transparent: true, linewidth: neu3dSettings.linewidth, color: color.getHex(), dashed: false, worldUnits: true, opacity: neu3dSettings.defaultOpacity, resolution: renderer_size}); 
                    var lines = new LineSegments2(geometry, material_lines)
                    lines.computeLineDistances()
                } else {
                    geometry = new BufferGeometry();
                    geometry.setAttribute('position', new Float32BufferAttribute(vs, 3));
                    var material_lines = new LineBasicMaterial({ transparent: true, color: color });
                    var lines = new LineSegments(geometry, material_lines)
                }
                object.add(lines);
    
            }
        }
        return object;
    };

    static parseSWCDict(unit) {
        var vertices = {};
        var segments = {};
        let len = unit['sample'].length;
        var nodeIndex, x, y, z, type, radius, parentIndex;
        var i = 0;
        for (let j = 0; j < len; j++) {
            nodeIndex = parseInt(unit['sample'][j]);
            x = parseFloat(unit['x'][j]);
            y = parseFloat(unit['y'][j]);
            z = parseFloat(unit['z'][j]);
            type = parseInt(unit['identifier'][j]);
            parentIndex = parseInt(unit['parent'][j]);
            if ('radius' in unit) {
                radius = parseFloat(unit['radius'][j]);
            } else {
                radius = parseFloat(unit['r'][j]);
            }
            vertices[nodeIndex] = {
                'type': type,
                'x': x,
                'y': y,
                'z': z,
                'radius': radius
            };

            if (parentIndex !== -1) {
                segments[i] = {
                    'start': parentIndex,
                    'end': nodeIndex
                };
                i += 1;
            }
        }
        delete unit['identifier'];
        delete unit['x'];
        delete unit['y'];
        delete unit['z'];
        delete unit['r'];
        delete unit['parent'];
        delete unit['sample'];
        var skeleton = {'vertices': vertices, 'segments': segments};
        return skeleton;
    };

    /**
    * Convert string of SWC to json object
    * @param {String} swcString
    * @param {Map} scale
    * @param {Map} rotation
    * @param {Map} shift
    * @returns object of swcString key-ed by id of each node
    */
    static parseSWCFile(swcString, scale, rotation, shift) {
        var vertices = {};
        var segments = {};
        swcString = swcString.replace(/\r\n/g, "\n");
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
            var x_put = parseFloat(seg[2]) * scale.x;
            var y_put = parseFloat(seg[3]) * scale.y;
            var z_put = parseFloat(seg[4]) * scale.z;
            var x_i = Math.cos(rotation.xy) * x_put + Math.sin(rotation.xy) * y_put;
            var y_i = Math.sin(rotation.xy) * x_put + Math.cos(rotation.xy) * y_put;
            var z_i = z_put;

            var x_f = x_i;
            var y_f = Math.cos(rotation.yz) * y_i + Math.sin(rotation.yz) * z_i;
            var z_f = Math.sin(rotation.yz) * y_i + Math.cos(rotation.yz) * z_i;

            x_f = x_f + shift.x;
            y_f = y_f + shift.y;
            z_f = z_f + shift.z;

            const nodeIndex = parseInt(seg[0]);
            const parentIndex = parseInt(seg[6]);

            vertices[nodeIndex] = {
                'type': parseInt(seg[1]),
                'x': x_f,
                'y': y_f,
                'z': z_f,
                'radius': parseFloat(seg[5]) * scale.radius
            };

            if (parentIndex !== -1) {
                segments[i] = {
                    'start': parentIndex,
                    'end': nodeIndex
                };
            }
        });
        var skeleton = {'vertices': vertices, 'segments': segments};
        return skeleton;
    }

    /** Check if SWC object is valid or not
    *
    * @param {Map} skeleton
    * @returns Boolean indicating if SWC is valid
    */
    static verifySWC(skeleton) {
        const isValid = (val) => ('type' in val) && ('x' in val) && ('y' in val) && ('z' in val) && ('radius' in val) && ('parent' in val);

        for (const [sample, value] of Object.entries(skeleton)){
            if (!isValid(value)) {
                return false;
            }

            if (!(value.parent in skeleton) && (value.parent !== -1)){
                return false
            }
        }
        return true;
    }
}


export class Synapses {
    constructor(data, type, transformation=undefined) {
        if (transformation === undefined) {
            transformation = {
                scale: {x: 1., y: 1., z: 1., radius:1.},
                rotation: {xy: 0., yz:0.},
                shift: {x: 0., y:0., z:0.}
              }
        }
        let locations = null;
        if (typeof data === 'string' || data instanceof String){
            if (type === 'syn'){
                locations = Synapses.parseSynFile(data, transformation.scale, transformation.rotation, transformation.shift);
            } else {
                console.error("[Neu3D] NeuronSkeleton unknown type.");
            }
        } else {
            if (type === 'syn') {
                locations = Synapses.parseSynDict(data);
            } else if (type === 'swc') {
                locations = Synapses.parseSWCDict(data);
            }
        }
        this.locations = locations;
    }

    createObject(color, neu3dSettings) {
        var object = new Object3D();

        var locations = this.locations
        var len = locations.length;
        // var total_seg = Object.keys(segments).length;
        
        var material_synapse = new MeshLambertMaterial( {color: color, transparent: true});

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
        spheres.overallScale = neu3dSettings.defaultSynapseRadius;
        object.add( spheres );

        geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        var material_lines = new LineBasicMaterial({ transparent: true, color: color});
        object.add(new LineSegments(geometry, material_lines));
        
        return object;
    }

    /**
    * Convert string of SWC to json object
    * @param {String} swcString
    * @param {Map} scale
    * @param {Map} rotation
    * @param {Map} shift
    * @returns object of swcString key-ed by id of each node
    */
    static parseSynFile(swcString, scale, rotation, shift) {
        var locations = [];
        swcString = swcString.replace(/\r\n/g, "\n");
        swcString.split("\n").forEach((e, i) => {
            let seg = e.split(' ');
            // if is comma delimted, split again
            if (seg.length === 1) {
                seg = e.split(',');
            }
            if (seg.length != 4 && seg.length != 8)  {
                return
            }
            // only process if have the right length
            var x_put = parseFloat(seg[0]) * scale.x;
            var y_put = parseFloat(seg[1]) * scale.y;
            var z_put = parseFloat(seg[2]) * scale.z;
            var x_i = Math.cos(rotation.xy) * x_put + Math.sin(rotation.xy) * y_put;
            var y_i = Math.sin(rotation.xy) * x_put + Math.cos(rotation.xy) * y_put;
            var z_i = z_put;

            var x_f = x_i;
            var y_f = Math.cos(rotation.yz) * y_i + Math.sin(rotation.yz) * z_i;
            var z_f = Math.sin(rotation.yz) * y_i + Math.cos(rotation.yz) * z_i;

            x_f = x_f + shift.x;
            y_f = y_f + shift.y;
            z_f = z_f + shift.z;

            if (seg.length == 8) {
                var x_put2 = parseFloat(seg[4]) * scale.x;
                var y_put2 = parseFloat(seg[5]) * scale.y;
                var z_put2 = parseFloat(seg[6]) * scale.z;
                var x_i2 = Math.cos(rotation.xy) * x_put2 + Math.sin(rotation.xy) * y_put2;
                var y_i2 = Math.sin(rotation.xy) * x_put2 + Math.cos(rotation.xy) * y_put2;
                var z_i2 = z_put2;
    
                var x_f2 = x_i2;
                var y_f2 = Math.cos(rotation.yz) * y_i2 + Math.sin(rotation.yz) * z_i2;
                var z_f2 = Math.sin(rotation.yz) * y_i2 + Math.cos(rotation.yz) * z_i2;
    
                x_f2 = x_f2 + shift.x;
                y_f2 = y_f2 + shift.y;
                z_f2 = z_f2 + shift.z;
            
                locations.push({
                    'pre_x': x_f,
                    'pre_y': y_f,
                    'pre_z': z_f,
                    'pre_radius': parseFloat(seg[3]) * scale.radius,
                    'post_x': x_f2,
                    'post_y': y_f2,
                    'post_z': z_f2,
                    'post_radius': parseFloat(seg[7]) * scale.radius,
                });
            } else {
                locations.push({
                    'pre_x': x_f,
                    'pre_y': y_f,
                    'pre_z': z_f,
                    'pre_radius': parseFloat(seg[3]) * scale.radius
                });
            }
        });
        return locations;
    }

    static parseSWCDict(unit) {
        var locations = [];
        var locdict = {};
        let len = unit['sample'].length;
        var nodeIndex, x, y, z, type, radius, parentIndex;
        var i = 0;
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
            if (parentIndex == -1) {
                locdict[nodeIndex] = {
                    'pre_x': x,
                    'pre_y': y,
                    'pre_z': z,
                    'pre_radius': radius
                };
            } else {
                locdict[parentIndex]['post_x'] = x;
                locdict[parentIndex]['post_y'] = y;
                locdict[parentIndex]['post_z'] = z;
                locdict[parentIndex]['post_radius'] = radius;
            }
        }
        for (var [k, v] of Object.entries(locdict)){
            locations.push(v);
        }

        delete unit['identifier'];
        delete unit['x'];
        delete unit['y'];
        delete unit['z'];
        delete unit['r'];
        delete unit['parent'];
        delete unit['sample'];
        return locations;
    }

    /** Check if SWC object is valid or not
    *
    * @param {Map} swcObj
    * @returns Boolean indicating if SWC is valid
    */
    static verifySWC(swcObj) {
        const isValid = (val) => ('type' in val) && ('x' in val) && ('y' in val) && ('z' in val) && ('radius' in val) && ('parent' in val);

        for (const [sample, value] of Object.entries(swcObj)){
            if (!isValid(value)) {
                return false;
            }

            if (!(value.parent in swcObj) && (value.parent !== -1)){
                return false
            }
        }
        return true;
    }
}
