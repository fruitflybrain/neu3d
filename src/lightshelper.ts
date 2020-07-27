import { 
  AmbientLight, Vector3, DirectionalLight,
  SpotLight, PerspectiveCamera, Scene, Color
} from 'three';
import {
  Signal, ISignal
} from '@lumino/signaling';

import {
  TrackballControls
} from 'three/examples/jsm/controls/TrackballControls';

/**
 * Generate unique id
 */ 
function guidGenerator(): string {
  var S4 = function() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  };
  return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}



export class FFBOLightsHelper {
  camera: PerspectiveCamera;
  controls: TrackballControls;
  scene: Scene;
  lights: { [name: string]: Lights.ILight } = {}; // array of lights
  _updatePause = false;

  constructor(
    camera:PerspectiveCamera, 
    controls: TrackballControls,
    scene: Scene
  ) {
    controls.addEventListener("change", () => {
      if (this._updatePause) {
        return;
      }
      this._updatePause = true;
      setTimeout(() => {
        for (let light of Object.values(this.lights)) {
          if (light._object && light._object.type === "SpotLight" && (light as Lights.INeu3DSpotLight).track) {
            this.onUpdateSpotLight(light as Lights.Neu3DSpotLight);
          } 
        }
        this._updatePause = false;
      }, 5);
    });
    this.camera = camera;
    this.controls = controls;
    this.scene = scene;
  }

  _ambientLightImporter(settings: Partial<Lights.INeu3DAmbientLight>, light?: Lights.INeu3DAmbientLight) {
    if (light == undefined) {
      return this.addAmbientLight(settings);
    }
    Object.assign(light, settings);
    return light;
  }

  _directionalLightImporter(settings: Partial<Lights.INeu3DDirectionalLight>, light?: Lights.INeu3DDirectionalLight) {
    if (light == undefined) {
      return this.addDirectionalLight(settings);
    }
    Object.assign(light, settings);
    return light;
  }

  _spotLightImporter(settings: Partial<Lights.INeu3DSpotLight>, light?: Lights.Neu3DSpotLight) {
    if (light == undefined){
      return this.addSpotLight(settings);
    }
    Object.assign(light, settings);
    this.onUpdateSpotLight(light);
    return light;
  }

  /**  Note that
  * 1) All lights that do not already exist (by key) will
  *    be added to the default scene
  * 2) SpotLights might not be added to same position as they were exported from
  *    if track = false and the camera/controls target has changed
  */
  import(settings: { [name: string]: Lights.ILight }) {
    for (let key in settings) {
      let light = (key in this.lights) ? this.lights[key] : undefined;
      let lightImporter;
      switch (settings[key].type) {
        case "AmbientLight":
          lightImporter = this._ambientLightImporter;
          break;
        case "DirectionalLight":
          lightImporter = this._directionalLightImporter;
          break;
        case "SpotLight":
          lightImporter = this._spotLightImporter;
          break;
        default:
          console.warn(`[Neu3D] Lights Helper import does not recognized type ${settings[key].type}`);
          break;
      }

      try {
        this.lights[key] = lightImporter(settings[key], light);
      } catch (err) {
        console.error(`[Neu3D] LightsHelper Import Error for settings ${settings}, Error ${err}`);
      }
    }
  }

  export() {
    let settings: any = {};
    for (let [key, light] of Object.entries(this.lights)) {
      if (!light._object) {
        continue;
      }
      switch (light._object.type) {
        case "AmbientLight":
          settings[key] = {
            intensity: (light as Lights.Neu3DAmbientLight).intensity,
            enabled: (light as Lights.Neu3DAmbientLight).enabled,
            color: (light as Lights.Neu3DAmbientLight).color,
            type: "AmbientLight"
          }
          break;
        case "DirectionalLight":
          settings[key] = {
            intensity: (light as Lights.Neu3DDirectionalLight).intensity,
            enabled: (light as Lights.Neu3DDirectionalLight).enabled,
            color: (light as Lights.Neu3DDirectionalLight).color,
            position: Object.assign({}, (light as Lights.Neu3DDirectionalLight).position),
            target: Object.assign({}, (light as Lights.Neu3DDirectionalLight).target),
            type: "DirectionalLight"
          }
          break;
        case "SpotLight":
          settings[key] = {
            intensity: (this.lights[key] as Lights.Neu3DSpotLight).intensity,
            enabled: (this.lights[key] as Lights.Neu3DSpotLight).enabled,
            color: (this.lights[key] as Lights.Neu3DSpotLight).color,
            angle: (this.lights[key] as Lights.Neu3DSpotLight).angle,
            decay: (this.lights[key] as Lights.Neu3DSpotLight).decay,
            distanceFactor: (this.lights[key] as Lights.Neu3DSpotLight).distanceFactor,
            posAngle1: (this.lights[key] as Lights.Neu3DSpotLight).posAngle1,
            posAngle2: (this.lights[key] as Lights.Neu3DSpotLight).posAngle2,
            track: (this.lights[key] as Lights.Neu3DSpotLight).track,
            type: "SpotLight"
          }
          break;
        default:
          break;
      }
    }
    return settings;
  }

