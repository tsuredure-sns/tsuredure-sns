import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const headersPlugin = {
  handlerWillRespond: async ({ response }) => {
    const headers = new Headers(response.headers);
    headers.set("X-Frame-Options", "DENY");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-XSS-Protection", "1; mode=block");
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    headers.set("Cross-Origin-Opener-Policy", "same-origin");

    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    });
  },
}

export default defineConfig({
  server: {
    https: {
      key: "localhost-key.pem",
      cert: "localhost.pem",
    },
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
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
            urlPattern: ({ request }) => ["document", "worker"].includes(request.destination),
            handler: "NetworkOnly",
            options: {
              plugins: [
                headersPlugin,
              ],
            },
          },
        ],
      },
      includeAssets: [
        // "**/*.png"
      ],
      manifest: {
        name: "徒然 SNS",
        short_name: "徒然",
        description: "徒然 Distributed-Web SNS",
        theme_color: "#556B2F",
        icons: [
          {
            src: "/pwa-images/ios/192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-images/ios/512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
