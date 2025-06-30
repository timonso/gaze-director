import {
    createShaderFromCode,
    GraphicsDevice,
    Layer,
    PIXELFORMAT_R8_G8_B8_A8,
    QuadRender,
    RenderTarget,
    SEMANTIC_POSITION,
    Shader,
    Texture,
    WebglGraphicsDevice
} from 'playcanvas';

import { ElementType, Element } from 'src/element';
import { Events } from 'src/events';
import { Scene } from 'src/scene';

import { Modulation } from './modulation';
import * as playerShaders from './shaders/modulation_player-shader';

class ModulationRenderer extends Element {
    shader: Shader;
    modulationsLayer: QuadRender;
    currentModulation: Modulation = null;
    _currentTime: number = 0;
    _overlayColorBuffer: Texture;
    _overlayRenderTarget: any;
    _pixelScale: number = 1;

    constructor(scene: Scene, events: Events) {
        super(ElementType.other);

        this.shader = createShaderFromCode(
            scene.app.graphicsDevice,
            playerShaders.vertexShader,
            playerShaders.fragmentShader,
            'modulation-renderer',
            {
                vertex_position: SEMANTIC_POSITION
            }
        );

        const device = scene.app.graphicsDevice;
        const effectiveCamera = scene.camera.entity.camera;
        this.modulationsLayer = new QuadRender(this.shader);

        this._overlayColorBuffer = new Texture(device, {
            width: device.width,
            height: device.height,
            format: PIXELFORMAT_R8_G8_B8_A8,
            mipmaps: false
        });

        this._overlayRenderTarget = new RenderTarget({
            colorBuffer: this._overlayColorBuffer,
            depth: false
        });

        const screenPostion_loc = device.scope.resolve(
            'modulationScreenPosition'
        );
        const currentTime_loc = device.scope.resolve('currentTime');
        const outerRadius_loc = device.scope.resolve('outerRadius');
        const halfVariance_loc = device.scope.resolve('halfVariance');
        const modulationIntensity_loc = device.scope.resolve('modulationIntensity');
        const modulationFrequency_loc = device.scope.resolve('modulationFrequency');
        const sceneBuffer_loc = device.scope.resolve('sceneBuffer');

        // eslint-disable-next-line prefer-const
        let frameRate = 30; // [fps]
        events.fire('timeline.frameRate', frameRate);

        events.on('timeline.time', (time: number) => {
            this._currentTime = time;
        });

        events.on('timeline.setPlaying', (_) => {
            this.currentModulation = null;
        });

        events.function('gaze.requestModulationUpdate', (modulation: Modulation) => {
            // always accept modulation deactivations
            if (!modulation) {
                this.currentModulation = modulation;
                return true;
            }

            // current modulation is still active
            if (this.currentModulation) return false;

            this.currentModulation = modulation;

            // adjust for device pixel ratio
            const nativeRadius = modulation.outerRadius * this._pixelScale;

            // precompute constant gaussian subterm 1 / (2 * sigma^2)
            const sigma = nativeRadius * modulation.hardness;
            const halfVariance = 1.0 / (2.0 * sigma ** 2);

            outerRadius_loc.setValue(nativeRadius);
            halfVariance_loc.setValue(halfVariance);
            modulationIntensity_loc.setValue(modulation.intensity);
            modulationFrequency_loc.setValue(modulation.frequency);
            // sceneBuffer_loc.setValue(effectiveCamera.renderTarget.colorBuffer);

            return true;
        }
        );

        // TODO: change to event listener
        const secondsPerFrame = 1 / frameRate;

        effectiveCamera.on('postRenderLayer', (layer: Layer, _) => {
            if (
                layer !== scene.gaze_modulationLayer ||
                !this.currentModulation ||
                !this.currentModulation.visible
            ) {
                return;
            }

            const screenPosition = this.getCanvasScreenPosition(device);
            screenPostion_loc.setValue(screenPosition);
            currentTime_loc.setValue(this._currentTime * secondsPerFrame);

            const glDevice = device as WebglGraphicsDevice;
            glDevice.setRenderTarget(this._overlayRenderTarget);
            glDevice.updateBegin();
            this.modulationsLayer.render();
            glDevice.updateEnd();
            glDevice.copyRenderTarget(
                this._overlayRenderTarget,
                effectiveCamera.renderTarget,
                true
            );
        });

        events.on('camera.resize', () => {
            this.resizeRenderTarget(device);
            sceneBuffer_loc.setValue(effectiveCamera.renderTarget.colorBuffer);
        });

        this.resizeRenderTarget(device);
    }

    // get the modulation screen position in WebGL coordinates
    getCanvasScreenPosition(device: GraphicsDevice): number[] {
        const screenPosition = [
            this.currentModulation.screenPosition.x * this._pixelScale,
            device.height - this.currentModulation.screenPosition.y * this._pixelScale
        ];
        // console.log(screenPosition);
        return screenPosition;
    }

    resizeRenderTarget(device: GraphicsDevice) {
        if (this._overlayColorBuffer) this._overlayColorBuffer.destroy();
        if (this._overlayRenderTarget) this._overlayRenderTarget.destroy();

        this._pixelScale = device.maxPixelRatio;

        this._overlayColorBuffer = new Texture(device, {
            width: device.width,
            height: device.height,
            format: PIXELFORMAT_R8_G8_B8_A8,
            mipmaps: false
        });

        this._overlayRenderTarget = new RenderTarget({
            colorBuffer: this._overlayColorBuffer,
            depth: false
        });
    }
}

export { ModulationRenderer };
