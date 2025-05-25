import params from './params.mjs';
import util from './util.mjs';
import util_regression from './util_regression.mjs';

const reg = {};

/**
 * Constructor of RidgeReg object,
 * this object allow to perform ridge regression
 * @class
 */
reg.RidgeReg = function () {
    this.init();
};

/**
 * Initialize new arrays and initialize Kalman filter.
 */
reg.RidgeReg.prototype.init = util_regression.InitRegression;

/**
 * Add given data from eyes
 * @param {Object} eyes - eyes where extract data to add
 * @param {Object} screenPos - The current screen point
 * @param {Object} type - The type of performed action
 */
reg.RidgeReg.prototype.addData = util_regression.addData;

/**
 * Try to predict coordinates from pupil data
 * after apply linear regression on data set
 * @param {Object} eyesObj - The current user eyes object
 * @returns {Object}
 */
reg.RidgeReg.prototype.predict = function (eyesObj) {
    if (!eyesObj || this.eyeFeaturesClicks.length === 0) {
        return null;
    }
    const acceptTime = performance.now() - this.trailTime;
    const trailX = [];
    const trailY = [];
    const trailFeat = [];
    for (var i = 0; i < this.trailDataWindow; i++) {
        if (this.trailTimes.get(i) > acceptTime) {
            trailX.push(this.screenXTrailArray.get(i));
            trailY.push(this.screenYTrailArray.get(i));
            trailFeat.push(this.eyeFeaturesTrail.get(i));
        }
    }

    const screenXArray = this.screenXClicksArray.data.concat(trailX);
    const screenYArray = this.screenYClicksArray.data.concat(trailY);
    const eyeFeatures = this.eyeFeaturesClicks.data.concat(trailFeat);

    const coefficientsX = util_regression.ridge(screenXArray, eyeFeatures, this.ridgeParameter);
    const coefficientsY = util_regression.ridge(screenYArray, eyeFeatures, this.ridgeParameter);

    const eyeFeats = util.getEyeFeats(eyesObj);
    let predictedX = 0;
    for (var i = 0; i < eyeFeats.length; i++) {
        predictedX += eyeFeats[i] * coefficientsX[i];
    }
    let predictedY = 0;
    for (var i = 0; i < eyeFeats.length; i++) {
        predictedY += eyeFeats[i] * coefficientsY[i];
    }

    predictedX = Math.floor(predictedX);
    predictedY = Math.floor(predictedY);

    if (params.applyKalmanFilter) {
    // Update Kalman model, and get prediction
        let newGaze = [predictedX, predictedY]; // [20200607 xk] Should we use a 1x4 vector?
        newGaze = this.kalman.update(newGaze);

        return {
            x: newGaze[0],
            y: newGaze[1]
        };
    }
    return {
        x: predictedX,
        y: predictedY
    };

};

reg.RidgeReg.prototype.setData = util_regression.setData;

/**
 * Return the data
 * @returns {Array.<Object>|*}
 */
reg.RidgeReg.prototype.getData = function () {
    return this.dataClicks.data;
};

/**
 * The RidgeReg object name
 * @type {string}
 */
reg.RidgeReg.prototype.name = 'ridge';

export default reg;
