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

const REGRESSION_TYPE = 'threadedRidge';
// const REGRESSION_TYPE = 'ridge';
const SAMPLING_RATE = 20; // [Hz]

class GazeTracker {
    gazeTracker: typeof webgazer;
    currentRecordedData: GazeRecord[] = [];
    loadedData: GazeRecord[] = [];
    _recording: boolean = false;
    _dataLoaded: boolean = false;

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

        events.on('gaze.loadTrackingData', () => {
            this.loadGazeRecording();
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

        events.on('timeline.frame', (frame: number) => {
            if (this._dataLoaded) {
                this.visualizeLoadedData(frame);
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

    loadGazeRecording() {
        this.loadedData.length = 0;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = (event: Event) => {
            const target = event.target as HTMLInputElement;
            if (target.files && target.files.length > 0) {
                const file = target.files[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    const text = e.target?.result as string;
                    const lines = text.split('\n').filter(line => line.trim().length > 0);
                    const dataLines = lines[0].startsWith('x,') ? lines.slice(1) : lines;
                    dataLines.forEach((l) => {
                        const [x, y, timestamp] = l.split(',').map(Number);
                        this.loadedData.push({ x, y, timestamp });
                    });
                };
                reader.readAsText(file);
            }
        };
        input.click();
        this._dataLoaded = true;
        this.addGazeMarker();
        console.log('Gaze recording loaded: ', this.loadedData);
    }

    addGazeMarker() {
        const gazeMarker = document.createElement('div');
        gazeMarker.id = 'gazeMarker';
        gazeMarker.style.display = 'block';
        gazeMarker.style.position = 'fixed';
        gazeMarker.style.left = '-5px';
        gazeMarker.style.top = '-5px';
        gazeMarker.style.width = '16px';
        gazeMarker.style.height = '16px';
        gazeMarker.style.borderRadius = '50%';
        gazeMarker.style.opacity = '0.7';
        gazeMarker.style.background = 'yellow';
        gazeMarker.style.pointerEvents = 'none';
        gazeMarker.style.zIndex = '9999';
        document.body.appendChild(gazeMarker);

        const childCircle = document.createElement('div');
        childCircle.style.position = 'absolute';
        childCircle.style.left = '-251px';
        childCircle.style.top = '-251px';
        childCircle.style.width = '502px';
        childCircle.style.height = '502px';
        childCircle.style.borderRadius = '50%';
        childCircle.style.opacity = '0.4';
        childCircle.style.background = 'yellow';
        childCircle.style.pointerEvents = 'none';
        gazeMarker.appendChild(childCircle);
    }

    visualizeLoadedData(currentFrameTime: number) {
        const gazeMarker = document.getElementById('gazeMarker');
        if (!gazeMarker) return;

        const currentData = this.loadedData.find(d => Math.floor(d.timestamp) === Math.floor(currentFrameTime));
        if (currentData) {
            gazeMarker.style.transform = `translate3d(${currentData.x}px, ${currentData.y}px, 0)`;
        }
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
