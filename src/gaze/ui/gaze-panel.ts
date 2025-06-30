import { Container, Element, Label } from 'pcui';

import { ModulationsList } from './modulations-list';
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

        const modulationsHeader = new Container({
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

        const addModulation = new Container({
            class: 'panel-header-button'
        });

        const addTarget = new Container({
            class: 'panel-header-button'
        });

        const modulationsLabel = new Label({
            text: 'Modulations: 0',
            class: 'panel-header-label'
        });
        modulationsHeader.append(modulationsLabel);

        const targetsLabel = new Label({
            text: 'Targets: 0',
            class: 'panel-header-label'
        });
        targetsHeader.append(targetsLabel);

        addModulation.dom.appendChild(createSvg(addElementSvg));
        addTarget.dom.appendChild(createSvg(addElementSvg));

        sceneHeader.append(sceneIcon);
        sceneHeader.append(sceneLabel);
        modulationsHeader.append(addModulation);
        targetsHeader.append(addTarget);

        addModulation.on('click', async () => {
            await events.fire('tool.gaze.modulationSelection');
        });

        addTarget.on('click', async () => {
            await events.fire('tool.gaze.targetSelection');
        });

        tooltips.register(addModulation, 'New Modulation', 'top');
        tooltips.register(addTarget, 'New Target', 'top');

        const modulationsList = new ModulationsList(events);

        const modulationsListContainer = new Container({
            class: 'modulations-list-container'
        });
        modulationsListContainer.append(modulationsList);

        const targetsList = new TargetsList(events);

        const targetsListContainer = new Container({
            class: 'targets-list-container'
        });
        targetsListContainer.append(targetsList);

        events.on('gaze.modulationsChanged', (count: number) => {
            modulationsLabel.text = `Modulations: ${count}`;
        });

        events.on('gaze.targetsChanged', (count: number) => {
            targetsLabel.text = `Targets: ${count}`;
            events.fire('gaze.toggleTargetRenderer', count > 0);
        });

        this.append(sceneHeader);
        this.append(modulationsHeader);
        this.append(modulationsListContainer);
        this.append(targetsHeader);
        this.append(targetsListContainer);
        this.append(new Element({
            class: 'panel-header',
            height: 20
        }));
    }
}

export { GazePanel };
