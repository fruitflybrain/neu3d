import {
    Lut
} from 'three/examples/jsm/math/Lut';

export const datGuiPresets = {
    "preset": "Default",
    "closed": false,
    "remembered": {
        "Low": {
            "0": {
                "neuron3dMode": "0",
                "meshWireframe": true,
                "backgroundColor": "#260226",
                "defaultOpacity": 0.7,
                "synapseOpacity": 1.0,
                "nonHighlightableOpacity": 0.1,
                "lowOpacity": 0.05,
                "pinOpacity": 0.9,
                "pinLowOpacity": 0.1,
                "highlightedObjectOpacity": 1,
                "backgroundOpacity": 0.5,
                "backgroundWireframeOpacity": 0.07,
                "defaultRadius": 0.2,
                "defaultSomaRadius": 0.5,
                'minRadius': 0.1,
                'maxRadius': 10,
                'maxSomaRadius': 3,
                'minSomaRadius': 0.5,
                "defaultSynapseRadius": 0.5,
                "sceneBackgroundColor": '#030305'
            },
            "1": {
                "brightness": 0.95
            },
            "2": {
                "radius": 0.2,
                "strength": 0.2,
                "threshold": 0.3
            },
            "3": {
                "enabled": false
            },
            "4": {
                "enabled": false
            }
        },
        "High": {
            "0": {
                "neuron3d": true,
                "neuron3dMode": "3",
                "meshWireframe": true,
                "backgroundColor": "#260226",
                "defaultOpacity": 0.7,
                "synapseOpacity": 1,
                "nonHighlightableOpacity": 0.1,
                "lowOpacity": 0.1,
                "pinOpacity": 0.9,
                "pinLowOpacity": 0.15,
                "highlightedObjectOpacity": 1,
                "backgroundOpacity": 1,
                "backgroundWireframeOpacity": 0.07,
                "defaultRadius": 0.5,
                "defaultSomaRadius": 3,
                "defaultSynapseRadius": 0.2
            },
            "1": {
                "brightness": 0.95
            },
            "2": {
                "radius": 0.2,
                "strength": 0.2,
                "threshold": 0.3
            },
            "3": {
                "enabled": true
            },
            "4": {
                "enabled": true
            }
        },
        "Default": {
            "0": {
                "neuron3d": true,
                "neuron3dMode": "2",
                "meshWireframe": true,
                "backgroundColor": "#260226",
                "defaultOpacity": 0.7,
                "synapseOpacity": 1,
                "nonHighlightableOpacity": 0.1,
                "lowOpacity": 0.1,
                "pinOpacity": 0.9,
                "pinLowOpacity": 0.15,
                "highlightedObjectOpacity": 1,
                "backgroundOpacity": 1,
                "backgroundWireframeOpacity": 0.07,
                "defaultRadius": 0.5,
                "defaultSomaRadius": 3,
                "defaultSynapseRadius": 0.2
            },
            "1": {
                "brightness": 0.95
            },
            "2": {
                "radius": 0.2,
                "strength": 0.2,
                "threshold": 0.3
            },
            "3": {
                "enabled": true
            },
            "4": {
                "enabled": true
            }
        }
    },
    "folders": {
        "Settings": {
            "preset": "Default",
            "closed": true,
            "folders": {
                "Display Mode": {
                    "preset": "Default",
                    "closed": true,
                    "folders": {}
                },
                "Visualization": {
                    "preset": "Default",
                    "closed": true,
                    "folders": {
                        "Opacity": {
                            "preset": "Default",
                            "closed": true,
                            "folders": {}
                        },
                        "Advanced": {
                            "preset": "Default",
                            "closed": true,
                            "folders": {}
                        }
                    }
                },
                "Size": {
                    "preset": "Default",
                    "closed": true,
                    "folders": {}
                }
            }
        }
    }
}



