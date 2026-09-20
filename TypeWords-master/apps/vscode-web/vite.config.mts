import { writeFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueJsx from '@vitejs/plugin-vue-jsx'
import { resolve } from 'path'
import type { OutputAsset, OutputChunk } from 'rollup'
import { visualizer } from 'rollup-plugin-visualizer'
import { getLastCommit } from 'git-last-commit'
import UnoCSS from 'unocss/vite'
import VueMacros from 'unplugin-vue-macros/vite'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import IconsResolver from 'unplugin-icons/resolver'
import AutoImport from 'unplugin-auto-import/vite'
import polyfillComponentPlugin from './vite-plugin-polyfill-component.js'

function pathResolve(dir: string) {
  return resolve(__dirname, '.', dir)
}

/** 打包完成后把主入口 JS / 抽取的 CSS 文件名写入 dist/vs.json，供部署或扩展读取 */
function recordBuildAssetsJson() {
  const OUTPUT_NAME = 'vs.json'
  return {
    name: 'record-build-assets-json',
    writeBundle(options: { dir?: string }, bundle: Record<string, OutputChunk | OutputAsset>) {
      const outDir = options.dir ?? pathResolve('dist')
      const jsChunks: string[] = []
      const cssAssets: string[] = []
      let entryJs = ''

      for (const fileName of Object.keys(bundle)) {
        const item = bundle[fileName]
        if (item.type === 'chunk' && fileName.endsWith('.js')) {
          jsChunks.push(fileName)
          if ((item as OutputChunk).isEntry) entryJs = fileName
        }
        if (item.type === 'asset' && fileName.endsWith('.css')) {
          cssAssets.push(fileName)
        }
      }

      const payload = {
        /** 主入口 JS（含 hash），无多入口时与 js 列表第一项一致 */
        js: entryJs || jsChunks[0] || '',
        /** 主样式 CSS（含 hash），通常仅一条 */
        css: cssAssets[0] || '',
        /** 若以后拆 chunk，可查看全部 */
        jsAll: jsChunks,
        cssAll: cssAssets,
        generatedAt: new Date().toISOString(),
      }

      writeFileSync(resolve(outDir, OUTPUT_NAME), JSON.stringify(payload, null, 2), 'utf-8')
    },
  }
}

const lifecycle = process.env.npm_lifecycle_event
let isAnalyseBuild = ['report-oss', 'report'].includes(lifecycle)

export default defineConfig(() => {
  return new Promise(resolve => {
    let latestCommitHash = ''
    getLastCommit((err, commit) => {
      if (!err) latestCommitHash = commit.shortHash
      resolve({
        plugins: [
          polyfillComponentPlugin(),
          recordBuildAssetsJson(),
          AutoImport({
            imports: ['vue'],
            dts: 'src/auto-imports.d.ts',
          }),
          Icons({
            autoInstall: true,
            compiler: 'vue3',
          }),
          Components({
            resolvers: [
              IconsResolver({
                prefix: 'Icon',
              }),
            ],
          }),
          VueMacros({
            plugins: {
              vue: Vue(),
              vueJsx: VueJsx(),
            },
          }),
          UnoCSS(),
          isAnalyseBuild
            ? visualizer({
                gzipSize: true,
                brotliSize: true,
                emitFile: false,
                filename: 'report.html',
                open: true,
              })
            : null,
        ],
        define: {
          LATEST_COMMIT_HASH: JSON.stringify(
            latestCommitHash + (process.env.NODE_ENV === 'production' ? '' : ' (dev)')
          ),
        },
        base: './',
        resolve: {
          alias: {
            '@': pathResolve('src'),
            '~': pathResolve('src'),
          },
          extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
        },
        css: {
          preprocessorOptions: {
            scss: {
              api: 'modern-compiler',
            },
          },
        },
        server: {
          port: 3000,
          open: false,
          host: '0.0.0.0',
          proxy: {
            '/baidu': 'https://api.fanyi.baidu.com/api/trans/vip/translate',
          },
        },
      })
    })
  })
})
