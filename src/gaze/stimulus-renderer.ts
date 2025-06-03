import {
    createShaderFromCode,
    Entity,
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

import * as playerShaders from './shaders/stimulus_player-shader';
import { Stimulus } from './stimulus';

class StimulusRenderer extends Element {
    shader: Shader;
    stimuliLayer: QuadRender;
    currentStimulus: Stimulus = null;
    _currentTime: number = 0;
    _colorBuffer: Texture;
    _overlayColorBuffer: Texture;
    _overlayRenderTarget: any;
    _pixelScale: number = 1;

    constructor(scene: Scene, events: Events) {
        super(ElementType.other);

        this.shader = createShaderFromCode(
            scene.app.graphicsDevice,
            playerShaders.vertexShader,
            playerShaders.fragmentShader,
            'stimulus-renderer',
            {
                vertex_position: SEMANTIC_POSITION
            }
        );

        const device = scene.app.graphicsDevice;
        const effectiveCamera = scene.camera.entity.camera;
        this.stimuliLayer = new QuadRender(this.shader);

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

        events.on('camera.resize', () => this.resizeRenderTarget(device));

        const screenPostion_loc = device.scope.resolve(
            'stimulusScreenPosition'
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
            this.currentStimulus = null;
        });

        events.function('gaze.requestStimulusUpdate', (stimulus: Stimulus) => {
            // always accept stimulus deactivations
            if (!stimulus) {
                this.currentStimulus = stimulus;
                return true;
            }

            // current stimulus is still active
            if (this.currentStimulus) return false;

            this.currentStimulus = stimulus;

            // adjust for device pixel ratio
            const nativeRadius = stimulus.radius * this._pixelScale;

            // precompute constant gaussian subterm 1 / (2 * sigma^2)
            const sigma = nativeRadius * stimulus.hardness;
            const halfVariance = 1.0 / (2.0 * sigma ** 2);

            outerRadius_loc.setValue(nativeRadius);
            halfVariance_loc.setValue(halfVariance);
            modulationIntensity_loc.setValue(stimulus.intensity);
            modulationFrequency_loc.setValue(stimulus.frequency);

            return true;
        }
        );

        // TODO: change to event listener
        const secondsPerFrame = 1 / frameRate;

        effectiveCamera.on('postRenderLayer', (layer: Layer, _) => {
            if (
                layer !== scene.gaze_stimulusLayer ||
                !this.currentStimulus ||
                !this.currentStimulus.visible
            ) {
                return;
            }

            sceneBuffer_loc.setValue(effectiveCamera.renderTarget.colorBuffer);

            const screenPosition = this.getCanvasScreenPosition(device);
            screenPostion_loc.setValue(screenPosition);
            currentTime_loc.setValue(this._currentTime * secondsPerFrame);

            const glDevice = device as WebglGraphicsDevice;
            glDevice.setRenderTarget(this._overlayRenderTarget);
            glDevice.updateBegin();
            this.stimuliLayer.render();
            glDevice.updateEnd();
            glDevice.copyRenderTarget(
                this._overlayRenderTarget,
                effectiveCamera.renderTarget,
                true
            );
        });

        this.resizeRenderTarget(device);
    }

    // get the stimulus screen position in WebGL coordinates
    getCanvasScreenPosition(device: GraphicsDevice): number[] {
        const screenPosition = [
            this.currentStimulus.screenPosition.x * this._pixelScale,
            device.height - this.currentStimulus.screenPosition.y * this._pixelScale
        ];
        // console.log(screenPosition);
        return screenPosition;
    }

    resizeRenderTarget(device: GraphicsDevice) {
        if (this._overlayColorBuffer) this._overlayColorBuffer.destroy();
        if (this._overlayRenderTarget) this._overlayRenderTarget.destroy();

        this._pixelScale = window.devicePixelRatio;

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

        // console.log('overlay resized');
    }
}

export { StimulusRenderer };
