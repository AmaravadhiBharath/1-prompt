import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import {
  copyFileSync,
  mkdirSync,
  existsSync,
  rmSync,
  readFileSync,
  writeFileSync,
} from "fs";

// Plugin to copy manifest and fix output structure
const postBuildPlugin = () => ({
  name: "post-build",
  closeBundle() {
    // Manifest is automatically copied by Vite from public/
    // copyFileSync('public/manifest.json', 'dist/manifest.json');

    // Copy welcome.html
    // Copy welcome.html only if src welcome doesn't exist (legacy support)
    if (existsSync("public/welcome.html")) {
      copyFileSync("public/welcome.html", "dist/welcome.html");
      let html = readFileSync("dist/welcome.html", "utf-8");
      html = html.replace(/\.\.\/\.\.\//g, "./");
      writeFileSync("dist/welcome.html", html);
    }

    // Create icons directory
    const iconDir = "dist/icons";
    if (!existsSync(iconDir)) {
      mkdirSync(iconDir, { recursive: true });
    }

    // Fix sidepanel HTML location
    const srcHtmlPath = "dist/src/sidepanel/index.html";
    const srcHistoryPath = "dist/src/sidepanel/history.html";
    const destDir = "dist/sidepanel";
    const destHtmlPath = "dist/sidepanel/index.html";
    const destHistoryPath = "dist/sidepanel/history.html";
    const destWelcomePath = "dist/welcome/index.html";

    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    if (existsSync(srcHtmlPath)) {
      // Read, fix paths, and write
      let html = readFileSync(srcHtmlPath, "utf-8");
      // Fix all paths that go too far up
      html = html.replace(
        /src="\.\.\/\.\.\/sidepanel\.js"/g,
        'src="../sidepanel.js"',
      );
      html = html.replace(/href="\.\.\/\.\.\/assets\//g, 'href="../assets/');
      html = html.replace(
        /href="\.\.\/\.\.\/modulepreload-polyfill\.js"/g,
        'href="../modulepreload-polyfill.js"',
      );
      html = html.replace(
        /href="\.\.\/\.\.\/vendor\.js"/g,
        'href="../vendor.js"',
      );
      html = html.replace(
        /href="\.\.\/\.\.\/preload-helper\.js"/g,
        'href="../preload-helper.js"',
      );
      html = html.replace(
        /href="\.\.\/\.\.\/firebase\.js"/g,
        'href="../firebase.js"',
      );
      // Generic fix for any remaining ../../ in href or src
      html = html.replace(/(href|src)="\.\.\/\.\.\//g, '$1="../');
      writeFileSync(destHtmlPath, html);
    }

    // Fix welcome page paths if needed
    if (existsSync("dist/src/welcome/index.html")) {
      // Move to root
      copyFileSync("dist/src/welcome/index.html", "dist/welcome.html");

      let html = readFileSync("dist/welcome.html", "utf-8");
      // Fix all paths that go too far up. Since we moved to root, ../../ becomes ./
      html = html.replace(/\.\.\/\.\.\//g, "./");

      writeFileSync("dist/welcome.html", html);
    }

    if (existsSync(srcHistoryPath)) {
      let html = readFileSync(srcHistoryPath, "utf-8");
      html = html.replace(
        /src="\.\.\/\.\.\/history\.js"/g,
        'src="../history.js"',
      );
      html = html.replace(/href="\.\.\/\.\.\/assets\//g, 'href="../assets/');
      html = html.replace(
        /href="\.\.\/\.\.\/modulepreload-polyfill\.js"/g,
        'href="../modulepreload-polyfill.js"',
      );
      html = html.replace(
        /href="\.\.\/\.\.\/vendor\.js"/g,
        'href="../vendor.js"',
      );
      html = html.replace(
        /href="\.\.\/\.\.\/preload-helper\.js"/g,
        'href="../preload-helper.js"',
      );
      html = html.replace(
        /href="\.\.\/\.\.\/firebase\.js"/g,
        'href="../firebase.js"',
      );
      // Generic fix for any remaining ../../ in href or src
      html = html.replace(/(href|src)="\.\.\/\.\.\//g, '$1="../');
      writeFileSync(destHistoryPath, html);
    }

    // Copy welcome-sidepanel to sidepanel/welcome.html
    const srcWelcomeSidepanelPath = "dist/src/sidepanel/welcome-v2.html";
    if (existsSync(srcWelcomeSidepanelPath)) {
      let html = readFileSync(srcWelcomeSidepanelPath, "utf-8");
      // Fix all paths that go too far up. Since we moved to sidepanel/, ../../ becomes ../
      html = html.replace(/\.\.\/\.\.\//g, "../");
      writeFileSync("dist/sidepanel/welcome.html", html);
    }

    // Clean up src folder
    rmSync("dist/src", { recursive: true, force: true });
  },
});

export default defineConfig({
  plugins: [react(), postBuildPlugin()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: false,
    minify: false,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "src/sidepanel/index.html"),
        history: resolve(__dirname, "src/sidepanel/history.html"),
        "welcome-sidepanel": resolve(
          __dirname,
          "src/sidepanel/welcome-v2.html",
        ),
        welcome: resolve(__dirname, "src/welcome/index.html"),
        "service-worker": resolve(
          __dirname,
          "src/background/service-worker.ts",
        ),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        manualChunks: (id) => {
          // Force everything into the entry points to avoid ESM imports in content scripts
          if (id.includes("node_modules")) {
            return "vendor";
          }
          return undefined;
        },
      },
    },
  },
});
