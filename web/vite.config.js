import { resolve } from 'path';
import { defineConfig } from 'vite'

import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx'
import autoprefixer from 'autoprefixer';

// https://vitejs.dev/config/
export default defineConfig({
  root: 'src',
  base: '',
  plugins: [
    vue({
      template: {
        compilerOptions: {
          whitespace: 'condense',
        },
      },
    }),
    vueJsx({

    })
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
    preserveSymlinks: true,
    alias: {
      '@': resolve('src'),
    },
  },

  optimizeDeps: {
    exclude: ['@mfro/vue-ui'],
  },
});
