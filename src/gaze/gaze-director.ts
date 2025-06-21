import { Asset, Color, Mat4, math, Vec2, Vec3 } from 'playcanvas';

import { EditHistory } from 'src/edit-history';
import { ElementType } from 'src/element';
import { Events } from 'src/events';
import { Scene } from 'src/scene';

import { GazeTracker } from './gaze-tracker';
import { ScenePlayer } from './scene-player';
import { SceneSequencer } from './scene-sequencer';
import { Stimulus } from './stimulus';
import { StimulusRenderer } from './stimulus-renderer';
import { Target } from './target';
import { TargetRenderer } from './target-renderer';
import { CalibrationScreen } from './ui/calibration-screen';

// values from Bailey et al. 2009 & Rayner 1975
export const FOVEAL_VISUAL_ANGLE = 3.8; // [degrees]
export const STIMULUS_VISUAL_ANGLE = 0.76; // [degrees]
export const STMULUS_INTENSITY = 0.095; // [0-1]
export const STIMULUS_FREQUENCY = 10.0; // [Hz]
export const STIMULUS_DURATION = 10.0; // [seconds]

// value from WebgazerJS
export const TRACKING_ERROR = 4.17; // [degrees]

export const STIMULUS_HARDNESS = 0.2; // [0-1]
export const SUPPRESSION_LAG = 30; // [native frames]
export const SUPPRESSION_ANGLE = 10; // [degrees]
export const SUPPRESSION_RADIUS = 256; // [px]

export const VIEWING_DISTANCE = 75; // [cm]
export const SCREEN_WIDTH_METRIC = 30; // [cm]

class AddStimulusOp {
    name: 'addStimulus';
    scene: Scene;
    stimulus: Stimulus;

    constructor(scene: Scene, stimulus: Stimulus) {
        this.scene = scene;
        this.stimulus = stimulus;
    }

    do() {
        this.scene.add(this.stimulus);
    }

    undo() {
        this.scene.remove(this.stimulus);
    }

    destroy() {
        this.stimulus.destroy();
    }
}

class AddTargetOp {
    name: 'addTarget';
    scene: Scene;
    target: Target;

    constructor(scene: Scene, target: Target) {
        this.scene = scene;
        this.target = target;
    }

    do() {
        this.scene.add(this.target);
    }

    undo() {
        this.scene.remove(this.target);
    }

    destroy() {
        this.target.destroy();
    }
}

class GazeDirector {
    stimulusRenderer: StimulusRenderer;
    targetRenderer: TargetRenderer;
    calibrationScreen: CalibrationScreen;
    gazeTracker: GazeTracker;
    scenePlayer: ScenePlayer;
    sceneSequencer: SceneSequencer;

    static screenWidthMetric: number = SCREEN_WIDTH_METRIC; // [cm]
    static viewingDistance: number = VIEWING_DISTANCE; // [cm]
    static suppressionVisualAngle: number =
        FOVEAL_VISUAL_ANGLE + 0.5 * TRACKING_ERROR; // [degrees]
    static trackingError: number = 0; // [px]

    constructor(scene: Scene, events: Events, editHistory: EditHistory) {
        this.stimulusRenderer = new StimulusRenderer(scene, events);
        this.targetRenderer = new TargetRenderer(scene, events);
        this.calibrationScreen = new CalibrationScreen(scene, events);
        this.gazeTracker = new GazeTracker(scene, events);
        this.scenePlayer = new ScenePlayer(scene, events);
        this.sceneSequencer = new SceneSequencer(scene, events);

        events.on(
            'gaze.addStimulus',
            (
                position: Vec3,
                radius: number,
                duration: number,
                startFrame: number,
                intensity: number,
                frequency: number,
                hardness: number
            ) => {
                const stimulus = new Stimulus(
                    position,
                    radius,
                    duration,
                    startFrame,
                    intensity,
                    frequency,
                    hardness
                );
                editHistory.add(new AddStimulusOp(scene, stimulus));

                Stimulus.defaultVisualAngle = radius;
                Stimulus.defaultFrequency = frequency;
                Stimulus.defaultDuration = duration;
                Stimulus.defaultHardness = hardness;
                Stimulus.defaultIntensity = intensity;
            }
        );

        events.on(
            'gaze.addTarget',
            (
                position: Vec3 = new Vec3(0, 0, 0),
                radius: number = 1.0,
                duration: number = 10,
                startFrame: number = 0,
                opacity: number = 1.0,
                lightPosition: Vec3 = new Vec3(0, 0, 0),
                specularFactor: number = 10.0,
                color: Color = new Color(1, 1, 1, 1)
            ) => {
                const target = new Target(
                    scene,
                    events,
                    position,
                    radius,
                    duration,
                    startFrame,
                    opacity,
                    lightPosition,
                    specularFactor,
                    color
                );
                editHistory.add(new AddTargetOp(scene, target));
            }
        );

        events.on('gaze.getCurrentCameraTransform', () => {
            this.getCurrentCameraTransform(scene);
        });

        events.on('gaze.loadCameraData', (cameraData) => {
            this.loadCameraData(scene, cameraData);
        });

        events.on(
            'gaze.setDeviceParams',
            (distance: number, screenWidthMetric: number) => this.setDeviceParams(distance, screenWidthMetric)
        );

        events.function('gaze.allStimuli', () => {
            return scene.getElementsByType(ElementType.gaze_stimulus);
        });

        events.function('gaze.allTargets', () => {
            return scene.getElementsByType(ElementType.gaze_target);
        });

        this.setDeviceParams();

        // add debug stimulus for suppression region visualization
        // events.fire(
        //     'gaze.addStimulus',
        //     new Vec3(0, 0, 0),
        //     GazeDirector.suppressionVisualAngle,
        //     STIMULUS_DURATION,
        //     0,
        //     STMULUS_INTENSITY,
        //     STIMULUS_FREQUENCY,
        //     1.0
        // );
    }

