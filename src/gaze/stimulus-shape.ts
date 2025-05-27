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
    Component,
    EventHandle,
    MeshInstance,
    Mesh,
    GraphicsDevice,
    Tracing,
    TRACEID_SHADER_ALLOC,
    CULLFACE_BACK
} from 'playcanvas';

import { Events } from 'src/events';
import { Scene } from 'src/scene';

import { Element, ElementType } from '../element';
import { Serializer } from '../serializer';
// TODO: create both debug and modulation shaders
import * as editorShaders from './shaders/stimulus_editor-shader';
import * as playerShaders from './shaders/stimulus_player-shader';

const bound = new BoundingBox();

const DEBUG_SCALE = 0.1;

function createQuadMesh(graphicsDevice: GraphicsDevice) {
    const mesh = new Mesh(graphicsDevice);
    const positions = [-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0];
    const indices = [0, 1, 2, 2, 1, 3];
    mesh.setPositions(positions);
    mesh.setIndices(indices);
    mesh.update();
    return mesh;
}

function createMaterial(name: string, vertexShader: string, fragmentShader: string) {
    const material = new ShaderMaterial({
        uniqueName: name,
        // @ts-ignore
        vertexCode: vertexShader,
        fragmentCode: fragmentShader
    });
    material.cull = CULLFACE_BACK;
    material.blendState = new BlendState(
        true,
        BLENDEQUATION_ADD,
        BLENDMODE_SRC_ALPHA,
        BLENDMODE_ONE_MINUS_SRC_ALPHA,
        BLENDEQUATION_ADD,
        BLENDMODE_ONE,
        BLENDMODE_ONE_MINUS_SRC_ALPHA
    );
    return material;
}

class StimulusShape extends Element {
    editorEntity: Entity;
    playerEntity: Entity;
    editorMaterial: ShaderMaterial;
    playerMaterial: ShaderMaterial;
    active: boolean = true;
    visible: boolean = true;
    name: string = 'stimulus';

    startFrame: number;
    maxDuration: number; // [frames]
    _radius: number;
    _debugRadius: number = 1.0; // [scene units]
    _updateHandle: EventHandle;
    _enableHandle: EventHandle;
    _materialUpdateHandle: EventHandle;

    constructor(
        scene: Scene,
        events: Events,
        position: Vec3 = new Vec3(0, 0, 0),
        radius: number = 1.0,
        maxDuration: number = 10,
        startFrame: number = 0
    ) {
        super(ElementType.gaze_stimulus);

        this.editorEntity = new Entity('stimulus_editor');
        this.playerEntity = new Entity('stimulus_player');

        this.editorEntity.addComponent('render', {
            type: 'sphere'
        });

        this.playerEntity.addComponent('render', {
            type: 'sphere'
        });

        this.editorMaterial = createMaterial('stimulus_editor', editorShaders.vertexShader, editorShaders.fragmentShader);
        this.playerMaterial = createMaterial('stimulus_player', playerShaders.vertexShader, playerShaders.fragmentShader);

        this.maxDuration = maxDuration;
        this.startFrame = startFrame;

        const endFrame = this.startFrame + this.maxDuration;

        this._radius = radius;
        this.name = `stim [ r: ${this.radius} | s: ${this.startFrame} | d: ${this.maxDuration} ]`;

        const r = (this._debugRadius = this._radius * DEBUG_SCALE);
        this.editorEntity.setLocalPosition(position);
        this.editorEntity.setLocalScale(r, r, r);

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

        this._materialUpdateHandle = events.on(
            'timeline.time',
            (time: number) => {
                this.playerMaterial.setParameter('currentTime', time);
                this.playerMaterial.update();
            }
        );

        // window.addEventListener('resize', () => this.updateCanvasResolution(scene));
        events.on('camera.resize', () => this.updateCanvasResolution(scene));
    }

    add() {
        this.playerEntity.render.enabled = false;
        this.editorEntity.addChild(this.playerEntity);
        this.scene.contentRoot.addChild(this.editorEntity);

        const quad = createQuadMesh(this.scene.graphicsDevice);
        this.playerEntity.render.meshInstances = [
            new MeshInstance(quad, this.playerMaterial)
        ];
        this.editorEntity.render.meshInstances[0].material = this.editorMaterial;

        this.playerMaterial.setParameter(
            'stimulusWorldPosition',
                    this.playerEntity
                    .getWorldTransform()
                    .getTranslation()
                    .toArray() as number[]
        );
        this.playerMaterial.update();

        this.updateCanvasResolution();

        this.editorMaterial.setParameter('radius', this._radius || 1.0); // [px]
        this.editorMaterial.update();

        this.editorEntity.render.layers = [this.scene.debugLayer.id];
        this.playerEntity.render.layers = [this.scene.gaze_stimulusLayer.id];

        this.updateBound();
    }

    updateCanvasResolution(scene: Scene = this.scene) {
        const canvasResolution = [
            scene.graphicsDevice.width,
            scene.graphicsDevice.height
        ];
        this.playerMaterial.setParameter(
            'canvasResolution',
            canvasResolution
        );
        this.playerMaterial.update();
    }

    remove() {
        this.editorEntity.removeChild(this.editorEntity);
        this.scene.contentRoot.removeChild(this.editorEntity);
        this.scene.boundDirty = true;
    }

    destroy() {
        this._updateHandle?.off();
        this._enableHandle?.off();
        this._materialUpdateHandle?.off();
        super.destroy();
    }

    serialize(serializer: Serializer): void {
        serializer.packa(this.editorEntity.getWorldTransform().data);
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
        bound.center.copy(this.editorEntity.getPosition());
        bound.halfExtents.set(1.0, 1.0, 1.0);
        this.scene.boundDirty = true;
    }

    get worldBound(): BoundingBox | null {
        return bound;
    }

    set radius(radius: number) {
        this._radius = radius;

        const r = (this._debugRadius = radius * DEBUG_SCALE);
        this.editorEntity.setLocalScale(r, r, r);

        this.updateBound();
    }

    get radius() {
        return this._radius;
    }
}

export { StimulusShape };
