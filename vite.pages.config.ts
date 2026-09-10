import {fileURLToPath} from "node:url";
import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

const project = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL("./pages-client", import.meta.url)),
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  base: "/",
  envDir: project,
  resolve: {alias: {"@": project}},
  plugins: [react()],
  define: {"import.meta.env.VITE_STATIC_PAGES": JSON.stringify("true")},
  css: {postcss: project},
  build: {
    outDir: fileURLToPath(new URL("./dist-pages", import.meta.url)),
    emptyOutDir: true,
  },
});