Lut.prototype.addColorMap('rainbow_gist', [
    [0.000000, '0xff0028'],
    [0.031250, '0xff0100'],
    [0.062500, '0xff2c00'],
    [0.093750, '0xff5700'],
    [0.125000, '0xff8200'],
    [0.156250, '0xffae00'],
    [0.187500, '0xffd900'],
    [0.218750, '0xf9ff00'],
    [0.250000, '0xceff00'],
    [0.281250, '0xa3ff00'],
    [0.312500, '0x78ff00'],
    [0.343750, '0x4dff00'],
    [0.375000, '0x22ff00'],
    [0.406250, '0x00ff08'],
    [0.437500, '0x00ff33'],
    [0.468750, '0x00ff5e'],
    [0.500000, '0x00ff89'],
    [0.531250, '0x00ffb3'],
    [0.562500, '0x00ffde'],
    [0.593750, '0x00f4ff'],
    [0.625000, '0x00c8ff'],
    [0.656250, '0x009dff'],
    [0.687500, '0x0072ff'],
    [0.718750, '0x0047ff'],
    [0.750000, '0x001bff'],
    [0.781250, '0x0f00ff'],
    [0.812500, '0x3a00ff'],
    [0.843750, '0x6600ff'],
    [0.875000, '0x9100ff'],
    [0.906250, '0xbc00ff'],
    [0.937500, '0xe800ff'],
    [0.968750, '0xff00ea'],
    [1.000000, '0xff00bf'],
]);


Lut.prototype.addColorMap('no_purple', [
    [0.000000, '0xFF4000'],
    [0.017544, '0xFF4D00'],
    [0.035088, '0xFF5900'],
    [0.052632, '0xFF6600'],
    [0.070175, '0xFF7300'],
    [0.087719, '0xFF8000'],
    [0.105263, '0xFF8C00'],
    [0.122807, '0xFF9900'],
    [0.140351, '0xFFA600'],
    [0.157895, '0xFFB300'],
    [0.175439, '0xFFBF00'],
    [0.192982, '0xFFCC00'],
    [0.210526, '0xFFD900'],
    [0.228070, '0xFFE500'],
    [0.245614, '0xFFF200'],
    [0.263158, '0xFFFF00'],
    [0.280702, '0xF2FF00'],
    [0.298246, '0xE6FF00'],
    [0.315789, '0xD9FF00'],
    [0.333333, '0xCCFF00'],
    [0.350877, '0xBFFF00'],
    [0.368421, '0xB3FF00'],
    [0.385965, '0xAAFF00'],
    [0.403509, '0x8CFF00'],
    [0.421053, '0x6EFF00'],
    [0.438596, '0x51FF00'],
    [0.456140, '0x33FF00'],
    [0.473684, '0x15FF00'],
    [0.491228, '0x00FF08'],
    [0.508772, '0x00FF26'],
    [0.526316, '0x00FF44'],
    [0.543860, '0x00FF55'],
    [0.561404, '0x00FF62'],
    [0.578947, '0x00FF6F'],
    [0.596491, '0x00FF7B'],
    [0.614035, '0x00FF88'],
    [0.631579, '0x00FF95'],
    [0.649123, '0x00FFA2'],
    [0.666667, '0x00FFAE'],
    [0.684211, '0x00FFBB'],
    [0.701754, '0x00FFC8'],
    [0.719298, '0x00FFD4'],
    [0.736842, '0x00FFE1'],
    [0.754386, '0x00FFEE'],
    [0.771930, '0x00FFFB'],
    [0.789474, '0x00F7FF'],
    [0.807018, '0x00EAFF'],
    [0.824561, '0x00DDFF'],
    [0.842105, '0x00D0FF'],
    [0.859649, '0x00C3FF'],
    [0.877193, '0x00B7FF'],
    [0.894737, '0x00AAFF'],
    [0.912281, '0x009DFF'],
    [0.929825, '0x0091FF'],
    [0.947368, '0x0084FF'],
    [0.964912, '0x0077FF'],
    [0.982456, '0x006AFF'],
    [1.000000, '0x005EFF'],
]);
