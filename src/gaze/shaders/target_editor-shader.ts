const vertexShader = /* glsl */ `
    attribute vec3 vertex_position;
    attribute vec3 aNormal;

    uniform mat4 matrix_model;
    uniform mat4 matrix_viewProjection;
    uniform mat3 matrix_normal;

    varying vec3 normal;
    varying vec3 worldPosition;

    void main() {
        normal = normalize(matrix_normal * aNormal);
        worldPosition = (matrix_model * vec4(vertex_position, 1.0)).xyz;
        gl_Position = matrix_viewProjection * matrix_model * vec4(vertex_position, 1.0);
    }
`;

const fragmentShader = /* glsl */ `
    precision mediump float;

    varying vec3 normal;
    varying vec3 worldPosition;

    vec3 lightColors[2];
    vec3 diffuseColor = vec3(0.6, 0.6, 0.6);
    vec3 specularColor = vec3(1.0, 1.0, 1.0);
    float samplingLevel = 0.0;
    float fresnelIntensity = 0.1;
    float fresnelPower = 2.0;

    uniform sampler2D backgroundBuffer;
    uniform vec3 cameraPosition;
    uniform vec3 lightPosition;
    uniform float specularFactor;
    uniform float opacity;
    uniform vec4 color;
    uniform int resolutionFactor;

    void main() {
        vec3 normal = normalize(normal);
        vec3 viewDirection = normalize(cameraPosition - worldPosition);

        vec3 lightPositions[2];
        lightPositions[0] = lightPosition;
        lightPositions[1] = -lightPosition;

        lightColors[0] = vec3(1.0, 1.0, 1.0);
        lightColors[1] = vec3(1.0, 1.0, 1.0);

        vec3 diffuse = vec3(0.0);
        vec3 specular = vec3(0.0);

        for (int i = 0; i < 2; i++) {
            vec3 lightDirection = normalize(lightPositions[i] - worldPosition);
            vec3 reflectDirection = reflect(-lightDirection, normal);

            float diffuseIntensity = max(dot(normal, lightDirection), 0.0);
            float specularIntensity = pow(max(dot(viewDirection, reflectDirection), 0.0), specularFactor);

            diffuse += diffuseIntensity * diffuseColor * lightColors[i];
            specular += specularIntensity * specularColor * lightColors[i];
        }

        vec3 ambient = 0.1 * color.rgb;
        vec3 phongColor = 0.6 * diffuse + 0.9 * specular + ambient;
        
        vec2 texCoord = gl_FragCoord.xy / vec2(textureSize(backgroundBuffer, 0) * resolutionFactor);
        vec4 backgroundColor = textureLod(backgroundBuffer, texCoord, samplingLevel);
        vec3 compositeColor = mix(backgroundColor.rgb, phongColor.rgb, opacity);

        float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), fresnelPower);
        fresnel = fresnel * fresnelIntensity;
        compositeColor = mix(compositeColor, color.rgb, fresnel);

        gl_FragColor = vec4(compositeColor, backgroundColor.a);
    }
`;

export { vertexShader, fragmentShader };