  /**
   * @param properties 
   */
  addAmbientLight(properties?: Partial<Lights.INeu3DAmbientLightOptions>) {
    let scene = properties.scene ?? this.scene;
    let color = properties.color ?? 0xffffff;
    let intensity = properties.intensity ?? 1.0;
    let key = properties.key ?? guidGenerator();
    this.lights[key] = new Lights.Neu3DAmbientLight({
      key: key,
      type: 'AmbientLight',
      _object: new AmbientLight(color, intensity),
      color: color,
      intensity: intensity,
      enabled: properties.enabled ?? true
    });
    scene.add(this.lights[key]._object);
    return this.lights[key];
  }


  addDirectionalLight(properties?: Partial<Lights.INeu3DDirectionalLightOptions>) {
    let scene = properties.scene ?? this.scene;
    let color = properties.color ?? 0xffffff;
    let intensity = properties.intensity ?? 1.0;
    let position = properties.position ?? new Vector3(0, 0, 1000);
    let target = properties.target ?? new Vector3(0, 0, 0);
    let key = properties.key ?? guidGenerator();
    this.lights[key] = new Lights.Neu3DDirectionalLight({
      key: key,
      type: 'DirectionalLight',
      _object: new DirectionalLight(color, intensity),
      color: properties.color ?? 0xffffff,
      intensity: intensity,
      position: position,
      target: target,
      enabled: properties.enabled ?? true
    });

    this.lights[key]._object.position.copy(position);
    (this.lights[key]._object as DirectionalLight).target.position.copy(target);
    scene.add(this.lights[key]._object);
    scene.add((this.lights[key]._object as DirectionalLight).target);
    return this.lights[key];
  }


  onUpdateSpotLight(light: Lights.Neu3DSpotLight) {
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
    (light._object as SpotLight).target.position.copy(target);
    (light._object as SpotLight).distance = distance;
  }


  addSpotLight(properties?: Partial<Lights.INeu3DSpotLightOptions>) {
    let key = properties.key ?? guidGenerator();
    let color = properties.color ?? 0xffffff;
    let intensity = properties.intensity ?? 4.0;
    this.lights[key] = new Lights.Neu3DSpotLight({
      key: key,
      type: 'SpotLight',
      _object: new SpotLight(color, intensity),
      enabled: properties.enabled ?? true,
      color: color,
      intensity: intensity,
      angle: properties.angle ?? 1.04,
      decay: properties.decay ?? 2.0,
      posAngle1: properties.posAngle1 ?? 80,
      posAngle2: properties.posAngle2 ?? 80,
      track: properties.track ?? true,
      distanceFactor: properties.distanceFactor ?? 2.0
    });

    // setup allback on spotlight update
    (this.lights[key] as Lights.Neu3DSpotLight).updateSpotLight.connect((light: Lights.Neu3DSpotLight) => {
      this.onUpdateSpotLight(light);
    }, this);
    
    this.onUpdateSpotLight(this.lights[key] as Lights.Neu3DSpotLight);
    this.scene.add(this.lights[key]._object);
    this.scene.add((this.lights[key]._object as SpotLight).target);
    return this.lights[key];
  }
}

/**
 * FFBOLight Helper Classes
 */
export namespace Lights {
  export type ILight = INeu3DAmbientLight | INeu3DDirectionalLight | INeu3DSpotLight;

  /**
   * Class constructor options
   * Note: `enabled`, `color`, `intensity` will call respective setters 
   */
  export interface IBaseOptions{
    key: string;
    type: 'AmbientLight' | 'DirectionalLight' | 'SpotLight' | string;
    _object: AmbientLight | DirectionalLight | SpotLight;
    enabled: boolean;
    color: string | number | Color;
    intensity: number;
    scene?: Scene;
  }

