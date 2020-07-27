import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { AdaptiveToneMappingPass } from "three/examples/jsm/postprocessing/AdaptiveToneMappingPass";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { GammaEncoding, WebGLRenderer, Scene, PerspectiveCamera, Vector2 } from "three";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";

/** return next power of 2 of given number */
function nextPow2(x: number): number {
  return Math.pow(2, Math.round(Math.max(x, 0)).toString(2).length);
}

interface ISettings {
  toneMappingPass: ToneMapSetting;
  bloomPass: BloomPassSettings;
  effectFXAA: EnablableSettings;
  backrenderSSAO: EnablableSettings;
}

export class PostProcessor {
  composer: EffectComposer;
  renderScene: RenderPass;
  backrenderScene: RenderPass;
  backrenderSSAO: SSAOPass;
  effectFXAA: ShaderPass;
  toneMappingPass: AdaptiveToneMappingPass;
  bloomPass: UnrealBloomPass;
  settings: ISettings;
  constructor(
    camera: PerspectiveCamera,
    scenes: { front: Scene, back: Scene },
    renderer: WebGLRenderer,
    container: HTMLDivElement
  ) {
    let height = container.clientHeight;
    let width = container.clientWidth;
    let renderScene = new RenderPass(scenes.front, camera);
    renderScene.clear = false;
    renderScene.clearAlpha = 1.;
    renderScene.clearDepth = true;

    let backrenderScene = this.backrenderScene = new RenderPass(scenes.back, camera);
    let backrenderSSAO = this.backrenderSSAO = new SSAOPass(scenes.back, camera, width, height);
    backrenderSSAO.enabled = false;

    let effectFXAA = this.effectFXAA = new ShaderPass(FXAAShader);
    effectFXAA.enabled = false
    effectFXAA.uniforms['resolution'].value.set(1 / Math.max(width, 1440), 1 / Math.max(height, 900));

    let bloomPass = this.bloomPass = new UnrealBloomPass(new Vector2(width, height), 0.2, 0.2, 0.3 );
    bloomPass.renderToScreen = true;

    let toneMappingPass = this.toneMappingPass = new AdaptiveToneMappingPass(true, nextPow2(width));
    toneMappingPass.setMinLuminance(1. - 0.95);

    renderer.outputEncoding = GammaEncoding;

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(backrenderScene);
    this.composer.addPass(backrenderSSAO);
    this.composer.addPass(renderScene);
    this.composer.addPass(effectFXAA);
    this.composer.addPass(toneMappingPass);
    this.composer.addPass(bloomPass);
    this.composer.setSize(
      width * window.devicePixelRatio,
      height * window.devicePixelRatio
    );

    this.settings = {
      toneMappingPass: new ToneMapSetting(toneMappingPass, 0.95),
      bloomPass: new BloomPassSettings(bloomPass, 0.2, 0.2, 0.3),
      effectFXAA: new EnablableSettings(effectFXAA, false),
      backrenderSSAO: new EnablableSettings(backrenderSSAO, false)
    }
  } 

  dispose() {
    delete this.backrenderScene;
    this.backrenderSSAO.dispose();
    delete this.renderScene;
    delete this.effectFXAA;
    this.bloomPass.dispose();
    this.toneMappingPass.dispose()
    delete this.composer;
  }
}


class ToneMapSetting {
  toneMap: AdaptiveToneMappingPass;
  _brightness: number;
  constructor(
    toneMap: AdaptiveToneMappingPass,
    brightness: number = 0.95
  ) {
    this.toneMap = toneMap;
    this._brightness = brightness
  }
  set brightness(val: number) {
    this.toneMap.setMinLuminance(1 - val);
    this._brightness = val;
  }

  get brightness(): number{
    return this._brightness;
  }
}

class EnablableSettings {
  pass: ShaderPass | SSAOPass;
  _enabled: boolean;
  constructor(
    pass: ShaderPass | SSAOPass,
    enabled: boolean = false
  ) {
    this.pass = pass;
    this._enabled = enabled;
  }
  set enabled(val: boolean) {
    this.pass.enabled = val;
    this._enabled = val;
  }

  get enabled(): boolean {
    return this._enabled;
  }
}

class BloomPassSettings{
  _radius: number;
  _strength: number;
  _threshold: number;
  pass: UnrealBloomPass;
  constructor(
    pass: UnrealBloomPass,
    radius: number = 0.2,
    strength: number = 0.2,
    threshold: number = 0.3
  ) {
    this.pass = pass;
    this._radius = radius;
    this._strength = strength;
    this._threshold = threshold;
  }

  set strength(val:number) {
    this._strength = val
    this.pass.strength = val;
  }

  set radius(val: number) {
    this._radius = val
    this.pass.radius = val;
  }

  set threshold(val: number) {
    this._threshold = val
    this.pass.threshold = val;
  }

  get strength(): number { return this._strength;}
  get radius(): number { return this._radius;}
  get threshold(): number { return this._threshold;}
}