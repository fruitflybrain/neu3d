export class Neu3D {
    /** Neu3D Instance
     *
     * @param {HTMLDivElement} container : parent div element
     * @param {JSON} data : optionally add initalization data
     * @param {IMetadata} metadata : optional metadata
     * @param {INeu3DOptions} [options={}] : additional options
     */
    constructor(container: HTMLDivElement, data?: JSON, metadata?: IMetadata, options?: INeu3DOptions);
    container: HTMLDivElement;
    frameCounter: number;
    resINeed: number;
    activeRender: boolean;
    powerSaving: boolean;
    _animationId: number;
    _containerEventListener: {};
    _addedDOMElements: HTMLDivElement[];
    _metadata: {
        colormap: string;
        maxColorNum: number;
        allowPin: boolean;
        allowHighlight: boolean;
        enablePositionReset: boolean;
        resetPosition: {
            x: number;
            y: number;
            z: number;
        };
        upVector: {
            x: number;
            y: number;
            z: number;
        };
        cameraTarget: {
            x: number;
            y: number;
            z: number;
        };
        upSign: number;
    };
    settings: PropertyManager;
    states: PropertyManager;
    activityData: {};
    it1: {};
    it2: {};
    meshDict: PropertyManager;
    uiVars: PropertyManager;
    _labelToRid: {};
    raycaster: any;
    stats: {
        REVISION: number;
        dom: HTMLDivElement;
        addPanel: (panel: any) => any;
        showPanel: (id: any) => void;
        begin: () => void;
        getFPS: () => any;
        end: () => number;
        update: () => void;
        domElement: HTMLDivElement;
        setMode: (id: any) => void;
    };
    camera: any;
    renderer: any;
    groups: {
        front: any;
        back: any;
    };
    scenes: {
        front: any;
        back: any;
    };
    controls: any;
    lightsHelper: FFBOLightsHelper;
    lut: any;
    loadingManager: any;
    controlPanel: any;
    animOpacity: {};
    defaultBoundingBox: {
        maxY: number;
        minY: number;
        maxX: number;
        minX: number;
        maxZ: number;
        minZ: number;
    };
    boundingBox: {
        maxY: number;
        minY: number;
        maxX: number;
        minX: number;
        maxZ: number;
        minZ: number;
    };
    visibleBoundingBox: {
        maxY: number;
        minY: number;
        maxX: number;
        minX: number;
        maxZ: number;
        minZ: number;
    };
    _take_screenshot: boolean;
    dispatch: {
        click: any;
        dblclick: any;
        getInfo: (d: any) => any;
        syncControls: any;
        resize: any;
    };
    commandDispatcher: {
        show: (id: string) => void;
        showall: () => void;
        hide: (id: string) => void;
        hideall: () => void;
        pin: (id: string) => void;
        unpin: (id: string) => void;
        unpinall: () => void;
        remove: (id: string) => void;
        setcolor: (id: any, color: any) => void;
        resetview: () => void;
    };
    /** Callbacks fired on `this` will be callbacks fired on `meshDict` */
    callbackRegistry: {
        add: (func: any) => void;
        remove: (func: any) => void;
        pinned: (func: any) => void;
        visibility: (func: any) => void;
        num: (func: any) => void;
        highlight: (func: any) => void;
        click: (func: any) => void;
    };
    _defaultSettings: PropertyManager & {
        lightsHelper: {};
        postProcessing: {
            fxaa: any;
            ssao: any;
            bloom: any;
            bloomRadius: any;
            bloomThreshold: any;
            bloomStrength: any;
        };
        backgroundColor: number[];
    };
    addDivs(): void;
    fileUploadInput: HTMLInputElement;
    /**
     * Remove all added DOM elements
     */
    removeDivs(): void;
    /**
     * Setup callback
     * @param {string} key string of callback
     * @param {function} func callback function
     */
    on(key: string, func: Function): void;
    /**
     * Clear Activity Animation
     */
    clearActivity(): void;
    /** Animate Activity Data */
    animateActivity(activityData: any, t_i: any, interval: any, interpolation_interval: any): void;
    /** Initialize WebGL Renderer */
    initCamera(): any;
    fov: number;
    prevhfov: number;
    /** Initialize WebGL Renderer */
    initRenderer(): any;
    /** Update display resolution */
    updateResolution(): void;
    highSettingsFPS: any;
    /** dynamically enable/disable shaders based on fps */
    updateShaders(): void;
    /** Initialize Mouse Control */
    initControls(): any;
    /** Update controller's positions based on metadata */
    updateControls(): void;
    /** Initialize Post Processing */
    initPostProcessing(): void;
    EffectComposerPasses: {};
    renderScene: any;
    backrenderScene: any;
    backrenderSSAO: any;
    effectFXAA: any;
    bloomPass: any;
    effectCopy: any;
    composer: any;
    /** Initialize Scene */
    initScenes(): {
        front: any;
        back: any;
    };
    /** Initialize Look Up Table(Lut) for Color */
    initLut(): any;
    maxColorNum: number;
    /** Initialize FFBOLightsHelper */
    initLights(): FFBOLightsHelper;
    /**
     * Initialize LoadingManager
     * https://threejs.org/docs/#api/en/loaders/managers/LoadingManager
     */
    initLoadingManager(): any;
    /**
     * Update selected object
     * @param {string} id uid of selected object
     */
    select(id: string): void;
    /**
     * Reset workspace
     *
     * @param {boolean=} resetBackground whether to reset background
     */
    reset(resetBackground?: boolean | undefined): void;
    /** Overload default DOM element event listener */
    addContainerEventListener(): void;
    removeContainerEventListener(): void;
    /**
     * Dispose everything and release memory
     */
    dispose(): void;
    /**
     *
     * @param {object} json
     */
    execCommand(json: object): void;
    /**
     * Add Object to workspace as JSON
     * @param {object} json
     */
    addJson(json: object): Promise<any>;
    /**
     * Compute Visible Bounding Box of all objects.
     */
    computeVisibleBoundingBox(): void;
    /**
     * Update Bounding Box of Object
     * @param {*} obj
     * @param {*} x
     * @param {*} y
     * @param {*} z
     */
    /** TODO: Add comment
     * @param {*} x
     * @param {*} y
     * @param {*} z
     */
    updateBoundingBox(boundingBox: any): void;
    animate(): void;
    /**
     * Load swc files on drop
     * @param {DragEvent} event
     */
    onDocumentDrop(event: DragEvent): void;
    /**
     * Mouse Click Event
     * @param {*} event
     */
    onDocumentMouseClick(event: any): void;
    blockDragEvents(event: any): void;
    blockContextMenu(): boolean;
    /**
     * Double Click callback
     * @param {*} event
     */
    onDocumentMouseDBLClick(event: any): void;
    /**
     * Double Click Mobile
     * @param {*} event
     */
    onDocumentMouseDBLClickMobile(event: any): void;
    /** TODO: Add Comment
     *
     * @param {*} event
     */
    onDocumentMouseMove(event: any): void;
    /**TODO: Add comment
     *
     * @param {*} event
     */
    onDocumentMouseEnter(event: any): void;
    /**TODO: Add comment
     *
     * @param {*} event
     */
    onDocumentMouseLeave(event: any): void;
    /**
     * Response to window resize
     */
    onWindowResize(): void;
    /**
     * Render
     */
    render(): void;
    /**
     * Raycaster intersection groups
     * @param {Array<object>} groups
     */
    getIntersection(groups: Array<object>): any;
    /** Show front neurons */
    showFrontAll(): void;
    /** hide front neurons */
    hideFrontAll(): void;
    /** Show back neurons */
    showBackAll(): void;
    /** Hide front neurons */
    hideBackAll(): void;
    /** Show all neurons */
    showAll(): void;
    /** Hide all neurons */
    hideAll(): void;
    /** export settings */
    export_settings(): PropertyManager & {
        lightsHelper: {};
        postProcessing: {
            fxaa: any;
            ssao: any;
            bloom: any;
            bloomRadius: any;
            bloomThreshold: any;
            bloomStrength: any;
        };
        backgroundColor: number[];
    };
    export_state(): void;
    import_state(state_metadata: any): void;
    import_settings(settings: any): void;
    /**
     * show individual object
     * @param {string} id
     */
    show(id: string[] | string): void;
    /**
     * Hide individual object
     * @param {string} id
     */
    hide(id: string[] | string): void;
    /**
     * callback for when mesh is added
     * @param {event} e
     */
    onAddMesh(e: Event): void;
    /**
     * callback when mesh is removed
     *
     * Dispose objects, decrement counters
     * @param {event} e
     */
    onRemoveMesh(e: Event): void;
    /** TODO: Add Comment
     *
     * @param {*} key
     */
    toggleVis(key: any): void;
    /** Change visibility of the neuron
     * @param {*} key
     */
    onUpdateVisibility(key: any): void;
    /** Highlight a  neuron
     *
     * @param {*} d
     * @param {*} updatePos
     */
    highlight(d?: any, updatePos?: any): void;
    /** TODO: Add Comment
     *
     * @param {event} e
     */
    onUpdateHighlight(e: Event): void;
    /** TODO: Add Comment
     *
     * @param {*} e
     */
    updateOpacity(e: any): void;
    /** Reset Opacity of all objects in workspace */
    resetOpacity(): void;
    /**
     * Update defaultRadius
     * @param {*} e
     */
    updateDefaultRadius(e: any): void;
    /**
     * Update defaultSomaRadius
     * @param {*} e
     */
    updateDefaultSomaRadius(e: any): void;
    updateWireframe(e: any): void;
    recreateNeurons(mode: any): void;
    updateSynapseRadius(e: any): void;
    /**
     * Conver to array
     * @param {any} variable
     */
    asarray(variable: any): any;
    /**
     * Update Pinned objects
     * @param {*} e
     */
    updatePinned(e: any): void;
    /**
     * pin an object in workspace
     * @param {string} id
     */
    pin(id: string[] | string): void;
    /**
     * Unpin an object in workspace
     * @param {string} id
     */
    unpin(id: string[] | string): void;
    /**
     * Get pinned objects
     */
    getPinned(): any[];
    /**
     * Get unpinned objects
     */
    getUnpinned(): string[];
    /**
     * remove object by id
     * @param {string} id
     */
    remove(id: string): void;
    /**
     * remove upinned object by id
     * @param {string} id
     */
    removeUnpinned(): void;
    /**
     * Set color of given object
     * @param id
     * @param color
     */
    setColor(id: any, color: any): void;
    /**
     * Set background color
     * @param {Array} color
     */
    setBackgroundColor(color: any[]): void;
    setSceneBackgroundColor(color: any): void;
    /**
     * Reset camera and control position
     */
    resetView(): void;
    /**
     * Reset view based on visible objects
     */
    resetVisibleView(): void;
    /**
     * toggle pinned state
     * @param {string} d id of object
     */
    togglePin(d: string): void;
    /**
     * Unpin all neurons
     */
    unpinAll(): void;
    /**
     * Create Tooltip
     */
    createToolTip(): void;
    toolTipDiv: HTMLDivElement;
    /**
     * Show tooltip for an object
     * @param {string} d id
     */
    show3dToolTip(d: string): void;
    domRect: any;
    /** Hid tooltip */
    hide3dToolTip(): void;
    /** FIXME: what is this? */
    _getInfo(d: any): any;
    /**
     * Get position of neuron on the screen
     * @param {*} id
     */
    getNeuronScreenPosition(id: any): {
        x: any;
        y: any;
    };
    /**
     * Synchronize controls with another `Neu3D` object
     * @param {*} ffbomesh
     */
    syncControls(ffbomesh: any): void;
}

interface INeu3DOptions {
    stats: boolean,
    datGUI: {
        autoPlace?: boolean,
        resizable?: boolean,
        scrollable?: boolean,
        closeOnTop?: boolean,
        createButtons?: boolean,
        preset?: string, // identifier in `load` JSON
        load?: JSON // json object associated with the presets
    }
}

interface IMetadata {
    colormap: string
    maxColorNum: Number,
    allowPin: boolean,
    allowHighlight: boolean,
    enablePositionReset: boolean,
    resetPosition: ICoords,
    upVector: ICoords,
    cameraTarget: ICoords,
    upSign: Number
}

interface ICoords {
    x: Number,
    y: Number,
    z: Number
}

import { PropertyManager } from "./propertymanager";
import { FFBOLightsHelper } from "./lightshelper";
