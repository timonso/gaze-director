// adapted from '/src/tools/sphere-selection.ts'

import { Button, Container, TextInput } from 'pcui';

import { Events } from 'src/events';

import { Scene } from '../../scene';

class SequenceSetup {
    activate: () => void;
    deactivate: () => void;

    active = false;

    constructor(scene: Scene, events: Events, canvasContainer: Container) {
        const sequenceToolbar = new Container({
            id: 'select-toolbar',
            hidden: true
        });

        sequenceToolbar.dom.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
        });

        const startButton = new Button({
            text: 'Start Sequence',
            class: 'select-toolbar-button'
        });

        const sequenceConfigButton = new Button({
            text: 'Load Sequence',
            class: 'select-toolbar-button'
        });

        const participantInput = new TextInput({
            value: 'default',
            placeholder: 'Participant ID',
            width: 180
        });

        const sceneLocationInput = new TextInput({
            value: 'http://localhost:8080/',
            placeholder: 'Scenes Source',
            width: 240
        });

        sequenceToolbar.append(participantInput);
        sequenceToolbar.append(sceneLocationInput);
        sequenceToolbar.append(sequenceConfigButton);
        sequenceToolbar.append(startButton);

        canvasContainer.append(sequenceToolbar);

        startButton.dom.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            events.fire('gaze.startSequence');
        });

        sequenceConfigButton.dom.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.onchange = async (e: Event) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    const content = await file.text();
                    try {
                        const sequenceData = JSON.parse(content);
                        events.fire('gaze.loadSequence', sequenceData);
                    } catch (err) {
                        console.error('Could not read sequence configuration file:', err);
                    }
                }
            };
            input.click();
        });

        participantInput.on('change', () => {
            events.fire('gaze.setParticipant', participantInput.value);
        });

        sceneLocationInput.on('change', () => {
            events.fire('gaze.setScenesLocation', sceneLocationInput.value);
        });

        this.activate = () => {
            this.active = true;
            sequenceToolbar.hidden = false;
        };

        this.deactivate = () => {
            sequenceToolbar.hidden = true;
            this.active = false;
        };
    }
}

export { SequenceSetup };
