/* eslint-disable jsdoc/require-returns */
/* eslint-disable no-undef */

console.log('thread starting');

// Add src/util.mjs and src/mat.mjs to the same directory as your html file
// importScripts('./worker_scripts/util.js', './worker_scripts/mat.js'); // [20200708] Figure out how to make all of this wrap up neatly
import { mat } from './worker_scripts/mat.js';
import { util } from './worker_scripts/util.js';
const ridgeParameter = Math.pow(10, -5);
const dataWindow = 70;
const trailDataWindow = 10;
const trainInterval = 500;

self.screenXClicksArray = new util.DataWindow(dataWindow);
self.screenYClicksArray = new util.DataWindow(dataWindow);
self.eyeFeaturesClicks = new util.DataWindow(dataWindow);
self.dataClicks = new util.DataWindow(dataWindow);

self.screenXTrailArray = new util.DataWindow(trailDataWindow);
self.screenYTrailArray = new util.DataWindow(trailDataWindow);
self.eyeFeaturesTrail = new util.DataWindow(trailDataWindow);
self.dataTrail = new util.DataWindow(trailDataWindow);

/**
 * Performs ridge regression, according to the Weka code.
 * @param {Array} y - corresponds to screen coordinates (either x or y) for each of n click events
 * @param {Array.<Array.<Number>>} X - corresponds to gray pixel features (120 pixels for both eyes) for each of n clicks
 * @param {Array} k - ridge parameter
 * @return{Array} regression coefficients
 */
function ridge(y, X, k) {
    const nc = X[0].length;
    const m_Coefficients = new Array(nc);
    const xt = mat.transpose(X);
    let solution = new Array();
    let success = true;
    do {
        const ss = mat.mult(xt, X);
        // Set ridge regression adjustment
        for (var i = 0; i < nc; i++) {
            ss[i][i] += k;
        }

        // Carry out the regression
        const bb = mat.mult(xt, y);
        for (var i = 0; i < nc; i++) {
            m_Coefficients[i] = bb[i][0];
        }
        try {
            const n = (m_Coefficients.length !== 0 ? m_Coefficients.length / m_Coefficients.length : 0);
            if (m_Coefficients.length * n !== m_Coefficients.length) {
                console.log('Array length must be a multiple of m');
            }
            solution = (ss.length === ss[0].length ? (mat.LUDecomposition(ss, bb)) : (mat.QRDecomposition(ss, bb)));

            for (var i = 0; i < nc; i++) {
                m_Coefficients[i] = solution[i][0];
            }
            success = true;
        } catch (ex) {
            k *= 10;
            console.log(ex);
            success = false;
        }
    } while (!success);
    return m_Coefficients;
}

/**
 * Event handler, it store screen position to allow training
 * @param {Event} event - the receive event
 */
self.onmessage = function (event) {
    // console.log(event.data);
    const data = event.data;
    const screenPos = data.screenPos;
    const eyes = data.eyes;
    const type = data.type;
    if (type === 'click') {
        self.screenXClicksArray.push([screenPos[0]]);
        self.screenYClicksArray.push([screenPos[1]]);

        self.eyeFeaturesClicks.push(eyes);
    } else if (type === 'move') {
        self.screenXTrailArray.push([screenPos[0]]);
        self.screenYTrailArray.push([screenPos[1]]);

        self.eyeFeaturesTrail.push(eyes);
        self.dataTrail.push({ 'eyes': eyes, 'screenPos': screenPos, 'type': type });
    }
    self.needsTraining = true;
};

/**
 * Compute coefficient from training data
 */
function retrain() {
    if (self.screenXClicksArray.length === 0) {
        return;
    }
    if (!self.needsTraining) {
        return;
    }
    const screenXArray = self.screenXClicksArray.data.concat(self.screenXTrailArray.data);
    const screenYArray = self.screenYClicksArray.data.concat(self.screenYTrailArray.data);
    const eyeFeatures = self.eyeFeaturesClicks.data.concat(self.eyeFeaturesTrail.data);

    const coefficientsX = ridge(screenXArray, eyeFeatures, ridgeParameter);
    const coefficientsY = ridge(screenYArray, eyeFeatures, ridgeParameter);
    self.postMessage({ 'X': coefficientsX, 'Y': coefficientsY });
    self.needsTraining = false;
}

setInterval(retrain, trainInterval);
