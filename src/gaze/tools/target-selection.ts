// adapted from '/src/tools/sphere-selection.ts'

import {
    BooleanInput,
    Button,
    ColorPicker,
    Container,
    Label,
    NumericInput,
    VectorInput
} from 'pcui';
import { Color, TranslateGizmo, Vec3 } from 'playcanvas';

import { Events } from 'src/events';

import { Scene } from '../../scene';
import { Splat } from '../../splat';
import { Modulation } from '../modulation';
import { Target } from '../target';

class TargetSelection {
    activate: () => void;
    deactivate: () => void;

    active = false;
    attachModulation = false;

    constructor(scene: Scene, events: Events, canvasContainer: Container) {
        const target = new Target(scene, events);
        const gizmo = new TranslateGizmo(
            scene.camera.entity.camera,
            scene.gizmoLayer
        );

        gizmo.on('render:update', () => {
            scene.forceRender = true;
        });

        gizmo.on('transform:move', () => {
            target.moved();
        });

        // ui
        const targetToolbar = new Container({
            id: 'select-toolbar',
            hidden: true
        });

        targetToolbar.dom.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
        });

        const addButton = new Button({
            text: 'Add',
            class: 'select-toolbar-button'
        });
        const radiusSlider = new NumericInput({
            precision: 0,
            value: target.radius,
            placeholder: 'Radius',
            width: 100,
            min: 1.0
        });
        const opacitySlider = new NumericInput({
            precision: 3,
            value: target.opacity,
            placeholder: 'Opacity',
            width: 100,
            min: 0.0,
            max: 1.0
        });
        const durationSlider = new NumericInput({
            precision: 0,
            value: target.duration,
            placeholder: 'Duration [s]',
            width: 100,
            min: 1.0
        });
        const specularSlider = new NumericInput({
            precision: 2,
            value: target.specularFactor,
            placeholder: 'Specularity',
            width: 100,
            min: 0.0,
            max: 1000.0
        });
        const lightPositionPicker = new VectorInput({
            precision: 0,
            dimensions: 3,
            value: target.lightPosition.toArray(),
            width: 120
        });
        const colorPicker = new ColorPicker({
            class: 'color-picker',
            value: target.color.toArray()
        });
        const addModulationToggle = new BooleanInput({
            class: 'control-element',
            value: this.attachModulation
        });

        targetToolbar.append(radiusSlider);
        targetToolbar.append(durationSlider);
        targetToolbar.append(opacitySlider);
        targetToolbar.append(specularSlider);
        targetToolbar.append(
            new Label({
                text: 'Light Position:',
                class: 'select-toolbar-label'
            })
        );
        targetToolbar.append(lightPositionPicker);
        targetToolbar.append(
            new Label({ text: 'Tint:', class: 'select-toolbar-label' })
        );
        targetToolbar.append(colorPicker);
        targetToolbar.append(
            new Label({ text: '+ Modulation:', class: 'select-toolbar-label' })
        );
        targetToolbar.append(addModulationToggle);
        targetToolbar.append(addButton);

        canvasContainer.append(targetToolbar);

        addButton.dom.addEventListener('pointerdown', (e) => {
            const currentFrame = events.invoke('timeline.frame');
            e.stopPropagation();
            events.fire(
                'gaze.addTarget',
                target.editorEntity.getPosition(),
                target._radius,
                target.duration,
                currentFrame,
                target.opacity,
                target.lightPosition,
                target.specularFactor,
                target.color
            );

            if (this.attachModulation) {
                events.fire(
                    'gaze.addModulation',
                    target.editorEntity.getPosition(),
                    Modulation.defaultVisualAngle,
                    target.duration,
                    currentFrame,
                    Modulation.defaultIntensity,
                    Modulation.defaultFrequency,
                    Modulation.defaultHardness
                );
            }
        });

        radiusSlider.on('change', () => {
            target.radius = radiusSlider.value;
        });
        durationSlider.on('change', () => {
            target.duration = durationSlider.value;
        });
        opacitySlider.on('change', () => {
            target.opacity = opacitySlider.value;
        });
        colorPicker.on('change', () => {
            target.color = new Color(
                colorPicker.value[0],
                colorPicker.value[1],
                colorPicker.value[2],
                1.0
            );
        });
        addModulationToggle.on('change', () => {
            this.attachModulation = addModulationToggle.value;
        });
        specularSlider.on('change', () => {
            target.specularFactor = specularSlider.value;
        });
        lightPositionPicker.on('change', () => {
            target.lightPosition = new Vec3(lightPositionPicker.value);
        });

        events.on(
            'camera.focalPointPicked',
            (details: { splat: Splat; position: Vec3 }) => {
                if (this.active) {
                    target.editorEntity.setPosition(details.position);
                    gizmo.attach([target.editorEntity]);
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
            scene.add(target);
            gizmo.attach([target.editorEntity]);
            targetToolbar.hidden = false;
            events.fire('grid.setVisible', false);
        };

        this.deactivate = () => {
            targetToolbar.hidden = true;
            gizmo.detach();
            scene.remove(target);
            target.destroy();
            this.active = false;
        };
    }
}

export { TargetSelection };
