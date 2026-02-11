import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        outDir: "dist",
        emptyOutDir: false,
        minify: false,
        lib: {
            entry: resolve(__dirname, "src/background/service-worker.ts"),
            formats: ["es"],
            fileName: () => "service-worker.js",
        },
        rollupOptions: {
            output: {
                inlineDynamicImports: true, // This is key: no chunks, no preload-helper!
                extend: true,
            },
        },
    },
});
