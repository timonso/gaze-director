// import * as tf from '@tensorflow/tfjs';
import webgazer from 'webgazer';
import '@tensorflow/tfjs-backend-webgl';

declare global {
    interface Window {
        webgazer: typeof webgazer;
    }
}

type GazeRecord = {
  x: number; y: number; timestamp: number
}

const currentRecordedData: GazeRecord[] = [];

const gazeTracker = window.webgazer = webgazer;

async function startGazeTracking() {
    await gazeTracker
    .setRegression('ridge')
    .setTracker('TFFacemesh');

    gazeTracker.showVideoPreview(false).showPredictionPoints(true);
    gazeTracker.setGazeListener((data: any, elapsedTime: number) => {
        if (data == null) {
            return;
        }
        const x = data.x;
        const y = data.y;
        currentRecordedData.push({ x, y, timestamp: elapsedTime });
        console.log(`Gaze coordinates: (${x}, ${y})`);
    });

    gazeTracker.begin();
}

function saveGazeRecording() {
    const header = 'x,y,timestamp\n';
    const rows = currentRecordedData.map(d => `${d.x},${d.y},${d.timestamp}`).join('\n');
    const csvContent = header + rows;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gaze-data-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function stopGazeTracking() {
    gazeTracker.end();
    gazeTracker.showVideoPreview(false).showPredictionPoints(false);
    saveGazeRecording();
    currentRecordedData.length = 0;
    gazeTracker.clearData();
}

export { startGazeTracking, saveGazeRecording, stopGazeTracking };
