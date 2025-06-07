import { Container, Element, Label } from 'pcui';

import { StimuliList } from './stimuli-list';
import { TargetsList } from './targets-list';
import { Events } from '../../events';
import addElementSvg from '../../ui/svg/new.svg';
import { Tooltips } from '../../ui/tooltips';

const createSvg = (svgString: string) => {
    const decodedStr = decodeURIComponent(svgString.substring('data:image/svg+xml,'.length));
    return new DOMParser().parseFromString(decodedStr, 'image/svg+xml').documentElement;
};

class GazePanel extends Container {
    constructor(events: Events, tooltips: Tooltips, args = {}) {
        args = {
            ...args,
            id: 'gaze-panel',
            class: 'panel'
        };

        super(args);

        // stop pointer events bubbling
        ['pointerdown', 'pointerup', 'pointermove', 'wheel', 'dblclick'].forEach((eventName) => {
            this.dom.addEventListener(eventName, (event: Event) => event.stopPropagation());
        });

        const sceneHeader = new Container({
            class: 'panel-header'
        });

        const stimuliHeader = new Container({
            class: 'panel-header'
        });

        const targetsHeader = new Container({
            class: 'panel-header'
        });

        const sceneIcon = new Label({
            text: '\uE344',
            class: 'panel-header-icon'
        });

        const sceneLabel = new Label({
            text: 'Gaze Direction Elements',
            class: 'panel-header-label'
        });

        const addStimulus = new Container({
            class: 'panel-header-button'
        });

        const addTarget = new Container({
            class: 'panel-header-button'
        });

        const stimuliLabel = new Label({
            text: 'Stimuli: 0',
            class: 'panel-header-label'
        });
        stimuliHeader.append(stimuliLabel);

        const targetsLabel = new Label({
            text: 'Targets: 0',
            class: 'panel-header-label'
        });
        targetsHeader.append(targetsLabel);

        addStimulus.dom.appendChild(createSvg(addElementSvg));
        addTarget.dom.appendChild(createSvg(addElementSvg));

        sceneHeader.append(sceneIcon);
        sceneHeader.append(sceneLabel);
        stimuliHeader.append(addStimulus);
        targetsHeader.append(addTarget);

        addStimulus.on('click', async () => {
            await events.fire('tool.stimulusSelection');
        });

        addTarget.on('click', async () => {
            await events.fire('tool.targetSelection');
        });

        tooltips.register(addStimulus, 'New Stimulus', 'top');
        tooltips.register(addTarget, 'New Target', 'top');

        const stimuliList = new StimuliList(events);

        const stimuliListContainer = new Container({
            class: 'stimuli-list-container'
        });
        stimuliListContainer.append(stimuliList);

        const targetsList = new TargetsList(events);

        const targetsListContainer = new Container({
            class: 'targets-list-container'
        });
        targetsListContainer.append(targetsList);

        events.on('gaze.stimuliChanged', (count: number) => {
            stimuliLabel.text = `Stimuli: ${count}`;
        });

        events.on('gaze.targetsChanged', (count: number) => {
            targetsLabel.text = `Targets: ${count}`;
            events.fire('gaze.toggleTargetRenderer', count > 0);
        });

        this.append(sceneHeader);
        this.append(stimuliHeader);
        this.append(stimuliListContainer);
        this.append(targetsHeader);
        this.append(targetsListContainer);
        this.append(new Element({
            class: 'panel-header',
            height: 20
        }));
    }
}

export { GazePanel };
