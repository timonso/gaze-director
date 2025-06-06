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
    DepthState,
    FUNC_LESSEQUAL
} from 'playcanvas';

import { Element, ElementType } from '../element';
import { Serializer } from '../serializer';
import * as editorShaders from './shaders/stimulus_editor-shader';

const bound = new BoundingBox();

const EDITOR_SCALE = 0.01;

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

class Stimulus extends Element {
    editorEntity: Entity;
    visible: boolean = false;
    active: boolean = false;
    editorMaterial: ShaderMaterial;
    name: string = 'stimulus';
    worldPosition: Vec3 = new Vec3(0, 0, 0);
    screenPosition: Vec3 = new Vec3(0, 0, 0);
    intensity: number = 0.095;
    startFrame: number = 0; // [frames]
    duration: number = 5.0; // [seconds]
    frequency: number = 10.0; // [Hz]
    hardness: number = 0.2; // [0..1]

    _outerRadius: number = 32; // [px]
    _editorRadius: number = 1.0; // [scene units]
    _updateHandle: EventHandle;
    _enableHandle: EventHandle;
    _materialUpdateHandle: EventHandle;

    set radius(radius: number) {
        this._outerRadius = radius;

        const r = (this._editorRadius = radius * EDITOR_SCALE);
        this.editorEntity.setLocalScale(r, r, r);
    }
    get radius() {
        return this._outerRadius;
    }

    constructor(
        position: Vec3 = new Vec3(0, 0, 0),
        radius: number = 32,
        duration: number = 5.0,
        startFrame: number = 0,
        intensity: number = 0.095,
        frequency: number = 10.0,
        hardness: number = 0.2
    ) {
        super(ElementType.gaze_stimulus);

        this.editorEntity = new Entity('stimulus_editor');

        this.editorEntity.addComponent('render', {
            type: 'sphere'
        });

        this.editorMaterial = createMaterial('stimulus_editor', editorShaders.vertexShader, editorShaders.fragmentShader);

        this.duration = duration;
        this.startFrame = startFrame;
        this.frequency = frequency;
        this.intensity = intensity;
        this.hardness = hardness;
        this.radius = radius;

        this.worldPosition = position;
        this.editorEntity.setPosition(position);
    }

    add() {
        const scene = this.scene;
        const events = this.scene.events;

        scene.contentRoot.addChild(this.editorEntity);
        this.worldPosition = this.editorEntity.getPosition();

        this.editorEntity.render.meshInstances[0].material = this.editorMaterial;
        this.editorMaterial.update();
        this.editorEntity.render.layers = [scene.gaze_editorLayer.id];
        this.updateBound();

        // eslint-disable-next-line prefer-const
        let frameRate = 30; // [fps]
        events.fire('timeline.frameRate', frameRate);
        const endFrame = this.startFrame + this.duration * frameRate;

        this.name =
            `S [ ${
                [`s: ${this.startFrame}`,
                    `d: ${this.duration}`,
                    `e: ${endFrame}`,
                    `r: ${this.radius}`,
                    `i: ${this.intensity}`,
                    `h: ${this.hardness}`,
                    `f: ${this.frequency}`].join(' | ')} ]`;


        this._updateHandle = events.on('timeline.time', (time: number) => {
            const scheduled = (time >= this.startFrame) && (time <= endFrame);

            if (!scheduled) {
                if (this.active) {
                    this.active = false;
                    events.invoke('gaze.requestStimulusUpdate', null);
                }
            } else {
                if (!this.active) {
                    this.active = events.invoke('gaze.requestStimulusUpdate', this);
                }
                // update stimulus projection
                scene.camera.worldToScreen(this.worldPosition, this.screenPosition);

                const culled = !scene.camera.entity.camera.frustum.containsPoint(this.worldPosition);

                // TODO: perform gaze proximity check
                const suppressed = false;
                this.visible = this.active && !culled && !suppressed;
            }
        });

        this._enableHandle = events.on(
            'timeline.setPlaying',
            (value: boolean) => {
                this.active = false;
                this.visible = false;
                scene.forceRender = true;
            }
        );
    }

    remove() {
        this.scene.contentRoot.removeChild(this.editorEntity);
        this.scene.boundDirty = true;
        // console.log(`Removed stimulus: ${this.name}`);
    }

    destroy() {
        this._updateHandle?.off();
        this._enableHandle?.off();
        this._materialUpdateHandle?.off();
        super.destroy();
        // console.log(`Destroyed stimulus: ${this.name}`);
    }

    serialize(serializer: Serializer): void {
        serializer.packa(this.editorEntity.getWorldTransform().data);
        // serializer.pack(this.radius);
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

export { Stimulus };
