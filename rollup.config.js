import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';

export default {
  input: 'src/handler.js',
  output: {
    file: 'dist/index.js',
    format: 'es',
    sourcemap: false,
    inlineDynamicImports: true,
  },
  plugins: [
    nodeResolve({
      preferBuiltins: true,
    }),
    commonjs(),
    json(),
  ],
};
