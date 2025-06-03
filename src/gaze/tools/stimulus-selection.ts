// adapted from '/src/tools/sphere-selection.ts'

import { Button, Container, NumericInput } from 'pcui';
import { TranslateGizmo, Vec3 } from 'playcanvas';

import { Events } from 'src/events';

import { Scene } from '../../scene';
import { Splat } from '../../splat';
import { Stimulus } from '../stimulus';

class StimulusSelection {
    activate: () => void;
    deactivate: () => void;

    active = false;

    constructor(scene: Scene, events: Events, canvasContainer: Container) {
        const stimulus = new Stimulus();

        const gizmo = new TranslateGizmo(
            scene.camera.entity.camera,
            scene.gizmoLayer
        );

        gizmo.on('render:update', () => {
            scene.forceRender = true;
        });

        gizmo.on('transform:move', () => {
            stimulus.moved();
        });

        // ui
        const stimulusToolbar = new Container({
            id: 'select-toolbar',
            hidden: true
        });

        stimulusToolbar.dom.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
        });

        const addButton = new Button({
            text: 'Add',
            class: 'select-toolbar-button'
        });
        const radiusSlider = new NumericInput({
            precision: 0,
            value: stimulus.radius,
            placeholder: 'Radius [px]',
            width: 120,
            min: 1.0
        });
        const intensitySlider = new NumericInput({
            precision: 3,
            value: stimulus.intensity,
            placeholder: 'Intensity',
            width: 120,
            min: 0.0,
            max: 1.0
        });
        const durationSlider = new NumericInput({
            precision: 0,
            value: stimulus.duration,
            placeholder: 'Duration [s]',
            width: 120,
            min: 1
        });
        const frequencySlider = new NumericInput({
            precision: 0,
            value: stimulus.frequency,
            placeholder: 'Frequency [Hz]',
            width: 120,
            min: 1
        });
        const hardnessSlider = new NumericInput({
            precision: 3,
            value: stimulus.hardness,
            placeholder: 'Hardness',
            width: 120,
            min: 0.0,
            max: 1.0
        });

        stimulusToolbar.append(radiusSlider);
        stimulusToolbar.append(durationSlider);
        stimulusToolbar.append(frequencySlider);
        stimulusToolbar.append(intensitySlider);
        stimulusToolbar.append(hardnessSlider);
        stimulusToolbar.append(addButton);

        canvasContainer.append(stimulusToolbar);

        addButton.dom.addEventListener('pointerdown', (e) => {
            const currentFrame = events.invoke('timeline.frame');
            e.stopPropagation();
            events.fire(
                'gaze.addStimulus',
                stimulus.editorEntity.getPosition(),
                stimulus._outerRadius,
                stimulus.duration,
                currentFrame,
                stimulus.intensity,
                stimulus.frequency,
                stimulus.hardness
            );
        });

        radiusSlider.on('change', () => {
            stimulus.radius = radiusSlider.value;
        });
        durationSlider.on('change', () => {
            stimulus.duration = durationSlider.value;
        });
        intensitySlider.on('change', () => {
            stimulus.intensity = intensitySlider.value;
        });
        frequencySlider.on('change', () => {
            stimulus.frequency = frequencySlider.value;
        });
        hardnessSlider.on('change', () => {
            stimulus.hardness = hardnessSlider.value;
        });

        events.on(
            'camera.focalPointPicked',
            (details: { splat: Splat; position: Vec3 }) => {
                if (this.active) {
                    stimulus.editorEntity.setPosition(details.position);
                    gizmo.attach([stimulus.editorEntity]);
                }
            }
        );

        const updateGizmoSize = () => {
            const { camera, canvas } = scene;
            if (camera.ortho) {
                gizmo.size = 1125 / canvas.clientHeight;
            } else {
                gizmo.size =
                    1200 / Math.max(canvas.clientWidth, canvas.clientHeight);
            }
        };
        updateGizmoSize();
        events.on('camera.resize', updateGizmoSize);
        events.on('camera.ortho', updateGizmoSize);

        this.activate = () => {
            this.active = true;
            scene.add(stimulus);
            gizmo.attach([stimulus.editorEntity]);
            stimulusToolbar.hidden = false;
        };

        this.deactivate = () => {
            stimulusToolbar.hidden = true;
            gizmo.detach();
            scene.remove(stimulus);
            stimulus.destroy();
            this.active = false;
        };
    }
}

export { StimulusSelection };