  export interface INeu3DBaseLight {
    key: string;
    type: 'AmbientLight' | 'DirectionalLight' | 'SpotLight' | string;
    _object: AmbientLight | DirectionalLight | SpotLight;
    _enabled: boolean;
  }
  
  export class Neu3DBaseLight implements INeu3DBaseLight{
    _object: AmbientLight | DirectionalLight | SpotLight;
    _enabled: boolean = true;
    type: 'AmbientLight' | 'DirectionalLight' | 'SpotLight' | string;
    key: string;

    constructor(args: IBaseOptions) {
      this._object = args._object;
      this.type = args.type;
      this.key = args.key;
      this.color = args.color;
      this.intensity = args.intensity;
      this.enabled = args.enabled;
    }

    set enabled(val: boolean) {
      this._enabled = val;
      this._object.intensity = val ? this.intensity: 0;
    }

    get enabled(): boolean {
      return this._enabled;
    }

    get intensity(): number { 
      return this._object.intensity;
    }

    set intensity(val: number) {
      this._object.intensity = this.enabled ? val: undefined;
    }

    get color(): string | number | Color {
      return this._object.color;
    }

    set color(val: string | number | Color) {
      this._object.color.set(val);
    }
  }

  /**
   * Ambient Light
   */
  export interface INeu3DAmbientLightOptions extends IBaseOptions { }
  export interface INeu3DAmbientLight extends INeu3DBaseLight {}
  export class Neu3DAmbientLight extends Neu3DBaseLight {}

  /**
   * Neu3D Directional Light
   */
  export interface INeu3DDirectionalLight extends INeu3DBaseLight {}
  export interface INeu3DDirectionalLightOptions extends IBaseOptions {
    position: Vector3;
    target: Vector3;
  }
  export class Neu3DDirectionalLight extends Neu3DBaseLight implements INeu3DDirectionalLight {
    constructor(
      args: INeu3DDirectionalLightOptions
    ) {
      super(args);
      this.position = args.position;
      this.target = args.target;
    }

    set position(val: Vector3) {
      if (val !== this._object.position) {
        this._object.position.copy(val);  
      }
    }

    get position(): Vector3 {
      return this._object.position;
    }

    set target(val: Vector3) {
      if (val !== (this._object as DirectionalLight).target.position) {
        (this._object as DirectionalLight).target.position.copy(val);
      }
    }

    get target(): Vector3 {
      return (this._object as DirectionalLight).target.position;
    }
  }

  /**
   * Neu3D Spotlight
   */
  export interface INeu3DSpotLight extends INeu3DBaseLight {
    track: boolean;
  }
  export interface INeu3DSpotLightOptions extends IBaseOptions {
    angle: number;
    decay: number;
    distanceFactor: number;
    posAngle1: number;
    posAngle2: number;
    track: boolean;
  }
  export class Neu3DSpotLight extends Neu3DBaseLight implements INeu3DSpotLight {
    _distanceFactor: number;
    _posAngle1: number;
    _posAngle2: number;
    track: boolean;
    _object: SpotLight;
    _updateSpotLight = new Signal<this, this>(this);
    
    constructor(
      args: INeu3DSpotLightOptions
    ) {
      super(args);
      this.angle = args.angle;
      this.decay = args.decay;
      this._distanceFactor = args.distanceFactor;
      this._posAngle1 = args.posAngle1;
      this._posAngle2 = args.posAngle2;
      this.track = args.track;
    }

    set decay(val: number) {
      this._object.decay = val;
    }
    get decay(): number {
      return this._object.decay;
    }
    set angle(val: number) {
      this._object.angle = val;
    }
    get angle(): number {
      return this._object.angle;
    }
    set posAngle1(val: number) {
      if (val !== this._posAngle1) {
        this._posAngle1 = val;
        this._updateSpotLight.emit(this);
      }
    }
    set posAngle2(val: number) {
      if (val !== this._posAngle2) {
        this._posAngle2 = val;
        this._updateSpotLight.emit(this);
      }
    }
    set distanceFactor(val: number) { 
      if (val !== this._distanceFactor) {
        this._distanceFactor = val;
        this._updateSpotLight.emit(this);
      }
    }
    get posAngle1(): number { return this._posAngle1; }
    get posAngle2(): number { return this._posAngle2; }
    get distanceFactor(): number { return this._distanceFactor; }
    get updateSpotLight(): ISignal<this, this> { return this._updateSpotLight; }
  }
}