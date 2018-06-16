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
import Neu3D from 'neu3d';
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

## Authors

This library is developed and maintained by:

* [Tingkai Liu]()
* [Mehmet Turkcan]()
* [Nikul Ukani]()
* [Chung-Heng Yeh]()

## Acknowledgements

A part of this library is inspired by the [Sharkviewer](https://github.com/JaneliaSciComp/SharkViewer) project, developed at the Janelia Research Campus.
