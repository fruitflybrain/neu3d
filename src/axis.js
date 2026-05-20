import {
    Neu3D
} from './neu3d';
import {
    ArrowHelper,
    Vector3,
    Object3D,
    Mesh,
    MeshBasicMaterial
} from 'three';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import helvetikerBold from 'three/examples/fonts/helvetiker_bold.typeface.json';

/**
 * Add a coordinate-axis indicator (3 colored arrows + Anterior/Dorsal/Right
 * text labels) to scenes.back, anchored to the lower-left of the viewport
 * regardless of camera movement. Ports the old FFBOMesh3D.addCoordinateAxis +
 * addAxisLabels logic plus the per-frame placement code mesh3d ran inside
 * its render() method.
 *
 * Returns true if the indicator was added, false if the required axis
 * settings (anteriorAxis / dorsalAxis / rightHemisphereAxis) aren't set on
 * this.settings.
 */
Neu3D.prototype.addAxisIndicator = function () {
    const settings = this.settings;
    if (!settings.anteriorAxis || !settings.dorsalAxis || !settings.rightHemisphereAxis) {
        return false;
    }
    const colorX = 0xff5555;  // anterior  (red)
    const colorY = 0x55ff55;  // dorsal    (green)
    const colorZ = 0x5599ff;  // right     (blue)
    const nearPlaneHeight = Math.tan(Math.PI * this.fov / 2 / 180) * 0.1;
    const arrowLength = 0.25 * nearPlaneHeight;
    const origin = new Vector3(...settings.axisOrigin);

    const axisGroup = new Object3D();
    const makeArrow = (axisVec, color) => {
        const dir = new Vector3(...axisVec).normalize();
        return new ArrowHelper(dir, origin, arrowLength, color, 0.5 * arrowLength);
    };
    axisGroup.add(makeArrow(settings.anteriorAxis, colorX));
    axisGroup.add(makeArrow(settings.dorsalAxis, colorY));
    axisGroup.add(makeArrow(settings.rightHemisphereAxis, colorZ));

    const labels = new Object3D();
    const labelShift = 1.2 * arrowLength;
    // mesh3d's original formula was `axisVec * labelShift + axisOrigin`, but
    // that only worked because mesh3d's config had axisOrigin=[0,0,0]. With a
    // non-zero axisOrigin large relative to labelShift, the labels jump off
    // the arrow tips. Drop the axisOrigin term so each label sits ~20% past
    // its arrow tip along its axis.
    const positionFor = (axisVec) => axisVec.map((v) => v * labelShift);
    const font = new Font(helvetikerBold);
    const makeLabel = (text, axisVec, color) => {
        const geo = new TextGeometry(text, { font, size: 0.2 * arrowLength, depth: 0.05 * arrowLength });
        // MeshBasicMaterial (vs MeshStandardMaterial) so the labels don't
        // depend on lighting — scenes.back has only a faint ambient light,
        // which would render standard-material text nearly black.
        const mesh = new Mesh(geo, new MeshBasicMaterial({ color }));
        mesh.position.set(...positionFor(axisVec));
        return mesh;
    };
    labels.add(makeLabel('Anterior', settings.anteriorAxis, colorX));
    labels.add(makeLabel('Dorsal', settings.dorsalAxis, colorY));
    labels.add(makeLabel('Right', settings.rightHemisphereAxis, colorZ));

    this.scenes.back.add(axisGroup);
    this.scenes.back.add(labels);

    // Pin the axis to the lower-left of the viewport every frame by computing
    // a camera-local offset and converting to world coords; billboard the
    // labels toward the camera. This mirrors what mesh3d did inline inside
    // its render() method.
    const axisOriginVec = new Vector3(...settings.axisOrigin);
    const localPlacement = new Vector3();
    const worldPlacement = new Vector3();
    const camera = this.camera;
    const updateAxisPlacement = () => {
        // TrackballControls writes to camera.position directly without flushing
        // the camera's world matrix; if we read stale matrixWorld via
        // localToWorld() the axis lags one frame behind the camera and visibly
        // shakes during rotation. Force-update the matrix to the current state.
        camera.updateMatrixWorld(true);
        localPlacement.set(
            -1.3 * camera.aspect * nearPlaneHeight,
            -1.2 * nearPlaneHeight,
            -0.15
        );
        worldPlacement.copy(localPlacement);
        camera.localToWorld(worldPlacement);
        axisGroup.position.copy(worldPlacement).addScaledVector(axisOriginVec, -1);
        labels.position.copy(worldPlacement);
        for (const child of labels.children) child.quaternion.copy(camera.quaternion);
    };
    const _origRender = this.render.bind(this);
    this.render = function (...args) {
        updateAxisPlacement();
        return _origRender(...args);
    };
    return true;
};

/**
 * Replace `camera.up` with its component perpendicular to the eye direction
 * every frame, before TrackballControls.update() runs. This is visually a
 * no-op for camera orientation (three.js's lookAt() and the trackball
 * rotation logic both compute right = forward × up internally, so only the
 * perpendicular component of up ever influences orientation), but it fixes
 * the TrackballControls vertical-pan zoom-drift that happens when the
 * configured upVector has a component along the view direction.
 *
 * Call once after construction. Idempotent -- only patches once per
 * controls instance.
 */
Neu3D.prototype.enableOrthogonalTrackballUp = function () {
    const controls = this.controls;
    if (!controls || controls._neu3dOrthogonalUpPatched) return;
    controls._neu3dOrthogonalUpPatched = true;
    const camera = controls.object;
    const eye = new Vector3();
    const right = new Vector3();
    const _origUpdate = controls.update.bind(controls);
    controls.update = function () {
        eye.subVectors(camera.position, controls.target);
        if (eye.lengthSq() > 0) {
            right.crossVectors(eye, camera.up);
            if (right.lengthSq() > 0) {
                camera.up.crossVectors(right, eye).normalize();
            }
        }
        return _origUpdate();
    };
};

export {
    Neu3D
};
