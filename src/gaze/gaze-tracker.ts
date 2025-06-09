// @ts-ignore

import { Events } from 'src/events';
import { Scene } from 'src/scene';

// @ts-ignore
import webgazer from '../webgazer/index.mjs';

declare global {
    interface Window {
        webgazer: typeof webgazer;
        saveDataAcrossSessions: boolean;
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

const REGRESSION_TYPE = 'threadedRidge';
const SAMPLING_RATE = 20; // [Hz]

class GazeTracker {
    gazeTracker: typeof webgazer;
    currentRecordedData: GazeRecord[] = [];
    _recording: boolean = false;
    _recorderHandle: any = null;

    constructor(scene: Scene, events: Events) {
        events.on('gaze.startTracking', (showPoints = false) => {
            this.startGazeTracking(showPoints, events);
        });

        events.on('gaze.stopTracking', () => {
            this.stopGazeTracking();
        });

        events.on('gaze.saveRecording', (sceneData?: SceneRecord) => {
            this.saveGazeRecording(sceneData);
        });

        events.function('gaze.getTrackingData', () => {
            return this.currentRecordedData;
        });

        // TODO: call at the end of scene sequence
        events.on('gaze.resetCalibration', () => {
            this.resetCalibration();
        });

        events.on('timeline.frame', async (frame: number) => {
            if (this._recording) {
                const prediction = await this.gazeTracker.getCurrentPrediction();
                if (prediction) {
                    this.currentRecordedData.push({ x: prediction.x, y: prediction.y, timestamp: frame });
                }
            }
        });

        this.gazeTracker = window.webgazer = webgazer;
    }

    async startGazeTracking(showPoints = false, events: Events) {
        this.currentRecordedData.length = 0;

        this.gazeTracker =
        this.gazeTracker
        .setRegression(REGRESSION_TYPE)
        .applyKalmanFilter(true)
        .setTracker('TFFacemesh')
        .showVideoPreview(false)
        .showPredictionPoints(showPoints)
        .saveDataAcrossSessions(true);

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

    async getCurrentGazePosition() : Promise<{ currentX: number; currentY: number; }> {
        const prediction = await this.gazeTracker.getCurrentPrediction();
        return { currentX: prediction.x, currentY: prediction.y };
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
            a.download = `gr_$s{sceneData.sceneId}_p${sceneData.participantId}_m${sceneData.modulated ? '1' : '0'}.csv`;
        } else {
            a.download = `gr_${Date.now()}.csv`;
        }

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    stopGazeTracking(saveRecording = false) {
        this._recording = false;
        clearInterval(this._recorderHandle);
        this.gazeTracker.end(REGRESSION_TYPE);
        this.gazeTracker.showVideoPreview(false).showPredictionPoints(false);
        if (saveRecording) this.saveGazeRecording();
    }

    resetCalibration() {
        this.gazeTracker.clearData();
    }
}

export { GazeRecord, GazeTracker };
