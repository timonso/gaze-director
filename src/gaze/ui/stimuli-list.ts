// adapted from 'src/ui/splat-list.ts'

import { Container, Label, Element as PcuiElement } from 'pcui';

import { Element, ElementType } from '../../element';
import { Events } from '../../events';
import deleteSvg from '../../ui/svg/delete.svg';
import { Stimulus } from '../stimulus';

const createSvg = (svgString: string) => {
    const decodedStr = decodeURIComponent(svgString.substring('data:image/svg+xml,'.length));
    return new DOMParser().parseFromString(decodedStr, 'image/svg+xml').documentElement;
};

class StimulusItem extends Container {
    getName: () => string;
    setName: (value: string) => void;
    getSelected: () => boolean;
    setSelected: (value: boolean) => void;
    destroy: () => void;

    constructor(name: string, args = {}) {
        args = {
            ...args,
            class: ['splat-item', 'visible']
        };

        super(args);

        const text = new Label({
            class: 'splat-item-text',
            text: name
        });

        const remove = new PcuiElement({
            dom: createSvg(deleteSvg),
            class: 'splat-item-delete'
        });

        this.append(text);
        this.append(remove);

        this.getName = () => {
            return text.value;
        };

        this.setName = (value: string) => {
            text.value = value;
        };

        this.getSelected = () => {
            return this.class.contains('selected');
        };

        this.setSelected = (value: boolean) => {
            if (value !== this.selected) {
                if (value) {
                    this.class.add('selected');
                    this.emit('select', this);
                } else {
                    this.class.remove('selected');
                    this.emit('unselect', this);
                }
            }
        };

        const handleRemove = (event: MouseEvent) => {
            event.stopPropagation();
            this.emit('removeClicked', this);
        };

        remove.dom.addEventListener('click', handleRemove);

        this.destroy = () => {
            remove.dom.removeEventListener('click', handleRemove);
        };
    }

    set name(value: string) {
        this.setName(value);
    }

    get name() {
        return this.getName();
    }

    set selected(value) {
        this.setSelected(value);
    }

    get selected() {
        return this.getSelected();
    }
}

class StimuliList extends Container {
    constructor(events: Events, args = {}) {
        args = {
            ...args,
            class: 'splat-list'
        };

        super(args);

        const items = new Map<Stimulus, StimulusItem>();

        events.on('scene.elementAdded', (element: Element) => {
            if (element.type === ElementType.gaze_stimulus) {
                const stimulus = element as Stimulus;
                const item = new StimulusItem(stimulus.name);
                this.append(item);
                items.set(stimulus, item);
            }
        });

        events.on('scene.elementRemoved', (element: Element) => {
            if (element.type === ElementType.gaze_stimulus) {
                const stimulus = element as Stimulus;
                const item = items.get(stimulus);
                if (item) {
                    this.remove(item);
                    items.delete(stimulus);
                }
            }
        });

        events.on('selection.changed', (selection: Stimulus) => {
            items.forEach((value, key) => {
                value.selected = key === selection;
            });
        });

        events.on('splat.name', (stimulus: Stimulus) => {
            const item = items.get(stimulus);
            if (item) {
                item.name = stimulus.name;
            }
        });

        this.on('click', (item: StimulusItem) => {
            for (const [key, value] of items) {
                if (item === value) {
                    events.fire('selection', key);
                    break;
                }
            }
        });

        this.on('removeClicked', (item: StimulusItem) => {
            let stimulus;
            for (const [key, value] of items) {
                if (item === value) {
                    stimulus = key;
                    break;
                }
            }

            if (!stimulus) {
                return;
            }
            stimulus.remove();
            stimulus.destroy();
        });
    }

    protected _onAppendChild(element: PcuiElement): void {
        super._onAppendChild(element);

        if (element instanceof StimulusItem) {
            element.on('click', () => {
                this.emit('click', element);
            });

            element.on('removeClicked', () => {
                this.emit('removeClicked', element);
            });
        }
    }

    protected _onRemoveChild(element: PcuiElement): void {
        if (element instanceof StimulusItem) {
            element.unbind('click');
            element.unbind('removeClicked');
        }

        super._onRemoveChild(element);
    }
}

export { StimuliList, StimulusItem };
