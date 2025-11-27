import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import dynamicImport from 'vite-plugin-dynamic-import';
//import { sassMigratorQuasar } from "rollup-plugin-sass-migrator";
//import {compression} from 'vite-plugin-compression2';
//import { toHandlers } from 'vue';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import RoutersCreateGen from './src/system/RoutersCreateGen.js';

// https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })

import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

export default defineConfig(({ command, mode }) => {
  const { heapUsed, external, heapTotal } = process.memoryUsage();
  const env = loadEnv(mode, process.cwd(), '');
  console.log('command: ', command);
  console.log('mode: ', mode);
  console.log('CONTEXT_PATH: ', env.VITE_CONTEXT_PATH);
  console.log('process: ', process.cwd());
  console.log('heapTotal: ', `${heapTotal / 1024 / 1024} MB`);
  console.log('heapUsed: ', `${heapUsed / 1024 / 1024} MB`);
  console.log('external: ', `${external / 1024 / 1024} MB`);
  console.log('base: ', env.VITE_CONTEXT_PATH + '/dist/');

  // RoutersCreateGen 실행
  console.log('Generating router configuration...');
  RoutersCreateGen.generateMap();
  console.log('Router configuration generated successfully.');

  return defineConfig({
    base: env.VITE_CONTEXT_PATH, // + '/dist/',
    server: {
      host: true, // 또는 host: '0.0.0.0'
      proxy: {
        '/api': {
          target: env.VITE_PROXY_URL + env.VITE_API_BASE_URL,
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      },
      stricPort: false, // 포트 충돌 시 자동으로 다음 포트 사용
      hmr: {
        overlay: false,
      }
    },
    plugins: [
      react(),
      //commonjs(),
      dynamicImport(),
      //sassMigratorQuasar(), // 이 플러그인은 Sass 파일을 컴파일하고 CSS로 변환
      replace({
        'process.platform': JSON.stringify(process.platform),
        preventAssignment: true
      }),
      // compression({
      //   include: [/\.(js)$/, /\.(css)$/],
      //   toHandlers: 1400,
      // }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        //'@': fileURLToPath(new URL('./src', import.meta.url)),
        //"~config": path.join(__dirname, './src/system/config'),
        //"~components": path.join(__dirname, './src/components')
      },
      extensions: [
        ".mjs",
        ".js",
        ".jsx",
        ".json",
        ".vue"
      ]
    },
    css: {
      devSourcemap: true, // f12개발자 모드에서 css파일명 show.
      preprocessorOptions: { // 다음 메세지 제거용. Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.
        scss: {
          api: 'modern-compiler' // or "modern"
        }
      }
    },
    // optimizeDeps: {
    //   include: ['cookie']
    // },
    // preview: {
    //   port: 5174,
    //   strictPort: true,
    //   // SPA 모드에서 모든 경로를 index.html로 리다이렉트
    //   // Vite 7 기준
    //   open: true,
    // },
    // build: {
    //   outDir: 'dist',
    //   assetsDir: 'assets', // 기본값, JS/CSS 파일이 assets 폴더로 나감      
    //   commonjsOptions: {
    //     include: [
    //       /node_modules\/cookie/,                        // 일반 cookie
    //       /node_modules\/react-router\/node_modules\/cookie/, // react-router 내부 cookie
    //       /node_modules/                                  // 나머지 node_modules
    //     ]
    //   }
    // }
  });

});
