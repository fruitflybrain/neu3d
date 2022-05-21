export namespace datGuiPresets {
    const preset: string;
    const closed: boolean;
    namespace remembered {
        const Low: {
            "0": {
                neuron3dMode: string;
                meshWireframe: boolean;
                backgroundColor: string;
                defaultOpacity: number;
                synapseOpacity: number;
                nonHighlightableOpacity: number;
                lowOpacity: number;
                pinOpacity: number;
                pinLowOpacity: number;
                highlightedObjectOpacity: number;
                backgroundOpacity: number;
                backgroundWireframeOpacity: number;
                defaultRadius: number;
                defaultSomaRadius: number;
                minRadius: number;
                maxRadius: number;
                maxSomaRadius: number;
                minSomaRadius: number;
                defaultSynapseRadius: number;
                sceneBackgroundColor: string;
            };
            "1": {
                brightness: number;
            };
            "2": {
                radius: number;
                strength: number;
                threshold: number;
            };
            "3": {
                enabled: boolean;
            };
            "4": {
                enabled: boolean;
            };
        };
        const High: {
            "0": {
                neuron3d: boolean;
                neuron3dMode: string;
                meshWireframe: boolean;
                backgroundColor: string;
                defaultOpacity: number;
                synapseOpacity: number;
                nonHighlightableOpacity: number;
                lowOpacity: number;
                pinOpacity: number;
                pinLowOpacity: number;
                highlightedObjectOpacity: number;
                backgroundOpacity: number;
                backgroundWireframeOpacity: number;
                defaultRadius: number;
                defaultSomaRadius: number;
                defaultSynapseRadius: number;
            };
            "1": {
                brightness: number;
            };
            "2": {
                radius: number;
                strength: number;
                threshold: number;
            };
            "3": {
                enabled: boolean;
            };
            "4": {
                enabled: boolean;
            };
        };
        const Default: {
            "0": {
                neuron3d: boolean;
                neuron3dMode: string;
                meshWireframe: boolean;
                backgroundColor: string;
                defaultOpacity: number;
                synapseOpacity: number;
                nonHighlightableOpacity: number;
                lowOpacity: number;
                pinOpacity: number;
                pinLowOpacity: number;
                highlightedObjectOpacity: number;
                backgroundOpacity: number;
                backgroundWireframeOpacity: number;
                defaultRadius: number;
                defaultSomaRadius: number;
                defaultSynapseRadius: number;
            };
            "1": {
                brightness: number;
            };
            "2": {
                radius: number;
                strength: number;
                threshold: number;
            };
            "3": {
                enabled: boolean;
            };
            "4": {
                enabled: boolean;
            };
        };
    }
    namespace folders {
        namespace Settings {
            const preset_1: string;
            export { preset_1 as preset };
            const closed_1: boolean;
            export { closed_1 as closed };
            const folders_1: {
                "Display Mode": {
                    preset: string;
                    closed: boolean;
                    folders: {};
                };
                Visualization: {
                    preset: string;
                    closed: boolean;
                    folders: {
                        Opacity: {
                            preset: string;
                            closed: boolean;
                            folders: {};
                        };
                        Advanced: {
                            preset: string;
                            closed: boolean;
                            folders: {};
                        };
                    };
                };
                Size: {
                    preset: string;
                    closed: boolean;
                    folders: {};
                };
            };
            export { folders_1 as folders };
        }
    }
}
//# sourceMappingURL=presets.d.ts.map