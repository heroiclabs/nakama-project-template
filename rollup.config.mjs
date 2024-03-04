import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import babel from '@rollup/plugin-babel';
import typescript from '@rollup/plugin-typescript';

const extensions = ['.mjs', '.js', '.ts', '.json'];

export default {
  input: './main.ts',
  external: ['nakama-runtime'],
  plugins: [
    // Compile TS to check types
    typescript(),

    // Allows node_modules resolution
    resolve(),

    json(),

    // Resolve CommonJS modules
    commonjs(),

    // Compile TS and build to ES5
    babel({
      extensions: extensions,
      babelHelpers: 'bundled',
    }),
  ],
  output: {
    format: 'cjs',
    file: 'build/index.js',
  },
};
