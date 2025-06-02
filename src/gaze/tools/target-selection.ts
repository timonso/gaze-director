// adapted from '/src/tools/sphere-selection.ts'

import { Button, Container, NumericInput } from 'pcui';
import { TranslateGizmo, Vec3 } from 'playcanvas';

import { Events } from 'src/events';

import { Scene } from '../../scene';
import { Splat } from '../../splat';
import { Target } from '../target';

class TargetSelection {
    activate: () => void;
    deactivate: () => void;

    active = false;

    constructor(scene: Scene, events: Events, canvasContainer: Container) {
        const target = new Target(scene, events);

        const gizmo = new TranslateGizmo(scene.camera.entity.camera, scene.gizmoLayer);

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

        const addButton = new Button({ text: 'Add', class: 'select-toolbar-button' });
        const radiusSlider = new NumericInput({
            precision: 0,
            value: target.radius,
            placeholder: 'Radius [px]',
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

        targetToolbar.append(radiusSlider);
        targetToolbar.append(durationSlider);
        targetToolbar.append(opacitySlider);
        targetToolbar.append(addButton);

        canvasContainer.append(targetToolbar);

        addButton.dom.addEventListener('pointerdown', (e) => {
            const currentFrame = events.invoke('timeline.frame');
            e.stopPropagation(); events.fire('gaze.addTarget', target.editorEntity.getPosition(), target._radius, target.duration, currentFrame, target.opacity);
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

        events.on('camera.focalPointPicked', (details: { splat: Splat, position: Vec3 }) => {
            if (this.active) {
                target.editorEntity.setPosition(details.position);
                gizmo.attach([target.editorEntity]);
            }
        });

        const updateGizmoSize = () => {
            const { camera, canvas } = scene;
            if (camera.ortho) {
                gizmo.size = 1125 / canvas.clientHeight;
            } else {
                gizmo.size = 1200 / Math.max(canvas.clientWidth, canvas.clientHeight);
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
