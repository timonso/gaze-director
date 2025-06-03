const vertexShader = /* glsl*/ `
    precision mediump float;

    attribute vec2 vertex_position;

    void main(void) {
        gl_Position = vec4(vertex_position, 0.0, 1.0);
    }
`;

const fragmentShader = /* glsl */ `
    precision mediump float;

    uniform float currentTime;
    uniform float outerRadius;
    uniform float halfVariance;
    uniform float modulationIntensity;
    uniform float modulationFrequency;
    uniform  vec2 stimulusScreenPosition;
    uniform sampler2D sceneBuffer;
    
    const float TAU = 6.2831853;
    const vec3 stimulusColor = vec3(1.0, 1.0, 1.0);

    float gaussian(float dist) {
        return exp(-(dist * dist * halfVariance));
    }
        
    void main() {
        float intensity = sin(currentTime * TAU * modulationFrequency);
        intensity *= modulationIntensity;

        float stimFragDist = distance(stimulusScreenPosition, gl_FragCoord.xy);

        ivec2 texel = ivec2(gl_FragCoord.xy);
        vec4 sceneColor = texelFetch(sceneBuffer, texel, 0);

        if (stimFragDist <= outerRadius) {
            float falloff = gaussian(stimFragDist);
            vec3 modulatedColor = (stimulusColor * intensity) + (sceneColor.rgb * (1.0 - intensity));
            vec3 compositeColor = (modulatedColor * falloff) + (sceneColor.rgb * (1.0 - falloff));
            gl_FragColor = vec4(compositeColor, sceneColor.a);
        } else {
            gl_FragColor = sceneColor;
        }
    }
`;

export { vertexShader, fragmentShader };
