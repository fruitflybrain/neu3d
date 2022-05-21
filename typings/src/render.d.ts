export class RenderObj {
    /**
     *
     * @param {*} transformation :  scale, rotation and shift
     */
    constructor(transformation?: any);
    transformation: any;
    boundingBox: {
        maxY: number;
        minY: number;
        maxX: number;
        minX: number;
        maxZ: number;
        minZ: number;
    };
    pinned: boolean;
    type: string;
    /** Register rid of rendered Object3D, and compute position
     *
     * @param {*} rid :  rid for raycaster
     */
    registerProperties(rid: any): void;
    position: any;
    /** create 3d object
     *
     * @param {*} color: color of the object
     * @param {bool} color: if object is in background
     * @param {*} setting: neu3dSettings
     * @param {Vector2} render_size: size of the rendered scene
     */
    createObject(color: any, background: any, setting: any, render_size?: Vector2): void;
    /** update the visibiilty of the object
     *
     * @param {bool} visibility
     */
    updateVisibility(visibility: bool): void;
    visibility: bool;
    /** toggle the visibiilty of the object
     */
    toggleVis(): void;
    /** update the bounding box
     *
     * @param {*} x
     * @param {*} y
     * @param {*} z
     */
    updateBoundingBox(x: any, y: any, z: any): void;
    /** update opacity of the object;
     *
     * @param {*} opacity : 0-1 value of opacity
     */
    updateOpacity(opacity: any): void;
    opacity: any;
    /** update if depthTest will be checked
     *
     * @param {bool} depth
     */
    updateDepthTest(depth: bool): void;
    depthTest: bool;
    /** get depthTest value
     */
    getDepthTest(): bool;
    /** set color of the object;
     *
     * @param {*} color
     */
    setColor(color: any): void;
    color: any;
    /** get color of the object;
     */
    getColor(): any;
    /** dispose threejs object
     */
    dispose(): void;
    /** transforms coordinate according to the transformation
     *
     * @param {*} x
     * @param {*} y
     * @param {*} z
     * @param {*} r
     */
    transform(x: any, y: any, z: any, r?: any): number[];
}
export class MeshObj extends RenderObj {
    constructor(data: any, type: any, transformation?: any);
    vertices: number[];
    faces: any;
    morph_type: string;
    background: any;
    meshWireframe: any;
    WireframeOpacity: any;
    threeObj: any;
    /**
     * Update background opacity
     * @param {*} op1 : opacity of faces
     * @param {*} op2 : opacity of wireframe
     */
    updateBackgroundOpacity(op1: any, op2: any): void;
    enableWireframe(): void;
    disableWireframe(): void;
    /**
     * Convert input json to mesh json
     *
     * @param {*} unit
     * @returns mesh json with vertices and faces
     */
    parseMeshDict(unit: any): {
        vertices: number[];
        faces: any;
    };
    parseMeshFile(meshString: any): {
        vertices: number[];
        faces: any;
    };
}
export class NeuronSkeleton extends RenderObj {
    constructor(data: any, type: any, transformation?: any);
    vertices: any;
    segments: any;
    heads: any;
    morph_type: any;
    /** create 3d object
     *
     * @param {*} color: color of the object
     * @param {bool} color: if object is in background
     * @param {*} setting: neu3dSettings
     * @param {Vector2} render_size: size of the rendered scene
     */
    createObject(color: any, background: any, neu3dSettings: any, renderer_size?: any, mode?: any): void;
    background: any;
    mode: any;
    defaultSomaRadiusNodes: number[];
    defaultRadiusNodes: number[];
    threeObj: any;
    /**
     * Update the radius of the rendered skeleton if they are rendered with default radius
     *
     * @param {*} unit
     * @returns skeleton json with vertices and segments
     */
    updateDefaultRadius(radius: any): void;
    updateDefaultSomaRadius(radius: any): void;
    recreateObject(neu3dSettings: any, renderer_size?: any): void;
    /**
     * Convert input json to skeleton
     * @param {*} unit
     * @returns skeleton json with vertices and segments
     */
    parseSWCDict(unit: any): {
        vertices: {};
        segments: {};
        heads: number[];
    };
    /**
     * Convert string of SWC to json object
     * @param {String} swcString
     * @returns vertices and segments
     */
    parseSWCFile(swcString: string): {
        vertices: {};
        segments: {};
        heads: any[];
    };
}
export class Synapses extends RenderObj {
    constructor(data: any, type: any, transformation?: any);
    locations: any;
    morph_type: string;
    /** create 3d object
     *
     * @param {*} color: color of the object
     * @param {bool} color: if object is in background
     * @param {*} setting: neu3dSettings
     * @param {Vector2} render_size: size of the rendered scene
     */
    createObject(color: any, background: any, neu3dSettings: any): void;
    background: any;
    overallScale: any;
    threeObj: any;
    /** update radius of the synapses
     *
     * @param {*} radius: new radius value
     */
    updateRadius(radius: any): void;
    /**
     * Convert string of synapse locations to json object
     * Expect input file is csv like file with 4 columns or 8 columns.
     * pre_x, pre_y, pre_z, pre_r(, post_x, post_y, post_z, post_r).
     * @param {String} synString
     * @returns Array of dict
     */
    parseSynFile(synString: string): any[];
    /**
     * Convert SWC json to locations
     * expected unit has keys x, y, z, r/radius, identifier, parent, sample.
     * @param {*} unit
     * @returns Array of dict
     */
    parseSWCDict(unit: any): any[];
}
export class GLTFObj extends RenderObj {
    constructor(data: any, type: any, transformation?: any);
    threeObj: any;
    morph_type: string;
    createObject(color: any, background: any, neu3dSettings: any): void;
    background: any;
}
//# sourceMappingURL=render.d.ts.map