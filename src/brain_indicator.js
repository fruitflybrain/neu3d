import { Neu3D } from './neu3d';
import {
    Scene,
    PerspectiveCamera,
    AmbientLight,
    DirectionalLight,
    MeshStandardMaterial,
    Mesh,
    MeshBasicMaterial,
    LineBasicMaterial,
    BoxGeometry,
    EdgesGeometry,
    LineSegments,
    ArrowHelper,
    Object3D,
    Box3,
    Vector3,
    Vector4,
    Color
} from 'three';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import helvetikerBold from 'three/examples/fonts/helvetiker_bold.typeface.json';

/**
 * Mini whole-brain viewport gizmo. A small inset in the lower-left corner
 * of the canvas that:
 *   - Loads a precomputed combined-brain gltf mesh (provided via meshUrl).
 *   - Stays a fixed pixel size regardless of main-canvas dimensions.
 *   - Tracks the main camera's rotation so the brain orientation in the
 *     inset matches the main scene.
 *   - Anterior/Dorsal/Right axis arrows centered at the brain (taking the
 *     axis vectors from this.settings, same source as addAxisIndicator).
 *   - A world-axis-aligned wireframe box centered on this.controls.target,
 *     sized to the main camera's view extent at that distance -- shows
 *     where the main view is looking + how zoomed it is.
 *
 * The brain mesh uses the same color + opacity as the main scene's
 * neuropils (this.settings.backgroundColor / backgroundOpacity) so the
 * inset reads as a faded version of the same surface.
 *
 * Idempotent: re-calling with a different meshUrl strips the previous
 * inset before installing a new one. Pass `null` / `undefined` to remove
 * the indicator entirely.
 */
