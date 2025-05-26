import { Container, Element, Label } from 'pcui';

import { StimuliList } from './stimuli-list';
import { Events } from '../../events';
import { localize } from '../../ui/localization';
import addStimulusSvg from '../../ui/svg/new.svg';
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

        const sceneIcon = new Label({
            text: '\uE344',
            class: 'panel-header-icon'
        });

        const sceneLabel = new Label({
            text: 'Gaze Stimuli',
            class: 'panel-header-label'
        });

        const addStimulus = new Container({
            class: 'panel-header-button'
        });

        addStimulus.dom.appendChild(createSvg(addStimulusSvg));

        sceneHeader.append(sceneIcon);
        sceneHeader.append(sceneLabel);
        sceneHeader.append(addStimulus);

        addStimulus.on('click', async () => {
            await events.fire('tool.stimulusSelection');
        });

        tooltips.register(addStimulus, 'New Stimulus', 'top');

        const stimuliList = new StimuliList(events);

        const stimuliListContainer = new Container({
            class: 'stimuli-list-container'
        });
        stimuliListContainer.append(stimuliList);

        this.append(sceneHeader);
        this.append(stimuliListContainer);
        this.append(new Element({
            class: 'panel-header',
            height: 20
        }));
    }
}

export { GazePanel };
