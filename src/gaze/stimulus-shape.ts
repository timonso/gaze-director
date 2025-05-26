import {
    BLENDEQUATION_ADD,
    BLENDMODE_ONE,
    BLENDMODE_ONE_MINUS_SRC_ALPHA,
    BLENDMODE_SRC_ALPHA,
    CULLFACE_FRONT,
    BlendState,
    BoundingBox,
    Entity,
    ShaderMaterial,
    Vec3,
    Component,
    EventHandle
} from 'playcanvas';

import { Events } from 'src/events';

import { Element, ElementType } from '../element';
import { Serializer } from '../serializer';
// TODO: create both debug and modulation shaders
import { vertexShader, fragmentShader } from './shaders/gaze-target-shader';

const bound = new BoundingBox();

const DEBUG_SCALE = 0.1;
const IS_PLAYING = false;

class StimulusShape extends Element {
    pivot: Entity;
    material: ShaderMaterial;
    active: boolean = true;
    visible: boolean = true;
    name: string = 'stimulus';

    startFrame: number;
    maxDuration: number; // [frames]
    _radius: number;

    _updateHandle: EventHandle;
    _debugRadius: number = 1.0; // [scene units]

    constructor(events: Events, position: Vec3 = new Vec3(0, 0, 0), radius: number = 1.0, maxDuration: number = 10, startFrame: number = 0) {
        super(ElementType.gaze_stimulus);

        this.pivot = new Entity('stimulus');
        this.pivot.addComponent('render', {
            type: 'sphere'
        });
        const debugRenderer = this.pivot.findComponent('render');
        // const modulationRenderer = this.pivot.addComponent('render', {
        //     type: 'sphere'
        // });
        // modulationRenderer.enabled = this.active && IS_PLAYING;
        this.maxDuration = maxDuration;
        this.startFrame = startFrame;

        const endFrame = this.startFrame + this.maxDuration;

        this._updateHandle = events.on('timeline.time', (time: number) => {
            debugRenderer.enabled = time >= this.startFrame && time <= endFrame;
        });

        this._radius = radius;
        this.name = `stim [ r: ${this.radius} | s: ${this.startFrame} | d: ${this.maxDuration} ]`;

        const r = this._debugRadius = this._radius * DEBUG_SCALE;
        this.pivot.setLocalPosition(position);
        this.pivot.setLocalScale(r, r, r);
    }

    add() {
        const material = new ShaderMaterial({
            uniqueName: 'stimlus-shape',
            // @ts-ignore
            vertexCode: vertexShader,
            fragmentCode: fragmentShader
        });
        // material.cull = CULLFACE_FRONT;
        material.blendState = new BlendState(
            true,
            BLENDEQUATION_ADD, BLENDMODE_SRC_ALPHA, BLENDMODE_ONE_MINUS_SRC_ALPHA,
            BLENDEQUATION_ADD, BLENDMODE_ONE, BLENDMODE_ONE_MINUS_SRC_ALPHA
        );

        material.setParameter('radius', this._radius || 1.0); // [px]
        material.update();

        this.pivot.render.meshInstances[0].material = material;
        this.pivot.render.layers = [this.scene.gaze_stimulusLayer.id];

        this.material = material;

        this.scene.contentRoot.addChild(this.pivot);

        this.updateBound();
    }

    remove() {
        this.scene.contentRoot.removeChild(this.pivot);
        this.scene.boundDirty = true;
    }

    destroy() {
        this._updateHandle?.off();
        super.destroy();
    }

    serialize(serializer: Serializer): void {
        serializer.packa(this.pivot.getWorldTransform().data);
        // serializer.pack(this.radius);
    }

    // onPreRender() {
    //     this.target.getWorldTransform().getTranslation(v);
    //     this.material.setParameter('sphere', [v.x, v.y, v.z, this.radius]);

    //     const device = this.scene.graphicsDevice;
    //     device.scope.resolve('targetSize').setValue([device.width, device.height]);
    // }

    moved() {
        this.updateBound();
    }

    updateBound() {
        bound.center.copy(this.pivot.getPosition());
        bound.halfExtents.set(1.0, 1.0, 1.0);
        this.scene.boundDirty = true;
    }

    get worldBound(): BoundingBox | null {
        return bound;
    }

    set radius(radius: number) {
        this._radius = radius;

        const r = this._debugRadius = radius * DEBUG_SCALE;
        this.pivot.setLocalScale(r, r, r);

        this.updateBound();
    }

    get radius() {
        return this._radius;
    }
}

export { StimulusShape };
