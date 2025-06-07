import {
    BoundingBox,
    Entity,
    ShaderMaterial,
    Vec3,
    EventHandle,
    BLEND_NORMAL,
    DepthState,
    FUNC_LESSEQUAL,
    Texture,
    Color,
    SEMANTIC_POSITION,
    SEMANTIC_NORMAL
} from 'playcanvas';

import { Events } from 'src/events';
import { Scene } from 'src/scene';

import { Element, ElementType } from '../element';
import { Serializer } from '../serializer';
import * as editorShaders from './shaders/target_editor-shader';

const bound = new BoundingBox();

const DEBUG_SCALE = 0.01;

function createMaterial(name: string, vertexShader: string, fragmentShader: string) {
    const material = new ShaderMaterial({
        attributes: {
            vertex_position: SEMANTIC_POSITION,
            aNormal: SEMANTIC_NORMAL
        },
        uniqueName: name,
        // @ts-ignore
        vertexCode: vertexShader,
        fragmentCode: fragmentShader
    });
    // material.cull = CULLFACE_BACK;
    material.blendType = BLEND_NORMAL;
    material.depthTest = true;
    material.depthState = new DepthState(FUNC_LESSEQUAL, true);
    return material;
}

class Target extends Element {
    editorEntity: Entity;
    material: ShaderMaterial;
    name: string = 'target';
    _opacity: number = 1.0;
    _color: Color = new Color(1, 1, 1, 1);

    startFrame: number;
    duration: number = 2.0; // [seconds]
    _lightPosition: Vec3 = new Vec3(0, 10, 10);
    _specularFactor: number = 10.0; // [0-1]
    _backgroundBuffer: Texture;
    _radius: number = 32; // [px]
    _debugRadius: number = 1.0; // [scene units]
    _timelineUpdateHandle: EventHandle;
    _enableHandle: EventHandle;
    _resizeHandle: EventHandle;
    _updateHandle: EventHandle;

    set radius(radius: number) {
        this._radius = radius;
        const r = (this._debugRadius = radius * DEBUG_SCALE);
        this.editorEntity.setLocalScale(r, r, r);
    }
    get radius() {
        return this._radius;
    }

    set color(value: Color) {
        this._color = value;
        this.material.setParameter('color', value.toArray());
        this.material.update();
    }
    get color() {
        return this._color;
    }

    set opacity(value: number) {
        this._opacity = value;
        this.material.setParameter('opacity', value);
        this.material.update();
    }
    get opacity() {
        return this._opacity;
    }

    set lightPosition(value: Vec3) {
        this._lightPosition.copy(value);
        this.material.setParameter('lightPosition', value.toArray() as number[]);
        this.material.update();
    }
    get lightPosition() {
        return this._lightPosition;
    }

    set specularFactor(value: number) {
        this._specularFactor = value;
        this.material.setParameter('specularFactor', value);
        this.material.update();
    }
    get specularFactor() {
        return this._specularFactor;
    }

    constructor(
        scene: Scene,
        events: Events,
        position: Vec3 = new Vec3(0, 0, 0),
        radius: number = 32,
        duration: number = 5.0,
        startFrame: number = 0,
        opacity: number = 0.2
    ) {
        super(ElementType.gaze_target);

        this.editorEntity = new Entity('target_editor');

        this.editorEntity.addComponent('render', {
            type: 'sphere'
        });

        this.material = createMaterial('target_editor', editorShaders.vertexShader, editorShaders.fragmentShader);

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

        this.name =
            `T [ ${
                [
                    `s: ${this.startFrame}`,
                    `d: ${this.duration}`,
                    `e: ${endFrame}`,
                    `r: ${this.radius}`,
                    `o: ${this.opacity}`
                ].join(' | ')
            } ]`;

        const playerRenderer = this.editorEntity.render;

        const resolutionFactor = events.invoke('gaze.getResolutionFactor');
        this.material.setParameter('resolutionFactor', resolutionFactor);

        this._timelineUpdateHandle = events.on('timeline.time', (time: number) => {
            const scheduled = time >= this.startFrame && time <= endFrame;
            playerRenderer.enabled = scheduled;
        });

        this._enableHandle = events.on(
            'timeline.setPlaying',
            (value: boolean) => {
                playerRenderer.enabled = !value;
                this.scene.forceRender = true;
            }
        );

        this._resizeHandle = events.on('camera.resize', () => {
            this._backgroundBuffer = events.invoke('gaze.getBackgroundBuffer');
            this.material.setParameter('backgroundBuffer', this._backgroundBuffer);
            this.material.update();
        });

        this._updateHandle = scene.app.on('update', () => {
            const cameraPosition = scene.camera.entity.getPosition().toArray() as number[];
            this.material.setParameter('cameraPosition', cameraPosition);
            this.material.update();
        });
    }

    add() {
        this.scene.contentRoot.addChild(this.editorEntity);

        this.editorEntity.render.material = this.material;
        this.material.setParameter('opacity', this.opacity);
        this.material.setParameter('color', this.color.toArray());
        this.material.setParameter('lightPosition', this.lightPosition.toArray() as number[]);
        this.material.setParameter('specularFactor', this.specularFactor);
        this.material.update();

        this.editorEntity.render.layers = [this.scene.gaze_targetLayer.id];

        this.updateBound();
    }

    remove() {
        this.scene.contentRoot.removeChild(this.editorEntity);
        this.scene.boundDirty = true;
    }

    destroy() {
        this._timelineUpdateHandle?.off();
        this._enableHandle?.off();
        this._resizeHandle?.off();
        this._updateHandle?.off();
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
