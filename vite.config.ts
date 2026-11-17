import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Compatibility shim: @tanstack/start-plugin-core >= 1.171 emits build.rolldownOptions
// (Vite 8), whereas Vite 7 reads build.rollupOptions.
const rolldownToRollupPlugin = {
  name: "vite7-rolldown-compat",
  enforce: "post" as const,
  configEnvironment(_name: string, envConfig: { build?: Record<string, any> }) {
    const build = envConfig.build;
    if (build?.rolldownOptions && !build?.rollupOptions?.input) {
      return {
        build: {
          rollupOptions: {
            ...(build.rollupOptions ?? {}),
            ...build.rolldownOptions,
          },
        },
      };
    }
    return undefined;
  },
};

export default defineConfig({
  nitro: false,
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true,
    },
    plugins: [rolldownToRollupPlugin],
  },
});
