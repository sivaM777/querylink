import { defineConfig } from "vite";
import path from "path";
import { copyFileSync, mkdirSync, existsSync } from "fs";

// Server build configuration
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "server/node-build.ts"),
      name: "server",
      fileName: "node-build",
      formats: ["es"],
    },
    outDir: "dist/server",
    target: "node22",
    ssr: true,
    copyPublicDir: false,
    rollupOptions: {
      external: [
        // Node.js built-ins
        "fs",
        "path",
        "url",
        "http",
        "https",
        "os",
        "crypto",
        "stream",
        "util",
        "events",
        "buffer",
        "querystring",
        "child_process",
        // External dependencies that should not be bundled
        "express",
        "cors",
      ],
      output: {
        format: "es",
        entryFileNames: "[name].mjs",
      },
    },
    minify: false, // Keep readable for debugging
    sourcemap: true,
  },
  plugins: [
    {
      name: "copy-database-files",
      writeBundle() {
        // Copy database files to dist directory
        const sourceDir = path.resolve(__dirname, "server/database");
        const targetDir = path.resolve(__dirname, "dist/server");

        if (!existsSync(targetDir)) {
          mkdirSync(targetDir, { recursive: true });
        }

        // Copy SQL files
        const filesToCopy = ["schema.sql", "init-data.sql"];
        filesToCopy.forEach(file => {
          const sourcePath = path.join(sourceDir, file);
          const targetPath = path.join(targetDir, file);
          if (existsSync(sourcePath)) {
            copyFileSync(sourcePath, targetPath);
            console.log(`Copied ${file} to dist/server/`);
          }
        });

        // Also copy public files like favicon.ico and other assets
        const publicDir = path.resolve(__dirname, "public");
        if (existsSync(publicDir)) {
          const publicFiles = ["favicon.ico", "robots.txt", "placeholder.svg"];
          publicFiles.forEach(file => {
            const sourcePath = path.join(publicDir, file);
            const targetPath = path.join(targetDir, file);
            if (existsSync(sourcePath)) {
              copyFileSync(sourcePath, targetPath);
              console.log(`Copied ${file} to dist/server/`);
            }
          });
        }
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
