const vertexShader = /* glsl */ `
    attribute vec3 vertex_position;

    uniform mat4 matrix_model;
    uniform mat4 matrix_view;
    uniform mat4 matrix_projection;

    uniform vec2 canvasResolution;
    uniform vec3 stimulusWorldPosition;

    uniform mediump vec3 stimulusScreenPosition;

    void main() {
        gl_Position = vec4(vertex_position, 1.0);

        vec4 stimulusClipPosition= matrix_projection * matrix_view * vec4(stimulusWorldPosition, 1.0);
        stimulusScreenPosition = stimulusClipPosition.xyz / stimulusClipPosition.w;
        stimulusScreenPosition = stimulusScreenPosition * 0.5 + 0.5;
        stimulusScreenPosition.xy *= canvasResolution;
    }
`;

const fragmentShader = /* glsl */ `
    uniform float currentTime;
    uniform float stimulusRadius;
    uniform float stimulusIntensity;

    varying vec3 stimulusScreenPosition;

    void main() {
        float intensity = sin(currentTime * 10.0) * 0.5 + 0.5;
        intensity *= stimulusIntensity;
        vec3 stimulusColor = vec3(1.0, 1.0, 1.0);
        float stimFragDist = distance(stimulusScreenPosition.xy, gl_FragCoord.xy);

        if (stimFragDist <= stimulusRadius) {
            float sigma = stimulusRadius / 3.0;
            float alpha = exp(- (stimFragDist * stimFragDist) / (2.0 * sigma * sigma));
            gl_FragColor = vec4(stimulusColor * intensity, alpha);
        } else {
            discard;
        }
    }
`;

export { vertexShader, fragmentShader };
