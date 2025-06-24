import { Button, Container, NumericInput } from 'pcui';

import { Events } from 'src/events';

import { Scene } from '../../scene';

class PoseSelection {
    activate: () => void;
    deactivate: () => void;

    active = false;

    constructor(scene: Scene, events: Events, canvasContainer: Container) {
        const poseToolbar = new Container({
            id: 'select-toolbar',
            hidden: true
        });

        poseToolbar.dom.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
        });

        const loadPoseButton = new Button({
            text: 'Apply Training Pose',
            class: 'select-toolbar-button'
        });

        const poseInput = new NumericInput({
            precision: 0,
            min: 0,
            value: scene.events.invoke('timeline.frame'),
            placeholder: 'Training Pose ID',
            width: 200
        });

        poseToolbar.append(poseInput);
        poseToolbar.append(loadPoseButton);

        canvasContainer.append(poseToolbar);

        loadPoseButton.dom.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            events.fire('gaze.reconstructTrainingPose', poseInput.value);
        });

        this.activate = () => {
            this.active = true;
            poseToolbar.hidden = false;
        };

        this.deactivate = () => {
            poseToolbar.hidden = true;
            this.active = false;
        };
    }
}

export { PoseSelection };
