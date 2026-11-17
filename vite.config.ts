import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: false,
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    ssr: {
      noExternal: [
        "@tanstack/react-router",
        "@tanstack/router-core",
        "@tanstack/history",
      ],
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true,
    },
  },
});
