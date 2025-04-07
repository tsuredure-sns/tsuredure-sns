import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

export default defineConfig({
  server: {
    https: {
      key: readFileSync(resolve(import.meta.dirname, '../../', 'key.pem')),
      cert: readFileSync(resolve(import.meta.dirname, '../../', 'cert.pem')),
    },
  },
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: [
          // "**/*.{js,css,html,ico,png,svg}",
        ],
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              ['document', 'iframe', 'worker'].includes(request.destination),
            handler: 'NetworkOnly',
            options: {
              plugins: [
                {
                  handlerWillRespond: async ({ response }) => {
                    const headers = new Headers(response.headers);
                    headers.set('X-Frame-Options', 'DENY');
                    headers.set('X-Content-Type-Options', 'nosniff');
                    headers.set('X-XSS-Protection', '1; mode=block');
                    headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
                    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
                    console.log(headers);

                    return new Response(response.body, {
                      headers,
                      status: response.status,
                      statusText: response.statusText,
                    });
                  },
                },
              ],
            },
          },
        ],
      },
      includeAssets: [
        // "**/*.png"
      ],
      manifest: {
        id: '/',
        name: '徒然 SNS',
        short_name: '徒然',
        description: '徒然 Decentralized-Web SNS',
        theme_color: '#556B2F',
        display_override: ['standalone', 'browser'],
        display: 'standalone',
        screenshots: [
          {
            sizes: '512x512',
            src: '/pwa-512x512.png',
            form_factor: 'wide',
            type: 'image/png',
          },
          {
            sizes: '512x512',
            src: '/pwa-512x512.png',
            form_factor: 'narrow',
            type: 'image/png',
          },
        ],
        icons: [
          {
            src: '/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
});
