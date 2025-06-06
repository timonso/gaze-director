import path from 'path';
import copyAndWatch from './copy-and-watch.mjs';
import alias from '@rollup/plugin-alias';
import image from '@rollup/plugin-image';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import strip from '@rollup/plugin-strip';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import { string } from 'rollup-plugin-string';
import commonjs from '@rollup/plugin-commonjs';
// import { visualizer } from 'rollup-plugin-visualizer';

import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import sass from 'sass';
import scss from 'rollup-plugin-scss';
import webWorkerLoader from 'rollup-plugin-web-worker-loader';

// prod is release build
if (process.env.BUILD_TYPE === 'prod') {
    process.env.BUILD_TYPE = 'release';
}

const HREF       = process.env.BASE_HREF || '';

// debug, profile, release
const BUILD_TYPE = process.env.BUILD_TYPE || 'release';

const ENGINE_DIR = process.env.ENGINE_PATH || './node_modules/playcanvas';
const ENGINE_NAME = (BUILD_TYPE === 'debug') ? 'playcanvas.dbg/src/index.js' : 'playcanvas/src/index.js';
const ENGINE_PATH = path.resolve(ENGINE_DIR, 'build', ENGINE_NAME);

const PCUI_DIR = path.resolve(process.env.PCUI_PATH || 'node_modules/@playcanvas/pcui');

const outputHeader = () => {
    const BLUE_OUT = '\x1b[34m';
    const BOLD_OUT = `\x1b[1m`;
    const REGULAR_OUT = `\x1b[22m`;
    const RESET_OUT = `\x1b[0m`;

    const title = [
        `Building SuperSplat`,
        `type ${BOLD_OUT}${BUILD_TYPE}${REGULAR_OUT}`,
        `engine ${BOLD_OUT}${ENGINE_DIR}${REGULAR_OUT}`,
        `pcui ${BOLD_OUT}${PCUI_DIR}${REGULAR_OUT}`
    ].map(l => `${BLUE_OUT}${l}`).join(`\n`);
    console.log(`${BLUE_OUT}${title}${RESET_OUT}\n`);
};

outputHeader();

const aliasEntries = [
    { find: 'playcanvas', replacement: ENGINE_PATH },
    { find: 'pcui', replacement: PCUI_DIR }
    // { find: 'localforage', replacement: 'node_modules/localforage/dist/localforage.js' }
];

const tsCompilerOptions = {
    baseUrl: '.',
    paths: {
        playcanvas: [ENGINE_DIR],
        pcui: [PCUI_DIR]
    }
};

const application = {
    input: 'src/index.ts',
    output: {
        dir: 'dist',
        format: 'esm',
        sourcemap: true
    },
    plugins: [
        copyAndWatch({
            targets: [
                {
                    src: 'src/index.html',
                    transform: (contents, filename) => {
                        return contents.toString().replace('__BASE_HREF__', HREF);
                    }
                },
                { src: 'src/manifest.json' },
                { src: 'node_modules/jszip/dist/jszip.js' },
                { src: 'static/images', dest: 'static' },
                { src: 'static/icons', dest: 'static' },
                { src: 'static/lib', dest: 'static' },
                { src: 'static/env/VertebraeHDRI_v1_512.png', dest: 'static/env' }
            ]
        }),
        typescript({
            compilerOptions: tsCompilerOptions
        }),
        alias({ entries: aliasEntries }),
        resolve(),
        commonjs({
            include: ['**', '/node_modules/webgazer/src/ridgeWorker.mjs'],
            exclude: ['submodules/supersplat-viewer/dist/index.js'],
            defaultIsModuleExports: true
        }),
        image({ dom: false }),
        json(),
        scss({
            sourceMap: true,
            runtime: sass,
            processor: (css) => {
                return postcss([autoprefixer])
                    .process(css, { from: undefined })
                    .then(result => result.css);
            },
            fileName: 'index.css',
            includePaths: [ path.resolve(PCUI_DIR, 'dist') ],
            exclude: ['submodules/**']
        }),
        string({
            include: [ 'submodules/supersplat-viewer/dist/*' ]
        }),

        BUILD_TYPE === 'release' &&
            strip({
                include: ['**/*.ts'],
                functions: ['Debug.exec']
            }),
        BUILD_TYPE !== 'debug' && terser(),
        webWorkerLoader({
            targetPlatform: 'browser',
            inline: false,
            preserveSource: true
        })
        // visualizer()
    ],
    treeshake: 'smallest',
    cache: false
};

const serviceWorker = {
    input: 'src/sw.ts',
    output: {
        dir: 'dist',
        format: 'esm',
        sourcemap: true
    },
    plugins: [
        resolve(),
        json(),
        typescript({
            compilerOptions: tsCompilerOptions
        }),
        // BUILD_TYPE !== 'debug' && terser()
    ],
    treeshake: 'smallest',
    cache: false
};

export default [
    application,
    serviceWorker
];
