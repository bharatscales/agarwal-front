import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
    base: '/', // ✅ REQUIRED for web hosting
    plugins: [
        react(),
        tailwindcss()
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
        // Prefer .tsx/.ts over committed companion .js files (Vite default puts .js first).
        extensions: [".mjs", ".mts", ".ts", ".tsx", ".jsx", ".js", ".json"],
    },
    server: {
        allowedHosts: ['localhost', '127.0.0.1', 'app.agaarwalflexiblapackging.com'],
    },
});
