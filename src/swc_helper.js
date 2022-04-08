import { Neu3D } from './neu3d';
import {
    Vector3, Face3, Object3D, Matrix4, Mesh, Vector4,
    MeshLambertMaterial, MeshBasicMaterial, PointsMaterial, LineBasicMaterial,
    BufferGeometry, CylinderGeometry, SphereGeometry, TubeGeometry,
    QuadraticBezierCurve3, VertexColors, LineSegments,
    XHRLoader
} from 'three';
import {
    SceneUtils
} from 'three/examples/jsm/utils/SceneUtils';
import {
    BufferGeometryUtils
} from 'three/examples/jsm/utils/BufferGeometryUtils'
import { CatmullRomCurve3 } from 'three';
import { Line } from 'three';
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
        const mergedSpheres = BufferGeometryUtils.mergeBufferGeometries(sphereGeometries);
        const shinyMaterial = new MeshLambertMaterial({
            color: color, transparent: true
        });
        let object = new Object3D();
        if (neu3dSettings.neuron3d == false) { // lines
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
            const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(neuriteGeometries.concat([mergedSpheres]));
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