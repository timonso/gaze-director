const vertexShader = /* glsl */ `
    attribute vec3 vertex_position;

    uniform mat4 matrix_model;
    uniform mat4 matrix_viewProjection;

    void main() {
        gl_Position = matrix_viewProjection * matrix_model * vec4(vertex_position, 1.0);
    }
`;

const fragmentShader = /* glsl */ `
    void main() {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.6);
    }
`;

export { vertexShader, fragmentShader };
