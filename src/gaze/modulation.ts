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
    FUNC_LESSEQUAL,
    Vec2
} from 'playcanvas';

import { Element, ElementType } from '../element';
import { Serializer } from '../serializer';
import { MODULATION_DURATION, MODULATION_FREQUENCY, MODULATION_HARDNESS, SUPPRESSION_LAG, MODULATION_VISUAL_ANGLE, STMULUS_INTENSITY, SUPPRESSION_ANGLE, SUPPRESSION_RADIUS, visualAngleToRadius } from './gaze-director';
import { GazeRecord } from './gaze-tracker';
import * as editorShaders from './shaders/modulation_editor-shader';

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

class Modulation extends Element {
    editorEntity: Entity;
    visible: boolean = false;
    active: boolean = false;
    editorMaterial: ShaderMaterial;
    name: string = 'modulation';
    worldPosition: Vec3 = new Vec3(0, 0, 0);
    screenPosition: Vec3 = new Vec3(0, 0, 0);
    intensity: number; // [0-1]
    visualAngle: number; // [degrees]
    outerRadius: number; // [px]
    startFrame: number; // [frames]
    duration: number; // [seconds]
    frequency: number; // [Hz]
    hardness: number; // [0-1]

    _editorRadius: number; // [scene units]
    _updateHandle: EventHandle;
    _enableHandle: EventHandle;
    _materialUpdateHandle: EventHandle;
    _gazeTrackingData: GazeRecord[] = [];
    _trackingHandle: EventHandle;
    _suppressionLag: number = 0; // [frames]

    static suppressionRadius: number = SUPPRESSION_RADIUS; // [px]
    static suppressionAngle: number = SUPPRESSION_ANGLE; // [degrees]
    static defaultVisualAngle: number = MODULATION_VISUAL_ANGLE; // [degrees]
    static defaultIntensity: number = STMULUS_INTENSITY; // [0-1]
    static defaultFrequency: number = MODULATION_FREQUENCY; // [Hz]
    static defaultHardness: number = MODULATION_HARDNESS; // [0-1]
    static defaultDuration: number = MODULATION_DURATION; // [seconds]

    set diameter(diameter: number) {
        this.visualAngle = diameter;
        this.outerRadius = visualAngleToRadius(diameter);

        const r = (this._editorRadius = this.outerRadius * EDITOR_SCALE);
        this.editorEntity.setLocalScale(r, r, r);
    }
    get diameter() {
        return this.outerRadius;
    }

    constructor(
        position: Vec3 = new Vec3(0, 0, 0),
        diameter: number = MODULATION_VISUAL_ANGLE,
        duration: number = MODULATION_DURATION,
        startFrame: number = 0,
        intensity: number = STMULUS_INTENSITY,
        frequency: number = MODULATION_FREQUENCY,
        hardness: number = MODULATION_HARDNESS
    ) {
        super(ElementType.gaze_modulation);

        this.editorEntity = new Entity('modulation_editor');

        this.editorEntity.addComponent('render', {
            type: 'sphere'
        });

        this.editorMaterial = createMaterial('modulation_editor', editorShaders.vertexShader, editorShaders.fragmentShader);

        this.duration = duration;
        this.startFrame = startFrame;
        this.frequency = frequency;
        this.intensity = intensity;
        this.hardness = hardness;
        this.diameter = diameter;

        this.worldPosition = position;
        this.editorEntity.setPosition(position);
    }

    add() {
        const scene = this.scene;
        const events = this.scene.events;

        this._gazeTrackingData = events.invoke('gaze.getTrackingData') || [];

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
                    `v: ${this.visualAngle}`,
                    `r: ${this.diameter}`,
                    `i: ${this.intensity}`,
                    `h: ${this.hardness}`,
                    `f: ${this.frequency}`].join(' | ')} ]`;


        this._updateHandle = events.on('timeline.time', (time: number) => {
            const scheduled = (time >= this.startFrame) && (time <= endFrame);

            if (!scheduled) {
                if (this.active) {
                    this.active = false;
                    events.invoke('gaze.requestModulationUpdate', null);
                }
            } else {
                if (!this.active) {
                    this.active = events.invoke('gaze.requestModulationUpdate', this);
                }
                // update modulation projection
                scene.camera.worldToScreen(this.worldPosition, this.screenPosition);

                // only render if the modulation is covered by the camera frustum
                const culled = !scene.camera.entity.camera.frustum.containsPoint(this.worldPosition);
                // perform gaze proximity check
                const suppressed = this.suppressModulation();

                this.visible = this.active && !culled && !suppressed;
            }
        });

        this._enableHandle = events.on(
            'timeline.setPlaying',
            (_) => {
                this.active = false;
                this.visible = false;
                scene.forceRender = true;
            }
        );
    }

    suppressModulation(suppressionRadius: number = Modulation.suppressionRadius, suppressionAngle: number = Modulation.suppressionAngle): boolean {
        if (this._suppressionLag > 0) {
            this._suppressionLag--;
            return true;
        }

        const len = this._gazeTrackingData.length;
        if (len > 1) {
            const modulationPosition = new Vec2(this.screenPosition.x, this.screenPosition.y);
            const fixationRecord = this._gazeTrackingData[len - 2];
            const gazeRecord = this._gazeTrackingData[len - 1];
            const fixationPosition = new Vec2(fixationRecord.x, fixationRecord.y);
            const gazePosition = new Vec2(gazeRecord.x, gazeRecord.y);

            const distance = gazePosition.distance(modulationPosition);
            if (distance <= suppressionRadius) {
                this._suppressionLag = SUPPRESSION_LAG;
                return true;
            }

            // const modulationDirection = gazePosition.sub(modulationPosition).normalize();
            // const saccadeDirection = gazePosition.sub(fixationPosition).normalize();
            // const thetaRad = Math.acos(saccadeDirection.dot(modulationDirection));
            // const thetaDeg = thetaRad * (180 / Math.PI);
            // if (thetaDeg <= suppressionAngle) {
            //     // this._suppressionLag = MODULATION_SUPPRESSION_LAG;
            //     return true;
            // }
        }

        this._suppressionLag = 0;
        return false;
    }

    remove() {
        this.scene.contentRoot.removeChild(this.editorEntity);
        this.scene.boundDirty = true;
    }

    destroy() {
        this.editorEntity.destroy();
        this._updateHandle?.off();
        this._enableHandle?.off();
        this._materialUpdateHandle?.off();
        this._trackingHandle?.off();
        super.destroy();
    }

    serialize(serializer: Serializer): void {
        serializer.packa(this.editorEntity.getWorldTransform().data);
        serializer.pack(this.diameter);
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

    docSerialize() {
        return {
            position: this.worldPosition.toArray(),
            diameter: this.visualAngle,
            duration: this.duration,
            startFrame: this.startFrame,
            intensity: this.intensity,
            frequency: this.frequency,
            hardness: this.hardness
        };
    }
}

export { Modulation };
