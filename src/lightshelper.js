import { PropertyManager } from './propertymanager';
import { AmbientLight, Vector3, DirectionalLight, SpotLight } from 'three';

function guidGenerator() {
  var S4 = function() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  };
  return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

function getProperty(properties, propertyName, def){
  if(propertyName in properties)
    return properties[propertyName]
  else
    return def

}

export class FFBOLightsHelper {
  constructor(camera, controls, scene) {
    let lh = new PropertyManager(this);
    lh.camera = camera;
    lh.controls = controls;
    lh.scene = scene;
    lh.on('change', function (e) {
      let light = this[e['path'][0]];
      if (e['value']) {
        light._object.intensity = light.intensity;
      }
      else {
        light._object.intensity = 0;
      }
    }.bind(lh), 'enabled');
    lh._updatePause = false;
    lh.controls.addEventListener("change", function () {
      if (this._updatePause)
        return;
      this._updatePause = true;
      setTimeout(function () {
        for (let k in this)
          if (this[k]._object && this[k]._object.type == "SpotLight" && this[k].track)
            this._updateSpotLight(this[k]);
        this._updatePause = false;
      }.bind(this), 5);
    }.bind(lh));
    return lh;
  }
  _ambientLightImporter(settings, light) {
    if (light == undefined)
      return this.addAmbientLight(settings);
    /*
      light.enabled = true
      light.object.intensity = settings.intensity;
      Object.assign(light.object.color, settings.color);
      light.enabled = settings.enabled;
    */
    Object.assign(light, settings);
    return light;
  }
  _directionalLightImporter(settings, light) {
    if (light == undefined)
      return this.addDirectionalLight(settings);
    /*
      light.enabled = true
      light.object.intensity = settings.intensity;
      Object.assign(light.object.color, settings.color);;
      Object.assign(light.object.position, settings.position);
      Object.assign(light.object.target.position, settings.target);
      light.enabled = settings.enabled;
    */
    Object.assign(light, settings);
    return light;
  }
  _spotLightImporter(settings, light) {
    if (light == undefined)
      return this.addSpotLight(settings);
    /*
      light.enabled = true
      light.object.intensity = settings.intensity;
      Object.assign(light.object.color, settings.color);;
      light.object.angle = settings.angle;
      light.object.decay = settings.decay;
      light.posAngle1 = settings.posAngle1;
      light.posAngle2 = settings.posAngle2;
      light.distanceFactor = settings.distanceFactor;
      this._updateSpotLight(light);
      light.enabled = settings.enabled;
    */
    Object.assign(light, settings);
    this._updateSpotLight(light);
    return light;
  }
  // Note that
  // 1) All lights that do not already exist (by key) will
  //    be added to the default scene
  // 2) SpotLights might not be added to same position as they were exported from
  //    if track = false and the camera/controls target has changed
  import(settings) {
    for (let key in settings) {
      let light = (key in this) ? this[key] : undefined;
      let lightImporter = (settings[key].type == "AmbientLight" ? this._ambientLightImporter :
        (settings[key].type == "DirectionalLight" ? this._directionalLightImporter : this._spotLightImporter)).bind(this);
      try {
        this[key] = lightImporter(settings[key], light);
      }
      catch (err) {
      }
      ;
    }
  }
  export() {
    let settings = {};
    for (let key in this) {
      if (!this[key]._object)
        continue;
      if (this[key]._object.type == "AmbientLight")
        settings[key] = ambientLightExporter(this[key]);
      if (this[key]._object.type == "DirectionalLight")
        settings[key] = directionalLightExporter(this[key]);
      if (this[key]._object.type == "SpotLight")
        settings[key] = spotLightExporter(this[key]);
    }
    return settings;
  }
  addAmbientLight(properties = {}) {
    // if (properties == undefined)
    //   properties = {};
    let scene = getProperty(properties, 'scene', this.scene);
    let color = getProperty(properties, 'color', 0xffffff);
    let intensity = getProperty(properties, 'intensity', 1.0);
    let key = getProperty(properties, 'key', guidGenerator());
    this[key] = new PropertyManager({
      _object: new AmbientLight(color, intensity),
      color: color,
      intensity: intensity,
      enabled: true
    });
    if ('enabled' in properties)
      this[key].enabled = properties.enabled;
    this[key].on("change", function (e) {
      if (e.prop == "intensity")
        e.obj.enabled ? (e.obj._object.intensity = e.value) : undefined;
      else if (e.prop == "color")
        e.obj._object.color.set(e.value);
      else
        Object.assign(e.obj._object[e.prop], e.value);
    }, ["color", "intensity"]);
    scene.add(this[key]._object);
    return this[key];
  }
  addDirectionalLight(properties = {}) {
    // if (properties == undefined)
    //   properties = {};
    let scene = getProperty(properties, 'scene', this.scene);
    let color = getProperty(properties, 'color', 0xffffff);
    let intensity = getProperty(properties, 'intensity', 1.0);
    let position = getProperty(properties, 'position', new Vector3(0, 0, 1000));
    let target = getProperty(properties, 'target', new Vector3(0, 0, 0));
    let key = getProperty(properties, 'key', guidGenerator());
    this[key] = new PropertyManager({
      _object: new DirectionalLight(color, intensity),
      color: color,
      intensity: intensity,
      position: position,
      target: target,
      enabled: true
    });
    this[key]._object.position.copy(position);
    this[key]._object.target.position.copy(target);
    if ('enabled' in properties)
      this[key].enabled = properties.enabled;
    this[key].on("change", function (e) {
      if (e.prop == "intensity")
        e.obj.enabled ? (e.obj._object.intensity = e.value) : undefined;
      else if (e.prop == "color")
        e.obj._object.color.set(e.value);
      else if (e.prop == "position")
        e.obj._object.position.copy(e.value);
      else if (e.prop == "target")
        e.obj._object.target.position.copy(e.value);
      else
        e.obj._object[e.prop] = e.value;
    }, ["color", "intensity", "position", "target"]);
    scene.add(this[key]._object);
    scene.add(this[key]._object.target);
    return this[key];
  }
  _updateSpotLight(light) {
    let position = this.camera.position.clone();
    let target = this.controls.target.clone();
    position.sub(target);
    let dir = position.clone().normalize();
    let mul = light.posAngle1 < 0 ? -1 : 1;
    position.applyAxisAngle(this.camera.up.clone(), light.posAngle1 * (Math.PI / 180));
    position.applyAxisAngle(dir, mul * light.posAngle2 * (Math.PI / 180));
    let distance = position.length() * light.distanceFactor;
    position.add(target);
    light._object.position.copy(position);
    light._object.target.position.copy(target);
    light._object.distance = distance;
  }
  addSpotLight(properties = {}) {
    // if (properties == undefined)
    //   properties = {};
    let scene = getProperty(properties, 'scene', this.scene);
    let color = getProperty(properties, 'color', 0xffffff);
    let intensity = getProperty(properties, 'intensity', 4.0);
    let angle = getProperty(properties, 'angle', 1.04);
    let decay = getProperty(properties, 'decay', 2.0);
    let distanceFactor = getProperty(properties, 'distanceFactor', 2.0);
    let posAngle1 = getProperty(properties, 'posAngle1', 80);
    let posAngle2 = getProperty(properties, 'posAngle2', 80);
    let track = getProperty(properties, 'track', true);
    let key = getProperty(properties, 'key', guidGenerator());
    this[key] = new PropertyManager({
      _object: new SpotLight(color, intensity),
      color: color,
      intensity: intensity,
      angle: angle,
      decay: decay,
      posAngle1: posAngle1,
      posAngle2: posAngle2,
      track: track,
      distanceFactor: distanceFactor,
      enabled: true
    });
    if ('enabled' in properties)
      this[key].enabled = properties.enabled;
    this[key].on("change", function (e) {
      if (e.prop == "intensity")
        e.obj.enabled ? (e.obj._object.intensity = e.value) : undefined;
      else if (e.prop == "color")
        e.obj._object.color.set(e.value);
      else
        e.obj._object[e.prop] = e.value;
    }, ["color", "intensity", "angle", "decay"]);
    this[key].on("change", function (e) {
      this._updateSpotLight(e.obj);
    }.bind(this), ["posAngle1", "posAngle2", "distanceFactor"]);
    this._updateSpotLight(this[key]);
    scene.add(this[key]._object);
    scene.add(this[key]._object.target);
    return this[key];
  }
}

function ambientLightExporter(light){
  return {
    intensity: light.intensity,
    enabled: light.enabled,
    color: light.color,
    type: "AmbientLight"
  }
}



function directionalLightExporter(light){
  return {
    intensity: light.intensity,
    enabled: light.enabled,
    color: light.color,
    position: Object.assign({}, light.position),
    target: Object.assign({}, light.target),
    type: "DirectionalLight"
  }
}



function spotLightExporter(light){
  return {
    intensity: light.intensity,
    enabled: light.enabled,
    color: light.color,
    angle: light.angle,
    decay: light.decay,
    distanceFactor: light.distanceFactor,
    posAngle1: light.posAngle1,
    posAngle2: light.posAngle2,
    track: light.track,
    type: "SpotLight"
  }
}