    setDeviceParams(
        distance: number = VIEWING_DISTANCE,
        screenWidthMetric: number = SCREEN_WIDTH_METRIC
    ): void {
        GazeDirector.viewingDistance = distance;
        GazeDirector.screenWidthMetric = screenWidthMetric;

        GazeDirector.trackingError = visualAngleToRadius(
            TRACKING_ERROR,
            distance,
            screenWidthMetric,
            1.0,
            true
        );

        Stimulus.suppressionRadius = visualAngleToRadius(
            GazeDirector.suppressionVisualAngle,
            distance,
            screenWidthMetric,
            1.0,
            true
        );
    }

    // adapted from 'loadCameraPoses' in '/src/file-handler.ts'
    loadCameraData(scene: Scene, cameraData: any) {
        const fovs: Vec2[] = [];
        console.log('Loading camera data:', cameraData);
        for (let i = 0; i < cameraData.frames.length; i++) {
            const frame = cameraData.frames[i];
            const m = frame.transform_matrix;

            const centerPosition = new Vec3(m[0][3], m[1][3], m[2][3]);
            const targetPosition = new Vec3(m[0][2], m[1][2], m[2][2]);

            const viewDirection = targetPosition
            .mulScalar(-1)
            .add(centerPosition);

            scene.events.fire('camera.addPose', {
                name: i,
                frame: i,
                position: new Vec3(
                    -centerPosition.x,
                    -centerPosition.y,
                    centerPosition.z
                ),
                target: new Vec3(
                    -viewDirection.x,
                    -viewDirection.y,
                    viewDirection.z
                )
            });

            const focalLength: Vec2 = new Vec2(frame.fl_x, frame.fl_y);
            const dimensions: Vec2 = new Vec2(frame.w, frame.h);
            const fieldOfViewHorizontal =
                2 *
                Math.atan(dimensions.x / (2 * focalLength.x)) *
                math.RAD_TO_DEG;
            const fieldOfViewVertical =
                2 *
                Math.atan(dimensions.y / (2 * focalLength.y)) *
                math.RAD_TO_DEG;
            const fieldOfView: Vec2 = new Vec2(
                fieldOfViewHorizontal,
                fieldOfViewVertical
            );
            fovs.push(fieldOfView);
        }

        const avgFov = fovs
        .reduce((acc, fov) => acc.add(fov), new Vec2(0, 0))
        .divScalar(fovs.length);
        console.log('Average FOV:', avgFov);
        scene.events.fire('camera.setFov', avgFov.x);
    }

    getCurrentCameraTransform(scene: Scene) {
        const position: Vec3 = scene.camera.entity.getPosition();
        const target: Vec3 = scene.camera.entity.getEulerAngles();
        console.log('Current camera position:', position);
        console.log('Current camera target:', target);
        return { position, target };
    }
}

function visualAngleToRadius(
    visualAngle: number,
    viewingDistance: number = GazeDirector.viewingDistance,
    screenWidthMetric: number = GazeDirector.screenWidthMetric,
    pixelRatio: number = 1.0,
    log: boolean = false
): number {
    const visualAngleRad = (visualAngle * Math.PI) / 180;
    const diameter = 2 * viewingDistance * Math.tan(visualAngleRad / 2);
    const radius = diameter / 2;

    const pxPerCm = pixelRatio * (screen.width / screenWidthMetric);
    const radiusPx = Math.ceil(radius * pxPerCm);

    if (log) {
        console.log(
            'Converted visual angle',
            visualAngle,
            'deg to screen space:',
            radius,
            'cm ~',
            radiusPx,
            'px'
        );
    }

    return radiusPx;
}

export { GazeDirector, visualAngleToRadius };
