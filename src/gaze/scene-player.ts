import { Events } from 'src/events';
import { Scene } from 'src/scene';

class ScenePlayer {
    _isPlaying: boolean = false;

    constructor(scene: Scene, events: Events) {
        this.setupRendering(scene, events);

        events.on('timeline.setPlaying', (value: boolean) => {
            scene.app.autoRender = value;
            scene.gaze_editorLayer.enabled = !value;
        });

        events.on('gaze.toggleInterface', () => {
            document.body.classList.toggle('hidden');
        });

        events.on('gaze.showStimuliEditor', (isVisible: boolean) => {
            scene.gaze_editorLayer.enabled = isVisible;
        });

        events.on('gaze.showStimuliPlayer', (isVisible: boolean) => {
            scene.gaze_stimulusLayer.enabled = isVisible;
        });

        events.on('gaze.setInterfaceHidden', (isHidden: boolean) => {
            if (isHidden) {
                document.body.classList.add('hidden');
            } else {
                document.body.classList.remove('hidden');
            }
        });

        events.on('gaze.toggleScene', () => {
            events.fire(this._isPlaying ? 'gaze.stopScene' : 'gaze.playScene');
        });

        events.on('gaze.playScene', () => {
            this._isPlaying = true;
            scene.gizmoLayer.enabled = false;
            events.fire('gaze.showCalibrationScreen', true);
            // TODO: re-enable for production
            // events.fire('gaze.removeTrackingDot');
            events.fire('gaze.showCalibrationScreen', false);
            events.fire('gaze.setInterfaceHidden', true);
            events.fire('grid.setVisible', false);
            events.fire('camera.setBound', false);
            events.fire('camera.setOverlay', false);
            events.fire('timeline.setPlaying', false);
            events.fire('timeline.setFrame', 0);
            events.fire('timeline.setPlaying', true);
        });

        events.on('gaze.stopScene', () => {
            this._isPlaying = false;
            scene.gizmoLayer.enabled = true;
            events.fire('gaze.setInterfaceHidden', false);
            events.fire('grid.visible', true);
            events.fire('camera.setBound', true);
            events.fire('timeline.setPlaying', false);
        });
    }

    setupRendering(scene: Scene, events: Events) {
        events.fire('timeline.setFrameRate', 30);
        events.fire('timeline.setFrames', 300);
        scene.camera.entity.camera.requestSceneColorMap(true);
        scene.camera.entity.camera.requestSceneDepthMap(true);
        // scene.graphicsDevice.maxPixelRatio = 1;
        // scene.graphicsDevice.setResolution(1920, 1080);
        // console.log('resolution set');
    }
}

export { ScenePlayer };
