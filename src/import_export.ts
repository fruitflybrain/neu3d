import { Neu3D } from './neu3d';
/** Import settings */
Neu3D.prototype.import_settings = function(settings) {
  settings = Object.assign({}, settings);
  if ('lightsHelper' in settings) {
    this.lightsHelper.import(settings.lightsHelper);
    delete settings.lightsHelper;
  }
  
  if ('postProcessing' in settings) {
    let postProcessing = settings.postProcessing;
    delete settings.postProcessing;
    if (postProcessing.fxaa != undefined){
      this.settings.effectFXAA.enabled = postProcessing.fxaa;
    }
    if (postProcessing.ssao != undefined){
      this.settings.backrenderSSAO.enabled = postProcessing.ssao;
    }
    if (postProcessing.toneMappingMinLum != undefined){
      this.settings.toneMappingPass.brightness = 1 - postProcessing.toneMappingMinLum;
    }
    if (postProcessing.bloomRadius != undefined){
      this.settings.bloomPass.radius = postProcessing.bloomRadius;
    }
    if (postProcessing.bloomStrength != undefined){
      this.settings.bloomPass.strength = postProcessing.bloomStrength;
    }
    if (postProcessing.bloomThreshold != undefined){
      this.settings.bloomPass.threshold = postProcessing.bloomThreshold;
    }
  }
  
  if ('backgroundColor' in settings) {
    let bg = settings.backgroundColor;
    setTimeout( ()=> {
      this.setBackgroundColor(bg);
    }, 4000);
    delete settings.backgroundColor;
  }
  Object.assign(this.settings, settings);
}

/** 
* Export state of the workspace 
* 
* Note: useful for tagging
*/
Neu3D.prototype.export_state = function() {
  let state_metadata = { 'color': {}, 'pinned': {}, 'visibility': {}, 'camera': { 'position': {}, 'up': {} }, 'target': {} };
  state_metadata['camera']['position']['x'] = this.camera.position.x;
  state_metadata['camera']['position']['y'] = this.camera.position.y;
  state_metadata['camera']['position']['z'] = this.camera.position.z;
  state_metadata['camera']['up']['x'] = this.camera.up.x;
  state_metadata['camera']['up']['y'] = this.camera.up.y;
  state_metadata['camera']['up']['z'] = this.camera.up.z;
  state_metadata['target']['x'] = this.controls.target.x;
  state_metadata['target']['y'] = this.controls.target.y;
  state_metadata['target']['z'] = this.controls.target.z;
  state_metadata['pinned'] = Array.from(this.uiVars.pinnedObjects);
  for (let key in this.meshDict) {
    if (this.meshDict.hasOwnProperty(key)) {
      state_metadata['color'][key] = this.meshDict[key].object.children[0].material.color.toArray();
      state_metadata['visibility'][key] = this.meshDict[key].visibility;
    }
  }
  return state_metadata;
}

/**
* Import State
* 
* Note: useful for tagging
* @param {object} state_metadata 
*/
Neu3D.prototype.import_state = function(state_metadata) {
  this.camera.position.x = state_metadata['camera']['position']['x'];
  this.camera.position.y = state_metadata['camera']['position']['y'];
  this.camera.position.z = state_metadata['camera']['position']['z'];
  this.camera.up.x = state_metadata['camera']['up']['x'];
  this.camera.up.y = state_metadata['camera']['up']['y'];
  this.camera.up.z = state_metadata['camera']['up']['z'];
  this.controls.target.x = state_metadata['target']['x'];
  this.controls.target.y = state_metadata['target']['y'];
  this.controls.target.z = state_metadata['target']['z'];
  this.camera.lookAt(this.controls.target);
  for (let i = 0; i < state_metadata['pinned'].length; ++i) {
    let key = state_metadata['pinned'][i];
    if (this.meshDict.hasOwnProperty(key))
    this.meshDict[key]['pinned'] = true;
  }
  for (let key of Object.keys(state_metadata['visibility'])) {
    if (!this.meshDict.hasOwnProperty(key)){
      continue;
    }
    this.meshDict[key].visibility = state_metadata['visibility'][key];
    if (this.meshDict[key].background){
      continue;
    } 
    let meshobj = this.meshDict[key].object;
    let color = state_metadata['color'][key];
    for (let j = 0; j < meshobj.children.length; ++j) {
      meshobj.children[j].material.color.fromArray(color);
      for (let k = 0; k < meshobj.children[j].geometry.colors.length; ++k) {
        meshobj.children[j].geometry.colors[k].fromArray(color);
      }
      meshobj.children[j].geometry.colorsNeedUpdate = true;
    }
  }
}

export { Neu3D };