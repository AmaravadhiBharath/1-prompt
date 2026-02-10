import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: false,
        minify: true,
        lib: {
            entry: resolve(__dirname, 'src/content/index.ts'),
            name: 'ContentScript',
            formats: ['iife'],
            fileName: () => 'content.js',
        },
        rollupOptions: {
            output: {
                extend: true,
            },
        },
    },
});
