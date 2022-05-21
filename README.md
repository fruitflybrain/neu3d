# Neu3D SWC visualization for fruitfly


## Installation
```
npm install
npm run build
```

## Test
Serve a HTML site from root of folder.

If using python3, in project root

```
python -m http.server
```

## Usage
The module can be imported according to ES6 syntax as follows:

```javascript
import { Neu3D } from 'neu3d';
```

Instantiate the visualization object by passing a `HTMLDivElement` with class `vis-3d` to it along with other optional configurations:

```javascript
var ffbomesh = new Neu3D(
    parentDiv,  // parent div object with class `vis-3d`
    undefined,  // optionally add initalization JSON data
    { "globalCenter": { 'x': 0, 'y': -250, 'z': 0 } },  // optional metadata
    false);  // display stats panel on top left

window.ffbomesh = ffbomesh; // exposing to global namespace if desired

$.getJSON("./data/data.json", (json) => {
    ffbomesh.addJson({
        ffbo_json: json,
        showAfterLoadAll: true
    });
});
```

## Consumption Example

1. Global
    The class `Neu3D` is available if script is loaded as script tag. See `index.html`.
2. ES6
    See [Usage](#usage) section.
3. TypeScript
   `import Neu3D = require('neu3d');`

## Expected Formats

There are two ways to visualize: upload a file, or call `ffbomesh.addJson` with a json.

neu3D takes files of the following format:

**Mesh**:

A json file with the following dict items [example](https://cdn.rawgit.com/fruitflybrain/ffbo.lib/master/mesh/al_l.json)

- `vertices`: a list of flattened coordinates with `x`, `y`, `z` of each vertex appearing consecutively.
- `faces`: a list of integers, every 3 of them indicates the ids of three vertices that form the face. The first vertex is 0.

**Neuron**:

An SWC file with columns in the following order [example1](https://cdn.rawgit.com/fruitflybrain/neu3d/master/data/hemibrain_neuron.swc) [example2](https://cdn.rawgit.com/fruitflybrain/neu3d/master/data/larva_neuron.swc):

- `sample`: sample ID of the node
- `identifier`: type of the node, 0: unspecified, 1: soma
- `x`: x coordinate of the node position
- `y`: y coordinate of the node position
- `z`: z coordinate of the node position
- `r` or `radius`: width of the node
- `parent`: sample ID of the parent node

In addition to SWC files, a neuron mesh in GLTF format, with '.gltf' extension, can also be visualized [example](https://cdn.rawgit.com/fruitflybrain/neu3d/master/data/hemibrain_neuron.gltf).

**Synapse**:

A `.syn` file defined as a csv file with the columns in the following order [example](https://cdn.rawgit.com/fruitflybrain/neu3d/master/data/synapses.swc):

- `pre_x`: x coordinate of the presynaptic site,
- `pre_y`: y coordinate of the presynaptic site,
- `pre_z`: z coordinate of the presynaptic site,
- `pre_r`: radius of presynaptic site,
- `post_x`: x coordinate of the postsynaptic site,
- `post_y`: y coordinate of the postsynaptic site,
- `post_z`: z coordinate of the postsynaptic site,
- `post_r`: radius of the postsynaptic site.

The last four columns are optional.

To call `ffbomesh.addJson`, the json input should be of the following format:

**Mesh**: a dict with the following fields:

- vertices: a list of flattened coordinates with `x`, `y`, `z` of each vertex appearing consecutively.
- faces: a list of integers, every 3 of them indicates the ids of three vertices that form the face. The first vertex is 0.

**Neuron**: a dict with the following fields:

- `sample`: sample ID of the node
- `identifier`: type of the node, 0: unspecified, 1: soma
- `x`: x coordinate of the node position
- `y`: y coordinate of the node position
- `z`: z coordinate of the node position
- `r` or `radius`: width of the node
- `parent`: sample ID of the parent node

**Synapse**: a dict with the following fields:

- `sample`: list of unique integers
- `identifier`: a list of same length as sample (not used).
- `x`: a list of x coordinates, with the first half for presynaptic sites and the second half for postsynaptic sites.
- `y`: a list of y coordinates, with the first half for presynaptic sites and the second half for postsynaptic sites.
- `z`: a list of z coordinates, with the first half for presynaptic sites and the second half for postsynaptic sites.
- `r` or `radius`: a list of radius, with the first half for presynaptic sites and the second half for postsynaptic sites.
- `parent`: a list of integers: -1 for the first half (presynaptic sites), and for the second half, the sample ID of their presynaptic site.

## Authors

This library is developed and maintained by:

* [Tingkai Liu]()
* [Mehmet Turkcan]()
* [Nikul Ukani]()
* [Chung-Heng Yeh]()

## Acknowledgements

A part of this library is inspired by the [Sharkviewer](https://github.com/JaneliaSciComp/SharkViewer) project, developed at the Janelia Research Campus.
