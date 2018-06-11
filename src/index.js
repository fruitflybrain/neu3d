import { FFBOMesh3D } from "./mesh3d";

var parentDivId  = 'vis-3d';
var ffbomesh = new FFBOMesh3D(parentDivId, undefined, { "globalCenter": { 'x': 0, 'y': -250, 'z': 0 } });
//ffbomesh.settings.neuron3d = 1;
function dataCallback(data) {
    ffbomesh.addJson({ ffbo_json: data, type: 'morphology_json' });
}

//window.client = client;
//window.tagsPanel = tagsPanel;
window.ffbomesh = ffbomesh;

$.getJSON("./config.json", function (json) {
    console.log(json);
    ffbomesh.addJson({
        ffbo_json: json,
        showAfterLoadAll: true
    });
});


$(document).ready(()=>{
    ffbomesh.onWindowResize();
});

$(parentDivId).on('resize',()=>{
    ffbomesh.onWindowResize();
})

$(parentDivId).on({
    'dragover dragenter': function(e) {
        e.preventDefault();
        e.stopPropagation();
    },
    'drop': function(e) {
        //console.log(e.originalEvent instanceof DragEvent);
        var dataTransfer =  e.originalEvent.dataTransfer;
        if( dataTransfer && dataTransfer.files.length) {
            e.preventDefault();
            e.stopPropagation();
            $.each( dataTransfer.files, function(i, file) {
              var reader = new FileReader();
              reader.onload = $.proxy(function(file, event) {
                if (file.name.match('.+(\.swc)$')) {
                  var name = file.name.split('.')[0];
                  var json = {};
                  json[name] = {
                    label: name,
                    dataStr: event.target.result,
                    filetype: 'swc'
                  };
                  ffbomesh.addJson({ffbo_json: json});
                }
              }, this, file);
              reader.readAsText(file);
            });
        }
    }
});


ffbomesh.createUIBtn("showSettings", "fa-cog", "Settings")
ffbomesh.createUIBtn("takeScreenshot", "fa-camera", "Download Screenshot")
ffbomesh.createUIBtn("showInfo", "fa-info-circle", "GUI guideline")
ffbomesh.createUIBtn("resetView", "fa-refresh", "Reset View")
ffbomesh.createUIBtn("resetVisibleView", "fa-align-justify", "Center and zoom into visible Neurons/Synapses")
ffbomesh.createUIBtn("showAll", "fa-eye", "Show All")
ffbomesh.createUIBtn("hideAll", "fa-eye-slash", "Hide All")
ffbomesh.createUIBtn("removeUnpin", "fa-trash", "Remove Unpinned Neurons")
ffbomesh.createUIBtn("downData", "fa-download", "Download Connectivity")

//////////////////////////

// import * as Detector from 'three/examples/js/Detector';
// import "three/examples/js/shaders/SSAOShader";
// import "three/examples/js/shaders/CopyShader";
// import "three/examples/js/postprocessing/EffectComposer";
// import "three/examples/js/postprocessing/RenderPass";
// import "three/examples/js/postprocessing/ShaderPass";
// import "three/examples/js/postprocessing/MaskPass";
// import "three/examples/js/postprocessing/SSAOPass";

// import * as Stats from 'stats.js';
// import * as dat from 'dat.gui';

// if (!Detector.webgl) Detector.addGetWebGLMessage();

// var container, stats;
// var camera, scene, renderer;
// var effectComposer;
// var ssaoPass;
// var group;

// var postprocessing = { enabled: true, onlyAO: false, radius: 32, aoClamp: 0.25, lumInfluence: 0.7 };

// init();
// animate();

// function init() {

//     container = document.createElement('div');
//     document.body.appendChild(container);

//     renderer = new THREE.WebGLRenderer();
//     renderer.setSize(window.innerWidth, window.innerHeight);
//     document.body.appendChild(renderer.domElement);

//     camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 100, 700);
//     camera.position.z = 500;

//     scene = new THREE.Scene();
//     scene.background = new THREE.Color(0xa0a0a0);

//     group = new THREE.Object3D();
//     scene.add(group);

