// adapted from 'src/ui/splat-list.ts'

import { Container, Label, Element as PcuiElement } from 'pcui';

import { Element, ElementType } from '../../element';
import { Events } from '../../events';
import deleteSvg from '../../ui/svg/delete.svg';
import { Modulation } from '../modulation';

const createSvg = (svgString: string) => {
    const decodedStr = decodeURIComponent(svgString.substring('data:image/svg+xml,'.length));
    return new DOMParser().parseFromString(decodedStr, 'image/svg+xml').documentElement;
};

class ModulationItem extends Container {
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

class ModulationsList extends Container {
    constructor(events: Events, args = {}) {
        args = {
            ...args,
            class: 'splat-list'
        };

        super(args);

        const items = new Map<Modulation, ModulationItem>();

        events.on('scene.elementAdded', (element: Element) => {
            if (element.type === ElementType.gaze_modulation) {
                const modulation = element as Modulation;
                const item = new ModulationItem(modulation.name);
                this.append(item);
                items.set(modulation, item);
                events.fire('gaze.modulationsChanged', items.size);
            }
        });

        events.on('scene.elementRemoved', (element: Element) => {
            if (element.type === ElementType.gaze_modulation) {
                const modulation = element as Modulation;
                const item = items.get(modulation);
                if (item) {
                    this.remove(item);
                    items.delete(modulation);
                    events.fire('gaze.modulationsChanged', items.size);
                }
            }
        });

        events.on('selection.changed', (selection: Modulation) => {
            items.forEach((value, key) => {
                value.selected = key === selection;
            });
        });

        events.on('splat.name', (modulation: Modulation) => {
            const item = items.get(modulation);
            if (item) {
                item.name = modulation.name;
            }
        });

        this.on('click', (item: ModulationItem) => {
            for (const [key, value] of items) {
                if (item === value) {
                    events.fire('selection', key);
                    break;
                }
            }
        });

        this.on('removeClicked', (item: ModulationItem) => {
            let modulation;
            for (const [key, value] of items) {
                if (item === value) {
                    modulation = key;
                    break;
                }
            }

            if (!modulation) {
                return;
            }
            modulation.remove();
            modulation.destroy();
        });
    }

    protected _onAppendChild(element: PcuiElement): void {
        super._onAppendChild(element);

        if (element instanceof ModulationItem) {
            element.on('click', () => {
                this.emit('click', element);
            });

            element.on('removeClicked', () => {
                this.emit('removeClicked', element);
            });
        }
    }

    protected _onRemoveChild(element: PcuiElement): void {
        if (element instanceof ModulationItem) {
            element.unbind('click');
            element.unbind('removeClicked');
        }

        super._onRemoveChild(element);
    }
}

export { ModulationsList, ModulationItem };
