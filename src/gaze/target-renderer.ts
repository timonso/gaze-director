import { Color, Entity, FILTER_LINEAR, FILTER_LINEAR_MIPMAP_LINEAR, GraphicsDevice, PIXELFORMAT_R8_G8_B8_A8, RenderTarget, Texture } from 'playcanvas';

import { Element, ElementType } from 'src/element';
import { Events } from 'src/events';
import { Scene } from 'src/scene';

class TargetRenderer extends Element {
    entity: Entity;
    backgroundBuffer: Texture;
    renderTarget: RenderTarget;
    resolutionFactor: number;

    constructor(scene: Scene, events: Events) {
        super(ElementType.other);

        this.entity = new Entity('target-renderer');
        this.entity.addComponent('camera');

        // level of downsampling applied to the background buffer to reduce memory usage
        this.resolutionFactor = 1;

        const device = scene.app.graphicsDevice;
        this.resizeRenderTarget(device, scene);

        const backgroundCamera = this.entity.camera;

        backgroundCamera.copy(scene.camera.entity.camera);
        backgroundCamera.clearColor = new Color(0, 0, 0, 0);

        // ensure this camera renders before the main camera to avoid frame delay issues
        backgroundCamera.priority = 0;
        scene.camera.entity.camera.priority = 1;

        const worldLayer = scene.app.scene.layers.getLayerByName('World');
        backgroundCamera.layers = [worldLayer.id];

        scene.camera.entity.addChild(this.entity);
        backgroundCamera.enabled = false;

        events.on('gaze.toggleTargetRenderer', (value: boolean) => {
            backgroundCamera.enabled = value;
        });

        events.function('gaze.getBackgroundBuffer', () => {
            return this.backgroundBuffer;
        });

        events.function('gaze.getResolutionFactor', () => {
            return this.resolutionFactor;
        });

        events.on('camera.resize', () => {
            this.updateCamera(scene);
            this.resizeRenderTarget(device, scene);
        });

        events.on('camera.fov', () => this.updateCamera(scene));
        events.on('camera.tonemapping', () => this.updateCamera(scene));
    }

    resizeRenderTarget(device: GraphicsDevice, scene: Scene) {
        if (this.backgroundBuffer) this.backgroundBuffer.destroy();
        if (this.renderTarget) this.renderTarget.destroy();

        this.backgroundBuffer = new Texture(device, {
            width: Math.floor(device.width / this.resolutionFactor),
            height: Math.floor(device.height / this.resolutionFactor),
            format: PIXELFORMAT_R8_G8_B8_A8,
            mipmaps: false
        });

        this.renderTarget = new RenderTarget({
            colorBuffer: this.backgroundBuffer,
            depth: false
        });

        this.entity.camera.renderTarget = this.renderTarget;
    }

    updateCamera(scene: Scene) {
        const effectiveCamera = scene.camera.entity.camera;
        const backgroundCamera = this.entity.camera;

        backgroundCamera.projection = effectiveCamera.projection;
        backgroundCamera.horizontalFov = effectiveCamera.horizontalFov;
        backgroundCamera.fov = effectiveCamera.fov;
        backgroundCamera.nearClip = effectiveCamera.nearClip;
        backgroundCamera.farClip = effectiveCamera.farClip;
        backgroundCamera.orthoHeight = effectiveCamera.orthoHeight;
        backgroundCamera.toneMapping = effectiveCamera.toneMapping;
    }
}

export { TargetRenderer };
