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
export const STIMULUS_VISUAL_ANGLE = 0.25; // [degrees]
export const STMULUS_INTENSITY = 0.095; // [0-1]
export const STIMULUS_FREQUENCY = 10.0; // [Hz]
export const STIMULUS_DURATION = 10.0; // [seconds]

// value from WebgazerJS
export const TRACKING_ERROR = 4.17; // [degrees]

export const STIMULUS_HARDNESS = 0.25; // [0-1]
export const SUPPRESSION_LAG = 30; // [native frames]
export const SUPPRESSION_ANGLE = 10; // [degrees]
export const SUPPRESSION_RADIUS = 256; // [px]

export const VIEWING_DISTANCE = 60; // [cm]
export const SCREEN_WIDTH_METRIC = 30; // [cm]

type CameraPose = {
    id: number;
    center: Vec3;
    target: Vec3;
    direction: Vec3;
    roll: number;
    fov: Vec2;
    heldOut: boolean;
    metrics: {ssim: number, lpips: number};
};

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

    static cameraPoses: CameraPose[] = [];
    static cameraFov: Vec2 = new Vec2(60, 40); // [degrees]
    static averageFov: Vec2 = new Vec2(60, 40); // [degrees]
    static averageDistance: number = 0;
    static averageMetrics: {ssim_mean: number, lpips_mean: number} = { ssim_mean: 0, lpips_mean: 0 };

    constructor(scene: Scene, events: Events, editHistory: EditHistory) {
        this.stimulusRenderer = new StimulusRenderer(scene, events);
        this.targetRenderer = new TargetRenderer(scene, events);
        this.calibrationScreen = new CalibrationScreen(scene, events);
        this.gazeTracker = new GazeTracker(scene, events);
        this.scenePlayer = new ScenePlayer(scene, events);
        this.sceneSequencer = new SceneSequencer(scene, events);

        // disable splat center overlay on startup
        events.fire('camera.toggleOverlay');

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

        events.on('gaze.probeCurrentPose', () => {
            this.probeCurrentPose(scene);
        });

        events.on('gaze.loadCameraData', () => {
            let cameraData: any;

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.onchange = async (e: Event) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    const content = await file.text();
                    try {
                        cameraData = JSON.parse(content);
                        this.loadCameraData(cameraData);
                    } catch (err) {
                        console.error('Could not read camera configuration file:', err);
                    }
                }
            };

            input.click();
        });

        events.on('gaze.reconstructTrainingTrajectory', () => {
            this.reconstructTrainingTrajectory(scene);
        });

        events.on('gaze.reconstructTrainingPose', (id?: number) => {
            this.reconstructTrainingPose(scene, id);
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
    loadCameraData(cameraData: any) {
        console.log('Loading camera data:', cameraData);
        GazeDirector.averageMetrics = { ssim_mean: cameraData.ssim_mean, lpips_mean: cameraData.lpips_mean };
        GazeDirector.cameraPoses.length = 0;
        GazeDirector.cameraPoses.push(undefined);

        for (let i = 0; i < cameraData.frames.length; i++) {
            const frame = cameraData.frames[i];
            const m = frame.transform_matrix;

            const centerPosition = new Vec3(-m[0][3], -m[1][3], m[2][3]);
            const targetPosition = new Vec3(m[0][2], m[1][2], -m[2][2]);

            const direction = targetPosition.clone().add(centerPosition);

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

            GazeDirector.cameraPoses.push({
                id: i + 1,
                center: centerPosition,
                target: targetPosition,
                direction: direction,
                roll: 0,
                fov: fieldOfView,
                heldOut: frame.held_out || false,
                metrics: { ssim: frame.ssim ?? -1, lpips: frame.lpips ?? -1 }
            });

        }

        const minDistances: number[] = [];

        for (const pose of GazeDirector.cameraPoses) {
            if (!pose) continue;
            let minDistance = Infinity;
            for (const otherPose of GazeDirector.cameraPoses) {
                if (!otherPose || otherPose.id === pose.id) continue;
                const dist = pose.center.distance(otherPose.center);
                if (dist < minDistance) {
                    minDistance = dist;
                }
            }
            minDistances.push(minDistance);
        }

        GazeDirector.averageDistance =
        minDistances.reduce((acc, dist) => acc + dist, 0) / minDistances.length;

        console.log(
            'Average training pose distance:',
            GazeDirector.averageDistance
        );
    }

    reconstructTrainingTrajectory(scene: Scene) {
        const fovs: Vec2[] = [];
        for (const pose of GazeDirector.cameraPoses) {
            if (!pose) continue;
            fovs.push(pose.fov);
            scene.events.fire('camera.addPose', {
                name: `training_${pose.id}`,
                frame: pose.id,
                position: pose.center,
                target: pose.direction
            });
        }
        const avgFov = fovs
        .reduce((acc, fov) => acc.add(fov), new Vec2(0, 0))
        .divScalar(fovs.length);

        console.log('Average training pose FOV:', avgFov);

        scene.events.fire('camera.setFov', avgFov.x);
        scene.events.fire('timeline.frames', GazeDirector.cameraPoses.length);
    }

    reconstructTrainingPose(
        scene: Scene,
        id?: number
    ) {
        const currentFrame = scene.events.invoke('timeline.frame');
        if (id === undefined) {
            id = currentFrame;
        }
        const pose = GazeDirector.cameraPoses[id];
        scene.events.fire('camera.addPose', {
            name: `pose_${id}`,
            frame: currentFrame,
            position: pose.center,
            target: pose.direction
        });
        scene.events.fire('camera.setFov', pose.fov.x);
        // scene.camera.roll = pose.roll;
        // scene.forceRender = true;

    }

    getCurrentCameraTransform(scene: Scene) {
        const position = scene.camera.entity.getPosition();
        const target = scene.camera.focalPoint;
        const direction = (target.clone().sub(position)).normalize();

        console.log('Current view pose: pos:', position, '| dir:', direction);

        return { position, direction };
    }

    probeCurrentPose(scene: Scene) {
        const { position, direction: currentPoseDirection } = this.getCurrentCameraTransform(scene);
        let minDistance = Infinity;
        let closestPose: CameraPose;

        for (const pose of GazeDirector.cameraPoses) {
            if (!pose) continue;
            const dist = position.distance(pose.center);
            if (dist < minDistance) {
                minDistance = dist;
                closestPose = pose;
            }
        }

        const closestPosePosition = closestPose.center;
        const closestPoseDirection = closestPose.target.clone().normalize();
        const closestPoseFov = closestPose.fov.x;
        const closestPoseHeldOut = closestPose.heldOut ? '(H)' : '(T)';
        const closestPoseSimilarity = closestPose.metrics.lpips;

        let dot = currentPoseDirection.dot(closestPoseDirection);
        dot = Math.max(-1, Math.min(1, dot));
        const relativeDistance = minDistance / GazeDirector.averageDistance * 100;

        const angle = Math.acos(dot) * math.RAD_TO_DEG;
        const commonFov = (scene.camera.fov / 2 + closestPoseFov / 2);
        let frustumIntersection = (commonFov - angle) / commonFov;
        frustumIntersection = Math.max(0, Math.min(1, frustumIntersection)) * 100;

        const relativeSimilarity = closestPoseSimilarity / GazeDirector.averageMetrics.lpips_mean * 100;

        console.log(
            'Closest reference pose:',
            closestPose.id,
            closestPoseHeldOut,
            '| lpips:',
            closestPoseSimilarity.toFixed(3),
            '; rel [%]:',
            `${relativeSimilarity.toFixed(3)}`
        );
        console.log(
            '=== Pose distance:',
            minDistance.toFixed(3),
            '; rel [%]:',
            relativeDistance.toFixed(3),
            '| angle:',
            angle.toFixed(3),
            '; intersection [%]:',
            frustumIntersection.toFixed(3)
        );

        return closestPoseHeldOut;
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
