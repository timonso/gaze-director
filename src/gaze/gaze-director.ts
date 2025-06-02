import { Asset, Vec3 } from 'playcanvas';

import { EditHistory } from 'src/edit-history';
import { Events } from 'src/events';
import { Scene } from 'src/scene';

import { startGazeTracking, stopGazeTracking } from './gaze-tracker';
import { Stimulus } from './stimulus';
import { StimulusRenderer } from './stimulus-renderer';
import { Target } from './target';

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

// TODO: remove if using built-in sphere mesh
function loadTargetMesh(scene: Scene) {
    const asset = new Asset('targetMesh', 'container', {
        url: 'assets/meshes/sphere.glb'
    });

    asset.once('load', (containerAsset) => {
        const modelEntity = containerAsset.resource.instantiateRenderEntity();
        modelEntity.setPosition(0, 0, 0);
        scene.app.root.addChild(modelEntity);
    });
}

class GazeDirector {
    stimulusRenderer: StimulusRenderer;

    constructor(scene: Scene, events: Events, editHistory: EditHistory) {
        this.stimulusRenderer = new StimulusRenderer(scene, events);
        events.on(
            'gaze.addStimulus',
            (
                position: Vec3 = new Vec3(0, 0, 0),
                radius: number = 1.0,
                duration: number = 10,
                startFrame: number = 0,
                intensity: number = 1.0,
                frequency: number = 10.0
            ) => {
                const stimulus = new Stimulus(
                    position,
                    radius,
                    duration,
                    startFrame,
                    intensity,
                    frequency
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

        events.function('gaze.getStimulusRenderer', () => {
            return this.stimulusRenderer;
        });

        events.on('gaze.startTracking', () => {
            startGazeTracking();
        });

        events.on('gaze.stopTracking', () => {
            stopGazeTracking();
        });
    }
}

export { GazeDirector };
