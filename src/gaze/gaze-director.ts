import { Asset, Vec3 } from 'playcanvas';

import { EditHistory } from 'src/edit-history';
import { Events } from 'src/events';
import { Scene } from 'src/scene';

import { startGazeTracking, stopGazeTracking } from './gaze-tracker';
import { Stimulus } from './stimulus';
import { StimulusRenderer } from './stimulus-renderer';
import { Target } from './target';
import { TargetRenderer } from './target-renderer';

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

    constructor(scene: Scene, events: Events, editHistory: EditHistory) {
        this.stimulusRenderer = new StimulusRenderer(scene, events);
        this.targetRenderer = new TargetRenderer(scene, events);
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
            }
        );

        events.on(
            'gaze.addTarget',
            (
                position: Vec3 = new Vec3(0, 0, 0),
                radius: number = 1.0,
                duration: number = 10,
                startFrame: number = 0,
                opacity: number = 1.0
            ) => {
                const target = new Target(scene, events, position, radius, duration, startFrame, opacity);
                editHistory.add(new AddTargetOp(scene, target));
            }
        );

        events.on('gaze.startTracking', () => {
            startGazeTracking();
        });

        events.on('gaze.stopTracking', () => {
            stopGazeTracking();
        });
    }
}

export { GazeDirector };
