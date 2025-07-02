import { Vec3 } from 'playcanvas';

import { Events } from 'src/events';
import { Scene } from 'src/scene';

import { SceneRecord } from './gaze-tracker';
import { Modulation } from './modulation';
import { Target } from './target';


type GazeScene = {
    id: string;
    filepath: string;
    repetitions: number;
    showModulations: boolean;
    durationOverride?: number; // [frames]
    modulationOverride: {
        diameter?: number; // [deg]
        intensity?: number; // [0-1]
        frequency?: number; // [Hz]
        hardness?: number; // [0-1]
    }
    targetOverride?: {
        opacity?: number; // [0-1]
        radius?: number; // [scene units]
        lightPosition?: [number, number, number]; // [scene units]
        specularFactor?: number;
    }
}

type SequenceData = {
    persistentTargets: boolean;
    tonemapping?: string;
    scenes: GazeScene[];
}

class SceneSequencer {
    enabled: boolean = false;
    participantId: string = 'default';
    viewingDistance: number = 40; // [cm]
    currentSequence: SequenceData = { persistentTargets: true, scenes: [] };
    scenesLocation: string = 'http://localhost:8080/';
    currentSceneIndex: number = 0;
    currentSceneDuration: number = 0;
    currentSceneRepetition: number = 0;

    constructor(scene: Scene, events: Events) {
        events.on('gaze.loadSequence', (data: SequenceData) => {
            this.enabled = true;
            this.currentSequence = data;
            this.currentSceneIndex = 0;
            console.log('Loaded sequence:', this.currentSequence);
        });

        events.on('gaze.setScenesLocation', (location: string) => {
            this.scenesLocation = location;
        });

        events.on('gaze.setParticipant', (id: string) => {
            this.participantId = id;
        });

        events.on('gaze.setViewingDistance', (distance: number) => {
            this.viewingDistance = distance;
        });

        events.on('gaze.startSequence', () => {
            this.startSequence(events);
        });

        events.on('gaze.continueSequence', () => {
            this.playNextScene(events);
        });

        events.on('gaze.stopSequence', () => {
            this.stopSequence(events);
        });

        events.on('timeline.time', (time: number) => {
            if (this.enabled) {
                const idx = this.currentSceneIndex;
                const scenes = this.currentSequence.scenes;

                if (time >= this.currentSceneDuration - 5) {
                    this.currentSceneRepetition++;

                    if (this.currentSceneRepetition >= scenes[idx].repetitions) {
                        events.fire('gaze.stopScene');

                        const sceneRecord: SceneRecord = {
                            sceneId: scenes[idx].id,
                            participantId: this.participantId,
                            modulated: scenes[idx].showModulations
                        };

                        events.fire('gaze.pauseTracking');
                        events.fire('gaze.saveTrackingData', sceneRecord);
                        setTimeout(() => events.fire('gaze.clearTrackingData'), 1000);
                        console.log('Tracking data saved.');

                        this.currentSceneIndex++;

                        this.playNextScene(events);
                    }
                }
            }
        });
    }

    playNextScene(events: Events) {
        const idx = this.currentSceneIndex;
        const scenes = this.currentSequence.scenes;
        const sceneCount = scenes.length;

        if (!this.currentSequence || idx >= sceneCount) {
            console.log('No more scenes to play or sequence not loaded.');
            this.stopSequence(events);
            return;
        }

        this.currentSceneRepetition = 0;
        events.fire('gaze.showCalibrationScreen', true);
        this.loadScene(scenes[idx], events)
        .then(() => {
            console.log(`--- Scene #${idx} loaded successfully: ${scenes[idx].id} ---`);
            console.log(`Playing scene #${idx}`);

            events.fire('gaze.showModulationsPlayer', scenes[idx].showModulations);
            this.currentSceneDuration = scenes[idx].durationOverride ?? events.invoke('timeline.frames');
            console.log('Scene duration: ', this.currentSceneDuration);

            events.fire('camera.setTonemapping', this.currentSequence.tonemapping ?? 'aces2');
        })
        .catch((error) => {
            console.error(`Error loading scene #${idx}:`, error);
        });

    }

    async loadScene(scene: GazeScene, events: Events) {
        console.log(`Scene ID: ${scene.id}, File: ${scene.filepath}, Repetitions: ${scene.repetitions}, Modulated: ${scene.showModulations}`);

        const scenePath = this.scenesLocation + scene.filepath;
        console.log(`Loading scene from server: ${scenePath}`);
        await events.invoke('gaze.doc.openFromServer', scenePath);

        const allModulations: Modulation[] = await events.invoke('gaze.allModulations');
        const allTargets: Target[] = await events.invoke('gaze.allTargets');

        console.log(`# modulations: ${allModulations.length} | # targets: ${allTargets.length}`);

        // override modulation parameters if specified
        if (scene.modulationOverride) {
            for (const modulation of allModulations) {
                modulation.diameter = scene.modulationOverride.diameter ?? modulation.diameter;
                modulation.intensity = scene.modulationOverride.intensity ?? modulation.intensity;
                modulation.frequency = scene.modulationOverride.frequency ?? modulation.frequency;
                modulation.hardness = scene.modulationOverride.hardness ?? modulation.hardness;
            }
        }

        // override target properties if specified
        if (scene.targetOverride) {
            for (const target of allTargets) {
                target.opacity = scene.targetOverride.opacity ?? target.opacity;
                target.radius = scene.targetOverride.radius ?? target.radius;
                target.lightPosition = scene.targetOverride.lightPosition ? new Vec3(scene.targetOverride.lightPosition) : target.lightPosition;
                target.specularFactor = scene.targetOverride.specularFactor ?? target.specularFactor;
            }
        }
    }

    startSequence(events: Events) {
        if (!this.currentSequence) {
            console.error('No sequence loaded.');
            this.enabled = false;
            return;
        }

        events.fire('gaze.ignoreTargetTimings', this.currentSequence.persistentTargets);

        console.log(`=== Starting sequence for participant ${this.participantId} ===`);
        this.playNextScene(events);

        events.fire('gaze.clearTrackingData');
        events.fire('gaze.startTracking', true);
    }

    stopSequence(events: Events) {
        console.log(`=== Sequence for participant ${this.participantId} stopped at Scene #${this.currentSceneIndex} ===`);
        this.enabled = false;
        this.currentSceneIndex = 0;
        this.currentSceneDuration = 0;
        this.currentSceneRepetition = 0;

        events.fire('gaze.stopTracking');
        events.fire('scene.clear');
        events.fire('gaze.toggleInterface');
        events.fire('gaze.showBlackoutScreen', true);
    }
}

export { SceneSequencer };
