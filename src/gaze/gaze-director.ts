import { Vec3 } from 'playcanvas';

import { EditHistory } from 'src/edit-history';
import { Events } from 'src/events';
import { Scene } from 'src/scene';

import { startGazeTracking, stopGazeTracking } from './gaze-tracker';
import { Stimulus } from './stimulus';

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

class GazeDirector {
    constructor(scene: Scene, events: Events, editHistory: EditHistory) {
        events.on(
            'gaze.addStimulus',
            (
                position: Vec3 = new Vec3(0, 0, 0),
                radius: number = 1.0,
                duration: number = 10,
                startFrame: number = 0,
                intensity: number = 1.0
            ) => {
                const stimulus = new Stimulus(
                    scene,
                    events,
                    position,
                    radius,
                    duration,
                    startFrame,
                    intensity
                );
                editHistory.add(new AddStimulusOp(scene, stimulus));
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