//     var geometry = new THREE.BoxBufferGeometry(10, 10, 10);
//     for (var i = 0; i < 200; i++) {

//         var material = new THREE.MeshBasicMaterial();
//         material.color.r = Math.random();
//         material.color.g = Math.random();
//         material.color.b = Math.random();

//         var mesh = new THREE.Mesh(geometry, material);
//         mesh.position.x = Math.random() * 400 - 200;
//         mesh.position.y = Math.random() * 400 - 200;
//         mesh.position.z = Math.random() * 400 - 200;
//         mesh.rotation.x = Math.random();
//         mesh.rotation.y = Math.random();
//         mesh.rotation.z = Math.random();

//         mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.random() * 10 + 1;
//         group.add(mesh);

//     }

//     stats = new Stats();
//     container.appendChild(stats.dom);

//     // Init postprocessing
//     initPostprocessing();

//     // Init gui
//     var gui = new dat.GUI();
//     gui.add(postprocessing, 'enabled');

//     gui.add(postprocessing, 'onlyAO', false).onChange(function (value) { ssaoPass.onlyAO = value; });
//     gui.add(postprocessing, 'radius').min(0).max(64).onChange(function (value) { ssaoPass.radius = value; });
//     gui.add(postprocessing, 'aoClamp').min(0).max(1).onChange(function (value) { ssaoPass.aoClamp = value; });
//     gui.add(postprocessing, 'lumInfluence').min(0).max(1).onChange(function (value) { ssaoPass.lumInfluence = value; });

//     window.addEventListener('resize', onWindowResize, false);

//     onWindowResize();

// }


// function onWindowResize() {

//     var width = window.innerWidth;
//     var height = window.innerHeight;

//     camera.aspect = width / height;
//     camera.updateProjectionMatrix();
//     renderer.setSize(width, height);

//     // Resize renderTargets
//     ssaoPass.setSize(width, height);

//     var pixelRatio = renderer.getPixelRatio();
//     var newWidth = Math.floor(width / pixelRatio) || 1;
//     var newHeight = Math.floor(height / pixelRatio) || 1;
//     effectComposer.setSize(newWidth, newHeight);

// }

// function initPostprocessing() {

//     // Setup render pass
//     var renderPass = new THREE.RenderPass(scene, camera);

//     // Setup SSAO pass
//     ssaoPass = new THREE.SSAOPass(scene, camera);
//     ssaoPass.renderToScreen = true;

//     // Add pass to effect composer
//     effectComposer = new THREE.EffectComposer(renderer);
//     effectComposer.addPass(renderPass);
//     effectComposer.addPass(ssaoPass);

// }

// function animate() {

//     requestAnimationFrame(animate);

//     stats.begin();
//     render();
//     stats.end();

// }

// function render() {

//     var timer = performance.now();
//     group.rotation.x = timer * 0.0002;
//     group.rotation.y = timer * 0.0001;

//     if (postprocessing.enabled) {

//         effectComposer.render();

//     } else {

//         renderer.render(scene, camera);

//     }

// }


//////////////////////////

// var camera, scene, renderer;
// var geometry, material, mesh;
 
// init();
// animate();
 
// function init() {
 
//     camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 10 );
//     camera.position.z = 1;
 
//     scene = new THREE.Scene();
 
//     geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
//     material = new THREE.MeshNormalMaterial();
 
//     mesh = new THREE.Mesh( geometry, material );
//     scene.add( mesh );
 
//     renderer = new THREE.WebGLRenderer( { antialias: true } );
//     renderer.setSize( window.innerWidth, window.innerHeight );
//     document.body.appendChild( renderer.domElement );
 
// }
 
// function animate() {
 
//     requestAnimationFrame( animate );
 
//     mesh.rotation.x += 0.01;
//     mesh.rotation.y += 0.02;
 
//     renderer.render( scene, camera );
 
// }



// // import _ from 'lodash';

// // function component() {
// //   var element = document.createElement('div');

// //   element.innerHTML = _.join(['Hello', 'webpack'], ' ');

// //   return element;
// // }

// // document.body.appendChild(component());
