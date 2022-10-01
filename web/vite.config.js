import { resolve } from 'path';
import { defineConfig } from 'vite'

import vuePlugin from '@vitejs/plugin-vue';
import autoprefixer from 'autoprefixer';

// https://vitejs.dev/config/
export default defineConfig({
  root: 'src',
  base: '',
  plugins: [
    vuePlugin({
      template: {
        compilerOptions: {
          whitespace: 'condense',
        },
      },
    }),
  ],
  css: {
    postcss: {
      plugins: [
        autoprefixer(),
      ],
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve('src'),
    },
  },
});
