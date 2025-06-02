// const vertexShader = /* glsl */ `
//     // attribute vec2 aPosition;
//     attribute vec3 vertex_position;
//     // attribute vec2 vertex_texCoord0;

//     uniform mat4 matrix_model;
//     uniform mat4 matrix_view;
//     uniform mat4 matrix_projection;

//     uniform vec2 canvasResolution;
//     uniform vec3 stimulusWorldPosition;

//     varying mediump vec3 stimulusScreenPosition;
//     varying mediump vec2 vUv0;

//     void main() {
//         gl_Position = vec4(vertex_position, 1.0);

//         vec4 stimulusClipPosition = matrix_projection * matrix_view * vec4(stimulusWorldPosition, 1.0);
//         stimulusScreenPosition = stimulusClipPosition.xyz / stimulusClipPosition.w;
//         stimulusScreenPosition = stimulusScreenPosition * 0.5 + 0.5;
//         stimulusScreenPosition.xy *= canvasResolution;
//         vUv0 = (vertex_position.xy * 0.5) + 0.5;
//         // vUv0 = vertex_texCoord0;
//     }
// `;

const vertexShader = /* glsl*/ `
    attribute vec2 vertex_position;
    void main(void) {
        gl_Position = vec4(vertex_position, 0.0, 1.0);
    }
`;

const fragmentShader = /* glsl */ `
    const float TAU = 6.2831853;

    uniform float currentTime;
    uniform float stimulusRadius;
    uniform float stimulusIntensity;
    uniform float frequency;
    uniform sampler2D inputBuffer;

    uniform mediump vec2 stimulusScreenPosition;
    // varying mediump vec2 vUv0;

    void main() {
        float intensity = sin(currentTime * TAU * frequency) * 0.5 + 0.5;
        intensity *= stimulusIntensity;
        vec3 stimulusColor = vec3(1.0, 1.0, 1.0);
        float stimFragDist = distance(stimulusScreenPosition, gl_FragCoord.xy);

        ivec2 texel = ivec2(gl_FragCoord.xy);
        mediump vec4 sceneColor = texelFetch(inputBuffer, texel, 0);

        if (stimFragDist <= stimulusRadius) {
            float sigma = stimulusRadius / 3.0;
            float alpha = exp(-(stimFragDist * stimFragDist) / (2.0 * sigma * sigma));
            mediump vec3 compositeColor = (stimulusColor * intensity) * alpha + sceneColor.rgb * (1.0 - alpha);
            gl_FragColor = vec4(compositeColor, sceneColor.a);
        } else {
            gl_FragColor = sceneColor * 0.4;
        }

        // mediump vec4 texel = texture2D(inputBuffer, vUv0);

        // gl_FragColor = vec4(gl_FragCoord.xy, 0.0, 1.0);

        // gl_FragColor = vec4(0.0, 1.0, 0.0, 0.3);
    }
`;

export { vertexShader, fragmentShader };
