// usage: node convert_swc_to_obj.js input.swc output.obj

import fs from 'fs';
import { JSDOM } from 'jsdom';
import { NeuronSkeleton } from './render.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { Color, Vector2 } from 'three';

// Setup fake DOM for Three.js
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;

Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
  enumerable: true,
  writable: true
});


// Monkey patch performance
global.performance = { now: () => Date.now() };

// Parse command-line arguments
const [swcPath, outPath] = process.argv.slice(2);
if (!swcPath || !outPath) {
    console.error('Usage: node convert_swc_to_obj.js input.swc output.obj');
    process.exit(1);
}

// Load SWC file
const swcData = fs.readFileSync(swcPath, 'utf8');

// Construct NeuronSkeleton and render object
const neuron = new NeuronSkeleton(swcData, 'swc');
neuron.createObject(new Color(0x00ff00), false, {
    neuron3dMode: 6,
    defaultRadius: 0.2,
    minRadius: 0.1,
    maxRadius: 10,
    defaultSomaRadius: 0.5,
    minSomaRadius: 0.5,
    maxSomaRadius: 3,
    defaultOpacity: 1.0,
    backgroundOpacity: 0.5,
    backgroundWireframeOpacity: 0.1
}, new Vector2(1024, 768));

// Export using OBJExporter
const exporter = new OBJExporter();
const objString = exporter.parse(neuron.threeObj);

// Save to output path
fs.writeFileSync(outPath, objString);
console.log(`Exported OBJ to ${outPath}`);

