import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import path from "node:path";
import { defineConfig, loadEnv, perEnvironmentPlugin } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const clientNodePolyfills = perEnvironmentPlugin("client-node-polyfills", (environment) =>
  environment.name === "client"
    ? nodePolyfills({
        include: ["buffer", "crypto", "stream", "util", "process"],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: false,
      })
    : false,
);

export default defineConfig(({ command, mode }) => {
  const rootEnv = loadEnv(mode, path.resolve(process.cwd(), ".."), "VITE_");
  const frontendEnv = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine = Object.fromEntries(
    Object.entries({ ...rootEnv, ...frontendEnv }).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  );

  return {
    define: envDefine,
    server: { host: "::", port: Number(process.env.PORT ?? 8080) },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    plugins: [
      clientNodePolyfills,
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
      }),
      command === "build" && nitro(),
      react(),
    ],
  };
});
