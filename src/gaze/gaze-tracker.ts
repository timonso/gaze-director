// @ts-ignore

import { Vec2 } from 'playcanvas';

import { Events } from 'src/events';
import { Scene } from 'src/scene';

// @ts-ignore
import webgazer from '../webgazer/index.mjs';

declare global {
    interface Window {
        webgazer: typeof webgazer;
    }
}

type GazeRecord = {
  x: number; y: number; timestamp: number
}

type SceneRecord = {
    sceneId: string;
    participantId: string;
    modulated: boolean;
}

// TODO: change back to threaded
const REGRESSION_TYPE = 'threadedRidge';
// const REGRESSION_TYPE = 'ridge';
const SAMPLING_RATE = 20; // [Hz]

class GazeTracker {
    gazeTracker: typeof webgazer;
    currentRecordedData: GazeRecord[] = [];
    _recording: boolean = false;

    constructor(scene: Scene, events: Events) {
        events.on('gaze.startTracking', (showPoints = true, regressionType = REGRESSION_TYPE) => {
            if (!this._recording) this.startGazeTracking(events, showPoints, regressionType);
        });

        events.on('gaze.stopTracking', () => {
            if (this._recording) this.stopGazeTracking();
        });

        events.on('gaze.pauseTracking', () => {
            if (this._recording) this.gazeTracker.pause();
        });

        events.on('gaze.resumeTracking', () => {
            if (this._recording) this.gazeTracker.resume();
        });

        events.on('gaze.saveTrackingData', (sceneData?: SceneRecord) => {
            this.saveGazeRecording(sceneData);
        });

        events.on('gaze.clearTrackingData', () => {
            this.currentRecordedData.length = 0;
        });

        events.function('gaze.getTrackingData', () => {
            return this.currentRecordedData;
        });

        events.function('gaze.getCurrentTrackingPosition', async () => {
            const position = await this.getCurrentTrackingPosition();
            return position;
        });

        // TODO: call at the end of scene sequence
        events.on('gaze.resetCalibration', () => {
            this.resetCalibration();
        });

        events.on('gaze.removeTrackingDot', () => {
            const gazeDot = document.getElementById('webgazerGazeDot');
            if (gazeDot && gazeDot.parentNode) {
                gazeDot.parentNode.removeChild(gazeDot);
            }
        });

        events.on('timeline.time', async (time: number) => {
            if (this._recording) {
                const prediction = await this.gazeTracker.getCurrentPrediction();
                if (prediction) {
                    this.currentRecordedData.push({ x: prediction.x, y: prediction.y, timestamp: time });
                }
            }
        });

        this.gazeTracker = window.webgazer = webgazer;
    }

    async startGazeTracking(events: Events, showPoints = false, regressionType = REGRESSION_TYPE) {
        this.currentRecordedData.length = 0;

        this.gazeTracker
        .setRegression(regressionType)
        .setTracker('TFFacemesh')
        .applyKalmanFilter(true)
        .saveDataAcrossSessions(true)
        .showVideoPreview(false)
        .showPredictionPoints(showPoints);

        // wait for the tracker to finish initialization
        await this.gazeTracker.begin();
        this._recording = true;
        console.log('Gaze tracker ready.');
        // TODO: check for this in the scene sequencer later
        events.fire('gaze.trackerReady');

        setTimeout(() => {
            const gazeDot = document.getElementById('webgazerGazeDot');
            if (gazeDot && gazeDot.parentNode) {
                // avoid interference with calibration dots
                gazeDot.style.pointerEvents = 'none';
                // reduce DOM update frequency for enhanced performance
                if (!showPoints) gazeDot.parentNode.removeChild(gazeDot);
            }
        }, 1000);
    }

    async getCurrentTrackingPosition() : Promise<Vec2> {
        const prediction = await this.gazeTracker.getCurrentPrediction();
        return new Vec2(prediction.x, prediction.y);
    }

    saveGazeRecording(sceneData: SceneRecord | null = null) {
        const header = 'x,y,timestamp\n';
        const rows = this.currentRecordedData.map(d => `${d.x},${d.y},${d.timestamp}`).join('\n');
        const csvContent = header + rows;

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        if (sceneData) {
            a.download = `gr_s.${sceneData.sceneId}_p.${sceneData.participantId}_m.${sceneData.modulated ? '1' : '0'}.csv`;
        } else {
            const timestamp = new Date().toISOString();
            a.download = `gr_${timestamp}.csv`;
        }

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    stopGazeTracking(saveTrackingData = false) {
        this._recording = false;
        this.gazeTracker.end(REGRESSION_TYPE);
        if (saveTrackingData) this.saveGazeRecording();
    }

    resetCalibration() {
        this.gazeTracker.clearData();
    }
}

export { GazeRecord, SceneRecord, GazeTracker };
