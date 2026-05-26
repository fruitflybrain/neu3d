import {
    Neu3D
} from './neu3d';
/**
 * Import settings
 *
 * Note: useful for tagging
 * @param {object} settings: settings to load
 */
Neu3D.prototype.import_settings = function(settings) {
    settings = Object.assign({}, settings);
    if ('lightsHelper' in settings) {
        this.lightsHelper.import(settings.lightsHelper);
        delete settings.lightsHelper;
    }

    if ('postProcessing' in settings) {
        let postProcessing = settings.postProcessing;
        delete settings.postProcessing;
        if (postProcessing.fxaa != undefined) {
            this.settings.effectFXAA.enabled = postProcessing.fxaa;
        }
        if (postProcessing.ssao != undefined) {
            this.settings.backrenderSSAO.enabled = postProcessing.ssao;
        }
        // if (postProcessing.toneMappingMinLum != undefined){
        //   this.settings.toneMappingPass.brightness = 1 - postProcessing.toneMappingMinLum;
        // }
        if (postProcessing.bloom != undefined)
            this.settings.bloomPass.enabled = postProcessing.bloom;
        if (postProcessing.bloomRadius != undefined) {
            this.settings.bloomPass.radius = postProcessing.bloomRadius;
        }
        if (postProcessing.bloomStrength != undefined) {
            this.settings.bloomPass.strength = postProcessing.bloomStrength;
        }
        if (postProcessing.bloomThreshold != undefined) {
            this.settings.bloomPass.threshold = postProcessing.bloomThreshold;
        }
    }

    // r170: ColorManagement is enabled by default, so new Color(hex) applies
    // an sRGB->linear conversion. The previous setTimeout(4000) re-applied
    // backgroundColor after a 4s delay, causing a visible single-frame
    // dimming of the brain when the converted (linear) values replaced the
    // initial (unconverted) ones. Let backgroundColor flow through the same
    // path as the other settings -- Object.assign triggers the
    // PropertyManager change handler, which calls setBackgroundColor
    // immediately. If no meshes have loaded yet, the iteration is a no-op
    // and meshes added later pick up the new settings.backgroundColor
    // value at creation time, with the conversion happening exactly once.
    Object.assign(this.settings, settings);
};

/**
 * Export state of the workspace
 *
 * Note: useful for tagging
 */
Neu3D.prototype.export_state = function() {
    let state_metadata = {
        'color': {},
        'pinned': {},
        'visibility': {},
        'camera': {
            'position': {},
            'up': {},
            // Also persist the camera quaternion. The (position, up, target)
            // triple is sufficient to define orientation in principle, but
            // reconstructing it via lookAt(target) doesn't always round-trip
            // to the exact quaternion -- the up vector that comes out of
            // TrackballControls + enableOrthogonalTrackballUp is the
            // already-projected one, and re-projecting in lookAt during
            // import can leave the camera with a different roll/tilt.
            // Saving the quaternion lets import_state pin orientation
            // directly and bypass that ambiguity.
            'quaternion': {}
        },
        'target': {}
    };
    state_metadata['camera']['position']['x'] = this.camera.position.x;
    state_metadata['camera']['position']['y'] = this.camera.position.y;
    state_metadata['camera']['position']['z'] = this.camera.position.z;
    state_metadata['camera']['up']['x'] = this.camera.up.x;
    state_metadata['camera']['up']['y'] = this.camera.up.y;
    state_metadata['camera']['up']['z'] = this.camera.up.z;
    state_metadata['camera']['quaternion']['x'] = this.camera.quaternion.x;
    state_metadata['camera']['quaternion']['y'] = this.camera.quaternion.y;
    state_metadata['camera']['quaternion']['z'] = this.camera.quaternion.z;
    state_metadata['camera']['quaternion']['w'] = this.camera.quaternion.w;
    state_metadata['target']['x'] = this.controls.target.x;
    state_metadata['target']['y'] = this.controls.target.y;
    state_metadata['target']['z'] = this.controls.target.z;
    state_metadata['pinned'] = Array.from(this.uiVars.pinnedObjects);
    for (let key in this.meshDict) {
        if (Object.prototype.hasOwnProperty.call(this.meshDict, key)) {
            state_metadata['color'][key] = this.meshDict[key].color.toArray();
            state_metadata['visibility'][key] = this.meshDict[key].visibility;
        }
    }
    return state_metadata;
};

/**
 * Import State
 *
 * Note: useful for tagging
 * @param {object} state_metadata
 */
Neu3D.prototype.import_state = function(state_metadata) {
    // resetVisibleView (often scheduled by an auto-fit on load) defers the
    // actual camera placement to a 400ms setTimeout. If it fires AFTER
    // we restore the camera here, it clobbers the saved pose. Cancel any
    // pending one so the imported state wins.
    if (this._resetVisibleViewTimer !== null) {
        clearTimeout(this._resetVisibleViewTimer);
        this._resetVisibleViewTimer = null;
    }
    this.camera.position.x = state_metadata['camera']['position']['x'];
    this.camera.position.y = state_metadata['camera']['position']['y'];
    this.camera.position.z = state_metadata['camera']['position']['z'];
    this.camera.up.x = state_metadata['camera']['up']['x'];
    this.camera.up.y = state_metadata['camera']['up']['y'];
    this.camera.up.z = state_metadata['camera']['up']['z'];
    this.controls.target.x = state_metadata['target']['x'];
    this.controls.target.y = state_metadata['target']['y'];
    this.controls.target.z = state_metadata['target']['z'];
    // Apply quaternion directly when available -- bypasses lookAt's
    // up-projection so the reconstructed orientation matches the
    // exporter exactly. Falls back to lookAt for older saved files.
    const q = state_metadata['camera'] && state_metadata['camera']['quaternion'];
    if (q && typeof q.x === 'number' && typeof q.y === 'number'
          && typeof q.z === 'number' && typeof q.w === 'number') {
        this.camera.quaternion.set(q.x, q.y, q.z, q.w);
        this.camera.updateMatrixWorld(true);
    } else {
        this.camera.lookAt(this.controls.target);
    }
    for (let i = 0; i < state_metadata['pinned'].length; ++i) {
        let key = state_metadata['pinned'][i];
        if (Object.prototype.hasOwnProperty.call(this.meshDict, key)) {
            this.meshDict[key]['pinned'] = true;
        }
    }
    for (let key of Object.keys(state_metadata['visibility'])) {
        if (!Object.prototype.hasOwnProperty.call(this.meshDict, key)) {
            continue;
        }
        this.meshDict[key].visibility = state_metadata['visibility'][key];
        if (this.meshDict[key].background) {
            continue;
        }
        this.meshDict[key].renderObj.setColor(
            state_metadata['color'][key]
        );
    }
};

export {
    Neu3D
};
