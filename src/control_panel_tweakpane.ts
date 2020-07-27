import { Neu3D } from "./neu3d";
const Tweakpane = require('tweakpane');

export class ControlPanel {
  _controlPanelBtnIds: any[] = [];
  panel: any;
  constructor(
    neu3d: Neu3D,
    container: HTMLDivElement,
  ) {
    let controlPanel = this.panel = new Tweakpane({ container: container });
    this._controlPanelBtnIds = []
    controlPanel.addMonitor(neu3d.uiVars, 'frontNum', { label: '# Neurons: ' });
    // neuronNum.domElement.style["pointerEvents"] = "None";
    // neuronNum.domElement.parentNode.parentNode.classList.addInput('noneurons');

    // if (GUIOptions['createButtons']) {
    //   function _createBtn(name, icon, iconAttrs, tooltip, func) {
    //     let newButton = function () {
    //       this[name] = func;
    //     };
    //     let btn = new newButton();
    //     let buttonid = controlPanel.addInput(btn, name).title(tooltip).icon(icon, "strip", iconAttrs);
    //     return buttonid;
    //   }

    //   let btnId = ''
    //   btnId = _createBtn("uploadFile", "fa fa-upload", {}, "Upload SWC File", () => { neu3d.fileUploadInput.click(); });
    //   this._controlPanelBtnIds.push(btnId);
    //   btnId = _createBtn("resetView", "fa fa-sync", { "aria-hidden": "true" }, "Reset View", () => { neu3d.resetView() });
    //   this._controlPanelBtnIds.push(btnId);
    //   btnId = _createBtn("resetVisibleView", "fa fa-align-justify", {}, "Center and zoom into visible Neurons/Synapses", () => { neu3d.resetVisibleView() });
    //   this._controlPanelBtnIds.push(btnId);
    //   btnId = _createBtn("hideAll", "fa fa-eye-slash", {}, "Hide All", () => { neu3d.hideAll() });
    //   this._controlPanelBtnIds.push(btnId);
    //   btnId = _createBtn("showAll", "fa fa-eye", {}, "Show All", () => { neu3d.showAll() });
    //   this._controlPanelBtnIds.push(btnId);
    //   btnId = _createBtn("takeScreenshot", "fa fa-camera", {}, "Download Screenshot", () => { neu3d._take_screenshot = true; });
    //   this._controlPanelBtnIds.push(btnId);
    //   btnId = _createBtn("removeUnpin", "fa fa-trash", {}, "Remove Unpinned Neurons", () => { neu3d.removeUnpinned(); })
    //   this._controlPanelBtnIds.push(btnId);
    //   btnId = _createBtn("removeUnpin", "fa fa-map-upin", {}, "Unpin All", () => { neu3d.unpinAll(); })
    //   this._controlPanelBtnIds.push(btnId);
    //   btnId = _createBtn("showSettings", "fa fa-cogs", {}, "Display Settings", () => { controlPanel.__closeButton.click(); })
    //   this._controlPanelBtnIds.push(btnId);
    // }
    // add settings
    let f_vis = controlPanel.addFolder('Settings');
    let f0 = f_vis.addFolder({ title: 'Display Mode', expanded: false });
    f0.addInput(neu3d.meshDict.settings, 'neuron3d', { label: "Enable 3D Mode" });
    f0.addInput(neu3d.meshDict.settings, 'neuron3dMode', {
      options: {
        low: 1,
        medium: 2,
        high: 3
      }
    }
    );
    f0.addInput(neu3d.meshDict.settings, 'synapseMode');

    let f1 = f_vis.addFolder({ title: 'Visualization', expanded: false });
    f1.addInput(neu3d.meshDict.settings, 'meshWireframe', { label: "Show Wireframe" });
    f1.addInput(neu3d.meshDict.settings, 'backgroundColor', { label: "Background" });
    let f1_1 = f1.addFolder({ title: 'Opacity', expanded: false });

    f1_1.addInput(neu3d.meshDict.settings, 'defaultOpacity', { min: 0.0, max: 1.0 });//.listen();
    f1_1.addInput(neu3d.meshDict.settings, 'synapseOpacity', { min: 0.0, max: 1.0 });//.listen();
    f1_1.addInput(neu3d.meshDict.settings, 'nonHighlightableOpacity', { min: 0.0, max: 1.0 });//.listen();
    f1_1.addInput(neu3d.meshDict.settings, 'lowOpacity', { min: 0.0, max: 1.0 });//.listen();
    f1_1.addInput(neu3d.meshDict.settings, 'pinOpacity', { min: 0.0, max: 1.0 });//.listen();
    f1_1.addInput(neu3d.meshDict.settings, 'pinLowOpacity', { min: 0.0, max: 1.0 });//.listen();
    f1_1.addInput(neu3d.meshDict.settings, 'highlightedObjectOpacity', { min: 0.0, max: 1.0 });//.listen();
    f1_1.addInput(neu3d.meshDict.settings, 'backgroundOpacity', { min: 0.0, max: 1.0 });//.listen();
    f1_1.addInput(neu3d.meshDict.settings, 'backgroundWireframeOpacity', { min: 0.0, max: 1.0 });//.listen();

    let f1_2 = f1.addFolder({ title: 'Advanced', expanded: false });

    f1_2.addInput(neu3d.postProcess.settings.toneMappingPass, 'brightness', { label: "ToneMap Brightness" });
    f1_2.addInput(neu3d.postProcess.settings.bloomPass, 'radius', { label: "BloomRadius", min: 0., max: 10. });
    f1_2.addInput(neu3d.postProcess.settings.bloomPass, 'strength', { label: "BloomStrength", min: 0., max: 1. });
    f1_2.addInput(neu3d.postProcess.settings.bloomPass, 'threshold', { label: "BloomThreshold", min: 0., max: 2. });
    f1_2.addInput(neu3d.postProcess.settings.effectFXAA, 'enabled', { label: "FXAA" });
    f1_2.addInput(neu3d.postProcess.settings.backrenderSSAO, 'enabled', { label: "SSAO" });

    // let f2 = f_vis.addFolder({ title: 'Size', expanded: false });
    // f2.addInput(neu3d.settings, 'defaultRadius', neu3d.settings.minRadius, neu3d.settings.maxRadius);//.listen();
    // f2.addInput(neu3d.settings, 'defaultSomaRadius', neu3d.settings.minSomaRadius, neu3d.settings.maxSomaRadius);//.listen();
    // f2.addInput(neu3d.settings, 'defaultSynapseRadius', neu3d.settings.minSynapseRadius, neu3d.settings.maxSynapseRadius);//.listen();

    // let ctl_minR = f2.addInput(neu3d.settings, 'minRadius', {min: 0});//.listen();
    // ctl_minR.onChange((value) => { value = Math.min(value, neu3d.settings.maxRadius); })
    // let ctl_maxR = f2.addInput(neu3d.settings, 'maxRadius', {min: 0});//.listen();
    // ctl_maxR.onChange((value) => { value = Math.max(value, neu3d.settings.minRadius); })
    // let ctl_minSomaR = f2.addInput(neu3d.settings, 'minSomaRadius', {min: 0});//.listen();
    // ctl_minSomaR.onChange((value) => { value = Math.min(value, neu3d.settings.maxSomaRadius); })
    // let ctl_maxSomaR = f2.addInput(neu3d.settings, 'maxSomaRadius', {min: 0});//.listen();
    // ctl_maxSomaR.onChange((value) => { value = Math.max(value, neu3d.settings.minSomaRadius); })
    // let ctl_minSynR = f2.addInput(neu3d.settings, 'minSynapseRadius', {min: 0});//.listen();
    // ctl_minSynR.onChange((value) => { value = Math.min(value, neu3d.settings.maxSynapseRadius); })
    // let ctl_maxSynR = f2.addInput(neu3d.settings, 'maxSynapseRadius', {min: 0});//.listen();
    // ctl_maxSynR.onChange((value) => { value = Math.max(value, neu3d.settings.minSynapseRadius); })


    // neu3d.settings.on("change", ((e) => {
    //   controlPanel.refresh();
    // }), [
    //   'neuron3d', 'neuron3dMode', 'synapseMode', 'meshWireframe', 'defaultOpacity',
    //   'synapseOpacity', 'nonHighlightableOpacity', 'lowOpacity', 'pinOpacity', 'pinLowOpacity',
    //   'highlightedObjectOpacity', 'backgroundOpacity', 'backgroundWireframeOpacity',
    //   'defaultRadius', 'defaultSomaRadius', 'defaultSynapseRadius', 'minRadius', 'maxRadius',
    //   'minSomaRadius', 'maxSomaRadius', 'minSynapseRadius', 'maxSynapseRadius', 'backgroundColor'
    // ]);
    // neu3d.settings.toneMappingPass.on('change', ((e) => { controlPanel.refresh(); }), ['brightness']);
    // neu3d.settings.bloomPass.on('change', ((e) => { controlPanel.refresh(); }), ['radius', 'strength', 'threshold']);
    // neu3d.settings.effectFXAA.on('change', ((e) => { controlPanel.refresh(); }), ['enabled']);
    // neu3d.settings.backrenderSSAO.on('change', ((e) => { controlPanel.refresh(); }), ['enabled']);
    // neu3d.uiVars.on('change', ((e) => { controlPanel.refresh(); }), ['frontNum']);
  }

  dispose() {
    this.panel.dispose()
  }
}