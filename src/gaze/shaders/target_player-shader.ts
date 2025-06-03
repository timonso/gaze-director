const vertexShader = /* glsl */ `
    // attribute vec2 aPosition;
    attribute vec3 vertex_position;

    uniform mat4 matrix_model;
    uniform mat4 matrix_view;
    uniform mat4 matrix_projection;

    uniform vec2 canvasResolution;
    uniform vec3 stimulusWorldPosition;

    varying mediump vec3 stimulusScreenPosition;
    varying vec2 vUv0;

    void main() {
        gl_Position = vec4(vertex_position, 1.0);

        vec4 stimulusClipPosition = matrix_projection * matrix_view * vec4(stimulusWorldPosition, 1.0);
        stimulusScreenPosition = stimulusClipPosition.xyz / stimulusClipPosition.w;
        stimulusScreenPosition = stimulusScreenPosition * 0.5 + 0.5;
        stimulusScreenPosition.xy *= canvasResolution;
        // vUv0 = (aPosition.xy + 1.0) * 0.5;
    }
`;

const fragmentShader = /* glsl */ `
    const float TAU = 6.2831853;

    uniform float currentTime;
    uniform float outerRadius;
    uniform float modulationIntensity;
    uniform float modulationFrequency;
    uniform sampler2D sceneBuffer;

    varying vec3 stimulusScreenPosition;
    varying vec2 vUv0;

    void main() {
        float intensity = sin(currentTime * TAU * modulationFrequency) * 0.5 + 0.5;
        intensity *= modulationIntensity;
        vec3 stimulusColor = vec3(1.0, 1.0, 1.0);
        float stimFragDist = distance(stimulusScreenPosition.xy, gl_FragCoord.xy);

        if (stimFragDist <= outerRadius) {
            float sigma = outerRadius / 3.0;
            float alpha = exp(-(stimFragDist * stimFragDist) / (2.0 * sigma * sigma));
            gl_FragColor = vec4(stimulusColor * intensity, alpha);
        } else {
            discard;
        }

        // gl_FragColor = texture2D(sceneBuffer, vUv0);
    }
`;

export { vertexShader, fragmentShader };
