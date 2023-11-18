import { defineConfig } from 'vite'
import AutoImport from "unplugin-auto-import/vite";
import Components from 'unplugin-vue-components/vite'
import { ArcoResolver } from 'unplugin-vue-components/resolvers'
import vue from '@vitejs/plugin-vue'
import eslintPlugin from 'vite-plugin-eslint'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    Components({
      dts: true,
      dirs: ['src/components'],
      resolvers: [ArcoResolver()]
    }),
    AutoImport({
      dts: true,
      imports: ["vue", "vue-router"],
      // 可以选择auto-import.d.ts生成的位置，使用ts建议设置为'src/auto-import.d.ts'
      // dts: 'src/auto-import.d.ts'
      eslintrc: { // 生成eslint的配置文件，需要在eslint配置中导入
        enabled: true, // Default `false`
        globalsPropValue: "readonly", // Default `true`, (true | false | 'readonly' | 'readable' | 'writable' | 'writeable')
      },
    }),
    eslintPlugin({
      exclude: ['./node_modules/**'],
      cache: false
    })
  ],
})
