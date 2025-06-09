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

    vec3 uLightColor = vec3(1.0, 1.0, 1.0);
    
    vec3 diffuseColor = vec3(1.0, 1.0, 1.0);
    vec3 specularColor = vec3(1.0, 1.0, 1.0);
    float samplingLevel = 0.0;
    
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
        vec3 lightDirection = normalize(lightPosition - worldPosition);
        vec3 outboundDirecton = reflect(-lightDirection, normal);

        float Kd = max(dot(normal, lightDirection), 0.0);
        float Ks = pow(max(dot(viewDirection, outboundDirecton), 0.0), specularFactor);
        vec3 diffuse = Kd * diffuseColor * uLightColor;
        vec3 specular = Ks * specularColor * uLightColor;
        vec3 ambient = 0.1 * color.rgb;
        vec3 phongColor = diffuse + specular + ambient;

        vec2 texCoord = gl_FragCoord.xy / vec2(textureSize(backgroundBuffer, 0) * resolutionFactor);
        vec4 splatColor = textureLod(backgroundBuffer, texCoord, samplingLevel);

        vec3 compositeColor = mix(splatColor.rgb, phongColor.rgb, opacity);

        gl_FragColor = vec4(compositeColor, splatColor.a);
    }
`;

export { vertexShader, fragmentShader };
