import { defineConfig, mergeConfig } from 'vite'
import base from './vite.config.js'
import { viteSingleFile } from 'vite-plugin-singlefile'
export default mergeConfig(base, defineConfig({ base: './', plugins: [viteSingleFile()], build: { outDir: '/tmp/single', emptyOutDir: true, assetsInlineLimit: 100000000, cssCodeSplit: false } }))
