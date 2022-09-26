import { resolve } from 'path';
import { defineConfig } from 'vite'

import vuePlugin from '@vitejs/plugin-vue';
import autoprefixer from 'autoprefixer';

function require_plugin() {
  let counter = 0;

  return {
    name: 'mfro-require',
    transform(code, id) {
      if (id.includes('/node_modules/')) return;

      const matches = code.matchAll(/_{0,2}require\s*\(\s*(["'].*?["'])\s*\)/g);
      for (const match of matches) {
        const name = '__mfro_require_' + (counter++);

        code = `import * as ${name} from ${match[1]};\n`
          + code.replace(match[0], `${name}.default || ${name}`);
      }

      return {
        code,
      };
    },
  };
}

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
    require_plugin(),
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
      'dominion.core': resolve('../core/src'),
    },
  },
});
