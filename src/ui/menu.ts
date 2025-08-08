import { Container, Element, Label } from 'pcui';

import { Events } from '../events';
import { localize } from './localization';
import { MenuPanel } from './menu-panel';
import arrowSvg from './svg/arrow.svg';
import collapseSvg from './svg/collapse.svg';
import selectDelete from './svg/delete.svg';
import sceneExport from './svg/export.svg';
import sceneImport from './svg/import.svg';
import sceneNew from './svg/new.svg';
import sceneOpen from './svg/open.svg';
import logoSvg from './svg/playcanvas-logo.svg';
import scenePublish from './svg/publish.svg';
import sceneSave from './svg/save.svg';
import selectAll from './svg/select-all.svg';
import selectDuplicate from './svg/select-duplicate.svg';
import selectInverse from './svg/select-inverse.svg';
import selectLock from './svg/select-lock.svg';
import selectNone from './svg/select-none.svg';
import selectSeparate from './svg/select-separate.svg';
import selectUnlock from './svg/select-unlock.svg';
import hideUISvg from './svg/shown.svg';

const createSvg = (svgString: string) => {
    const decodedStr = decodeURIComponent(svgString.substring('data:image/svg+xml,'.length));
    return new Element({
        dom: new DOMParser().parseFromString(decodedStr, 'image/svg+xml').documentElement
    });
};

