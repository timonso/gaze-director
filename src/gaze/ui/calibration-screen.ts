import {
    Color,
    ELEMENTTYPE_IMAGE,
    Entity,
    SCALEMODE_BLEND,
    Vec2
} from 'playcanvas';

import { Events } from 'src/events';
import { Scene } from 'src/scene';

import crossVector from '../images/cross.svg';

const GRID_SIZE = 20; // 5 columns x 4 rows

class CalibrationScreen {
    calibrated = false;
    blackoutScreen: Entity;
    _grid: HTMLDivElement;
    _overlay: HTMLDivElement;
    _calibratedCount = 0;

    constructor(scene: Scene, events: Events) {
        this.blackoutScreen = new Entity('blackout-screen');
        this.blackoutScreen.addComponent('screen', {
            screenSpace: true,
            scaleMode: SCALEMODE_BLEND,
            margin: [0, 0, 0, 0],
            pivot: [0.5, 0.5],
            scaleBlend: 0.5,
            referenceResolution: new Vec2(
                scene.graphicsDevice.width,
                scene.graphicsDevice.height
            )
        });

        const background = new Entity('blackout-screen_background');
        background.addComponent('element', {
            type: ELEMENTTYPE_IMAGE,
            anchor: [0, 0, 1, 1],
            pivot: [0.5, 0.5],
            margin: [0, 0, 0, 0],
            width: scene.graphicsDevice.width,
            height: scene.graphicsDevice.height,
            color: new Color(0.0, 0.0, 0.0)
        });

        scene.app.root.addChild(this.blackoutScreen);
        this.blackoutScreen.addChild(background);
        this.blackoutScreen.enabled = false;

        const overlay = (this._overlay = document.createElement('div'));
        overlay.id = 'calibration-screen-overlay';
        overlay.style.display = 'none';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.zIndex = '9999';
        overlay.style.cursor = 'crosshair';
        overlay.style.backgroundColor = 'rgba(30, 30, 30, 1.0)';
        document.body.appendChild(overlay);

        overlay.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            events.fire('gaze.toggleCalibrationScreen');
        });

        const cross = document.createElement('img');
        cross.src = crossVector;
        cross.style.position = 'absolute';
        cross.style.width = '48px';
        cross.style.height = '48px';
        cross.style.top = '50%';
        cross.style.left = '50%';
        cross.style.transform = 'translate(-50%, -50%)';
        cross.style.filter = 'invert(1)';
        overlay.appendChild(cross);

        this._grid = this.generateCalibrationGrid();
        overlay.appendChild(this._grid);

        events.on('camera.resize', ({ width, height }) => {
            background.element.width = width;
            background.element.height = height;
        });

        events.on('gaze.showBlackoutScreen', (value: boolean) => {
            this.blackoutScreen.enabled = value;
            scene.forceRender = true;
        });

        events.on('gaze.toggleBlackoutScreen', () => {
            events.fire(
                'gaze.showBlackoutScreen',
                !this.blackoutScreen.enabled
            );
        });

        events.on('gaze.showCalibrationScreen', (value: boolean) => {
            overlay.style.display = value ? 'block' : 'none';
            this._grid.style.display = this.calibrated ? 'none' : 'grid';
        });

        events.on('gaze.toggleCalibrationScreen', () => {
            events.fire(
                'gaze.showCalibrationScreen',
                overlay.style.display !== 'block'
            );
        });

        events.on('gaze.startCalibration', () => {
            this.calibrated = false;
            this._calibratedCount = 0;
            this._overlay.removeChild(this._grid);
            this._grid = this.generateCalibrationGrid();
            this._overlay.appendChild(this._grid);
            events.fire('gaze.showCalibrationScreen', true);
            events.fire('gaze.resetCalibration');
            events.fire('gaze.startTracking', true, 'ridge');
        });

        events.on('gaze.stopCalibration', () => {
            events.fire('gaze.showCalibrationScreen', false);
            events.fire('gaze.stopTracking');
        });
    }

    generateCalibrationGrid(): HTMLDivElement {
        const grid = (this._grid = document.createElement('div'));
        grid.style.display = 'grid';
        grid.style.width = '100%';
        grid.style.height = '100%';
        grid.style.position = 'relative';
        grid.style.pointerEvents = 'auto';
        grid.style.gridTemplateColumns = 'repeat(5, 100px)';
        grid.style.gridTemplateRows = 'repeat(4, 100px)';
        grid.style.justifyContent = 'space-between';
        grid.style.alignContent = 'space-between';
        grid.style.gap = '0';

        for (let i = 0; i < GRID_SIZE; i++) {
            const cell = document.createElement('div');
            cell.style.display = 'flex';
            cell.style.justifyContent = 'center';
            cell.style.alignItems = 'center';
            cell.style.width = '100%';
            cell.style.height = '100%';
            grid.appendChild(cell);

            const circle = document.createElement('div');
            circle.style.boxSizing = 'border-box';
            circle.style.width = '32px';
            circle.style.height = '32px';
            circle.style.cursor = 'crosshair';
            circle.style.border = '1px solid';
            circle.style.backgroundColor = 'rgba(50, 50, 50, 1.0)';
            circle.style.borderColor = 'rgba(80, 80, 80, 1.0)';
            circle.style.borderRadius = '50%';
            circle.style.pointerEvents = 'auto';
            cell.appendChild(circle);

            let clickCount = 0;
            const handleClick = () => {
                clickCount++;
                if (clickCount < 5) {
                    circle.style.borderWidth = `${clickCount * 2}px`;
                } else if (clickCount === 5) {
                    circle.style.borderColor = 'rgba(0, 150, 0, 1.0)';
                    circle.style.backgroundColor = 'rgba(0, 255, 0, 1.0)';
                    this._calibratedCount++;
                    this.calibrated = this._calibratedCount === GRID_SIZE;
                }
            };
            circle.addEventListener('click', handleClick);
        }
        return grid;
    }
}

export { CalibrationScreen };
