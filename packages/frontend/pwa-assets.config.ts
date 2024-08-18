import { defineConfig } from "@vite-pwa/assets-generator/config";

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    transparent: {
      sizes: [64, 192, 512],
      favicons: [
        [48, 'favicon.ico'],
      ],
      padding: 0,
    },
    maskable: {
      sizes: [64, 192, 512],
      padding: 0,
    },
    apple: {
      sizes: [64, 180, 192, 512],
      padding: 0,
    },
  },
  images: [
    "public/logo.webp",
  ],
});
