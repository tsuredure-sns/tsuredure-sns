import { readFileSync } from 'node:fs';
import type { ServerOptions } from 'node:http2';
import { resolve } from 'node:path';
import type { SecureContextOptions } from 'node:tls';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

if (!import.meta.dirname) {
  throw new Error('import.meta.dirname is not defined');
}

const https = (() => {
  try {
    return {
      key: readFileSync(resolve(import.meta.dirname, '../../', 'key.pem')),
      cert: readFileSync(resolve(import.meta.dirname, '../../', 'cert.pem')),
    } satisfies ServerOptions & SecureContextOptions;
  } catch {
    return {};
  }
})();

export default defineConfig({
  base: './',
  server: {
    https,
    headers: {
      'accept-charset': 'utf-8',
      'accept-encoding': 'br, gzip, zstd, deflate',
      'strict-transport-security':
        'max-age=63072000; includeSubDomains; preload',
      'permissions-policy': 'fullscreen=(self)',
      'referrer-policy': 'same-origin',
      'x-frame-options': 'SAMEORIGIN',
      'x-content-type-options': 'nosniff',
      'x-xss-protection': '1; mode=block',
      'cross-origin-embedder-policy': 'require-corp',
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-origin',
    },
  },
  optimizeDeps: {
    exclude: ['@electric-sql/pglite'],
  },
  worker: {
    format: 'es',
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
                    headers.set('accept-charset', 'utf-8');
                    headers.set('accept-encoding', 'br, gzip, zstd, deflate');
                    headers.set(
                      'strict-transport-security',
                      'max-age=63072000; includeSubDomains; preload',
                    );
                    headers.set('permissions-policy', 'fullscreen=(self)');
                    headers.set('referrer-policy', 'same-origin');
                    headers.set('x-frame-options', 'SAMEORIGIN');
                    headers.set('x-content-type-options', 'nosniff');
                    headers.set('x-xss-protection', '1; mode=block');
                    headers.set('cross-origin-embedder-policy', 'require-corp');
                    headers.set('cross-origin-opener-policy', 'same-origin');
                    headers.set('cross-origin-resource-policy', 'same-origin');

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
            src: './pwa-512x512.png',
            form_factor: 'wide',
            type: 'image/png',
          },
          {
            sizes: '512x512',
            src: './pwa-512x512.png',
            form_factor: 'narrow',
            type: 'image/png',
          },
        ],
        icons: [
          {
            src: './pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: './pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: './pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
});