Neu3D.prototype.addBrainIndicator = function (options = {}) {
    const meshUrl = options.meshUrl;
    const size = options.size || 200;
    const padding = options.padding ?? 10;
    const showAxis = options.showAxis ?? true;
    const showViewBox = options.showViewBox ?? true;

    // Idempotent cleanup of any previous indicator.
    if (this._brainIndicator) {
        if (this._brainIndicator.originalRender) {
            this.render = this._brainIndicator.originalRender;
        }
        this._brainIndicator.disposed = true;
        this._brainIndicator = null;
    }

    if (!meshUrl) {
        // No URL = caller wants the indicator removed. Already cleaned up above.
        return false;
    }

    const insetScene = new Scene();
    insetScene.background = null; // transparent over main render

    // Match the lighting rig from neu3d's main scene closely enough that
    // MeshStandardMaterial reads identically to the main neuropils.
    insetScene.add(new AmbientLight(0xffffff, 0.7));
    const directional = new DirectionalLight(0xffffff, 0.6);
    directional.position.set(1, 1, 1);
    insetScene.add(directional);

    const insetCamera = new PerspectiveCamera(this.fov, 1, 0.1, 1e6);
    insetScene.add(insetCamera);

    // World-axis-aligned wireframe box. Recomputed each frame to track the
    // main camera's target position and frustum extent at that depth.
    let viewBox = null;
    if (showViewBox) {
        const boxMat = new LineBasicMaterial({
            color: 0xffaa33,
            transparent: true,
            opacity: 0.9,
            depthTest: false
        });
        const boxGeo = new EdgesGeometry(new BoxGeometry(1, 1, 1));
        viewBox = new LineSegments(boxGeo, boxMat);
        viewBox.renderOrder = 10;
        insetScene.add(viewBox);
    }

    // Axis arrows + labels centered at the brain (sized to brain radius once
    // the mesh has loaded). Use the same vectors as addAxisIndicator so the
    // orientation matches the main scene's axis hud.
    const axisGroup = new Object3D();
    let axisLabels = null;
    if (showAxis) {
        insetScene.add(axisGroup);
        axisLabels = new Object3D();
        insetScene.add(axisLabels);
    }

    const state = {
        meshUrl,
        size,
        padding,
        insetScene,
        insetCamera,
        viewBox,
        axisGroup,
        axisLabels,
        brainMesh: null,
        // Materials of the loaded gltf, captured so the
        // backgroundColor-change listener can recolor them live.
        brainMaterials: [],
        brainCenter: new Vector3(),
        brainRadius: 1,
        ready: false,
        disposed: false,
        originalRender: this.render.bind(this)
    };
    this._brainIndicator = state;

    // PropertyManager has no .off() so we can't unsubscribe; the closure
    // checks state.disposed (flipped by the idempotent-cleanup block at
    // the top of this function) and bails out for stale subscriptions.
    this.settings.on(
        'change',
        () => {
            if (state.disposed || state.brainMaterials.length === 0) {
                return;
            }
            const c = new Color(this.settings.backgroundColor || 0x500250);
            const e = c.clone().multiplyScalar(0.8);
            for (const mat of state.brainMaterials) {
                mat.color.copy(c);
                mat.emissive.copy(e);
            }
        },
        'backgroundColor'
    );

    const buildAxis = () => {
        if (!showAxis) {
            return;
        }
        const s = this.settings;
        if (!s.anteriorAxis || !s.dorsalAxis || !s.rightHemisphereAxis) {
            return;
        }
        // Wipe previous arrows / labels (e.g. on idempotent re-init).
        while (axisGroup.children.length) {
            axisGroup.remove(axisGroup.children[0]);
        }
        while (axisLabels.children.length) {
            axisLabels.remove(axisLabels.children[0]);
        }
        const colorX = 0xff5555;
        const colorY = 0x55ff55;
        const colorZ = 0x5599ff;
        const arrowLength = 0.9 * state.brainRadius;
        const headSize = 0.18 * arrowLength;
        const makeArrow = (axisVec, color) => {
            const dir = new Vector3(...axisVec).normalize();
            return new ArrowHelper(
                dir,
                state.brainCenter,
                arrowLength,
                color,
                headSize,
                0.5 * headSize
            );
        };
        axisGroup.add(makeArrow(s.anteriorAxis, colorX));
        axisGroup.add(makeArrow(s.dorsalAxis, colorY));
        axisGroup.add(makeArrow(s.rightHemisphereAxis, colorZ));
        const labelShift = 1.18 * arrowLength;
        const font = new Font(helvetikerBold);
        const makeLabel = (text, axisVec, color) => {
            const geo = new TextGeometry(text, {
                font,
                size: 0.14 * arrowLength,
                depth: 0.03 * arrowLength
            });
            const mesh = new Mesh(geo, new MeshBasicMaterial({ color }));
            const offset = new Vector3(...axisVec).multiplyScalar(labelShift);
            mesh.position.copy(state.brainCenter).add(offset);
            return mesh;
        };
        axisLabels.add(makeLabel('Anterior', s.anteriorAxis, colorX));
        axisLabels.add(makeLabel('Dorsal', s.dorsalAxis, colorY));
        axisLabels.add(makeLabel('Right', s.rightHemisphereAxis, colorZ));
    };

    const loader = this._getSharedGLTFLoader();
    loader.load(
        meshUrl,
        gltf => {
            if (state.disposed) {
                return;
            }
            const brain = gltf.scene;
            // Brighter than the main neuropils: bump opacity by ~40 % and add a
            // small emissive so the mini brain reads clearly against the dark
            // canvas without losing the dataset's color identity. Cap at fully
            // opaque so the cap on dim-color datasets doesn't blow out.
            const baseColor = new Color(this.settings.backgroundColor || 0x500250);
            const baseOpacity = this.settings.backgroundOpacity ?? 0.5;
            const opacity = Math.min(1, baseOpacity * 1.8);
            const emissive = baseColor.clone().multiplyScalar(0.8);
            brain.traverse(child => {
                if (child.isMesh) {
                    const mat = new MeshStandardMaterial({
                        color: baseColor,
                        emissive,
                        opacity,
                        transparent: opacity < 1,
                        roughness: 1.0,
                        metalness: 0.0,
                        depthWrite: opacity >= 1
                    });
                    child.material = mat;
                    state.brainMaterials.push(mat);
                }
            });
            const box = new Box3().setFromObject(brain);
            box.getCenter(state.brainCenter);
            state.brainRadius = box.getSize(new Vector3()).length() / 2 || 1;
            insetScene.add(brain);
            state.brainMesh = brain;
            buildAxis();
            state.ready = true;
        },
        undefined,
        err => {
            console.warn(
                `[Neu3D] addBrainIndicator: failed to load mesh ${meshUrl}`,
                err
            );
        }
    );

    // Wrap render so the inset pass runs after the main composer pass. The
    // inset camera orbits the brain at a fixed distance, oriented to match
    // the main camera; the view box tracks controls.target with a size that
    // approximates what the main camera frames at that depth.
    const renderer = this.renderer;
    const tmpDir = new Vector3();
    const tmpViewport = new Vector4();
    const tmpScissor = new Vector4();
    const tmpBoxSize = new Vector3();
    this.render = function (...args) {
        state.originalRender(...args);
        if (state.disposed || !state.ready) {
            return;
        }

        tmpDir
            .subVectors(this.camera.position, this.controls.target)
            .normalize();
        const distance =
            (state.brainRadius / Math.tan((Math.PI * this.fov) / 360)) * 1.2;
        insetCamera.position
            .copy(state.brainCenter)
            .addScaledVector(tmpDir, distance);
        insetCamera.up.copy(this.camera.up);
        insetCamera.lookAt(state.brainCenter);
        insetCamera.fov = this.fov;
        insetCamera.aspect = 1;
        insetCamera.updateProjectionMatrix();

        // View box: world-axis-aligned cube around controls.target. Size based
        // on the main camera's vertical fov at the eye-to-target distance --
        // a rough but intuitive proxy for "the region the main camera is
        // currently framing".
        if (viewBox) {
            const eyeDist = this.camera.position.distanceTo(
                this.controls.target
            );
            const half =
                eyeDist * Math.tan((Math.PI * this.fov) / 360);
            tmpBoxSize.set(2 * half, 2 * half, 2 * half);
            viewBox.position.copy(this.controls.target);
            viewBox.scale.copy(tmpBoxSize);
            // Rotation: identity (world-axis-aligned).
            viewBox.quaternion.identity();
        }

        // Billboard the axis labels so they always face the inset camera --
        // matches the addAxisIndicator behavior in axis.js.
        if (state.axisLabels) {
            const q = insetCamera.quaternion;
            for (const child of state.axisLabels.children) {
                child.quaternion.copy(q);
            }
        }

        renderer.getViewport(tmpViewport);
        renderer.getScissor(tmpScissor);
        const prevAutoClear = renderer.autoClear;
        const prevScissorTest = renderer.getScissorTest();

        renderer.autoClear = false;
        renderer.setScissor(state.padding, state.padding, state.size, state.size);
        renderer.setViewport(state.padding, state.padding, state.size, state.size);
        renderer.setScissorTest(true);
        renderer.clearDepth();
        renderer.render(insetScene, insetCamera);

        renderer.setScissorTest(prevScissorTest);
        renderer.setViewport(tmpViewport.x, tmpViewport.y, tmpViewport.z, tmpViewport.w);
        renderer.setScissor(tmpScissor.x, tmpScissor.y, tmpScissor.z, tmpScissor.w);
        renderer.autoClear = prevAutoClear;
    };

    return true;
};
