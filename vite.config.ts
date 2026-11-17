import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const env = loadEnv(process.env.NODE_ENV === "production" ? "production" : "development", process.cwd(), "");
for (const [key, value] of Object.entries(env)) {
  if (value !== "") {
    process.env[key] = value;
  }
}

const dotEnvPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(dotEnvPath)) {
  for (const rawLine of fs.readFileSync(dotEnvPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val !== "") {
      process.env[key] = val;
    }
  }
}

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
