/**
 * @author mrdoob / http://mrdoob.com/
 */
export function Stats(): {
    REVISION: number;
    dom: HTMLDivElement;
    addPanel: (panel: any) => any;
    showPanel: (id: any) => void;
    begin: () => void;
    getFPS: () => any;
    end: () => number;
    update: () => void;
    domElement: HTMLDivElement;
    setMode: (id: any) => void;
};
export namespace Stats {
    function Panel(name: any, fg: any, bg: any): {
        dom: HTMLCanvasElement;
        getVal: () => number;
        update: (value: any, maxValue: any) => void;
    };
}
//# sourceMappingURL=stats.d.ts.map