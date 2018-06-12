import {FFBOMesh3D} from "./mesh3D";
const parentDiv  = document.getElementById('vis-3d');
var ffbomesh = new FFBOMesh3D(parentDiv, undefined, { "globalCenter": { 'x': 0, 'y': -250, 'z': 0 } }, false);
// ffbomesh.settings.neuron3d = 1;
// function dataCallback(data) {
//     ffbomesh.addJson({ ffbo_json: data, type: 'morphology_json' });
// }

window.ffbomesh = ffbomesh;

$.getJSON("./config.json", function (json) {
    ffbomesh.addJson({
        ffbo_json: json,
        showAfterLoadAll: true
    });
});


$(document).ready(()=>{
    ffbomesh.onWindowResize();
});


// ffbomesh.createUIBtn("showSettings", "fa-cog", "Settings");
// ffbomesh.createUIBtn("showInfo", "fa-info-circle", "GUI guideline");
// ffbomesh.createUIBtn("downData", "fa-download", "Download Connectivity");
