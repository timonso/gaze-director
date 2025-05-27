import { Events } from 'src/events';
import { Scene } from 'src/scene';

class ScenePlayer {
    constructor(scene: Scene, events: Events) {
        events.on('gaze.toggleInterface', () => {
            document.body.classList.toggle('hidden');
        });

        events.on('gaze.setInterfaceHidden', (isHidden: boolean) => {
            if (isHidden) {
                document.body.classList.add('hidden');
            } else {
                document.body.classList.remove('hidden');
            }
        });

        events.on('gaze.playScene', () => {
            events.fire('gaze.setInterfaceHidden', true);
            events.fire('grid.setVisible', false);
            events.fire('camera.setBound', false);
            events.fire('timeline.setPlaying', false);
            events.fire('timeline.setFrame', 0);
            events.fire('timeline.setPlaying', true);
        });

        events.on('gaze.stopScene', () => {
            events.fire('gaze.setInterfaceHidden', false);
            events.fire('grid.setVisible', true);
            events.fire('camera.setBound', true);
            events.fire('timeline.setPlaying', false);
        });
    }
}

export { ScenePlayer };
