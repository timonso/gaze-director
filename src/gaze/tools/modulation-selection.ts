// adapted from '/src/tools/sphere-selection.ts'

import { Button, Container, NumericInput } from 'pcui';
import { TranslateGizmo, Vec3 } from 'playcanvas';

import { Events } from 'src/events';

import { Scene } from '../../scene';
import { Splat } from '../../splat';
import { Modulation } from '../modulation';

class ModulationSelection {
    activate: () => void;
    deactivate: () => void;

    active = false;

    constructor(scene: Scene, events: Events, canvasContainer: Container) {
        const modulation = new Modulation();

        const gizmo = new TranslateGizmo(
            scene.camera.entity.camera,
            scene.gizmoLayer
        );

        gizmo.on('render:update', () => {
            scene.forceRender = true;
        });

        gizmo.on('transform:move', () => {
            modulation.moved();
        });

        // ui
        const modulationToolbar = new Container({
            id: 'select-toolbar',
            hidden: true
        });

        modulationToolbar.dom.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
        });

        const addButton = new Button({
            text: 'Add',
            class: 'select-toolbar-button'
        });
        const diameterSlider = new NumericInput({
            precision: 3,
            value: modulation.visualAngle,
            placeholder: 'Diameter [deg]',
            width: 140,
            min: 0.0
        });
        const intensitySlider = new NumericInput({
            precision: 3,
            value: modulation.intensity,
            placeholder: 'Intensity',
            width: 120,
            min: 0.0,
            max: 1.0
        });
        const durationSlider = new NumericInput({
            precision: 0,
            value: modulation.duration,
            placeholder: 'Duration [s]',
            width: 120,
            min: 1
        });
        const frequencySlider = new NumericInput({
            precision: 0,
            value: modulation.frequency,
            placeholder: 'Frequency [Hz]',
            width: 120,
            min: 1
        });
        const hardnessSlider = new NumericInput({
            precision: 3,
            value: modulation.hardness,
            placeholder: 'Hardness',
            width: 120,
            min: 0.0,
            max: 1.0
        });

        modulationToolbar.append(diameterSlider);
        modulationToolbar.append(durationSlider);
        modulationToolbar.append(frequencySlider);
        modulationToolbar.append(intensitySlider);
        modulationToolbar.append(hardnessSlider);
        modulationToolbar.append(addButton);

        canvasContainer.append(modulationToolbar);

        addButton.dom.addEventListener('pointerdown', (e) => {
            const currentFrame = events.invoke('timeline.frame');
            e.stopPropagation();
            events.fire(
                'gaze.addModulation',
                modulation.editorEntity.getPosition(),
                modulation.visualAngle,
                modulation.duration,
                currentFrame,
                modulation.intensity,
                modulation.frequency,
                modulation.hardness
            );
        });

        diameterSlider.on('change', () => {
            modulation.diameter = diameterSlider.value;
        });
        durationSlider.on('change', () => {
            modulation.duration = durationSlider.value;
        });
        intensitySlider.on('change', () => {
            modulation.intensity = intensitySlider.value;
        });
        frequencySlider.on('change', () => {
            modulation.frequency = frequencySlider.value;
        });
        hardnessSlider.on('change', () => {
            modulation.hardness = hardnessSlider.value;
        });

        events.on(
            'camera.focalPointPicked',
            (details: { splat: Splat; position: Vec3 }) => {
                if (this.active) {
                    modulation.editorEntity.setPosition(details.position);
                    gizmo.attach([modulation.editorEntity]);
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
            scene.add(modulation);
            gizmo.attach([modulation.editorEntity]);
            modulationToolbar.hidden = false;
        };

        this.deactivate = () => {
            modulationToolbar.hidden = true;
            gizmo.detach();
            scene.remove(modulation);
            modulation.destroy();
            this.active = false;
        };
    }
}

export { ModulationSelection };
