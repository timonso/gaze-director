import {
    BLENDEQUATION_ADD,
    BLENDMODE_ONE,
    BLENDMODE_ONE_MINUS_SRC_ALPHA,
    BLENDMODE_SRC_ALPHA,
    BlendState,
    BoundingBox,
    Entity,
    ShaderMaterial,
    Vec3,
    EventHandle,
    MeshInstance,
    Mesh,
    GraphicsDevice,
    CULLFACE_BACK,
    DepthState,
    FUNC_LESSEQUAL,
    CULLFACE_FRONT
} from 'playcanvas';

import { Events } from 'src/events';
import { Scene } from 'src/scene';

import { Element, ElementType } from '../element';
import { Serializer } from '../serializer';
import * as editorShaders from './shaders/target_editor-shader';
import * as playerShaders from './shaders/target_player-shader';

const bound = new BoundingBox();

const DEBUG_SCALE = 0.01;

function createMaterial(name: string, vertexShader: string, fragmentShader: string) {
    const material = new ShaderMaterial({
        uniqueName: name,
        // @ts-ignore
        vertexCode: vertexShader,
        fragmentCode: fragmentShader
    });
    // material.cull = CULLFACE_BACK;
    material.blendState = new BlendState(
        true,
        BLENDEQUATION_ADD,
        BLENDMODE_SRC_ALPHA,
        BLENDMODE_ONE_MINUS_SRC_ALPHA,
        BLENDEQUATION_ADD,
        BLENDMODE_ONE,
        BLENDMODE_ONE_MINUS_SRC_ALPHA
    );
    material.depthState = new DepthState(FUNC_LESSEQUAL, true);
    return material;
}

class Target extends Element {
    editorEntity: Entity;
    playerEntity: Entity;
    editorMaterial: ShaderMaterial;
    playerMaterial: ShaderMaterial;
    active: boolean = true;
    name: string = 'target';
    screenPosition: Vec3 = new Vec3(0, 0, 0);
    opacity: number = 1.0;

    startFrame: number;
    duration: number = 2.0; // [seconds]
    _radius: number = 32; // [px]
    _debugRadius: number = 1.0; // [scene units]
    _updateHandle: EventHandle;
    _enableHandle: EventHandle;

    set radius(radius: number) {
        this._radius = radius;

        const r = (this._debugRadius = radius * DEBUG_SCALE);
        this.editorEntity.setLocalScale(r, r, r);

        this.updateBound();
    }

    get radius() {
        return this._radius;
    }

    constructor(
        scene: Scene,
        events: Events,
        position: Vec3 = new Vec3(0, 0, 0),
        radius: number = 32,
        duration: number = 2.0,
        startFrame: number = 0,
        opacity: number = 1.0
    ) {
        super(ElementType.gaze_target);

        this.editorEntity = new Entity('target_editor');
        this.playerEntity = new Entity('target_player');

        this.editorEntity.addComponent('render', {
            type: 'sphere'
        });

        this.playerEntity.addComponent('render', {
            type: 'sphere'
        });

        this.editorMaterial = createMaterial('target_editor', editorShaders.vertexShader, editorShaders.fragmentShader);
        this.playerMaterial = createMaterial('target_player', playerShaders.vertexShader, playerShaders.fragmentShader);

        this.opacity = opacity;
        this.duration = duration;
        this.startFrame = startFrame;

        // eslint-disable-next-line prefer-const
        let frameRate = 30; // [fps]
        events.fire('timeline.frameRate', frameRate);
        const endFrame = this.startFrame + this.duration * frameRate;

        this._radius = radius;
        const r = (this._debugRadius = this._radius * DEBUG_SCALE);
        this.editorEntity.setPosition(position);
        this.editorEntity.setLocalScale(r, r, r);

        this.name = `T [ r: ${this.radius} | s: ${this.startFrame} | d: ${this.duration} | o: ${this.opacity} ]`;

        const editorRenderer = this.editorEntity.render;
        const playerRenderer = this.playerEntity.render;

        this._updateHandle = events.on('timeline.time', (time: number) => {
            playerRenderer.enabled =
              time >= this.startFrame && time <= endFrame;
        });

        this._enableHandle = events.on(
            'timeline.setPlaying',
            (value: boolean) => {
                playerRenderer.enabled = value && this.active;
                editorRenderer.enabled = !value && this.active;
            }
        );
    }

    add() {
        this.playerEntity.render.enabled = false;
        this.editorEntity.addChild(this.playerEntity);
        this.scene.contentRoot.addChild(this.editorEntity);

        this.playerMaterial.setParameter('targetOpacity', this.opacity);
        this.playerMaterial.update();

        this.editorEntity.render.layers = [this.scene.gaze_targetLayer.id];
        this.playerEntity.render.layers = [this.scene.gaze_targetLayer.id];

        this.updateBound();
    }

    remove() {
        this.editorEntity.removeChild(this.playerEntity);
        this.scene.contentRoot.removeChild(this.editorEntity);
        this.scene.boundDirty = true;
    }

    destroy() {
        this._updateHandle?.off();
        this._enableHandle?.off();
        super.destroy();
    }

    serialize(serializer: Serializer): void {
        serializer.packa(this.editorEntity.getWorldTransform().data);
    }

    moved() {
        this.updateBound();
    }

    updateBound() {
        bound.center.copy(this.editorEntity.getPosition());
        bound.halfExtents.set(1.0, 1.0, 1.0);
        this.scene.boundDirty = true;
    }

    get worldBound(): BoundingBox | null {
        return bound;
    }
}

export { Target };
