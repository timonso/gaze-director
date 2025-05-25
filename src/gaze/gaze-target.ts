import {
    BLENDEQUATION_ADD,
    BLENDMODE_ONE,
    BLENDMODE_ONE_MINUS_SRC_ALPHA,
    BLENDMODE_SRC_ALPHA,
    CULLFACE_FRONT,
    BlendState,
    BoundingBox,
    Entity,
    ShaderMaterial
} from 'playcanvas';

import { Element, ElementType } from '../element';
import { Serializer } from '../serializer';
import { vertexShader, fragmentShader } from './shaders/gaze-target-shader';

const bound = new BoundingBox();

class GazeTarget extends Element {
    pivot: Entity;
    material: ShaderMaterial;

    constructor() {
        super(ElementType.debug);

        this.pivot = new Entity('target');
        this.pivot.addComponent('render', {
            type: 'sphere'
        });
        this.pivot.setLocalScale(1.0, 1.0, 1.0);
    }

    add() {
        const material = new ShaderMaterial({
            uniqueName: 'gazeTarget',
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
        material.update();

        this.pivot.render.meshInstances[0].material = material;
        this.pivot.render.layers = [this.scene.gazeLayer.id];

        this.material = material;

        this.scene.contentRoot.addChild(this.pivot);

        this.updateBound();
    }

    remove() {
        this.scene.contentRoot.removeChild(this.pivot);
        this.scene.boundDirty = true;
    }

    destroy() {

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

    // set radius(radius: number) {
    //     this._radius = radius;

    //     const r = this._radius * 2;
    //     this.pivot.setLocalScale(r, r, r);

    //     this.updateBound();
    // }

    // get radius() {
    //     return this._radius;
    // }
}

export { GazeTarget };
