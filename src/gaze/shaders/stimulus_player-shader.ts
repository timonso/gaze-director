const vertexShader = /* glsl */ `
    attribute vec3 vertex_position;

    uniform mat4 matrix_model;
    uniform mat4 matrix_view;
    uniform mat4 matrix_projection;

    uniform vec2 canvasResolution;
    uniform vec3 stimulusWorldPosition;

    varying mediump vec3 stimulusScreenPosition;

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
    varying vec3 stimulusScreenPosition;

    void main() {
        float stimulusIntensity = sin(currentTime * 10.0) * 0.5 + 0.5;
        vec4 stimulusColor = vec4(1.0, 1.0, 1.0, 1.0);
        float stimFragDist = distance(stimulusScreenPosition.xy, gl_FragCoord.xy);

        if (stimFragDist <= 32.0) {
            gl_FragColor = vec4(stimulusColor.xyz * stimulusIntensity, 0.7);
        } else {
            discard;
        }
    }
`;

export { vertexShader, fragmentShader };
