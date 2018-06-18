// Type definitions for mesh3D
// Project:mesh3D
// Definitions by: Tingkai Liu

declare module 'neu3d' {
    class Neu3D {
        constructor(container: HTMLDivElement, data?: object, metadata?: object, stats?: boolean);
        container: HTMLDivElement;
        meshDict: any; // should be PropertyManager;
        uiVars: any; // should be PropertyManager;
        settings: any; // should be PropertyManager;
        _take_screenshot: boolean;
        backrenderSSAO: any; // should be THREE.SSAOPass;

        on(key: string, func: () => {}): void;
        addJson(json: object): Promise<void>;
        execCommand(json: any): void;
        createUIBtn(name: string, icon: string, tooltip: string, func?: any): void;

        reset(resetBackground?: boolean): void;
        resetView(): void;
        resetVisibleView(): void;

        import_state(state_metadata: object): void;
        export_state(): object;
        import_settings(settings: object): void;
        export_settings(): object;
        onWindowResize(): void;


        setColor(id: string, color: any): void;
        highlight(d?: any, updatePos?: boolean): void;

        toggleVis(key: string): void;
        togglePin(d: string | object): void;

        unpin(id: string): void;
        unpinAll(): void;

        getPinned(): Array<any>;

        select(id: string): void;
        showFrontAll(): void;
        hideFrontAll(): void;
        showBackAll(): void;
        hideBackAll(): void;

        hideAll(): void;
        showAll(): void;
    }

    export default Neu3D;
}