class Menu extends Container {
    constructor(events: Events, args = {}) {
        args = {
            ...args,
            id: 'menu'
        };

        super(args);

        const menubar = new Container({
            id: 'menu-bar'
        });

        menubar.dom.addEventListener('pointerdown', (event) => {
            event.stopPropagation();
        });

        const iconDom = document.createElement('img');
        iconDom.src = logoSvg;
        iconDom.setAttribute('id', 'app-icon');
        iconDom.addEventListener('pointerdown', (event) => {
            window.open('https://playcanvas.com', '_blank').focus();
        });

        const icon = new Element({
            dom: iconDom
        });

        const scene = new Label({
            text: localize('file'),
            class: 'menu-option'
        });

        const render = new Label({
            text: localize('render'),
            class: 'menu-option'
        });

        const selection = new Label({
            text: localize('select'),
            class: 'menu-option'
        });

        const gaze = new Label({
            text: 'Gaze',
            class: 'menu-option'
        });

        const help = new Label({
            text: localize('help'),
            class: 'menu-option'
        });

        const toggleCollapsed = () => {
            document.body.classList.toggle('collapsed');
        };

        // toggle UI visibility
        const toggleHidden = () => {
            events.fire('gaze.toggleInterface');
        };

        // collapse menu on mobile
        if (document.body.clientWidth < 600) {
            toggleCollapsed();
        }

        const hideUI = createSvg(hideUISvg);
        hideUI.dom.classList.add('menu-icon');
        hideUI.dom.setAttribute('id', 'menu-hide');
        hideUI.dom.addEventListener('click', toggleHidden);

        const collapse = createSvg(collapseSvg);
        collapse.dom.classList.add('menu-icon');
        collapse.dom.setAttribute('id', 'menu-collapse');
        collapse.dom.addEventListener('click', toggleCollapsed);

        const arrow = createSvg(arrowSvg);
        arrow.dom.classList.add('menu-icon');
        arrow.dom.setAttribute('id', 'menu-arrow');
        arrow.dom.addEventListener('click', toggleCollapsed);

        const buttonsContainer = new Container({
            id: 'menu-bar-options'
        });
        buttonsContainer.append(scene);
        buttonsContainer.append(selection);
        buttonsContainer.append(render);
        buttonsContainer.append(gaze);
        buttonsContainer.append(help);
        buttonsContainer.append(collapse);
        buttonsContainer.append(hideUI);
        buttonsContainer.append(arrow);

        // menubar.append(icon);
        menubar.append(buttonsContainer);

        const exportMenuPanel = new MenuPanel([{
            text: localize('file.export.ply'),
            icon: createSvg(sceneExport),
            isEnabled: () => !events.invoke('scene.empty'),
            onSelect: () => events.invoke('scene.export', 'ply')
        }, {
            text: localize('file.export.compressed-ply'),
            icon: createSvg(sceneExport),
            isEnabled: () => !events.invoke('scene.empty'),
            onSelect: () => events.invoke('scene.export', 'compressed-ply')
        }, {
            text: localize('file.export.splat'),
            icon: createSvg(sceneExport),
            isEnabled: () => !events.invoke('scene.empty'),
            onSelect: () => events.invoke('scene.export', 'splat')
        }, {
            // separator
        }, {
            text: localize('file.export.viewer'),
            icon: createSvg(sceneExport),
            isEnabled: () => !events.invoke('scene.empty'),
            onSelect: () => events.invoke('scene.export', 'viewer')
        }]);

        const fileMenuPanel = new MenuPanel([{
            text: localize('file.new'),
            icon: createSvg(sceneNew),
            isEnabled: () => !events.invoke('scene.empty'),
            onSelect: () => events.invoke('doc.new')
        }, {
            text: localize('file.open'),
            icon: createSvg(sceneOpen),
            onSelect: async () => {
                await events.invoke('doc.open');
            }
        }, {
            // separator
        }, {
            text: localize('file.save'),
            icon: createSvg(sceneSave),
            isEnabled: () => events.invoke('doc.name'),
            onSelect: async () => await events.invoke('doc.save')
        }, {
            text: localize('file.save-as'),
            icon: createSvg(sceneSave),
            isEnabled: () => !events.invoke('scene.empty'),
            onSelect: async () => await events.invoke('doc.saveAs')
        }, {
            // separator
        }, {
            text: localize('file.import'),
            icon: createSvg(sceneImport),
            onSelect: async () => {
                await events.invoke('scene.import');
            }
        }, {
            text: localize('file.export'),
            icon: createSvg(sceneExport),
            subMenu: exportMenuPanel
        }, {
            text: localize('file.publish'),
            icon: createSvg(scenePublish),
            isEnabled: () => !events.invoke('scene.empty'),
            onSelect: async () => await events.invoke('show.publishSettingsDialog')
        }]);

        const selectionMenuPanel = new MenuPanel([{
            text: localize('select.all'),
            icon: createSvg(selectAll),
            extra: 'Ctrl + A',
            onSelect: () => events.fire('select.all')
        }, {
            text: localize('select.none'),
            icon: createSvg(selectNone),
            extra: 'Shift + A',
            onSelect: () => events.fire('select.none')
        }, {
            text: localize('select.invert'),
            icon: createSvg(selectInverse),
            extra: 'Ctrl + I',
            onSelect: () => events.fire('select.invert')
        }, {
            // separator
        }, {
            text: localize('select.lock'),
            icon: createSvg(selectLock),
            extra: 'H',
            isEnabled: () => events.invoke('selection.splats'),
            onSelect: () => events.fire('select.hide')
        }, {
            text: localize('select.unlock'),
            icon: createSvg(selectUnlock),
            extra: 'U',
            onSelect: () => events.fire('select.unhide')
        }, {
            text: localize('select.delete'),
            icon: createSvg(selectDelete),
            extra: 'Delete',
            isEnabled: () => events.invoke('selection.splats'),
            onSelect: () => events.fire('select.delete')
        }, {
            text: localize('select.reset'),
            onSelect: () => events.fire('scene.reset')
        }, {
            // separator
        }, {
            text: localize('select.duplicate'),
            icon: createSvg(selectDuplicate),
            isEnabled: () => events.invoke('selection.splats'),
            onSelect: () => events.fire('select.duplicate')
        }, {
            text: localize('select.separate'),
            icon: createSvg(selectSeparate),
            isEnabled: () => events.invoke('selection.splats'),
            onSelect: () => events.fire('select.separate')
        }]);

        const renderMenuPanel = new MenuPanel([{
            text: localize('render.image'),
            icon: createSvg(sceneExport),
            onSelect: async () => await events.invoke('show.imageSettingsDialog')
        }, {
            text: localize('render.video'),
            icon: createSvg(sceneExport),
            onSelect: async () => await events.invoke('show.videoSettingsDialog')
        }]);

        const gazeMenuPanel = new MenuPanel([{
            text: 'Start Tracking',
            icon: 'E131',
            onSelect: async () => await events.fire('gaze.startTracking')
        }, {
            text: 'Start Tracking (Debug)',
            icon: 'E131',
            onSelect: async () => await events.fire('gaze.startTracking', true)
        }, {
            text: 'Stop Tracking',
            icon: 'E135',
            onSelect: async () => await events.fire('gaze.stopTracking')
        }, {
            text: 'Save Tracking Data',
            onSelect: async () => await events.fire('gaze.saveTrackingData')
        }, {
            text: 'Load Tracking Data',
            onSelect: async () => await events.fire('gaze.loadTrackingData')
        }, {
            text: 'Clear Tracking Data',
            onSelect: async () => await events.fire('gaze.clearTrackingData')
        }, {
            // separator
        }, {
            text: 'Add Modulation',
            onSelect: async () => await events.fire('tool.gaze.modulationSelection')
        }, {
            text: 'Add Target',
            onSelect: async () => await events.fire('tool.gaze.targetSelection')
        }, {
            text: 'Toggle Target Timings',
            onSelect: async () => await events.fire('gaze.toggleTargetTimings')
        }, {
            // separator
        }, {
            text: 'Toggle Blackout Screen',
            onSelect: async () => await events.fire('gaze.toggleBlackoutScreen')
        }, {
            text: 'Toggle Calibration Screen',
            onSelect: async () => await events.fire('gaze.toggleCalibrationScreen')
        }, {
            text: 'Start Calibration',
            onSelect: async () => await events.fire('gaze.startCalibration')
        }, {
            text: 'Stop Calibration',
            onSelect: async () => await events.fire('gaze.stopCalibration')
        }, {
            text: 'Reset Calibration',
            onSelect: async () => await events.fire('gaze.resetCalibration')
        }, {
            // separator
        }, {
            text: 'Load Training Poses',
            onSelect: async () => await events.fire('gaze.loadCameraData')
        }, {
            text: 'Reconstruct Training Poses',
            onSelect: async () => await events.fire('gaze.reconstructTrainingTrajectory')
        }, {
            text: 'Reconstruct Single Pose',
            onSelect: async () => await events.fire('gaze.reconstructTrainingPose')
        }, {
            text: 'Add Training Pose',
            onSelect: async () => await events.fire('tool.gaze.poseSelection')
        }, {
            text: 'Reset Poses',
            onSelect: async () => await events.fire('timeline.resetPoses')
        }, {
            // separator
        }, {
            text: 'Setup Sequence',
            onSelect: async () => await events.fire('tool.gaze.sequenceSetup')
        }]);

        const helpMenuPanel = new MenuPanel([{
            text: localize('help.shortcuts'),
            icon: 'E136',
            onSelect: () => events.fire('show.shortcuts')
        }, {
            text: localize('help.user-guide'),
            icon: 'E232',
            onSelect: () => window.open('https://github.com/playcanvas/supersplat/wiki', '_blank').focus()
        }, {
            text: localize('help.log-issue'),
            icon: 'E336',
            onSelect: () => window.open('https://github.com/playcanvas/supersplat/issues', '_blank').focus()
        }, {
            text: localize('help.github-repo'),
            icon: 'E259',
            onSelect: () => window.open('https://github.com/playcanvas/supersplat', '_blank').focus()
        }, {
            // separator
        }, {
            text: localize('help.basics-video'),
            icon: 'E261',
            onSelect: () => window.open('https://youtu.be/MwzaEM2I55I', '_blank').focus()
        }, {
            // separator
        }, {
            text: localize('help.discord'),
            icon: 'E233',
            onSelect: () => window.open('https://discord.gg/T3pnhRTTAY', '_blank').focus()
        }, {
            text: localize('help.forum'),
            icon: 'E432',
            onSelect: () => window.open('https://forum.playcanvas.com', '_blank').focus()
        }, {
            // separator
        }, {
            text: localize('help.about'),
            icon: 'E138',
            onSelect: () => events.invoke('show.about')
        }]);

        this.append(menubar);
        this.append(fileMenuPanel);
        this.append(exportMenuPanel);
        this.append(selectionMenuPanel);
        this.append(renderMenuPanel);
        this.append(gazeMenuPanel);
        this.append(helpMenuPanel);

        const options: { dom: HTMLElement, menuPanel: MenuPanel }[] = [{
            dom: scene.dom,
            menuPanel: fileMenuPanel
        }, {
            dom: selection.dom,
            menuPanel: selectionMenuPanel
        }, {
            dom: render.dom,
            menuPanel: renderMenuPanel
        }, {
            dom: help.dom,
            menuPanel: helpMenuPanel
        }, {
            dom: gaze.dom,
            menuPanel: gazeMenuPanel
        }];

        options.forEach((option) => {
            const activate = () => {
                option.menuPanel.position(option.dom, 'bottom', 2);
                options.forEach((opt) => {
                    opt.menuPanel.hidden = opt !== option;
                });
            };

            option.dom.addEventListener('pointerdown', (event: PointerEvent) => {
                if (!option.menuPanel.hidden) {
                    option.menuPanel.hidden = true;
                } else {
                    activate();
                }
            });

            option.dom.addEventListener('pointerenter', (event: PointerEvent) => {
                if (!options.every(opt => opt.menuPanel.hidden)) {
                    activate();
                }
            });
        });

        const checkEvent = (event: PointerEvent) => {
            if (!this.dom.contains(event.target as Node)) {
                options.forEach((opt) => {
                    opt.menuPanel.hidden = true;
                });
            }
        };

        window.addEventListener('pointerdown', checkEvent, true);
        window.addEventListener('pointerup', checkEvent, true);
    }
}

export { Menu };
