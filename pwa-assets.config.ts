import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

const background = '#aa3bff'

// Genera los iconos de la PWA a partir de public/favicon.svg (npm run icons)
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background } },
  },
  images: ['public/favicon.svg'],
})
