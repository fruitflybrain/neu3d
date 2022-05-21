export class FFBOLightsHelper {
    constructor(camera: any, controls: any, scene: any);
    _ambientLightImporter(settings: any, light: any): any;
    _directionalLightImporter(settings: any, light: any): any;
    _spotLightImporter(settings: any, light: any): any;
    import(settings: any): void;
    export(): {};
    addAmbientLight(properties?: {}): any;
    addDirectionalLight(properties?: {}): any;
    _updateSpotLight(light: any): void;
    addSpotLight(properties?: {}): any;
}
