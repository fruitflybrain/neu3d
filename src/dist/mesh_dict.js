"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.MeshItem = exports.MeshDict = void 0;
var Lut_1 = require("three/examples/jsm/math/Lut");
var three_1 = require("three");
var coreutils_1 = require("@lumino/coreutils");
var SceneUtils_1 = require("three/examples/jsm/utils/SceneUtils");
var signaling_1 = require("@lumino/signaling");
// import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
/** Clip value in between min/max */
var clipNumber = function (number, min, max) {
    if (max < min) {
        return number;
    }
    return Math.max(min, Math.min(number, max));
};
/**
 * return anything as array of itself
 */
var asArray = function (value) {
    if (Array.isArray(value)) {
        return value;
    }
    else {
        return [value];
    }
};
/**
 * Convert any color type to Color instance
 * @param color
 */
var convertColor = function (color) {
    if (Array.isArray(color)) {
        return new three_1.Color().fromArray(color);
    }
    else if (color instanceof three_1.Color) {
        return color;
    }
    else {
        return new three_1.Color(color);
    }
};
/**
* Mesh Dictionary Model
*/
var MeshDict = /** @class */ (function () {
    function MeshDict(colormap, settings) {
        if (colormap === void 0) { colormap = "rainbow"; }
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
        this.state = { pin: false, highlight: false };
        this.boundingBox = new three_1.Box3();
        this.visibleBoundingBox = new three_1.Box3();
        this._meshDict = {};
        this._opacityChanged = new signaling_1.Signal(this);
        this._labelToRid = {}; // map label to Rid
        this.loadingManager = new three_1.LoadingManager();
        this.maxColorNum = 1747591;
        this.groups = { front: new three_1.Group(), back: new three_1.Group() };
        this.colormap = colormap;
        this.lut = this.initLut(this.colormap, this.maxColorNum);
        var that = this;
        var settingsChangeHandler = {
            set: function (obj, prop, value) {
                if (prop.toLowerCase().includes('opacity')) {
                    that._opacityChanged.emit(obj);
                    that.updateOpacity();
                }
                if (prop === 'backgroundColor') {
                    that.setBackgroundColor(value);
                }
                // if (['radius', 'strength', 'threshold', 'enabled'].includes(prop)) {
                //   that._opacityChanged.emit(obj);
                // }
                obj[prop] = value;
                return true;
            }
        };
        this.settings = new Proxy({
            defaultOpacity: (_a = settings.defaultOpacity) !== null && _a !== void 0 ? _a : 0.7,
            synapseOpacity: (_b = settings.synapseOpacity) !== null && _b !== void 0 ? _b : 1.0,
            nonHighlightableOpacity: (_c = settings.nonHighlightableOpacity) !== null && _c !== void 0 ? _c : 0.1,
            lowOpacity: (_d = settings.lowOpacity) !== null && _d !== void 0 ? _d : 0.1,
            pinOpacity: (_e = settings.pinOpacity) !== null && _e !== void 0 ? _e : 0.9,
            pinLowOpacity: (_f = settings.pinLowOpacity) !== null && _f !== void 0 ? _f : 0.15,
            highlightedObjectOpacity: (_g = settings.highlightedObjectOpacity) !== null && _g !== void 0 ? _g : 1.0,
            defaultRadius: (_h = settings.defaultRadius) !== null && _h !== void 0 ? _h : 0.5,
            defaultSomaRadius: (_j = settings.defaultSomaRadius) !== null && _j !== void 0 ? _j : 3.0,
            defaultSynapseRadius: (_k = settings.defaultSynapseRadius) !== null && _k !== void 0 ? _k : 0.2,
            minRadius: (_l = settings.minRadius) !== null && _l !== void 0 ? _l : 0.1,
            minSomaRadius: (_m = settings.minSomaRadius) !== null && _m !== void 0 ? _m : 1.0,
            minSynapseRadius: (_o = settings.minSynapseRadius) !== null && _o !== void 0 ? _o : 0.1,
            maxRadius: (_p = settings.maxRadius) !== null && _p !== void 0 ? _p : 1.0,
            maxSomaRadius: (_q = settings.maxSomaRadius) !== null && _q !== void 0 ? _q : 10.0,
            maxSynapseRadius: (_r = settings.maxSynapseRadius) !== null && _r !== void 0 ? _r : 1.,
            backgroundOpacity: (_s = settings.backgroundOpacity) !== null && _s !== void 0 ? _s : 1.0,
            backgroundWireframeOpacity: (_t = settings.backgroundWireframeOpacity) !== null && _t !== void 0 ? _t : 0.07,
            neuron3d: (_u = settings.neuron3d) !== null && _u !== void 0 ? _u : false,
            neuron3dMode: (_v = settings.neuron3dMode) !== null && _v !== void 0 ? _v : 1,
            synapseMode: (_w = settings.synapseMode) !== null && _w !== void 0 ? _w : true,
            meshWireframe: (_x = settings.meshWireframe) !== null && _x !== void 0 ? _x : true,
            backgroundColor: (_y = settings.backgroundColor) !== null && _y !== void 0 ? _y : "#260226"
        }, settingsChangeHandler);
    }
    /**
     * Set Attribute of a given rid
     * @param rid
     * @param attr
     * @param value
     */
    MeshDict.prototype.set = function (rid, attr, value) {
        if (!(rid in this._meshDict)) {
            console.warn(rid + " not found in meshDict");
            return;
        }
        this._meshDict[rid][attr] = value;
    };
    /**
     * Compute the bounding box of visible objects
     */
    MeshDict.prototype.computeVisibleBoundingBox = function (includeBackground) {
        if (includeBackground === void 0) { includeBackground = false; }
        var box = new three_1.Box3();
        for (var _i = 0, _a = Object.values(this._meshDict); _i < _a.length; _i++) {
            var mesh = _a[_i];
            if (mesh.background && !includeBackground) {
                continue;
            }
            if (mesh.visibility) {
                box.union(mesh.boundingBox);
            }
        }
        this.visibleBoundingBox = box;
        return box;
    };
    Object.defineProperty(MeshDict.prototype, "opacityChanged", {
        get: function () {
            return this._opacityChanged;
        },
        enumerable: false,
        configurable: true
    });
    /** Initialize Look Up Table(Lut) for Color */
    MeshDict.prototype.initLut = function (colormap, maxColorNum) {
        var lut = new Lut_1.Lut(colormap, maxColorNum);
        lut.setMin(0);
        lut.setMax(1);
        return lut;
    };
    /**
     * Empty MeshDict
     * @param resetBackground - if `true`, remove background meshes as well
     */
    MeshDict.prototype.reset = function (resetBackground) {
        var _a;
        if (resetBackground === void 0) { resetBackground = false; }
        for (var _i = 0, _b = Object.keys(this._meshDict); _i < _b.length; _i++) {
            var key = _b[_i];
            if (!resetBackground && this._meshDict[key].background) {
                continue;
            }
            if ((_a = this._meshDict[key]) === null || _a === void 0 ? void 0 : _a.pinned) {
                this._meshDict[key].pinned = false;
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
    };
    /**
     * Reset opacity to default of all objects in workspace
     */
    MeshDict.prototype.resetOpacity = function () {
        for (var _i = 0, _a = Object.entries(this._meshDict); _i < _a.length; _i++) {
            var _b = _a[_i], rid = _b[0], mesh = _b[1];
            if (!mesh.background) {
                if (mesh.morphType !== 'Synapse SWC') {
                    if (mesh.opacity >= 0.) {
                        this._meshDict[rid].opacity = this._meshDict[rid].opacity * this.settings.defaultOpacity;
                    }
                    else {
                        this._meshDict[rid].opacity = this.settings.defaultOpacity;
                    }
                }
                else {
                    if (mesh.opacity >= 0.) {
                        this._meshDict[rid].opacity = this._meshDict[rid].opacity * this.settings.synapseOpacity;
                    }
                    else {
                        this._meshDict[rid].opacity = this.settings.synapseOpacity;
                    }
                }
            }
            else {
                if (mesh.opacity >= 0.) {
                    this._meshDict[rid].opacity = this._meshDict[rid].opacity * this.settings.backgroundOpacity;
                }
                else {
                    this._meshDict[rid].opacity = this.settings.backgroundOpacity;
                }
            }
        }
    };
    /**
     * Update all neurons' opacity based on states
     */
    MeshDict.prototype.updateOpacity = function () {
        for (var _i = 0, _a = Object.values(this._meshDict); _i < _a.length; _i++) {
            var mesh = _a[_i];
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
    };
    MeshDict.prototype.show = function (rid) {
        rid = asArray(rid);
        for (var _i = 0, rid_1 = rid; _i < rid_1.length; _i++) {
            var id = rid_1[_i];
            if (!(id in this._meshDict)) {
                continue;
            }
            this._meshDict[id].show();
        }
    };
    ;
    MeshDict.prototype.hide = function (rid) {
        rid = asArray(rid);
        for (var _i = 0, rid_2 = rid; _i < rid_2.length; _i++) {
            var id = rid_2[_i];
            if (!(id in this._meshDict)) {
                continue;
            }
            if (!this._meshDict[id].pinned) { // do not hide pinned objects
                this._meshDict[id].hide();
            }
        }
    };
    ;
    MeshDict.prototype.showAll = function (group) {
        switch (group) {
            case 'front':
                this.show(this.front);
                break;
            case 'back':
                this.show(this.back);
                break;
            default:
                this.show(Object.keys(this._meshDict));
                break;
        }
    };
    ;
    MeshDict.prototype.hideAll = function (group) {
        switch (group) {
            case 'front':
                this.hide(this.front);
                break;
            case 'back':
                this.hide(this.back);
                break;
            default:
                this.hide(Object.keys(this._meshDict));
                break;
        }
    };
    ;
    Object.defineProperty(MeshDict.prototype, "front", {
        /**
         * return Rids of all elements in the front
         */
        get: function () {
            var rids = [];
            for (var _i = 0, _a = Object.entries(this._meshDict); _i < _a.length; _i++) {
                var _b = _a[_i], rid = _b[0], mesh = _b[1];
                if (!mesh.background) {
                    rids.push(rid);
                }
            }
            return rids;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MeshDict.prototype, "back", {
        /**
         * return Rids of all elements in the front
         */
        get: function () {
            var rids = [];
            for (var _i = 0, _a = Object.entries(this._meshDict); _i < _a.length; _i++) {
                var _b = _a[_i], rid = _b[0], mesh = _b[1];
                if (mesh.background === true) {
                    rids.push(rid);
                }
            }
            return rids;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MeshDict.prototype, "unpinned", {
        /**
         * Return rid of unpinned items
         */
        get: function () {
            var list = [];
            for (var _i = 0, _a = Object.entries(this._meshDict); _i < _a.length; _i++) {
                var _b = _a[_i], key = _b[0], mesh = _b[1];
                if (!mesh.background && !mesh.pinned) {
                    list.push(key);
                }
            }
            return list;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MeshDict.prototype, "pinned", {
        /**
         * Return Rids of all pinned elements
         */
        get: function () {
            var rids = [];
            for (var _i = 0, _a = Object.entries(this._meshDict); _i < _a.length; _i++) {
                var _b = _a[_i], rid = _b[0], mesh = _b[1];
                if (!mesh.background && mesh.pinned) {
                    rids.push(rid);
                }
            }
            return rids;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Highlight objects given rid(s)
     * @param rid
     */
    MeshDict.prototype.highlight = function (rid) {
        if (!(rid in this._meshDict)) {
            return;
        }
        this._meshDict[rid].highlight = true;
        this._meshDict[rid].show();
        this.state.highlight = true;
    };
    MeshDict.prototype.pin = function (rid) {
        rid = asArray(rid);
        for (var _i = 0, rid_3 = rid; _i < rid_3.length; _i++) {
            var id = rid_3[_i];
            if (!(id in this._meshDict)) {
                continue;
            }
            this._meshDict[id].pin();
            this.state.pin = true;
        }
    };
    ;
    MeshDict.prototype.unpin = function (rid) {
        rid = asArray(rid);
        for (var _i = 0, rid_4 = rid; _i < rid_4.length; _i++) {
            var id = rid_4[_i];
            if (!(id in this._meshDict)) {
                continue;
            }
            this._meshDict[id].unpin();
        }
        if (this.pinned.length == 0) {
            this.state.pin = false;
        }
    };
    ;
    MeshDict.prototype.unpinAll = function () {
        this.unpin(Object.keys(this._meshDict));
    };
    ;
    MeshDict.prototype.remove = function (rid) {
        rid = asArray(rid);
        for (var _i = 0, rid_5 = rid; _i < rid_5.length; _i++) {
            var id = rid_5[_i];
            if (!(id in this._meshDict)) {
                continue;
            }
            this._meshDict[id].remove();
            delete this._meshDict[id];
        }
    };
    ;
    MeshDict.prototype.removeUnpinned = function () {
        for (var _i = 0, _a = Object.entries(this._meshDict); _i < _a.length; _i++) {
            var _b = _a[_i], rid = _b[0], mesh = _b[1];
            if (!mesh.background && !mesh.pinned) {
                this.remove(rid);
            }
        }
    };
    MeshDict.prototype.setColor = function (rid, color) {
        rid = asArray(rid);
        color = convertColor(color);
        for (var _i = 0, rid_6 = rid; _i < rid_6.length; _i++) {
            var id = rid_6[_i];
            if (!(id in this._meshDict)) {
                continue;
            }
            this._meshDict[id].color = color;
        }
    };
    ;
    MeshDict.prototype.setBackgroundColor = function (color) {
        color = convertColor(color);
        for (var _i = 0, _a = Object.entries(this._meshDict); _i < _a.length; _i++) {
            var _b = _a[_i], rid = _b[0], mesh = _b[1];
            if (mesh.background) {
                this._meshDict[rid].color = color;
            }
        }
    };
    ;
    /**
    * Add JSON object to meshdict
    * @param {object} json
    */
    MeshDict.prototype.addJson = function (json) {
        var _a, _b, _c, _d, _e, _f;
        return __awaiter(this, void 0, Promise, function () {
            var metadata, colorNum, id2float, lut, i, key;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        if ((json === undefined) || !("ffbo_json" in json)) {
                            console.log('mesh json is undefined');
                            return [2 /*return*/, Promise.resolve(void 0)];
                        }
                        metadata = {
                            type: (_a = json.type) !== null && _a !== void 0 ? _a : '',
                            visibility: (_b = json.visibility) !== null && _b !== void 0 ? _b : true,
                            colormap: (_c = json.colormap) !== null && _c !== void 0 ? _c : this.colormap,
                            colororder: (_d = json.colororder) !== null && _d !== void 0 ? _d : "random",
                            showAfterLoadAll: (_e = json.showAfterLoadAll) !== null && _e !== void 0 ? _e : false,
                            radiusScale: (_f = json.radiusScale) !== null && _f !== void 0 ? _f : 1.
                        };
                        if (json.reset) {
                            this.reset();
                        }
                        colorNum = 0;
                        lut = this.lut;
                        if (metadata.colororder === "order") {
                            colorNum = Object.keys(json.ffbo_json).length;
                            id2float = function (i) { return i / colorNum; };
                        }
                        else {
                            colorNum = this.maxColorNum;
                            id2float = function (i) { return MeshDict.getRandomIntInclusive(1, colorNum) / colorNum; };
                        }
                        // reinit lut if color is specified
                        if (metadata.colororder === "order" && (colorNum !== this.maxColorNum || metadata.colormap !== "rainbow")) {
                            colorNum = Object.keys(json.ffbo_json).length;
                            lut = new Lut_1.Lut(metadata.colormap, colorNum);
                            lut.setMin(0);
                            lut.setMax(1);
                        }
                        if (metadata.showAfterLoadAll) {
                            this.groups.front.visible = false;
                        }
                        i = 0;
                        _g.label = 1;
                    case 1:
                        if (!(i < Object.keys(json.ffbo_json).length)) return [3 /*break*/, 4];
                        key = Object.keys(json.ffbo_json)[i];
                        return [4 /*yield*/, this.addOneJson(key, json.ffbo_json[key], lut.getColor(id2float(i)), metadata)];
                    case 2:
                        _g.sent();
                        if (this._meshDict[key].background) {
                            this.boundingBox.union(this._meshDict[key].boundingBox);
                        }
                        _g.label = 3;
                    case 3:
                        ++i;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, Promise.resolve(void 0)];
                }
            });
        });
    };
    MeshDict.prototype.addOneJson = function (key, unit, color, metadata) {
        var _a;
        return __awaiter(this, void 0, Promise, function () {
            var objectLoaded, loader;
            var _this = this;
            return __generator(this, function (_b) {
                objectLoaded = new coreutils_1.PromiseDelegate();
                if (key in this._meshDict) {
                    console.log('mesh object already exists... skip rendering...');
                    return [2 /*return*/, Promise.resolve(void 0)];
                }
                unit.color = (_a = unit.color) !== null && _a !== void 0 ? _a : color;
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
                            console.warn("[Neu3D] mesh cannot have booth dataStra and filename. addJSON failed for " + unit);
                            objectLoaded.resolve(void 0);
                            break;
                        }
                        if (unit.filename) {
                            unit.filetype = unit.filename.split('.').pop();
                            loader = new three_1.FileLoader(this.loadingManager);
                            if (unit.filetype == "json") {
                                loader.load(unit.filename, function (response) {
                                    unit = new MeshItem('Mesh', key, unit, metadata.visibility, _this.settings, _this.loadingManager, response);
                                    objectLoaded.resolve(void 0);
                                });
                                break;
                            }
                            else if (unit.filetype === "swc") {
                                loader.load(unit.filename, function (response) {
                                    unit = new MeshItem('SWC', key, unit, metadata.visibility, _this.settings, _this.loadingManager, response);
                                    objectLoaded.resolve(void 0);
                                });
                                break;
                            }
                        }
                        else if (unit.dataStr) {
                            if (unit.filetype === 'json') {
                                unit.type = 'Mesh';
                                unit = new MeshItem('Mesh', key, unit, metadata.visibility, this.settings, this.loadingManager, unit.dataStr);
                                objectLoaded.resolve(void 0);
                                break;
                            }
                            else if (unit.filetype === 'swc') {
                                unit.type = 'SWC';
                                unit = new MeshItem('SWC', key, unit, metadata.visibility, this.settings, this.loadingManager, unit.dataStr);
                                objectLoaded.resolve(void 0);
                                break;
                            }
                        }
                        else {
                            console.warn("[Neu3D] mesh data type not understood. addJSON failed for " + unit);
                            objectLoaded.resolve(void 0);
                        }
                }
                return [2 /*return*/, objectLoaded.promise.then(function () {
                        _this._meshDict[key] = unit;
                        if (unit.background) {
                            _this.groups.back.add(unit.object);
                        }
                        else {
                            _this.groups.front.add(unit.object);
                        }
                        _this._labelToRid[unit.label] = unit.rid;
                        return _this._meshDict[key];
                    })];
            });
        });
    };
    /**
     * Dispose all Meshes to free up GPU memory
     */
    MeshDict.prototype.disposeMeshes = function () {
        for (var _i = 0, _a = Object.entries(this._meshDict); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], mesh = _b[1];
            mesh.dispose();
            if (mesh.background) {
                this.groups.back.remove(mesh.object);
            }
            else {
                this.groups.front.remove(mesh.object);
            }
            delete this._meshDict[key];
        }
    };
    /**
     * Dispose everything
     */
    MeshDict.prototype.dispose = function () {
        //TODO
    };
    return MeshDict;
}());
exports.MeshDict = MeshDict;
/**
* Mesh Model - corresponds to 1 object in the scene
*/
var MeshItem = /** @class */ (function () {
    function MeshItem(meshType, key, unit, visibility, settings, // visualization settings
    loadingManager, dataStr // asynchronously added data
    ) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        this.boundingBox = new three_1.Box3();
        this.position = new three_1.Vector3();
        this.meshType = meshType;
        this.morphType = (_a = unit.morphType) !== null && _a !== void 0 ? _a : '';
        this.rid = key;
        this.pinned = (_b = unit.pinned) !== null && _b !== void 0 ? _b : false;
        this.background = (_c = unit.background) !== null && _c !== void 0 ? _c : false;
        this._visibility = visibility;
        this._color = convertColor(unit.color);
        this.position = (_d = unit.position) !== null && _d !== void 0 ? _d : new three_1.Vector3();
        this.loadingManager = loadingManager; // for loading OBJ files
        this.settings = settings;
        this.transform = {
            xShift: (_e = unit.xShift) !== null && _e !== void 0 ? _e : 0.,
            yShift: (_f = unit.yShift) !== null && _f !== void 0 ? _f : 0.,
            zShift: (_g = unit.zShift) !== null && _g !== void 0 ? _g : 0.,
            xScale: (_h = unit.xScale) !== null && _h !== void 0 ? _h : 1.,
            yScale: (_j = unit.yScale) !== null && _j !== void 0 ? _j : 1.,
            zScale: (_k = unit.zScale) !== null && _k !== void 0 ? _k : 1.,
            xyRot: (_l = unit.xyRot) !== null && _l !== void 0 ? _l : 0.,
            yzRot: (_m = unit.yzRot) !== null && _m !== void 0 ? _m : 0.
        };
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
    Object.defineProperty(MeshItem.prototype, "color", {
        get: function () {
            return this._color;
        },
        /**
         * Propogate colorchanges to object's material
         */
        set: function (val) {
            val = convertColor(val);
            if (val !== this._color) {
                this._color.set(val);
                for (var j = 0; j < this.object.children.length; ++j) {
                    this.object.children[j].material.color.set(this._color);
                    this.object.children[j].geometry.colorsNeedUpdate = true;
                }
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MeshItem.prototype, "opacity", {
        get: function () {
            return this._opacity;
        },
        /**
         * Propogate opacity changes to object's material
         */
        set: function (val) {
            if (this._opacity !== val) {
                this._opacity = val;
                for (var i in this.object.children) {
                    this.object.children[i].material.opacity = val;
                }
            }
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Show a given neuron
     */
    MeshItem.prototype.show = function () { this.visibility = true; };
    MeshItem.prototype.hide = function () { this.visibility = false; };
    MeshItem.prototype.toggleVis = function () { this.visibility = !this.visibility; };
    MeshItem.prototype.togglePin = function () { this.pinned = !this.pinned; };
    ;
    MeshItem.prototype.pin = function () { this.pinned = true; };
    ;
    MeshItem.prototype.unpin = function () { this.pinned = false; };
    ;
    MeshItem.prototype.remove = function () { this.dispose(); };
    ;
    Object.defineProperty(MeshItem.prototype, "visibility", {
        get: function () {
            return this._visibility;
        },
        /**
         * Propogate visibility changes to object's material
         */
        set: function (val) {
            if (val !== this.visibility) {
                this.object.visible = val;
                this._visibility = val;
            }
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Refresh rendering opacity of the object based on its states
     */
    MeshItem.prototype.updateOpacity = function (states) {
        // background opacity always set to settings values
        if (this.background) {
            this.object.children[0].material.opacity = this.settings.backgroundOpacity;
            this.object.children[1].material.opacity = this.settings.backgroundWireframeOpacity;
            return;
        }
        var opacity = this.opacity;
        var visibility = this.visibility;
        var depthTest = true;
        if (this.pinned) {
            visibility = true;
            opacity = this.settings.pinOpacity;
            depthTest = false;
        }
        else {
            if (this.highlight) {
                visibility = true;
                opacity = this.settings.highlightedObjectOpacity;
                depthTest = false;
            }
            else {
                if (states === null || states === void 0 ? void 0 : states.highlight) {
                    opacity = this.settings.lowOpacity;
                }
                else {
                    opacity = this.settings.nonHighlightableOpacity;
                }
                depthTest = true;
            }
        }
        this.opacity = opacity;
        this.visibility = visibility;
        for (var i in this.object.children) {
            this.object.children[i].material.depthTest = depthTest;
        }
    };
    /**
     * scale/rotate/shift SWC object inplace
     * @param swcObj object
     * @param transform transformation
     */
    MeshItem.prototype.transformSWC = function (swcObj, transform) {
        for (var _i = 0, _a = Object.keys(swcObj); _i < _a.length; _i++) {
            var sample = _a[_i];
            var _b = swcObj[sample], x = _b.x, y = _b.y, z = _b.z;
            var x_put = x * transform.xScale;
            var y_put = y * transform.yScale;
            var z_put = z * transform.zScale;
            var x_i = Math.cos(transform['xyRot']) * x_put + Math.sin(transform['xyRot']) * y_put;
            var y_i = Math.sin(transform['xyRot']) * x_put + Math.cos(transform['xyRot']) * y_put;
            var z_i = z_put;
            var y_f = Math.cos(transform['yzRot']) * y_i + Math.sin(transform['yzRot']) * z_i;
            var z_f = Math.sin(transform['yzRot']) * y_i + Math.cos(transform['yzRot']) * z_i;
            var x_f = x_i;
            x_f = x_f + transform['xShift'];
            y_f = y_f + transform['yShift'];
            z_f = z_f + transform['zShift'];
            swcObj[sample].x = x_f;
            swcObj[sample].y = y_f;
            swcObj[sample].z = z_f;
        }
    };
    MeshItem.prototype.dispose = function () {
        for (var j = 0; j < this.object.children.length; ++j) {
            this.object.children[j].geometry.dispose();
            this.object.children[j].material.dispose();
        }
        delete this.object;
    };
    /**
     * Convert Neuron Skeleton to SWC Format
     * @param unit
     */
    MeshItem.prototype.toSWC = function (unit) {
        var swcObj = {};
        // if a single string, assume is the entire dataStr of swc, split
        if (typeof (unit) === 'string') {
            unit = unit.replace(/\r\n/g, "\n");
            unit = unit.split("\n");
        }
        // if array of strings
        if (Array.isArray(unit) && typeof (unit[0]) === 'string') {
            if (unit[0].split(' ').length === 7) {
                unit.forEach(function (e) {
                    var seg = e.split(' ');
                    swcObj[parseInt(seg[0])] = {
                        type: parseInt(seg[1]),
                        x: parseFloat(seg[2]),
                        y: parseFloat(seg[3]),
                        z: parseFloat(seg[4]),
                        radius: parseFloat(seg[5]),
                        parent: parseInt(seg[6])
                    };
                });
            }
            else if (unit[0].split(',').length === 7) {
                unit.forEach(function (e) {
                    var seg = e.split(',');
                    swcObj[parseInt(seg[0])] = {
                        type: parseInt(seg[1]),
                        x: parseFloat(seg[2]),
                        y: parseFloat(seg[3]),
                        z: parseFloat(seg[4]),
                        radius: parseFloat(seg[5]),
                        parent: parseInt(seg[6])
                    };
                });
            }
            else { // not understood
                console.warn("[Neu3D] SWC unit format not understood. toSWC failed " + unit);
            }
        }
        else { // if MorphJSON
            unit = unit;
            for (var j = 0; j < unit.sample.length; j++) {
                swcObj[parseInt(unit.sample[j])] = {
                    type: parseInt(unit.identifier[j]),
                    x: parseFloat(unit.x[j]),
                    y: parseFloat(unit.y[j]),
                    z: parseFloat(unit.z[j]),
                    radius: parseFloat(unit.r[j]),
                    parent: parseInt(unit.parent[j])
                };
            }
        }
        return swcObj;
    };
    MeshItem.prototype._onAfterAdd = function (key, unit, object, settings) {
        var _a;
        object.rid = key; // needed rid for raycaster reference
        this.object = object;
        for (var _i = 0, _b = this.object.children; _i < _b.length; _i++) {
            var obj = _b[_i];
            obj.geometry.computeBoundingBox();
            this.boundingBox.union(obj.geometry.boundingBox);
        }
        this.position = (_a = unit.position) !== null && _a !== void 0 ? _a : new three_1.Vector3(0.5 * (unit.boundingBox.min.x + unit.boundingBox.max.x), 0.5 * (unit.boundingBox.min.y + unit.boundingBox.max.y), 0.5 * (unit.boundingBox.min.z + unit.boundingBox.max.z));
        if (this.morphType !== 'Synapse SWC') {
            if (this.background) {
                this.object.children[0].material.opacity = settings.backgroundOpacity;
                this.object.children[1].material.opacity = settings.backgroundWireframeOpacity;
            }
            else {
                if (settings.defaultOpacity !== 1) {
                    for (var i = 0; i < this.object.children.length; i++) {
                        this.object.children[i].material.opacity = settings.defaultOpacity;
                    }
                }
            }
        }
        else {
            if (settings.synapseOpacity !== 1) {
                for (var i = 0; i < unit.object.children.length; i++) {
                    this.object.children[i].material.opacity = settings.synapseOpacity;
                }
            }
        }
    };
    /**
     * Create object from mesh
     * @param key
     * @param unit
     * @param settings
     * @param visibility
     */
    MeshItem.prototype._addMesh = function (key, unit, settings, visibility, jsonString) {
        var json = JSON.parse(jsonString);
        var geometry = new three_1.Geometry();
        var vtx = json['vertices'];
        var idx = json['faces'];
        for (var j = 0; j < vtx.length / 3; j++) {
            var x = parseFloat(vtx[3 * j + 0]);
            var y = parseFloat(vtx[3 * j + 1]);
            var z = parseFloat(vtx[3 * j + 2]);
            geometry.vertices.push(new three_1.Vector3(x, y, z));
        }
        for (var j = 0; j < idx.length / 3; j++) {
            geometry.faces.push(new three_1.Face3(parseInt(idx[3 * j + 0]), parseInt(idx[3 * j + 1]), parseInt(idx[3 * j + 2])));
        }
        geometry.mergeVertices();
        geometry.computeFaceNormals();
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        var materials = [
            new three_1.MeshLambertMaterial({ color: this.color, transparent: true, side: 2, flatShading: true }),
            new three_1.MeshBasicMaterial({ color: this.color, wireframe: true, transparent: true })
        ];
        var object = SceneUtils_1.SceneUtils.createMultiMaterialObject(geometry, materials);
        if (!this.settings.meshWireframe) {
            object.children[1].visible = false;
        }
        object.visible = visibility;
        unit.boundingBox = geometry.boundingBox;
        this._onAfterAdd(key, unit, object, settings);
    };
    MeshItem.prototype._addSWC = function (key, unit, settings, visibility, swcString) {
        var _a, _b, _c, _d;
        /** process string */
        var swcObj = this.toSWC(swcString);
        this.transformSWC(swcObj, this.transform);
        var object = new three_1.Object3D(); // the neuron Object
        var synapseSphereGeometry = new three_1.Geometry(); // the synapse sphere geometry
        var synapsePointsGeometry = new three_1.Geometry(); // the synapse point geometry
        var neuronGeometry = new three_1.Geometry(); // the neuron 3d geometry
        var neuronLineGeometry = new three_1.Geometry(); // the neuron line geometry
        for (var _i = 0, _e = Object.entries(swcObj); _i < _e.length; _i++) {
            var _f = _e[_i], idx = _f[0], c = _f[1];
            if (parseInt(idx) == Math.round(Object.keys(swcObj).length / 2) && unit.position == undefined) {
                unit.position = new three_1.Vector3(c.x, c.y, c.z);
            }
            // DEBUG: this.updateObjectBoundingBox(unit, c.x, c.y, c.z);
            // DEBUG:this.updateBoundingBox(c.x, c.y, c.z);
            switch (c.type) {
                case 1: // soma
                    c.radius = (_a = c.radius) !== null && _a !== void 0 ? _a : settings.defaultSomaRadius;
                    c.radius = clipNumber(c.radius, settings.minSomaRadius, settings.maxSomaRadius);
                    var sphereGeometry = new three_1.SphereGeometry(c.radius, 8, 8);
                    sphereGeometry.translate(c.x, c.y, c.z);
                    var sphereMaterial = new three_1.MeshLambertMaterial({
                        color: unit.color,
                        transparent: true
                    });
                    object.add(new three_1.Mesh(sphereGeometry, sphereMaterial));
                    unit.position = new three_1.Vector3(c.x, c.y, c.z);
                    break;
                case -1: // synapse
                    if (settings.synapseMode) {
                        c.radius = (_b = c.radius) !== null && _b !== void 0 ? _b : settings.defaultSynapseRadius;
                        c.radius = clipNumber(c.radius, settings.minSynapseRadius, settings.maxSynapseRadius);
                        var sphereGeometry_1 = new three_1.SphereGeometry(c.radius, 8, 8);
                        sphereGeometry_1.translate(c.x, c.y, c.z);
                        synapseSphereGeometry.merge(sphereGeometry_1);
                        sphereGeometry_1.dispose();
                        sphereGeometry_1 = null;
                        unit.position = new three_1.Vector3(c.x, c.y, c.z);
                    }
                    else {
                        synapsePointsGeometry.vertices.push(new three_1.Vector3(c.x, c.y, c.z));
                    }
                    break;
                default: // neurite
                    var p = swcObj[c.parent]; // parent object
                    if (p == undefined) {
                        break;
                    }
                    if (!settings.neuron3d) { // 1d neuron
                        var geometry = new three_1.Geometry();
                        geometry.vertices.push(new three_1.Vector3(c.x, c.y, c.z));
                        geometry.vertices.push(new three_1.Vector3(p.x, p.y, p.z));
                        geometry.colors.push(unit.color);
                        geometry.colors.push(unit.color);
                        neuronLineGeometry.merge(geometry);
                        geometry.dispose();
                        geometry = null;
                    }
                    else { // 3d neuron
                        // line from parent to current node
                        var d = new three_1.Vector3((p.x - c.x), (p.y - c.y), (p.z - c.z));
                        // set radius of the parent and current radius
                        p.radius = (_c = p.radius) !== null && _c !== void 0 ? _c : settings.defaultRadius;
                        c.radius = (_d = c.radius) !== null && _d !== void 0 ? _d : settings.defaultRadius;
                        p.radius = clipNumber(p.radius, settings.minRadius, settings.maxRadius);
                        c.radius = clipNumber(c.radius, settings.minRadius, settings.maxRadius);
                        // create segment
                        var geometry = new three_1.CylinderGeometry(p.radius, c.radius, d.length(), 4, 1, false);
                        geometry.translate(0, 0.5 * d.length(), 0);
                        geometry.applyMatrix4(new three_1.Matrix4().makeRotationX(Math.PI / 2));
                        geometry.lookAt(d.clone());
                        geometry.translate((c.x + c.x) / 2, -0.0 * d.length() + (c.y + c.y) / 2, (c.z + c.z) / 2);
                        neuronGeometry.merge(geometry);
                        geometry.dispose();
                        geometry = null;
                        if (settings.neuron3dMode == 2) {
                            var geometry_1 = new three_1.SphereGeometry(c.radius, 8, 8);
                            geometry_1.applyMatrix4(new three_1.Matrix4().makeRotationX(Math.PI / 2));
                            geometry_1.lookAt(d);
                            geometry_1.translate((c.x + c.x) / 2, (c.y + c.y) / 2, (c.z + c.z) / 2);
                            neuronGeometry.merge(geometry_1);
                            geometry_1.dispose();
                            geometry_1 = null;
                        }
                        else if (settings.neuron3dMode == 3) {
                            // if the parent is not direct descendant of the soma
                            // smoothly interpolate tubes between parent and child
                            if (p.parent != -1) {
                                var p2 = swcObj[p.parent];
                                var a = new three_1.Vector3(0.9 * p.x + 0.1 * p2.x, 0.9 * p.y + 0.1 * p2.y, 0.9 * p.z + 0.1 * p2.z);
                                var b = new three_1.Vector3(0.9 * p.x + 0.1 * c.x, 0.9 * p.y + 0.1 * c.y, 0.9 * p.z + 0.1 * c.z);
                                var curve = new three_1.QuadraticBezierCurve3(a, new three_1.Vector3(p.x, p.y, p.z), b);
                                var geometry_2 = new three_1.TubeGeometry(curve, 8, p.radius, 4, false);
                                neuronGeometry.merge(geometry_2);
                                geometry_2.dispose();
                                geometry_2 = null;
                            }
                        }
                    }
                    break;
            }
        }
        if (synapsePointsGeometry.vertices.length > 0) {
            var pointMaterial = new three_1.PointsMaterial({ color: unit.color, size: settings.defaultSynapseRadius }); // DEBUG: , lights: true });
            var points = new three_1.Points(synapsePointsGeometry, pointMaterial);
            object.add(points);
        }
        else {
            synapsePointsGeometry.dispose();
            synapsePointsGeometry = null;
        }
        if (neuronGeometry.vertices.length > 0) {
            var material = new three_1.MeshLambertMaterial({ color: unit.color, transparent: true });
            var mesh = new three_1.Mesh(neuronGeometry, material);
            // TODO: The following code addes simplifier
            //let modifier = new SimplifyModifier();
            //simplified = modifier.modify( mergedGeometry, geometry.vertices.length * 0.25 | 0 )
            //let mesh = new Mesh(simplified, material);
            object.add(mesh);
        }
        else {
            neuronGeometry.dispose();
            neuronGeometry = null;
        }
        if (neuronLineGeometry.vertices.length > 0) {
            // DEBUG: let material = new LineBasicMaterial({ vertexColors: VertexColors, transparent: true, color: color });
            var material = new three_1.LineBasicMaterial({ transparent: true, color: unit.color });
            object.add(new three_1.LineSegments(neuronLineGeometry, material));
        }
        else {
            neuronLineGeometry.dispose();
            neuronLineGeometry = null;
        }
        object.visible = visibility;
        this._onAfterAdd(key, unit, object, settings);
        //DEBUG: this._registerObject(key, unit, object);
    };
    return MeshItem;
}());
exports.MeshItem = MeshItem;
/**
 * MeshDict Namespace
 */
(function (MeshDict) {
    function getRandomIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    MeshDict.getRandomIntInclusive = getRandomIntInclusive;
})(MeshDict = exports.MeshDict || (exports.MeshDict = {}));
exports.MeshDict = MeshDict;
