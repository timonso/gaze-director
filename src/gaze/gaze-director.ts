import { Asset, Color, Vec3 } from 'playcanvas';

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

export const STIMULUS_HARDNESS = 0.2; // [0-1]
export const TOLERANCE_ANGLE = 10; // [degrees]
export const TOLERANCE_RADIUS = 256; // [px]

export const VIEWING_DISTANCE = 60; // [cm]
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

        events.function('gaze.visualAngleToPixels', (visualAngle: number) => {
            return visualAngleToPixels(visualAngle, GazeDirector.viewingDistance);
        });

        events.on('gaze.setDeviceParams', (distance: number, screenWidthMetric: number) => {
            GazeDirector.viewingDistance = distance;
            GazeDirector.screenWidthMetric = screenWidthMetric;
            Stimulus.toleranceRadius = visualAngleToPixels(FOVEAL_VISUAL_ANGLE, distance, screenWidthMetric);
        }
        );

        events.function('gaze.allStimuli', () => {
            return scene.getElementsByType(ElementType.gaze_stimulus);
        });

        events.function('gaze.allTargets', () => {
            return scene.getElementsByType(ElementType.gaze_target);
        });
    }
}

function visualAngleToPixels(
    visualAngle: number,
    viewingDistance: number = GazeDirector.viewingDistance,
    screenWidthMetric: number = GazeDirector.screenWidthMetric
): number {
    const visualAngleRad = (visualAngle * Math.PI) / 180;
    const diameter = 2 * viewingDistance * Math.tan(visualAngleRad / 2);
    const radius = diameter / 2;

    const pxPerCm = window.devicePixelRatio * (screen.width / screenWidthMetric);
    const radiusPx = Math.ceil(radius * pxPerCm);

    console.log(
        'Converted visual angle',
        visualAngle,
        'deg to screen space:',
        radius,
        'cm ~',
        radiusPx,
        'px'
    );

    return radiusPx;
}

export { GazeDirector, visualAngleToPixels };
