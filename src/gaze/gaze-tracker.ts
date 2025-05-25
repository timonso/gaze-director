// @ts-ignore
// eslint-disable-next-line import/no-unresolved
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

const REGRESSION_TYPE = 'threadedRidge';

const currentRecordedData: GazeRecord[] = [];
const gazeTracker = window.webgazer = webgazer;

let recorderHandle: any = null;

async function startGazeTracking() {
    gazeTracker
    .setRegression(REGRESSION_TYPE)
    .setTracker('TFFacemesh');

    window.saveDataAcrossSessions = false;
    gazeTracker.showVideoPreview(false).showPredictionPoints(true);
    // gazeTracker.setGazeListener((data: any, elapsedTime: number) => {
    //     if (data == null) {
    //         return;
    //     }
    //     const x = data.x;
    //     const y = data.y;
    //     currentRecordedData.push({ x, y, timestamp: elapsedTime });
    //     // console.log(`Gaze coordinates: (${x}, ${y})`);
    // });

    await gazeTracker.begin();

    let currentTime = 0;
    recorderHandle = setInterval(async () => {
        const prediction = await gazeTracker.getCurrentPrediction();
        if (prediction) {
            currentRecordedData.push({ x: prediction.x, y: prediction.y, timestamp: currentTime });
            // console.log(prediction);
        }
        currentTime++;
    }, 50);
}


async function getCurrentGazePosition() : Promise<{ currentX: number; currentY: number; }> {
    const prediction = await gazeTracker.getCurrentPrediction();
    return { currentX: prediction.x, currentY: prediction.y };
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
    clearInterval(recorderHandle);
    gazeTracker.end(REGRESSION_TYPE);
    gazeTracker.showVideoPreview(false).showPredictionPoints(false);
    saveGazeRecording();
    currentRecordedData.length = 0;
    gazeTracker.clearData();
}

export { startGazeTracking, saveGazeRecording, stopGazeTracking, getCurrentGazePosition };
